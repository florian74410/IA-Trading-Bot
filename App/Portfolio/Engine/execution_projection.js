"use strict";
// Reuse the existing owner Portfolio namespace; no extra ledger or Engine.
const Owner = require("./owner_portfolio");
function record({ root, store, engine }, event) {
  const owner = event?.metadata?.ownerClientId;
  if (owner !== undefined && !/^CL[A-Za-z0-9_-]{1,64}$/.test(owner))
    throw Error("PORTFOLIO_EVENT_OWNER_INVALID");
  const result = engine.recordEvent(event);
  if (owner) {
    Owner.dispatch({ root, dbPath: store.dbPath })(
      { clientId: owner },
      "portfolio.event.record",
      { event },
    );
    result.owner_recorded = true;
  }
  return result;
}
module.exports = { record };
