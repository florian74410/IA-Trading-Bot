
"use strict";

function ensureLive(ctx) {
  if (!ctx.liveExecutionEnabled) {
    const e = new Error("Live execution is disabled");
    e.code = "LIVE_EXECUTION_DISABLED";
    throw e;
  }
}

function statusFromHttp(code) {
  return code >= 200 && code < 300;
}

function asError(body, fallback) {
  if (!body) return fallback;
  if (typeof body === "string") return body;
  return body.msg || body.message || body.error || fallback;
}

module.exports = { ensureLive, statusFromHttp, asError };
