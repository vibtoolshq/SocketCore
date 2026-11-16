"use strict";

// PU-06: pure configuration acceptance. These tests never open network sockets.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { reviewPlan } = require("../../load-test/pu06-preflight");

const templatePath = path.join(__dirname, "pu06-target-template.json");
const scriptPath = path.join(__dirname, "../../load-test/pu06-preflight.js");
function draft() { return JSON.parse(readFileSync(templatePath, "utf8")); }

function syntheticComplete() {
  // Synthetic fixture values, not real operator choices or approved SLOs.
  const plan = draft();
  plan.reviewState = "OWNER_APPROVED";
  plan.deployment = {
    model: "embedded-library",
    vpsOs: "synthetic-linux-fixture",
    nodeVersion: "24",
    wssUrl: "wss://fixture.example/socket",
    ramGiB: 4,
    vcpus: 2,
    tlsTerminator: "synthetic-proxy",
    proxyOwner: "fixture-operator",
    certificateOwner: "fixture-operator",
    processSupervisor: "fixture-supervisor",
    credentialMethod: "fixture-credential",
    metricsOwner: "fixture-monitor",
    rollbackOwner: "fixture-operator",
    applicationOwner: "fixture-app",
  };
  plan.workload = {
    clients: 100,
    rampPerSecond: 20,
    soakSeconds: 60,
    requestIntervalSeconds: 10,
    payloadBytes: 1024,
    broadcastIntervalSeconds: 10,
    reconnectWaveClients: 25,
    reconnectWaves: 2,
    fanoutRecipients: 100,
    failureRecoveryTrialCount: 2,
    failureScenarios: ["backend-restart", "reconnect-wave", "backpressure"],
  };
  plan.slo = {
    responseSuccessRatioMin: 0.99,
    broadcastDeliveryRatioMin: 0.99,
    reconnectSuccessRatioMin: 0.99,
    p95MsMax: 200,
    p99MsMax: 600,
    cpuOneCorePercentMax: 170,
    rssMiBMax: 512,
    eventLoopLagMeanMsMax: 100,
    recoverySecondsMax: 30,
    maxUnexpectedErrors: 0,
  };
  plan.ownerApproval = {
    reference: "UNIT-TEST-ONLY",
    approver: "fixture",
    date: "2026-11-17",
  };
  return plan;
}

test("PU-06 real unapproved target template blocks all remote work and lists D-02/05/06/07/10 fields", () => {
  const report = reviewPlan(draft());
  assert.equal(report.status, "BLOCKED");
  assert.equal(report.mayRunLoad, false);
  assert.equal(report.actualProductionTestPerformed, false);
  assert.equal(report.invalid.length, 0);
  for (const name of [
    "deployment.model", "deployment.wssUrl", "deployment.ramGiB",
    "deployment.metricsOwner", "workload.clients",
    "workload.payloadBytes", "workload.failureScenarios",
    "slo.p95MsMax", "slo.p99MsMax", "slo.rssMiBMax",
    "slo.cpuOneCorePercentMax", "ownerApproval.reference",
    "reviewState_OWNER_APPROVED",
  ]) assert.ok(report.missing.includes(name), name);
});

test("PU-06 fully populated synthetic fixture only becomes reviewable, never executable", () => {
  const report = reviewPlan(syntheticComplete());
  assert.deepEqual(report.missing, []);
  assert.deepEqual(report.invalid, []);
  assert.equal(report.status, "READY_FOR_MANUAL_REVIEW");
  assert.equal(report.mayRunLoad, false);
  assert.equal(report.actualProductionTestPerformed, false);
  const unapproved = syntheticComplete();
  unapproved.reviewState = "DRAFT_UNAPPROVED";
  assert.equal(reviewPlan(unapproved).status, "BLOCKED");
});

test("PU-06 rejects plaintext or local WSS and secrets in target plan without leaking values", () => {
  for (const wssUrl of [
    "ws://fixture.example/socket",
    "wss://localhost/socket",
    "wss://127.0.0.1/socket",
    "wss://user:pass@fixture.example/socket",
    "wss://fixture.example/socket?token=hidden",
    "wss://10.0.0.1/socket",
  ]) {
    const plan = syntheticComplete();
    plan.deployment.wssUrl = wssUrl;
    const result = reviewPlan(plan);
    assert.equal(result.status, "BLOCKED");
    assert.ok(result.invalid.includes("deployment.wssUrl"));
    assert.ok(!JSON.stringify(result).includes(wssUrl));
  }
  const plan = syntheticComplete();
  plan.clientSecret = "never-log-this-secret";
  const result = reviewPlan(plan);
  assert.ok(result.invalid.includes("sensitive_configuration_keys_forbidden"));
  assert.ok(!JSON.stringify(result).includes("never-log-this-secret"));
});

test("PU-06 refuses malformed workload, incomparable SLOs and wrong 4 GiB host budget", () => {
  const plan = syntheticComplete();
  plan.deployment.ramGiB = 8;
  plan.workload.clients = 0;
  plan.workload.reconnectWaveClients = 1000;
  plan.workload.failureScenarios = ["backend-restart", "backend-restart"];
  plan.slo.p95MsMax = 800;
  plan.slo.p99MsMax = 50;
  plan.slo.responseSuccessRatioMin = 1.4;
  plan.slo.rssMiBMax = -1;
  const verdict = reviewPlan(plan);
  for (const field of [
    "deployment.ramGiB", "workload.clients",
    "workload.reconnectWaveClients", "workload.failureScenarios",
    "slo.p95MsMax", "slo.responseSuccessRatioMin", "slo.rssMiBMax",
  ]) assert.ok(verdict.invalid.includes(field), field);
  assert.equal(verdict.status, "BLOCKED");
  assert.equal(verdict.mayRunLoad, false);
});

test("PU-06 CLI is a fail-closed offline preflight and never contacts a target", () => {
  const result = spawnSync(process.execPath, [
    scriptPath, "--check", templatePath,
  ], { encoding: "utf8", timeout: 5000 });
  assert.equal(result.status, 2);
  assert.equal(result.stderr.trim(), "");
  const report = JSON.parse(result.stdout);
  assert.equal(report.status, "BLOCKED");
  assert.equal(report.mayRunLoad, false);
  assert.equal(report.actualProductionTestPerformed, false);
  assert.ok(report.missing.includes("deployment.wssUrl"));
});

test("PU-06 missing/broken file or invalid argument fails closed without secrets", () => {
  const result = spawnSync(process.execPath, [scriptPath, "--check",
    path.join(__dirname, "does-not-exist.json"),
  ], { encoding: "utf8", timeout: 5000 });
  assert.equal(result.status, 2);
  assert.deepEqual(JSON.parse(result.stdout).invalid, ["plan_read_or_parse_failed"]);
  const usage = spawnSync(process.execPath, [scriptPath, "--run-load"], {
    encoding: "utf8", timeout: 5000,
  });
  assert.equal(usage.status, 64);
  assert.match(usage.stderr, /Usage:/);
});
