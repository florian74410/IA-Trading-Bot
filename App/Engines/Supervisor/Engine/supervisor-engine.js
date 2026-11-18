"use strict";
// Supervisor Engine 3.0-dev.1: durable working context + authorized CP1 observations.
// No secondary Supervisor service, autonomous agent spawn, shell or financial mutation.
const crypto = require("node:crypto");
const { tenantOf, memorySession } = require("../CognitiveRuntime");
const { WorkingMemory, safeValue } = require("./working-memory");
const READ_COMMANDS = new Set([
  "marketdata.health",
  "marketdata.providers",
  "trading.health",
  "trading.capabilities",
  "risk.status",
  "risk.constraints.get",
  "portfolio.health",
  "strategy.health",
  "fundamental.health",
  "fundamental.summary",
  "liquidity.health",
  "liquidity.capabilities",
  "firewall.status",
  "supervisor.status",
]);
function scope(auth, room, workspaceId) {
  const tenantId = tenantOf(auth);
  if (!/^[a-f0-9]{64}$/.test(auth.sessionHash || ""))
    throw Error("SUPERVISOR_SESSION_REQUIRED");
  if (!/^[-A-Za-z0-9_]{1,64}$/.test(room || ""))
    throw Error("SUPERVISOR_ROOM_INVALID");
  return {
    tenantId,
    sessionHash: auth.sessionHash,
    room,
    ...(workspaceId ? { workspaceId } : {}),
  };
}
function safeError(e) {
  const message = String(e?.message || "");
  return /^(PERMISSION_DENIED|COMMAND_UNAVAILABLE|ENGINE_UNAVAILABLE|SESSION_SCOPE_DENIED|AGENT_SESSION_REVOKED|COMMAND_UNKNOWN|CP_ROUTER_TIMEOUT|CONTROL_ARGUMENT_INVALID)$/.test(
    message,
  )
    ? message
    : "CP1_OBSERVATION_UNAVAILABLE";
}
class SupervisorEngine {
  constructor({ root, memory, cognitive } = {}) {
    this.memory = memory || new WorkingMemory({ root });
    this.cognitive = cognitive || null;
  }
  context(input = {}, auth) {
    const room = input.room || "default",
      s = scope(auth, room, input.workspace_id),
      working = this.memory.current(s);
    const cognitive = this.cognitive?.();
    const history = cognitive
      ? cognitive.short.history({
          tenantId: s.tenantId,
          sessionId: memorySession({
            sessionId: room,
            workspace_id: input.workspace_id,
          }),
          limit: 8,
        })
      : [];
    const self = cognitive ? cognitive.long.readSelf("supervisor") : "";
    return {
      schema: "supervisor.engine.context/1.0",
      version: "3.0.1-dev.1",
      execution: "NONE",
      working,
      identity_summary: self,
      conversation: history,
      workspaces: this.memory.workspaces(s),
      freshness: {
        fresh: working.observations.filter((x) => x.freshness === "FRESH")
          .length,
        stale: working.observations.filter((x) => x.freshness === "STALE")
          .length,
        unknown: working.observations.filter((x) => x.freshness === "UNKNOWN")
          .length,
      },
      cp1: "GATEWAY_REQUIRED_FOR_COMMANDS",
    };
  }
  objective(input = {}, auth) {
    const room = input.room || "default",
      s = scope(auth, room, input.workspace_id);
    this.memory.setObjective(s, input.objective);
    return this.context({ room, workspace_id: input.workspace_id }, auth);
  }
  async discover(input = {}, auth, gateway = null) {
    if (input.recover === true)
      return this.recover({ ...input, recover: false }, auth, gateway);
    const context = this.context(input, auth);
    if (!gateway)
      return { ...context, cp1: "UNAVAILABLE", engines: [], commands: [] };
    try {
      const [engines, commands] = await Promise.all([
        gateway.list_available_engines(),
        gateway.list_available_commands(),
      ]);
      return {
        ...context,
        cp1: "CONNECTED",
        engines: engines.map((x) => ({ id: x.id, online: x.online })),
        commands: commands
          .filter((x) => READ_COMMANDS.has(x.id))
          .map((x) => ({
            engine: x.engine,
            id: x.id,
            online: x.online,
            decision: x.decision,
            qualified:
              x.contract?.agent_qualified === true &&
              x.contract?.verified_handler === true &&
              !x.contract?.hard_deny,
          })),
      };
    } catch (e) {
      return {
        ...context,
        cp1: "UNAVAILABLE",
        error: safeError(e),
        engines: [],
        commands: [],
      };
    }
  }
  async observe(input = {}, auth, gateway = null) {
    const room = input.room || "default",
      s = scope(auth, room, input.workspace_id);
    const engine = input.engine,
      command = input.command;
    if (
      typeof engine !== "string" ||
      typeof command !== "string" ||
      !READ_COMMANDS.has(command) ||
      !command.startsWith(engine + ".")
    )
      throw Error("SUPERVISOR_COMMAND_NOT_ALLOWED");
    if (!gateway) {
      this.memory.record(s, {
        engine,
        command,
        status: "UNAVAILABLE",
        value: "AGENT_GATEWAY_UNAVAILABLE",
      });
      return {
        status: "UNAVAILABLE",
        error: "AGENT_GATEWAY_UNAVAILABLE",
        context: this.context({ room, workspace_id: input.workspace_id }, auth),
      };
    }
    const objectiveId = this.memory.current(s).objective_id;
    let contract;
    try {
      contract = await gateway.describe_command(engine, command);
      if (
        contract.decision !== "ALLOW" ||
        contract.online !== true ||
        contract.contract?.verified_handler !== true ||
        contract.contract?.agent_qualified !== true ||
        contract.contract?.hard_deny ||
        contract.contract?.side_effects === true
      )
        throw Error("PERMISSION_DENIED");
      const response = await gateway.execute_authorized_command(
        engine,
        command,
        {},
        { request_id: crypto.randomUUID() },
      );
      if (response?.status && response.status !== "OK")
        throw Error("ENGINE_UNAVAILABLE");
      const result = safeValue(
        response && Object.hasOwn(response, "data") ? response.data : response,
      );
      this.memory.record(s, {
        engine,
        command,
        status: "OK",
        value: result,
        contractHash: contract.contract_hash || null,
        contractVersion: contract.contract?.contract_version || null,
        objectiveId,
      });
      return {
        status: "OK",
        engine,
        command,
        result,
        context: this.context({ room, workspace_id: input.workspace_id }, auth),
      };
    } catch (e) {
      if (e.message === "SUPERVISOR_OBJECTIVE_CHANGED")
        return {
          status: "UNAVAILABLE",
          error: e.message,
          context: this.context(
            { room, workspace_id: input.workspace_id },
            auth,
          ),
        };
      const error = safeError(e),
        status = error === "PERMISSION_DENIED" ? "DENIED" : "UNAVAILABLE";
      this.memory.record(s, {
        engine,
        command,
        status,
        value: error,
        contractHash: contract?.contract_hash || null,
        contractVersion: contract?.contract?.contract_version || null,
        objectiveId,
      });
      return {
        status,
        error,
        engine,
        command,
        context: this.context({ room, workspace_id: input.workspace_id }, auth),
      };
    }
  }
  async recover(input = {}, auth, gateway = null) {
    const room = input.room || "default",
      s = scope(auth, room, input.workspace_id),
      before = this.memory.current(s),
      discovery = await this.discover(
        { ...input, recover: false },
        auth,
        gateway,
      ),
      refreshed = [];
    if (discovery.cp1 === "CONNECTED") {
      const targets = new Map();
      for (const o of before.observations)
        if (o.freshness !== "FRESH" && READ_COMMANDS.has(o.command))
          targets.set(o.engine + ":" + o.command, o);
      for (const o of targets.values()) {
        if (this.memory.current(s).objective_id !== before.objective_id) break;
        refreshed.push(
          await this.observe(
            {
              room,
              workspace_id: input.workspace_id,
              engine: o.engine,
              command: o.command,
            },
            auth,
            gateway,
          ),
        );
      }
    }
    const context = this.context(
      { room, workspace_id: input.workspace_id },
      auth,
    );
    return {
      ...context,
      cp1: discovery.cp1,
      engines: discovery.engines,
      commands: discovery.commands,
      recovery: {
        objective_restored: context.working.objective !== null,
        attempted: refreshed.length,
        refreshed: refreshed.filter((x) => x.status === "OK").length,
        unavailable: refreshed
          .filter((x) => x.status !== "OK")
          .map((x) => ({
            engine: x.engine,
            command: x.command,
            status: x.status,
            error: x.error,
          })),
        current_data_only: context.working.observations
          .filter((x) => x.freshness === "FRESH")
          .map((x) => x.id),
      },
    };
  }
  close() {
    this.memory.close();
  }
}
module.exports = { SupervisorEngine, READ_COMMANDS };
