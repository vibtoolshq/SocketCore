"use strict";

// PU-06: Offline-only qualification preflight.
// It reads JSON and checks owner-entered fields; it NEVER opens a socket,
// starts a load server, edits an environment, or authorizes a remote test.
const { readFileSync } = require("node:fs");
const path = require("node:path");

const TEMPLATE = path.join(__dirname, "../test/load/pu06-target-template.json");
const REQUIRED_TEXT = [
  "deployment.model",
  "deployment.vpsOs",
  "deployment.nodeVersion",
  "deployment.wssUrl",
  "deployment.tlsTerminator",
  "deployment.proxyOwner",
  "deployment.certificateOwner",
  "deployment.processSupervisor",
  "deployment.credentialMethod",
  "deployment.metricsOwner",
  "deployment.rollbackOwner",
  "deployment.applicationOwner",
  "ownerApproval.reference",
  "ownerApproval.approver",
  "ownerApproval.date",
];
const POSITIVE_INTEGERS = [
  "deployment.vcpus",
  "workload.clients",
  "workload.rampPerSecond",
  "workload.soakSeconds",
  "workload.requestIntervalSeconds",
  "workload.payloadBytes",
  "workload.broadcastIntervalSeconds",
  "workload.reconnectWaveClients",
  "workload.reconnectWaves",
  "workload.fanoutRecipients",
  "workload.failureRecoveryTrialCount",
];
const POSITIVE_LIMITS = [
  "slo.p95MsMax",
  "slo.p99MsMax",
  "slo.cpuOneCorePercentMax",
  "slo.rssMiBMax",
  "slo.eventLoopLagMeanMsMax",
  "slo.recoverySecondsMax",
];
const RATIOS = [
  "slo.responseSuccessRatioMin",
  "slo.broadcastDeliveryRatioMin",
  "slo.reconnectSuccessRatioMin",
];

function get(obj, dotPath) {
  return dotPath.split(".").reduce(
    (value, key) => value != null && typeof value === "object" ? value[key] : undefined,
    obj,
  );
}

function isPresent(value) {
  return value !== undefined && value !== null && value !== "";
}

function looksUnsafeUrl(raw) {
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "wss:" || url.username || url.password ||
        url.search || url.hash || !host || url.port === "0") return true;
    return host === "localhost" || host === "127.0.0.1" || host === "::1" ||
      host === "[::1]" || host === "0.0.0.0" ||
      host.endsWith(".localhost") || host.endsWith(".local") ||
      host.startsWith("10.") || host.startsWith("192.168.") ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host);
  } catch {
    return true;
  }
}

function hasSensitiveKeys(obj, depth = 0) {
  if (depth > 8 || obj === null || typeof obj !== "object") return false;
  for (const [key, value] of Object.entries(obj)) {
    if (/token|password|secret|api[_-]?key|private[_-]?key|cookie|credentialvalue/i.test(key)) {
      return true;
    }
    if (hasSensitiveKeys(value, depth + 1)) return true;
  }
  return false;
}

function reviewPlan(plan) {
  const missing = new Set();
  const invalid = new Set();
  const item = (key) => get(plan, key);
  if (!plan || typeof plan !== "object" || Array.isArray(plan)) {
    return {
      status: "BLOCKED",
      mayRunLoad: false,
      actualProductionTestPerformed: false,
      missing: [],
      invalid: ["root_object"],
    };
  }
  if (plan.schemaVersion !== 1) invalid.add("schemaVersion");
  for (const key of REQUIRED_TEXT) {
    const value = item(key);
    if (!isPresent(value)) missing.add(key);
    else if (typeof value !== "string" || value.trim() !== value ||
             value.length > 250 || value.trim().length === 0) invalid.add(key);
  }
  if (isPresent(item("deployment.model")) &&
      !["embedded-library", "standalone-hosted"].includes(item("deployment.model"))) {
    invalid.add("deployment.model");
  }
  if (isPresent(item("deployment.wssUrl")) && looksUnsafeUrl(item("deployment.wssUrl"))) {
    invalid.add("deployment.wssUrl");
  }
  if (isPresent(item("deployment.ramGiB")) &&
      item("deployment.ramGiB") !== 4) invalid.add("deployment.ramGiB");
  if (!isPresent(item("deployment.ramGiB"))) missing.add("deployment.ramGiB");
  for (const key of POSITIVE_INTEGERS) {
    const value = item(key);
    if (!isPresent(value)) missing.add(key);
    else if (!Number.isSafeInteger(value) || value <= 0) invalid.add(key);
  }
  for (const key of POSITIVE_LIMITS) {
    const value = item(key);
    if (!isPresent(value)) missing.add(key);
    else if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) invalid.add(key);
  }
  for (const key of RATIOS) {
    const value = item(key);
    if (!isPresent(value)) missing.add(key);
    else if (typeof value !== "number" || !Number.isFinite(value) ||
             value <= 0 || value > 1) invalid.add(key);
  }
  if (!isPresent(item("slo.maxUnexpectedErrors"))) missing.add("slo.maxUnexpectedErrors");
  else if (!Number.isSafeInteger(item("slo.maxUnexpectedErrors")) ||
           item("slo.maxUnexpectedErrors") < 0) invalid.add("slo.maxUnexpectedErrors");
  if (isPresent(item("workload.clients")) &&
      Number.isSafeInteger(item("workload.clients")) &&
      item("workload.clients") < 100) invalid.add("workload.clients");
  if (isPresent(item("workload.reconnectWaveClients")) &&
      isPresent(item("workload.clients")) &&
      item("workload.reconnectWaveClients") > item("workload.clients")) {
    invalid.add("workload.reconnectWaveClients");
  }
  if (isPresent(item("slo.p95MsMax")) && isPresent(item("slo.p99MsMax")) &&
      item("slo.p95MsMax") > item("slo.p99MsMax")) invalid.add("slo.p95MsMax");
  if (isPresent(item("workload.failureScenarios"))) {
    const scenarios = item("workload.failureScenarios");
    if (!Array.isArray(scenarios) || scenarios.length < 3 ||
        scenarios.some((v) => !["backend-restart", "proxy-unavailable", "bad-certificate",
          "reconnect-wave", "slow-client", "backpressure", "auth-failure"].includes(v)) ||
        new Set(scenarios).size !== scenarios.length) invalid.add("workload.failureScenarios");
  } else missing.add("workload.failureScenarios");

  if (hasSensitiveKeys(plan)) invalid.add("sensitive_configuration_keys_forbidden");
  if (!isPresent(plan.reviewState) || plan.reviewState !== "OWNER_APPROVED") {
    missing.add("reviewState_OWNER_APPROVED");
  }

  return {
    // Status READY_FOR_MANUAL_REVIEW is NEVER an authorization to run any target load.
    status: missing.size || invalid.size ? "BLOCKED" : "READY_FOR_MANUAL_REVIEW",
    mayRunLoad: false,
    actualProductionTestPerformed: false,
    missing: [...missing].sort(),
    invalid: [...invalid].sort(),
  };
}

function main(args = process.argv.slice(2)) {
  if (args.length > 2 || (args[0] && args[0] !== "--check") ||
      (args[1] && args[1].startsWith("--"))) {
    process.stderr.write("Usage: node load-test/pu06-preflight.js --check [local-json-path]\n");
    return 64;
  }
  const requested = args[1] ? path.resolve(args[1]) : TEMPLATE;
  let plan;
  try {
    plan = JSON.parse(readFileSync(requested, "utf8"));
  } catch {
    process.stdout.write(JSON.stringify({
      status: "BLOCKED", mayRunLoad: false,
      actualProductionTestPerformed: false, missing: [], invalid: ["plan_read_or_parse_failed"],
    }) + "\n");
    return 2;
  }
  const verdict = reviewPlan(plan);
  process.stdout.write(JSON.stringify(verdict, null, 2) + "\n");
  return verdict.status === "READY_FOR_MANUAL_REVIEW" ? 0 : 2;
}

if (require.main === module) process.exitCode = main();
module.exports = { reviewPlan, main };
