"use strict";
// Evidence runner: every mandatory failure is propagated; only JSON/TAP are exported.
const fs = require("node:fs"),
  path = require("node:path"),
  { spawnSync, execFileSync } = require("node:child_process");
const root = path.resolve(__dirname, ".."),
  out = path.resolve(
    process.argv[2] || path.join(root, "../artifacts/supervisor-3.0.1"),
  );
fs.mkdirSync(out, { recursive: true, mode: 0o700 });
let commit = "UNKNOWN";
try {
  commit = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  }).trim();
} catch (_) {}
const reports = [],
  count = (s, k) =>
    Number(s.match(new RegExp("^# " + k + " (\\d+)$", "m"))?.[1] || 0);
function run(name, args, { timeout = 240000, env = {} } = {}) {
  const started = Date.now(),
    r = spawnSync(process.execPath, args, {
      cwd: root,
      env: { ...process.env, ...env },
      encoding: "utf8",
      maxBuffer: 16 * 1024 * 1024,
      timeout,
    });
  const log = (r.stdout || "") + (r.stderr || "");
  fs.writeFileSync(path.join(out, name + ".tap"), log);
  const item = {
    name,
    exit_code: r.status,
    error: r.error?.code || null,
    duration_ms: Date.now() - started,
    tests: count(log, "tests"),
    passed: count(log, "pass"),
    failed: count(log, "fail"),
    skipped: count(log, "skipped"),
    cancelled: count(log, "cancelled"),
    failed_cases: [...log.matchAll(/^not ok \d+ - (.+)$/gm)].map((x) => x[1]),
    cases: [...log.matchAll(/^(ok|not ok) (\d+) - (.+)$/gm)].map((x) => ({
      name: x[3],
      status: x[3].includes("# SKIP")
        ? "SKIP"
        : x[1] === "ok"
          ? "PASS"
          : "FAIL",
    })),
    ok: r.status === 0 && !r.error,
  };
  reports.push(item);
  fs.writeFileSync(
    path.join(out, name + ".json"),
    JSON.stringify(item, null, 2) + "\n",
  );
  console.log(JSON.stringify(item));
}
const testArgs = (files) => [
  "--test",
  "--test-concurrency=1",
  "--test-reporter=tap",
  ...files,
];
run("qualification", ["Tools/qualify_cp1_control.js"]);
run(
  "foundation",
  testArgs([
    "Supervisor/Tests/SupervisorEngine/foundation.test.js",
    "Supervisor/Tests/SupervisorEngine/recovery.test.js",
  ]),
);
run(
  "cognitive",
  testArgs([
    "tests/supervisor-short-term-memory.test.js",
    "tests/supervisor-cognitive-runtime.test.js",
    "tests/supervisor-owner-cognitive-auth.test.js",
    "tests/supervisor-cognitive-network-smoke.js",
  ]),
);
const auth = fs
  .readdirSync(path.join(root, "Tools/Tests"))
  .filter(
    (f) =>
      /^user_management.*\.test\.js$/.test(f) ||
      [
        "auth21_ipc_proof.test.js",
        "auth21_body_digest.test.js",
        "auth21_browser_core_tls_integration.test.js",
        "auth21_service_boundary.test.js",
        "auth21_network_upgrade_lockdown.test.js",
      ].includes(f),
  )
  .map((f) => "Tools/Tests/" + f);
auth.push("Tools/Tests/auth21_real_engines_ingress.test.js");
run("auth21", testArgs(auth));
const validation = JSON.parse(
  fs.readFileSync(
    path.join(root, "Tools/Tests/SupervisorSimulator/validation-suite.json"),
  ),
);
run("regression", testArgs(validation), {
  env: {
    IATB_CP1_BENCHMARK_REPORT: path.join(out, "cp1-benchmark.json"),
    IATB_ORDER_SCENARIO_REPORT: path.join(out, "order-scenarios.json"),
    IATB_SIMULATOR_ENGINE_REPORT: path.join(out, "engine-scenarios.json"),
    IATB_SIMULATOR_OWNER_REPORT: path.join(out, "owner-scenarios.json"),
  },
});
const report = {
  schema: "iatb.supervisor-foundation-validation/1.0",
  version: require("../Core/Shared/build_info").version,
  commit,
  node: process.version,
  generated_at: new Date().toISOString(),
  live_orders: 0,
  paid_ai_calls: 0,
  groups: reports,
  passed: reports.reduce((n, r) => n + r.passed, 0),
  failed: reports.reduce((n, r) => n + r.failed, 0),
  skipped: reports.reduce((n, r) => n + r.skipped, 0),
  mandatory_failures: reports.filter((r) => !r.ok).map((r) => r.name),
  status: reports.every((r) => r.ok) ? "PASS" : "FAIL",
};
fs.writeFileSync(
  path.join(out, "summary.json"),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(JSON.stringify(report));
if (report.status !== "PASS") process.exitCode = 1;
