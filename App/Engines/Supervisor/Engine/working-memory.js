"use strict";
// Durable owner/workspace memory. Auth21 authenticates each access; no token or grant is stored here.
const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto"),
  Database = require("better-sqlite3");
const { redactSecrets } = require("../../../Core/Shared/cognitive_text_safety");
const SCHEMA = 2,
  MAX_BYTES = 65536,
  MAX_DEPTH = 8;
const SECRET_KEY =
  /(?:secret|passphrase|password|authorization|api[_-]?key|private[_-]?key|credential|(?:^|[_-])token|agentToken|sessionHash|session_hash|proof|grant)/i;
function key(x) {
  if (
    !x ||
    !/^[a-f0-9]{64}$/.test(x.tenantId || "") ||
    !/^[a-f0-9]{64}$/.test(x.sessionHash || "") ||
    !/^[-A-Za-z0-9_]{1,64}$/.test(x.room || "") ||
    (x.workspaceId !== undefined &&
      !/^[-A-Za-z0-9_]{1,64}$/.test(x.workspaceId))
  )
    throw Error("SUPERVISOR_MEMORY_SCOPE_INVALID");
  return [x.tenantId, x.workspaceId || x.room, x.room];
}
function safeValue(input) {
  let count = 0;
  const active = new Set();
  function visit(v, depth) {
    if (depth > MAX_DEPTH || ++count > 4096)
      throw Error("SUPERVISOR_OBSERVATION_LIMIT");
    if (v === null || typeof v === "boolean") return v;
    if (typeof v === "number") {
      if (!Number.isFinite(v))
        throw Error("SUPERVISOR_OBSERVATION_VALUE_INVALID");
      return v;
    }
    if (typeof v === "string") {
      if (Buffer.byteLength(v) > MAX_BYTES)
        throw Error("SUPERVISOR_OBSERVATION_LIMIT");
      return redactSecrets(v).replace(
        /\b(passphrase|agentToken|sessionHash|session_hash|cp1[_-]?proof)\s*[:=]\s*("[^"]+"|'[^']+'|[^\s,;]+)/gi,
        "$1=[REDACTED]",
      );
    }
    if (
      typeof v !== "object" ||
      active.has(v) ||
      (!Array.isArray(v) &&
        ![Object.prototype, null].includes(Object.getPrototypeOf(v)))
    )
      throw Error("SUPERVISOR_OBSERVATION_VALUE_INVALID");
    active.add(v);
    let out;
    if (Array.isArray(v)) {
      if (v.length > 256) throw Error("SUPERVISOR_OBSERVATION_LIMIT");
      if (
        Object.keys(v).length !== v.length ||
        !v.every((_, i) => Object.hasOwn(v, i))
      )
        throw Error("SUPERVISOR_OBSERVATION_VALUE_INVALID");
      out = v.map((x) => visit(x, depth + 1));
    } else {
      const props = Object.getOwnPropertyDescriptors(v);
      if (Object.keys(props).length > 128)
        throw Error("SUPERVISOR_OBSERVATION_LIMIT");
      out = {};
      for (const [name, p] of Object.entries(props)) {
        if (
          !Object.hasOwn(p, "value") ||
          name.length > 128 ||
          ["__proto__", "constructor", "prototype"].includes(name)
        )
          throw Error("SUPERVISOR_OBSERVATION_VALUE_INVALID");
        out[name] = SECRET_KEY.test(name)
          ? "[REDACTED]"
          : visit(p.value, depth + 1);
      }
    }
    active.delete(v);
    return out;
  }
  const out = visit(input, 0);
  if (Buffer.byteLength(JSON.stringify(out)) > MAX_BYTES)
    throw Error("SUPERVISOR_OBSERVATION_LIMIT");
  return out;
}
function defaultTtl(engine, command) {
  if (/(?:registry|capabilities|constraints|providers|catalog)/.test(command))
    return 300000;
  if (/(?:price|ticker|book|candles|microstructure)/.test(command)) return 5000;
  if (/health|status/.test(command)) return 15000;
  return 30000;
}
function label(v, max = 96) {
  return (
    typeof v === "string" && v.length <= max && /^[a-zA-Z0-9_.:/-]+$/.test(v)
  );
}
class WorkingMemory {
  constructor({ root, filename, now = Date.now } = {}) {
    if (!root && !filename) throw Error("SUPERVISOR_MEMORY_PATH_REQUIRED");
    this.now = now;
    this.file =
      filename ||
      path.join(
        process.env.IATB_RUNTIME_ROOT || path.join(root, ".runtime"),
        "supervisor-engine",
        "working.sqlite",
      );
    if (this.file === ":memory:" && process.env.NODE_ENV === "production")
      throw Error("SUPERVISOR_MEMORY_PATH_REQUIRED");
    if (this.file !== ":memory:") {
      this.file = path.resolve(this.file);
      const dir = path.dirname(this.file);
      fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
      const ds = fs.lstatSync(dir);
      if (ds.isSymbolicLink() || !ds.isDirectory())
        throw Error("SUPERVISOR_MEMORY_PATH_UNSAFE");
      if (fs.existsSync(this.file)) {
        const st = fs.lstatSync(this.file);
        if (
          !st.isFile() ||
          st.isSymbolicLink() ||
          st.nlink !== 1 ||
          (process.getuid && st.uid !== process.getuid())
        )
          throw Error("SUPERVISOR_MEMORY_PATH_UNSAFE");
      }
      const fd = fs.openSync(
        this.file,
        fs.constants.O_RDWR | fs.constants.O_CREAT | fs.constants.O_NOFOLLOW,
        0o600,
      );
      fs.fchmodSync(fd, 0o600);
      fs.closeSync(fd);
    }
    this.db = new Database(this.file);
    try {
      this.db.pragma("journal_mode=WAL");
      this.db.pragma("synchronous=FULL");
      this.db.pragma("busy_timeout=5000");
      this.db.pragma("foreign_keys=ON");
      this.legacyBackup();
      this.migrate();
    } catch (e) {
      this.db.close();
      throw e;
    }
  }
  legacyBackup() {
    if (
      this.file === ":memory:" ||
      !this.db
        .prepare(
          "SELECT 1 FROM sqlite_master WHERE type='table' AND name='work_sessions'",
        )
        .get()
    )
      return;
    const backup = this.file + ".pre-v2.sqlite";
    if (fs.existsSync(backup)) {
      const st = fs.lstatSync(backup);
      if (!st.isFile() || st.isSymbolicLink() || st.mode & 0o077)
        throw Error("SUPERVISOR_MEMORY_BACKUP_UNSAFE");
      return;
    }
    const fd = fs.openSync(backup, "wx", 0o600);
    fs.closeSync(fd);
    try {
      this.db.prepare("VACUUM INTO ?").run(backup);
      fs.chmodSync(backup, 0o600);
    } catch (e) {
      fs.rmSync(backup, { force: true });
      throw Error("SUPERVISOR_MEMORY_BACKUP_FAILED");
    }
  }
  migrate() {
    const version = this.db.pragma("user_version", { simple: true });
    if (version > SCHEMA) throw Error("SUPERVISOR_MEMORY_SCHEMA_UNSUPPORTED");
    this.db
      .transaction(() => {
        this.db
          .exec(`CREATE TABLE IF NOT EXISTS supervisor_workspaces(tenant TEXT NOT NULL,workspace TEXT NOT NULL,active_objective TEXT,revision INTEGER NOT NULL DEFAULT 0,updated_ms INTEGER NOT NULL,PRIMARY KEY(tenant,workspace));
  CREATE TABLE IF NOT EXISTS supervisor_objectives(id TEXT PRIMARY KEY,tenant TEXT NOT NULL,workspace TEXT NOT NULL,objective TEXT,created_ms INTEGER NOT NULL,FOREIGN KEY(tenant,workspace) REFERENCES supervisor_workspaces(tenant,workspace));
  CREATE TABLE IF NOT EXISTS supervisor_observations(id TEXT PRIMARY KEY,tenant TEXT NOT NULL,workspace TEXT NOT NULL,context TEXT NOT NULL,objective_id TEXT,engine TEXT NOT NULL,command TEXT NOT NULL,status TEXT NOT NULL,value TEXT NOT NULL,contract_hash TEXT,contract_version TEXT,source TEXT NOT NULL,provenance TEXT NOT NULL,observed_ms INTEGER NOT NULL,ttl_ms INTEGER NOT NULL,legacy_type_unknown INTEGER NOT NULL DEFAULT 0,FOREIGN KEY(tenant,workspace) REFERENCES supervisor_workspaces(tenant,workspace));
  CREATE INDEX IF NOT EXISTS supervisor_observation_scope ON supervisor_observations(tenant,workspace,context,observed_ms DESC);
  CREATE TABLE IF NOT EXISTS supervisor_memory_migrations(version INTEGER PRIMARY KEY,applied_ms INTEGER NOT NULL);`);
        if (
          this.db
            .prepare(
              "SELECT 1 FROM sqlite_master WHERE type='table' AND name='work_sessions'",
            )
            .get()
        ) {
          const sessions = this.db
            .prepare("SELECT * FROM work_sessions ORDER BY updated_ms,rowid")
            .all();
          for (const r of sessions) {
            const oid =
                "legacy-" +
                crypto
                  .createHash("sha256")
                  .update(r.tenant + "|" + r.room + "|" + r.session_hash)
                  .digest("hex"),
              objective =
                r.objective === null
                  ? null
                  : String(safeValue(r.objective)).slice(0, 1200);
            this.db
              .prepare(
                "INSERT INTO supervisor_workspaces VALUES(?,?,?,?,?) ON CONFLICT(tenant,workspace) DO UPDATE SET active_objective=excluded.active_objective,revision=supervisor_workspaces.revision+1,updated_ms=excluded.updated_ms",
              )
              .run(r.tenant, r.room, oid, r.revision, r.updated_ms);
            this.db
              .prepare(
                "INSERT OR IGNORE INTO supervisor_objectives VALUES(?,?,?,?,?)",
              )
              .run(oid, r.tenant, r.room, objective, r.updated_ms);
            if (
              this.db
                .prepare(
                  "SELECT 1 FROM sqlite_master WHERE type='table' AND name='work_observations'",
                )
                .get()
            )
              for (const o of this.db
                .prepare(
                  "SELECT * FROM work_observations WHERE tenant=? AND session_hash=? AND room=?",
                )
                .all(r.tenant, r.session_hash, r.room)) {
                let value;
                try {
                  value = safeValue(JSON.parse(o.value));
                } catch (_) {
                  value = "[LEGACY_VALUE_UNAVAILABLE]";
                }
                this.db
                  .prepare(
                    "INSERT OR IGNORE INTO supervisor_observations VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                  )
                  .run(
                    o.id,
                    r.tenant,
                    r.room,
                    r.room,
                    oid,
                    o.engine,
                    o.command,
                    o.status,
                    JSON.stringify(value),
                    /^[a-f0-9]{64}$/.test(o.contract_hash || "")
                      ? o.contract_hash
                      : null,
                    null,
                    "LEGACY_DEV1",
                    "DEV1_SINGLE_DECODE",
                    o.observed_ms,
                    0,
                    1,
                  );
              }
          }
          this.db.exec(
            "DROP TABLE IF EXISTS work_observations; DROP TABLE work_sessions;",
          );
        }
        this.db
          .prepare(
            "INSERT OR IGNORE INTO supervisor_memory_migrations VALUES(?,?)",
          )
          .run(SCHEMA, this.now());
        this.db.pragma("user_version=" + SCHEMA);
      })
      .immediate();
  }
  current(scope) {
    return this.db.transaction(() => this.snapshot(scope))();
  }
  snapshot(scope) {
    const [tenant, workspace, context] = key(scope),
      r = this.db
        .prepare(
          "SELECT * FROM supervisor_workspaces WHERE tenant=? AND workspace=?",
        )
        .get(tenant, workspace),
      objective = r?.active_objective
        ? this.db
            .prepare(
              "SELECT objective FROM supervisor_objectives WHERE id=? AND tenant=?",
            )
            .get(r.active_objective, tenant)?.objective
        : null,
      now = this.now();
    const observations = this.db
      .prepare(
        "SELECT * FROM supervisor_observations WHERE tenant=? AND workspace=? AND context=? AND objective_id IS ? ORDER BY observed_ms DESC,rowid DESC LIMIT 12",
      )
      .all(tenant, workspace, context, r?.active_objective ?? null)
      .map((x) => {
        const age = now - x.observed_ms,
          availability = x.status === "OK" ? "AVAILABLE" : x.status,
          freshness =
            x.status !== "OK" ||
            x.legacy_type_unknown ||
            x.ttl_ms === 0 ||
            age < 0
              ? "UNKNOWN"
              : age >= x.ttl_ms
                ? "STALE"
                : "FRESH";
        return {
          id: x.id,
          engine: x.engine,
          command: x.command,
          status: x.status,
          availability,
          value: JSON.parse(x.value),
          source: x.source,
          provenance: x.provenance,
          contract_hash: x.contract_hash,
          contract_version: x.contract_version,
          observed_ms: x.observed_ms,
          ttl_ms: x.ttl_ms,
          age_ms: Math.max(0, age),
          valid_until_ms: x.ttl_ms ? x.observed_ms + x.ttl_ms : null,
          freshness,
          stale: freshness === "STALE",
          legacy_type_unknown: !!x.legacy_type_unknown,
        };
      })
      .reverse();
    const history = this.db
      .prepare(
        "SELECT id,objective,created_ms FROM supervisor_objectives WHERE tenant=? AND workspace=? ORDER BY created_ms DESC,rowid DESC LIMIT 12",
      )
      .all(tenant, workspace)
      .reverse();
    return {
      schema: "supervisor.working-memory/2.0",
      schema_version: SCHEMA,
      workspace_id: workspace,
      context_id: context,
      objective_id: r?.active_objective ?? null,
      objective: objective ?? null,
      revision: r?.revision ?? 0,
      updated_at: r?.updated_ms ?? null,
      objective_history: history,
      observations,
    };
  }
  setObjective(scope, objective) {
    const [tenant, workspace] = key(scope);
    if (
      typeof objective !== "string" ||
      !objective.trim() ||
      objective.length > 1200
    )
      throw Error("SUPERVISOR_OBJECTIVE_INVALID");
    const text = safeValue(objective.trim()),
      now = this.now();
    this.db
      .transaction(() => {
        const current = this.current(scope);
        if (current.objective === text) return;
        const oid = crypto.randomUUID();
        this.db
          .prepare(
            "INSERT INTO supervisor_workspaces VALUES(?,?,?,1,?) ON CONFLICT(tenant,workspace) DO UPDATE SET active_objective=excluded.active_objective,revision=supervisor_workspaces.revision+1,updated_ms=excluded.updated_ms",
          )
          .run(tenant, workspace, oid, now);
        this.db
          .prepare("INSERT INTO supervisor_objectives VALUES(?,?,?,?,?)")
          .run(oid, tenant, workspace, text, now);
      })
      .immediate();
    return this.current(scope);
  }
  record(
    scope,
    {
      engine,
      command,
      status,
      value,
      contractHash = null,
      contractVersion = null,
      source = "CP1",
      provenance = "AgentEngineGateway",
      ttlMs = defaultTtl(engine, command),
      observedMs = this.now(),
      objectiveId,
    } = {},
  ) {
    const [tenant, workspace, context] = key(scope);
    if (
      !/^[a-z][a-z0-9_-]{0,40}$/.test(engine) ||
      !/^[a-z][a-z0-9_.-]{0,95}$/.test(command) ||
      !["OK", "UNAVAILABLE", "DENIED"].includes(status) ||
      !Number.isSafeInteger(ttlMs) ||
      ttlMs < 0 ||
      ttlMs > 86400000 ||
      !Number.isSafeInteger(observedMs) ||
      observedMs < 0 ||
      !label(source) ||
      !label(provenance, 128) ||
      (contractHash !== null && !/^[a-f0-9]{64}$/.test(contractHash)) ||
      (contractVersion !== null && !label(contractVersion, 64))
    )
      throw Error("SUPERVISOR_OBSERVATION_INVALID");
    const clean = safeValue(value),
      now = this.now();
    this.db
      .transaction(() => {
        this.db
          .prepare(
            "INSERT OR IGNORE INTO supervisor_workspaces VALUES(?,?,NULL,0,?)",
          )
          .run(tenant, workspace, now);
        const current = this.db
          .prepare(
            "SELECT active_objective FROM supervisor_workspaces WHERE tenant=? AND workspace=?",
          )
          .get(tenant, workspace);
        if (
          objectiveId !== undefined &&
          objectiveId !== current.active_objective
        )
          throw Error("SUPERVISOR_OBJECTIVE_CHANGED");
        this.db
          .prepare(
            "INSERT INTO supervisor_observations VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0)",
          )
          .run(
            crypto.randomUUID(),
            tenant,
            workspace,
            context,
            current.active_objective,
            engine,
            command,
            status,
            JSON.stringify(clean),
            contractHash,
            contractVersion,
            source,
            provenance,
            observedMs,
            ttlMs,
          );
        this.db
          .prepare(
            "UPDATE supervisor_workspaces SET revision=revision+1,updated_ms=? WHERE tenant=? AND workspace=?",
          )
          .run(now, tenant, workspace);
        this.db
          .prepare(
            "DELETE FROM supervisor_observations WHERE id IN (SELECT id FROM supervisor_observations WHERE tenant=? AND workspace=? AND context=? ORDER BY observed_ms DESC,rowid DESC LIMIT -1 OFFSET 48)",
          )
          .run(tenant, workspace, context);
      })
      .immediate();
    return this.current(scope);
  }
  workspaces(scope) {
    const [tenant] = key(scope);
    return this.db
      .prepare(
        "SELECT workspace AS workspace_id,active_objective AS objective_id,revision,updated_ms FROM supervisor_workspaces WHERE tenant=? ORDER BY updated_ms DESC LIMIT 100",
      )
      .all(tenant);
  }
  close() {
    this.db.close();
  }
}
module.exports = {
  WorkingMemory,
  key,
  safeValue,
  defaultTtl,
  SCHEMA,
  MAX_BYTES,
  MAX_DEPTH,
};
