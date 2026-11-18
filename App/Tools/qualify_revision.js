"use strict";
// Release evidence is saved outside runtime databases. No real broker is used.
const fs = require("node:fs"),
  path = require("node:path"),
  { spawnSync, execFileSync } = require("node:child_process");
const root = path.resolve(__dirname, ".."),
  out = path.resolve(
    process.argv[2] || path.join(root, "../artifacts/consolidation-validation"),
  );
fs.mkdirSync(out, { recursive: true });
const groups = [];
function run(name, args, env = {}) {
  const r = spawnSync(process.execPath, args, {
      cwd: root,
      env: { ...process.env, ...env },
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
      timeout: 600000,
    }),
    log = (r.stdout || "") + (r.stderr || "");
  fs.writeFileSync(path.join(out, name + ".tap"), log);
  const n = (k) =>
      Number(log.match(new RegExp("^# " + k + " (\\d+)$", "m"))?.[1] || 0),
    g = {
      name,
      ok: r.status === 0 && !r.error,
      exit_code: r.status,
      error: r.error?.code || null,
      tests: n("tests"),
      passed: n("pass"),
      failed: n("fail"),
      skipped: n("skipped"),
    };
  groups.push(g);
  console.log(JSON.stringify(g));
}
run(
  "foundation-runner",
  ["Tools/qualify_supervisor_foundation.js", path.join(out, "foundation")],
  { IATB_ADVANCED_REPORT: path.join(out, "scenarios.json") },
);
run("rev2-unit", [
  "--test",
  "--test-concurrency=1",
  "Core/Execution/advanced_contract.test.js",
  "Engines/Trading/tests/manual_outbox.test.js",
  "Engines/Portfolio/Tests/manual_projection.test.js",
]);
run("layout-unit", ["--test", "Tools/Tests/engines_persistent_layout.test.js", "Core/FunctionRegistry/Tests/release_version.test.js", "Tools/Tests/wallet_generated_width.test.js", "../Tools/Architecture/Rev3/migration.test.js"]);
if (process.env.IATB_REV2_BROWSER === "1") {
  run("companion-legacy-ui", ["Engines/Supervisor/ChatBot/Tests/browser_ui.js"], {
    IATB_UI_REPORT_DIR: path.join(out, "ui-legacy"),
  });
  run("companion-rev2-ui", ["Engines/Supervisor/ChatBot/Tests/browser_rev2.js"], {
    IATB_UI_REPORT_DIR: path.join(out, "ui-rev2"),
  });
}
const scenarios = JSON.parse(
  fs.readFileSync(path.join(out, "scenarios.json"), "utf8"),
).scenarios;
const baseReport = JSON.parse(
    fs.readFileSync(path.join(out, "foundation/summary.json"), "utf8"),
  ),
  unit = groups.filter((g) => ["rev2-unit", "layout-unit"].includes(g.name)).reduce((a,g)=>({passed:a.passed+g.passed,failed:a.failed+g.failed,skipped:a.skipped+g.skipped}),{passed:0,failed:0,skipped:0});
const result = {
  tap_executions: {
    passed: baseReport.passed + unit.passed,
    failed: baseReport.failed + unit.failed,
    skipped: baseReport.skipped + unit.skipped,
    note: "Executions across groups; some files overlap; scenario parent is included.",
  },
  schema: "iatb.revision-qualification/1.0",
  revision: fs.readFileSync(path.join(root,"REVISION"),"utf8").trim(),
  commit: execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  }).trim(),
  node: process.version,
  live_orders: 0,
  paid_ai_calls: 0,
  browser_required: process.env.IATB_REV2_BROWSER === "1",
  groups,
  scenarios: {
    total: scenarios.length,
    passed: scenarios.filter((s) => s.status === "PASS").length,
    failed: scenarios.filter((s) => s.status === "FAIL").length,
  },
  status:
    groups.every((g) => g.ok) &&
    scenarios.length >= 80 &&
    scenarios.every((s) => s.status === "PASS")
      ? "PASS"
      : "FAIL",
};
fs.writeFileSync(
  path.join(out, "summary.json"),
  JSON.stringify(result, null, 2) + "\n",
);
console.log(JSON.stringify(result));
if (result.status !== "PASS") process.exitCode = 1;
