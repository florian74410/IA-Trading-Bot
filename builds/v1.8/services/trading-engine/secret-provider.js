"use strict";
const path = require("path");
const CredentialService = require(path.resolve(__dirname,"../../UserData/credential_service"));

/**
 * Trading Engine credential bridge.
 * Reads credentials only through the UserData local Data Service/Vault.
 * It never opens SQLite and never reads credential files directly.
 */
class SecretProvider {
  constructor(options = {}) {
    this.service = options.service || new CredentialService({root:path.resolve(__dirname,"../..")});
  }
  async get(exchange) {
    return this.service.exchange(String(exchange || "").toUpperCase());
  }
}

module.exports = { SecretProvider };
