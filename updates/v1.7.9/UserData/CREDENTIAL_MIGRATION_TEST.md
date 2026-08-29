# v1.7.9 Credential/Vault migration test

This file is intentionally small and documents the runtime checks performed by `UserData/core_credential_patch.js` and `UserData/credential_runtime.js`.

Checks:
- OpenAI credential maps to `OPENAI/API_KEY`.
- X credential maps to `X/BEARER_TOKEN`.
- Exchange-style legacy names map to `<EXCHANGE>/<SCOPE>`.
- Existing RSA legacy vault is decrypted only during migration, copied into SQLite Vault, then removed after successful persistence.
- Runtime consumers use the Data Service/Vault bridge; no direct file credential read remains active.
- Auth UI is rendered from the real form with the v1.7.9 artwork as visual panel; no fake static login form replaces the functional controls.
