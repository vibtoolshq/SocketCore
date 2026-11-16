"use strict";

// PU-05 test-only proof: ephemeral loopback TLS/proxy + engine integration.
// Do not reuse this minimal proxy/health adapter in production.
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { mkdtempSync, readFileSync, rmSync } = require("node:fs");
const { createServer: createHttpServer, get: httpGet } = require("node:http");
const { createServer: createHttpsServer, get: httpsGet } = require("node:https");
const net = require("node:net");
const { tmpdir } = require("node:os");
const path = require("node:path");
const { test } = require("node:test");
const WebSocket = require("ws");
const { createEngine } = require("../engine");

const TOKEN = "pu05-ephemeral-test-token";
const ORIGIN = "https://client.example";
const TIMEOUT_MS = 3000;

function opensslCommand() {
  const candidates = process.platform === "win32"
    ? ["openssl", "C:\\Program Files\\Git\\usr\\bin\\openssl.exe"]
    : ["openssl"];
  for (const candidate of candidates) {
    const result = spawnSync(candidate, ["version"], { encoding: "utf8", timeout: 3000 });
    if (!result.error && result.status === 0) return candidate;
  }
  throw new Error("OpenSSL CLI required for ephemeral PU-05 TLS certificate");
}

function temporaryCertificate() {
  const dir = mkdtempSync(path.join(tmpdir(), "socketcore-pu05-tls-"));
  const keyPath = path.join(dir, "key.pem");
  const certPath = path.join(dir, "cert.pem");
  try {
    const generate = spawnSync(opensslCommand(), [
      "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "1",
      "-keyout", keyPath, "-out", certPath, "-subj", "/CN=localhost",
      "-addext", "subjectAltName=IP:127.0.0.1,DNS:localhost",
    ], { encoding: "utf8", timeout: 10000 });
    assert.equal(generate.status, 0, "ephemeral OpenSSL certificate generation failed");
    return {
      key: readFileSync(keyPath),
      cert: readFileSync(certPath),
      cleanup: () => rmSync(dir, { recursive: true, force: true }),
    };
  } catch (error) {
    rmSync(dir, { recursive: true, force: true });
    throw error;
  }
}

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
  return server.address().port;
}

async function closeServer(server) {
  if (!server.listening) return;
  server.closeAllConnections?.();
  await new Promise((resolve, reject) =>
    server.close((error) => error ? reject(error) : resolve()));
}

function timedResponse(socket) {
  const received = [];
  const waiters = [];
  socket.on("message", (data) => {
    const msg = JSON.parse(data.toString());
    const next = waiters.shift();
    if (next) next(msg);
    else received.push(msg);
  });
  return () => {
    if (received.length) return Promise.resolve(received.shift());
    return new Promise((resolve, reject) => {
      const done = (msg) => { clearTimeout(timer); resolve(msg); };
      const timer = setTimeout(() => {
        const at = waiters.indexOf(done);
        if (at !== -1) waiters.splice(at, 1);
        reject(new Error("WSS response timeout"));
      }, TIMEOUT_MS);
      waiters.push(done);
    });
  };
}

function tlsClient(url, ca, headers) {
  return new WebSocket(url, {
    ca,
    rejectUnauthorized: true,
    headers,
    handshakeTimeout: TIMEOUT_MS,
  });
}

async function accepted(url, ca, headers = {}) {
  const socket = tlsClient(url, ca, headers);
  const receive = timedResponse(socket);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { socket.terminate(); reject(new Error("WSS open timeout")); }, TIMEOUT_MS);
    socket.once("open", () => { clearTimeout(timer); resolve(); });
    socket.once("error", (error) => { clearTimeout(timer); reject(error); });
  });
  return { socket, receive };
}

async function rejectedStatus(url, ca, headers) {
  return new Promise((resolve, reject) => {
    const socket = tlsClient(url, ca, headers);
    socket.on("error", () => {});
    const timer = setTimeout(() => {
      socket.terminate();
      reject(new Error("expected HTTP rejection timeout"));
    }, TIMEOUT_MS);
    socket.once("unexpected-response", (_request, response) => {
      clearTimeout(timer);
      const status = response.statusCode;
      response.resume();
      socket.terminate();
      resolve(status);
    });
    socket.once("open", () => {
      clearTimeout(timer);
      socket.terminate();
      reject(new Error("unexpected WSS acceptance"));
    });
  });
}

async function getHealth(port, urlPath, ca) {
  return new Promise((resolve, reject) => {
    const req = httpsGet({
      host: "127.0.0.1", port, path: urlPath, ca, rejectUnauthorized: true,
      timeout: TIMEOUT_MS,
    }, (response) => {
      response.resume();
      response.once("end", () => resolve(response.statusCode));
    });
    req.once("timeout", () => req.destroy(new Error("HTTPS health timeout")));
    req.once("error", reject);
  });
}

async function fixture(t) {
  const tls = temporaryCertificate();
  let backend = null;
  let proxy = null;
  const connections = new Set();
  const metrics = [];
  const upgradedHeaders = [];
  const wsClients = new Set();
  const loggerEvents = [];
  let upstreamPort = null;

  async function startBackend() {
    assert.equal(backend, null);
    const httpServer = createHttpServer((req, res) => {
      if (req.url === "/internal-ready") {
        res.writeHead(200, { "content-type": "text/plain" });
        res.end("backend-ready");
        return;
      }
      res.writeHead(404);
      res.end();
    });
    const engine = createEngine({
      path: "/socket",
      allowedOrigins: [ORIGIN],
      authenticate(req) {
        upgradedHeaders.push({
          forwardedFor: req.headers["x-forwarded-for"],
          forwardedProto: req.headers["x-forwarded-proto"],
        });
        return req.headers["x-auth-token"] === TOKEN ? { role: "client" } : null;
      },
      heartbeat: { heartbeatIntervalMs: 0, staleThresholdMs: 0 },
      logger: {
        warn(...args) { loggerEvents.push(["warn", ...args]); },
        error(...args) { loggerEvents.push(["error", ...args]); },
      },
      metrics: {
        increment(name, value, attributes) { metrics.push({ name, value, attributes }); },
        gauge(name, value, attributes) { metrics.push({ name, value, attributes }); },
      },
    });
    engine.register("echo-pu05", (ctx, msg) => ctx.reply({ type: "echo-pu05", value: msg.value }));
    engine.attach(httpServer);
    upstreamPort = await listen(httpServer);
    engine.start();
    backend = { engine, httpServer };
  }

  async function stopBackend() {
    if (!backend) return;
    const current = backend;
    // Readiness must fail while backend is down even if TLS proxy is still alive.
    upstreamPort = null;
    await current.engine.stop();
    await closeServer(current.httpServer);
    backend = null;
  }

  function rejectUpgrade(socket, status, message) {
    if (!socket.destroyed) socket.end(
      "HTTP/1.1 " + status + " " + message +
      "\r\nConnection: close\r\nContent-Length: 0\r\n\r\n",
    );
  }

  proxy = createHttpsServer({ key: tls.key, cert: tls.cert }, (req, res) => {
    if (req.url === "/health") {
      res.writeHead(200, { "content-type": "text/plain" });
      res.end("proxy-live");
      return;
    }
    if (req.url !== "/ready") {
      res.writeHead(404);
      res.end();
      return;
    }
    if (upstreamPort === null) {
      res.writeHead(503);
      res.end("backend-unavailable");
      return;
    }
    const probe = httpGet({
      host: "127.0.0.1", port: upstreamPort, path: "/internal-ready",
      timeout: 600,
    }, (upstreamResponse) => {
      upstreamResponse.resume();
      upstreamResponse.once("end", () => {
        res.writeHead(upstreamResponse.statusCode === 200 ? 200 : 503);
        res.end();
      });
    });
    probe.on("error", () => {
      if (!res.headersSent) { res.writeHead(503); res.end(); }
    });
    probe.on("timeout", () => probe.destroy(new Error("backend probe timeout")));
  });

  proxy.on("upgrade", (req, clientSocket, head) => {
    if (new URL(req.url, "https://localhost").pathname !== "/socket") {
      rejectUpgrade(clientSocket, 404, "Not Found");
      return;
    }
    if (upstreamPort === null) {
      rejectUpgrade(clientSocket, 503, "Service Unavailable");
      return;
    }
    const upstream = net.createConnection({ host: "127.0.0.1", port: upstreamPort });
    let connected = false;
    upstream.once("connect", () => {
      connected = true;
      const headers = { ...req.headers };
      for (const name of Object.keys(headers)) {
        if (name.startsWith("x-forwarded-")) delete headers[name];
      }
      headers.host = "127.0.0.1:" + upstreamPort;
      headers["x-forwarded-proto"] = "https";
      const requestLines = ["GET " + req.url + " HTTP/1.1"];
      for (const [name, value] of Object.entries(headers)) {
        requestLines.push(name + ": " + value);
      }
      upstream.write(requestLines.join("\r\n") + "\r\n\r\n");
      if (head.length > 0) upstream.write(head);
      clientSocket.pipe(upstream).pipe(clientSocket);
    });
    connections.add(clientSocket);
    connections.add(upstream);
    const forget = (socket) => () => connections.delete(socket);
    clientSocket.once("close", forget(clientSocket));
    upstream.once("close", forget(upstream));
    clientSocket.on("error", () => upstream.destroy());
    upstream.on("error", () => {
      if (!connected) rejectUpgrade(clientSocket, 502, "Bad Gateway");
      else clientSocket.destroy();
    });
  });
  const proxyPort = await listen(proxy);
  t.after(async () => {
    for (const socket of wsClients) socket.terminate();
    await stopBackend();
    for (const socket of connections) socket.destroy();
    await closeServer(proxy);
    tls.cleanup();
  });
  await startBackend();
  const wssUrl = "wss://127.0.0.1:" + proxyPort + "/socket";
  return {
    tls, proxyPort, wssUrl, metrics, upgradedHeaders, loggerEvents,
    accepted: async (headers) => {
      const result = await accepted(wssUrl, tls.cert, headers);
      wsClients.add(result.socket);
      return result;
    },
    rejected: (headers, url = wssUrl) => rejectedStatus(url, tls.cert, headers),
    health: (pathName) => getHealth(proxyPort, pathName, tls.cert),
    stopBackend, startBackend,
    connectionCount: () => backend ? backend.engine.connectionManager.size() : 0,
  };
}

test("PU-05 local verified TLS/WSS proxy checks cert, upgrade routing, header trust, auth and metrics", async (t) => {
  const f = await fixture(t);
  assert.equal(await f.health("/health"), 200);
  assert.equal(await f.health("/ready"), 200);
  assert.equal(await f.health("/unknown"), 404);
  const invalidCert = tlsClient(f.wssUrl, undefined, {
    Origin: ORIGIN, "x-auth-token": TOKEN,
  });
  await new Promise((resolve, reject) => {
    invalidCert.once("unexpected-response", () => reject(new Error("TLS validation bypassed")));
    invalidCert.once("open", () => reject(new Error("untrusted cert accepted")));
    invalidCert.once("error", (error) => {
      assert.match(error.message, /certificate|self.signed|verify/i);
      resolve();
    });
  });
  invalidCert.terminate();

  assert.equal(await f.rejected({ Origin: ORIGIN }), 401);
  assert.equal(await f.rejected({ Origin: "https://wrong.example", "x-auth-token": TOKEN }), 403);
  assert.equal(await f.rejected({ Origin: ORIGIN, "x-auth-token": TOKEN },
    "wss://127.0.0.1:" + f.proxyPort + "/unapproved"), 404);

  const client = await f.accepted({
    Origin: ORIGIN, "x-auth-token": TOKEN,
    "x-forwarded-for": "untrusted-spoofed-ip",
    "x-forwarded-proto": "http",
  });
  assert.equal((await client.receive()).type, "connected");
  client.socket.send(JSON.stringify({ type: "echo-pu05", value: "through-tls-proxy" }));
  assert.deepEqual(await client.receive(),
    { type: "echo-pu05", value: "through-tls-proxy" });
  const pong = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("proxied pong timed out")), TIMEOUT_MS);
    client.socket.once("pong", () => { clearTimeout(timer); resolve(); });
  });
  client.socket.ping();
  await pong;
  assert.equal(f.upgradedHeaders.at(-1).forwardedFor, undefined);
  assert.equal(f.upgradedHeaders.at(-1).forwardedProto, "https");
  assert.equal(f.connectionCount(), 1);
  assert.ok(f.metrics.some(({ name }) => name === "ws.upgrades.accepted"));
  assert.ok(f.metrics.some(({ name }) => name === "ws.upgrades.rejected"));
  assert.ok(!JSON.stringify(f.metrics).includes(TOKEN));
  assert.ok(!JSON.stringify(f.loggerEvents).includes(TOKEN));
});

test("PU-05 proxy liveness vs backend readiness, engine drain and WSS reconnect after backend restart", async (t) => {
  const f = await fixture(t);
  const first = await f.accepted({ Origin: ORIGIN, "x-auth-token": TOKEN });
  await first.receive();
  const closed = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("graceful drain did not close client")), TIMEOUT_MS);
    first.socket.once("close", (code) => { clearTimeout(timer); resolve(code); });
  });
  await f.stopBackend();
  assert.equal(await closed, 1001);
  assert.equal(f.connectionCount(), 0);
  assert.equal(await f.health("/health"), 200, "TLS proxy is still alive");
  assert.equal(await f.health("/ready"), 503, "unavailable backend must fail readiness");
  assert.equal(await f.rejected({ Origin: ORIGIN, "x-auth-token": TOKEN }), 503);
  await f.startBackend();
  assert.equal(await f.health("/ready"), 200);
  const second = await f.accepted({ Origin: ORIGIN, "x-auth-token": TOKEN });
  assert.equal((await second.receive()).type, "connected");
  second.socket.send(JSON.stringify({ type: "echo-pu05", value: "reconnected" }));
  assert.deepEqual(await second.receive(),
    { type: "echo-pu05", value: "reconnected" });
  assert.equal(f.connectionCount(), 1);
});
