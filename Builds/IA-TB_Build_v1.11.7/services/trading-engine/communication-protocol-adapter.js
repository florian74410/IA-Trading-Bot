
"use strict";

function responseEnvelope(message, type, payload, ok = true, error = null) {
  return {
    protocol: message.protocol || "COMMUNICATION_PROTOCOL_v1",
    version: message.version || 1,
    id: message.id || message.request_id || null,
    request_id: message.request_id || message.id || null,
    source: "TRADING_ENGINE",
    target: message.source || "ROUTER",
    type,
    timestamp: Date.now(),
    ok,
    payload: payload || null,
    error
  };
}

function createTradingProtocolAdapter(engine) {
  return async function handle(message = {}) {
    const type = String(message.type || "").toLowerCase();

    try {
      if (type === "trading.health") {
        return responseEnvelope(message, "trading.health.result", engine.health());
      }

      if (type === "trading.capabilities") {
        const exchange = message.payload && message.payload.exchange;
        return responseEnvelope(message, "trading.capabilities.result", {
          exchange,
          capabilities: engine.capabilities(exchange)
        });
      }

      if (type === "trading.execute") {
        const intent = {
          ...(message.payload || {}),
          request_id: message.request_id || message.id || message.payload?.request_id
        };
        const result = await engine.execute(intent);
        return responseEnvelope(message, "trading.execution.result", result, result.ok);
      }

      return responseEnvelope(
        message,
        "trading.error",
        null,
        false,
        { code: "UNSUPPORTED_MESSAGE", message: `Unsupported message type: ${message.type || "<empty>"}` }
      );
    } catch (err) {
      return responseEnvelope(
        message,
        "trading.error",
        null,
        false,
        { code: "TRADING_ENGINE_ERROR", message: String(err && err.message || err) }
      );
    }
  };
}

module.exports = { createTradingProtocolAdapter };
