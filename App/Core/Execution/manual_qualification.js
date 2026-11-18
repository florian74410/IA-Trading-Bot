"use strict";
// Release fingerprints gate native manual mutations; agent permissions stay DENY.
function qualified(root, action) {
  try {
    const Catalog = require("../FunctionRegistry/Control/catalog");
    for (const [engine, name] of [
      ["trading", action],
      ["risk", "risk.manual.authorize"],
      ["firewall", "firewall.status"],
      ["supervisor", "supervisor.chatbot.confirm"],
    ]) {
      const c = Catalog.manifest(root, engine).functions.find(
        (x) => x.id === name,
      );
      if (!c?.verified_handler) return false;
    }
    return true;
  } catch (_) {
    return false;
  }
}
module.exports = { qualified };
