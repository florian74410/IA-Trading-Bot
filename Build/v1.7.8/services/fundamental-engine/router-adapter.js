/**
 * Router adapter for Fundamental Engine.
 *
 * The Router may dispatch:
 *   { type: "fundamental.analyze", payload: {...} }
 *   { type: "fundamental.health" }
 *
 * Response shape is always normalized.
 */

"use strict";

function createFundamentalRouterAdapter(engine) {
  if (!engine || typeof engine.analyze !== "function") {
    throw new Error("Fundamental Engine instance required");
  }

  return async function handleRouterMessage(message = {}) {
    const type = String(message.type || "");
    const requestId = message.request_id || message.payload?.request_id || null;

    try {
      if (type === "fundamental.health") {
        return {
          ok: true,
          type: "fundamental.health.result",
          request_id: requestId,
          payload: engine.health()
        };
      }

      if (type === "fundamental.analyze") {
        const payload = await engine.analyze({
          ...(message.payload || {}),
          request_id: requestId
        });

        return {
          ok: true,
          type: "fundamental.analysis.result",
          request_id: requestId,
          payload
        };
      }

      return {
        ok: false,
        type: "fundamental.error",
        request_id: requestId,
        error: {
          code: "UNSUPPORTED_MESSAGE",
          message: `Unsupported message type: ${type || "<empty>"}`
        }
      };
    } catch (error) {
      return {
        ok: false,
        type: "fundamental.error",
        request_id: requestId,
        error: {
          code: "FUNDAMENTAL_ENGINE_ERROR",
          message: String(error && error.message || error)
        }
      };
    }
  };
}

module.exports = { createFundamentalRouterAdapter };
