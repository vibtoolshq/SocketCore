"use strict";

// Read-only npmjs release payload verification. Never publishes or uses credentials.
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
const lock = JSON.parse(readFileSync(path.join(root, "package-lock.json"), "utf8"));
const required = new Set([
  "LICENSE", "README.md", "package.json",
  "engine/index.js", "engine/config.js", "engine/connection-manager.js",
  "engine/message-router.js", "engine/observability.js",
  "docs/ENGINE_API.md", "docs/CONFIGURATION.md", "docs/WEBSOCKET_PROTOCOL.md",
]);

assert.equal(pkg.name, "configurable-websocket-engine");
assert.equal(pkg.version, lock.version);
assert.equal(pkg.name, lock.name);
assert.equal(lock.packages[""].license, "MIT");
assert.equal(pkg.license, "MIT");
assert.equal(pkg.private, undefined, "public package must not be private");
assert.equal(pkg.main, "engine/index.js");
assert.equal(pkg.exports["."], "./engine/index.js");
assert.equal(typeof pkg.repository.url, "string");
assert.ok(pkg.repository.url.includes("github.com/vibtoolshq/SocketCore.git"));
assert.ok(Array.isArray(pkg.files) && pkg.files.length > 0);
const isWindows = process.platform === "win32";
const cmd = isWindows ? (process.env.ComSpec || "cmd.exe") : "npm";
const args = isWindows
  ? ["/d", "/s", "/c", "npm.cmd pack --dry-run --json --ignore-scripts"]
  : ["pack", "--dry-run", "--json", "--ignore-scripts"];
const run = spawnSync(cmd, args, {
  cwd: root, encoding: "utf8", timeout: 45000,
  maxBuffer: 2 * 1024 * 1024,
});
if (run.error || run.status !== 0) {
  process.stderr.write("npm pack dry-run failed; publish was NOT attempted\n");
  process.exit(1);
}
let tarballs;
try {
  tarballs = JSON.parse(run.stdout);
} catch {
  process.stderr.write("Could not parse npm pack --json output\n");
  process.exit(1);
}
assert.equal(tarballs.length, 1);
const packed = tarballs[0];
assert.equal(packed.name, pkg.name);
assert.equal(packed.version, pkg.version);
const observed = new Set(packed.files.map(({ path: file }) => file));
for (const file of required) {
  assert.ok(observed.has(file), "Required public file missing: " + file);
}
for (const file of observed) {
  assert.ok(required.has(file), "Unexpected public npm package file: " + file);
  assert.ok(!/(^|\/)(?:\.github|\.vscode|notes|project|test|scripts|node_modules)(\/|$)/.test(file),
    "Internal-only file unexpectedly packed: " + file);
}
assert.equal(observed.size, required.size);
process.stdout.write(JSON.stringify({
  verification: "PASS", name: packed.name, version: packed.version,
  packedFiles: [...observed].sort(), packedSizeBytes: packed.size,
  dryRunOnly: true, published: false,
}, null, 2) + "\n");
