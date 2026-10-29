"""Local asyncio WebSocket workload for the Phase 4 engine qualification study."""

from __future__ import annotations

import argparse
import asyncio
import json
import math
import os
import platform
import secrets
import shutil
import statistics
import sys
import time
from collections import Counter
from pathlib import Path
from typing import Any

import websockets


ROOT = Path(__file__).resolve().parents[2]
SERVER_SCRIPT = ROOT / "load-test" / "server.js"
ORIGIN = "http://load.local"


def percentile(values: list[float], percentile_value: float) -> float | None:
    if not values:
        return None
    ordered = sorted(values)
    index = min(len(ordered) - 1, math.ceil(percentile_value * len(ordered)) - 1)
    return round(ordered[index], 3)


async def run_load(args: argparse.Namespace) -> dict[str, Any]:
    client_token = secrets.token_urlsafe(24)
    admin_token = secrets.token_urlsafe(24)
    env = os.environ.copy()
    env["WS_LOAD_CLIENT_TOKEN"] = client_token
    env["WS_LOAD_ADMIN_TOKEN"] = admin_token
    env["WS_LOAD_CLIENTS"] = str(args.clients)

    node = os.environ.get("NODE_BINARY") or shutil.which("node")
    if not node:
        raise RuntimeError("Node.js executable was not found on PATH")
    server_process = await asyncio.create_subprocess_exec(
        node,
        str(SERVER_SCRIPT),
        cwd=ROOT,
        env=env,
        stdin=asyncio.subprocess.PIPE,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.STDOUT,
    )
    assert server_process.stdout is not None
    first_line = await asyncio.wait_for(server_process.stdout.readline(), timeout=15)
    try:
        ready = json.loads(first_line)
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        server_process.kill()
        await server_process.wait()
        raise RuntimeError(f"load server did not emit a ready record: {first_line!r}") from error
    if ready.get("kind") != "ready":
        server_process.kill()
        await server_process.wait()
        raise RuntimeError(f"load server failed to start: {ready!r}")

    stats: Counter[str] = Counter()
    latencies_ms: list[float] = []
    broadcast_ids: list[int] = []
    broadcast_receipts: set[tuple[int, int]] = set()
    request_failures: Counter[str] = Counter()
    server_samples: list[dict[str, Any]] = []
    stop_sending = asyncio.Event()
    finish_receiving = asyncio.Event()
    reconnect_bursts_done = asyncio.Event()
    start_traffic = asyncio.Event()
    all_connections_attempted = asyncio.Event()
    connected_count = 0
    completed_connects = 0
    loop = asyncio.get_running_loop()

    async def read_server_output() -> None:
        assert server_process.stdout is not None
        while raw_line := await server_process.stdout.readline():
            try:
                record = json.loads(raw_line)
            except json.JSONDecodeError:
                continue
            if record.get("kind") == "sample":
                server_samples.append(record)
            elif record.get("kind") == "log" and record.get("level") == "error":
                stats["server_error_logs"] += 1

    output_task = asyncio.create_task(read_server_output())

    async def client_worker(client_index: int) -> None:
        nonlocal connected_count, completed_connects
        try:
            async with websockets.connect(
                ready["url"],
                additional_headers={"x-auth-token": client_token},
                origin=ORIGIN,
                open_timeout=15,
                close_timeout=2,
                ping_interval=20,
                max_queue=32,
            ) as socket:
                connected_message = json.loads(await asyncio.wait_for(socket.recv(), 10))
                if connected_message.get("type") != "connected":
                    raise RuntimeError("expected initial connected message")
                connected_count += 1
                completed_connects += 1
                if completed_connects == args.clients:
                    all_connections_attempted.set()

                pending: dict[int, tuple[asyncio.Future[dict[str, Any]], float]] = {}

                async def receive_messages() -> None:
                    async for raw_message in socket:
                        message = json.loads(raw_message)
                        data = message.get("data", {})
                        if data.get("from") is not None and data.get("broadcast"):
                            broadcast_receipts.add((client_index, int(data["sequence"])))
                            continue
                        echo = data.get("echo", {})
                        sequence = echo.get("sequence")
                        if data.get("ack") and sequence in pending:
                            future, started_at = pending.pop(sequence)
                            elapsed_ns = time.perf_counter_ns() - started_at
                            latencies_ms.append(elapsed_ns / 1_000_000)
                            stats["responses"] += 1
                            if not future.done():
                                future.set_result(message)

                receiver_task = asyncio.create_task(receive_messages())
                try:
                    await start_traffic.wait()
                    next_send_at = loop.time() + (client_index / args.clients) * args.request_interval
                    sequence = 0
                    while not stop_sending.is_set():
                        delay = next_send_at - loop.time()
                        if delay > 0:
                            try:
                                await asyncio.wait_for(stop_sending.wait(), timeout=delay)
                                break
                            except asyncio.TimeoutError:
                                pass

                        future: asyncio.Future[dict[str, Any]] = loop.create_future()
                        started_at = time.perf_counter_ns()
                        pending[sequence] = (future, started_at)
                        await socket.send(
                            json.dumps(
                                {
                                    "type": "status",
                                    "data": {
                                        "request": "load",
                                        "sequence": sequence,
                                    },
                                },
                                separators=(",", ":"),
                            )
                        )
                        stats["requests_sent"] += 1
                        try:
                            await asyncio.wait_for(future, timeout=args.response_timeout)
                        except asyncio.TimeoutError:
                            pending.pop(sequence, None)
                            stats["request_timeouts"] += 1
                        sequence += 1
                        next_send_at += args.request_interval

                    await finish_receiving.wait()
                finally:
                    receiver_task.cancel()
                    await asyncio.gather(receiver_task, return_exceptions=True)
        except Exception as error:  # noqa: BLE001 - counted as a load-test failure
            stats["client_errors"] += 1
            request_failures[type(error).__name__] += 1
        finally:
            if completed_connects < args.clients and not all_connections_attempted.is_set():
                completed_connects += 1
                if completed_connects == args.clients:
                    all_connections_attempted.set()

    async def admin_broadcasts() -> None:
        try:
            async with websockets.connect(
                ready["url"],
                additional_headers={"x-auth-token": admin_token},
                origin=ORIGIN,
                open_timeout=15,
                close_timeout=2,
                ping_interval=20,
                max_queue=32,
            ) as socket:
                message = json.loads(await asyncio.wait_for(socket.recv(), 10))
                if message.get("type") != "connected":
                    raise RuntimeError("admin connection did not receive connected")
                await start_traffic.wait()
                sequence = 0
                while not stop_sending.is_set():
                    try:
                        await asyncio.wait_for(
                            stop_sending.wait(), timeout=args.broadcast_interval
                        )
                        break
                    except asyncio.TimeoutError:
                        pass
                    if stop_sending.is_set():
                        break
                    await socket.send(
                        json.dumps(
                            {
                                "type": "status",
                                "data": {
                                    "broadcast": True,
                                    "sequence": sequence,
                                },
                            },
                            separators=(",", ":"),
                        )
                    )
                    broadcast_ids.append(sequence)
                    stats["broadcasts_sent"] += 1
                    sequence += 1
                await reconnect_bursts_done.wait()
        except Exception as error:  # noqa: BLE001 - counted as a load-test failure
            stats["admin_errors"] += 1
            request_failures[type(error).__name__] += 1

    async def reconnect_burst(wave_number: int) -> dict[str, Any]:
        started_ns = time.perf_counter_ns()
        wave_errors: Counter[str] = Counter()

        async def reconnect_one() -> bool:
            try:
                async with websockets.connect(
                    ready["url"],
                    additional_headers={"x-auth-token": client_token},
                    origin=ORIGIN,
                    open_timeout=15,
                    close_timeout=2,
                    ping_interval=20,
                    max_queue=8,
                ) as socket:
                    message = json.loads(await asyncio.wait_for(socket.recv(), 10))
                    return message.get("type") == "connected"
            except Exception as error:  # noqa: BLE001 - counted in the report
                wave_errors[type(error).__name__] += 1
                return False

        results = await asyncio.gather(
            *(reconnect_one() for _ in range(args.reconnect_burst_clients))
        )
        return {
            "wave": wave_number,
            "attempted": len(results),
            "connected": sum(results),
            "errors": dict(wave_errors),
            "duration_seconds": round(
                (time.perf_counter_ns() - started_ns) / 1e9,
                3,
            ),
        }

    workers: list[asyncio.Task[None]] = []
    admin_task: asyncio.Task[None] | None = None
    try:
        for index in range(args.clients):
            workers.append(asyncio.create_task(client_worker(index)))
            if (index + 1) % args.ramp_rate == 0:
                await asyncio.sleep(1)

        try:
            await asyncio.wait_for(all_connections_attempted.wait(), timeout=args.connect_timeout)
        except asyncio.TimeoutError:
            stats["ramp_timeout"] += 1
        admin_task = asyncio.create_task(admin_broadcasts())
        start_time = loop.time()
        start_traffic.set()
        await asyncio.sleep(args.soak_seconds)
        stop_sending.set()
        await asyncio.sleep(args.broadcast_grace)
        finish_receiving.set()
        await asyncio.gather(*workers, return_exceptions=True)
        reconnect_results = []
        for wave_number in (1, 2):
            reconnect_results.append(await reconnect_burst(wave_number))
        reconnect_bursts_done.set()
        if admin_task:
            await asyncio.gather(admin_task, return_exceptions=True)
    finally:
        stop_sending.set()
        finish_receiving.set()
        if server_process.stdin:
            server_process.stdin.write(b"STOP\n")
            await server_process.stdin.drain()
            server_process.stdin.close()
        try:
            await asyncio.wait_for(server_process.wait(), timeout=20)
        except asyncio.TimeoutError:
            server_process.kill()
            await server_process.wait()
        await asyncio.gather(output_task, return_exceptions=True)

    actual_broadcast_expected = connected_count * len(broadcast_ids)
    broadcast_ratio = (
        len(broadcast_receipts) / actual_broadcast_expected
        if actual_broadcast_expected
        else 1.0
    )
    response_ratio = stats["responses"] / stats["requests_sent"] if stats["requests_sent"] else 0.0
    p95 = percentile(latencies_ms, 0.95)
    p99 = percentile(latencies_ms, 0.99)
    peak_rss = max((sample.get("rssBytes", 0) for sample in server_samples), default=0)
    peak_heap_used = max(
        (sample.get("heapUsedBytes", 0) for sample in server_samples),
        default=0,
    )
    peak_active_connections = max(
        (sample.get("gauges", {}).get("ws.connections.active", 0) for sample in server_samples),
        default=0,
    )
    peak_buffered_bytes = max(
        (sample.get("gauges", {}).get("ws.buffered_bytes.total", 0) for sample in server_samples),
        default=0,
    )
    cpu_samples = [sample.get("cpuOneCorePercent", 0) for sample in server_samples]
    lag_samples = [
        sample["eventLoopLagMeanMs"]
        for sample in server_samples
        if sample.get("eventLoopLagMeanMs") is not None
    ]
    final_sample = server_samples[-1] if server_samples else {}
    provisional_pass = (
        connected_count == args.clients
        and response_ratio >= 0.999
        and broadcast_ratio >= 0.999
        and p95 is not None
        and p95 <= 250
        and p99 is not None
        and p99 <= 1000
        and stats["client_errors"] == 0
        and stats["admin_errors"] == 0
        and stats["server_error_logs"] == 0
        and stats["ramp_timeout"] == 0
        and all(
            wave["connected"] == args.reconnect_burst_clients
            and not wave["errors"]
            for wave in reconnect_results
        )
    )

    return {
        "result": "pass_provisional_local_profile" if provisional_pass else "fail_provisional_local_profile",
        "slo_status": "provisional_only_not_user_approved_production_slo",
        "environment": {
            "os": platform.platform(),
            "python": sys.version.split()[0],
            "node": ready.get("nodeVersion"),
            "logical_cpus": os.cpu_count(),
            "topology": "local_loopback",
        },
        "workload": {
            "target_clients": args.clients,
            "connected_clients": connected_count,
            "admin_senders": 1,
            "ramp_rate_per_second": args.ramp_rate,
            "soak_seconds": args.soak_seconds,
            "request_interval_seconds": args.request_interval,
            "broadcast_interval_seconds": args.broadcast_interval,
            "reconnect_burst_clients_per_wave": args.reconnect_burst_clients,
            "reconnect_burst_waves": 2,
            "elapsed_seconds": round(loop.time() - start_time, 2),
        },
        "results": {
            "latency_clock": "time.perf_counter_ns",
            "requests_sent": stats["requests_sent"],
            "responses_received": stats["responses"],
            "response_ratio": round(response_ratio, 6),
            "request_timeouts": stats["request_timeouts"],
            "client_errors": stats["client_errors"],
            "admin_errors": stats["admin_errors"],
            "server_error_logs": stats["server_error_logs"],
            "error_types": dict(request_failures),
            "latency_ms": {
                "p50": percentile(latencies_ms, 0.50),
                "p95": p95,
                "p99": p99,
                "max": round(max(latencies_ms), 3) if latencies_ms else None,
            },
            "broadcasts_sent": len(broadcast_ids),
            "broadcast_expected_deliveries": actual_broadcast_expected,
            "broadcast_received": len(broadcast_receipts),
            "broadcast_ratio": round(broadcast_ratio, 6),
            "reconnect_bursts": reconnect_results,
        },
        "server": {
            "peak_rss_bytes": peak_rss,
            "peak_rss_mib": round(peak_rss / (1024 * 1024), 2),
            "peak_heap_used_bytes": peak_heap_used,
            "peak_heap_used_mib": round(peak_heap_used / (1024 * 1024), 2),
            "peak_active_connections": peak_active_connections,
            "peak_buffered_bytes": peak_buffered_bytes,
            "peak_cpu_one_core_percent": round(max(cpu_samples), 2) if cpu_samples else None,
            "event_loop_lag_mean_ms_max": round(max(lag_samples), 3) if lag_samples else None,
            "final_counters": final_sample.get("counters", {}),
            "final_gauges": final_sample.get("gauges", {}),
        },
        "provisional_targets": {
            "all_clients_connected": connected_count == args.clients,
            "response_ratio_at_least_0_999": response_ratio >= 0.999,
            "broadcast_ratio_at_least_0_999": broadcast_ratio >= 0.999,
            "p95_ms_at_most_250": p95 is not None and p95 <= 250,
            "p99_ms_at_most_1000": p99 is not None and p99 <= 1000,
            "reconnect_waves_completed": all(
                wave["connected"] == args.reconnect_burst_clients
                and not wave["errors"]
                for wave in reconnect_results
            ),
        },
        "server_exit_code": server_process.returncode,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--clients", type=int, default=1000)
    parser.add_argument("--ramp-rate", type=int, default=20)
    parser.add_argument("--soak-seconds", type=int, default=60)
    parser.add_argument("--request-interval", type=float, default=10)
    parser.add_argument("--broadcast-interval", type=float, default=10)
    parser.add_argument("--broadcast-grace", type=float, default=3)
    parser.add_argument("--reconnect-burst-clients", type=int, default=500)
    parser.add_argument("--response-timeout", type=float, default=10)
    parser.add_argument("--connect-timeout", type=float, default=120)
    args = parser.parse_args()
    if min(args.clients, args.ramp_rate, args.soak_seconds) < 1:
        parser.error("clients, ramp-rate, and soak-seconds must be positive")
    if min(args.request_interval, args.broadcast_interval, args.response_timeout) <= 0:
        parser.error("intervals and response timeout must be positive")
    return args


if __name__ == "__main__":
    result = asyncio.run(run_load(parse_args()))
    print(json.dumps(result, indent=2, sort_keys=True))
    if result["result"] != "pass_provisional_local_profile":
        raise SystemExit(1)
