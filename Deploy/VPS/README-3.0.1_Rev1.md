# IA-TB 3.0.1_Rev1 — Complete Source / VPS Deployment Candidate

**Package revision:** 3.0.1_Rev1
**Runtime code version:** 3.0.1-dev.1 (Supervisor Engine foundation).
**Source:** `fix/iatb-3.0.1-supervisor-foundation`, plus packaging scripts and VPS instructions on this release branch.
**Delivery:** complete application SOURCE, not a preconfigured VPS image.

## What is present

- Core/Auth21, Router CP1, Function Registry, Supervisor Engine 3.0.1 and working memory.
- Supervisor hybrid ChatBot, LOCAL/OpenAI adapters, persistent SQLite workspace memory and CP1 recovery.
- MarketData, Indicators, Fundamental, Liquidity, Strategy, Risk, Portfolio, Firewall and Trading Engines.
- Existing OKX Spot Market manual-confirmation code, persistent histories, migrations and applications UI.
- All tracked source code, templates, tests, workflows and development tools for future maintenance.
- A reproducible SHA-256 source inventory (`BUILD.json`) and archive SHA-256 companion file.

The code reflects all changes *merged into the 3.0.1 foundation branch*, not every feature ever proposed.
**NOT IMPLEMENTED in this branch:** manual OKX Limit, trailing stop, TP/SL, leveraged
positions and advanced multi-order execution. The existing manual order path is
Spot Market only. Do not claim these are delivered.

## What is intentionally NOT inside the archive

- `node_modules/` (install pinned dependencies with `npm ci` on the target).
- VPS OS, Docker images/volumes, persistent private SQLite account data, exchange keys,
  Auth21 master keys, TLS private keys, operator secrets, `.env`.
- Generated TAP/log outputs and duplicated historical validation evidence.
- A running or configured public HTTPS proxy. No public-facing service is activated.

**Important:** The VPS was suspended during development. This release has **NOT**
been executed on the target VPS and has not passed a genuine OKX exchange validation.
A green GitHub Actions qualification is not equivalent to host provisioning.

## Expected VPS prerequisites

1. Debian/Ubuntu x86-64 with Node.js **22.x**, npm, and adequate filesystem space.
2. Existing IA-TB/Auth21 private directory restored from the prior VPS or securely provisioned.
3. Existing private files with correct permissions:
   - `<PRIVATE>/data/Database/clients.sqlite`
   - `<PRIVATE>/data/Security/client_master.key`
   - `<PRIVATE>/tls/localhost.crt`
   - `<PRIVATE>/tls/localhost.key`
4. Control of the existing instance: **stop the old process first**. No scripts in Rev1 remove old data, overwrite an existing private SQLite DB, delete a Docker volume or reinitialize accounts.
5. A TLS reverse proxy or SSH tunnel for access; do not publish internal Engines to the internet.

## Deployment steps (run after mounting/copying ZIP to VPS)

Use a separate directory; *never overwrite the currently active installation in place*:

```bash
mkdir -p "$HOME/iatb-releases/3.0.1_Rev1"
unzip IA-TB-3.0.1_Rev1_FULL-SOURCE_VPS.zip -d "$HOME/iatb-releases/3.0.1_Rev1"
cd "$HOME/iatb-releases/3.0.1_Rev1"

# Pure source checks: do not start financial services.
bash Deploy/VPS/preflight.sh --source-only

# Install pinned native Node dependencies for this VPS architecture.
bash Deploy/VPS/prepare_vps.sh

# Point to EXISTING, backed-up private Auth21 directory (do not copy into ZIP).
export IATB_AUTH21_LOCAL_PRIVATE=/path/to/your/existing/private-auth21
bash Deploy/VPS/preflight.sh
```

After verifying the environment and that the previous services are stopped:

```bash
bash Deploy/VPS/launch_vps.sh
```

The launch wrapper deliberately uses the existing Auth21 SAFE launcher; it starts all
Core/Router/Engines/UI processes and keeps them on loopback with `IATB_TRADING_LIVE=0`
while the target's real trading qualifications remain unverified. That does **not**
remove LIVE functionality from the source code or change account data. It is a
deployment guardrail, not a separately compiled product variant.

Use a tunnel from your desktop:

```bash
ssh -L 8000:127.0.0.1:8000 YOUR_SSH_USER@YOUR_VPS_IP
```

Then browse to `https://localhost:8000` after trusting/validating the actual
TLS certificate. A proper public domain requires an independently reviewed
reverse-proxy, origin and TLS configuration. No unauthenticated public exposure.

## Systemd (optional, after successful manual smoke test)

`Deploy/VPS/iatb-3.0.1-rev1.service.template` is a starting point. Adjust user,
private-path and release directory, then install it under systemd only after the
manual launch passes. Do not enable simultaneous old and new services.

## Verification and rollback

- Verify `BUILD.json` with `python3 Tools/Build/verify_source_bundle.py <ZIP>`
  **before extraction**, from a trusted copy of the verification script.
- Run `node App/Tools_validate_release_version.js` inside extracted source.
- `bash -n Deploy/VPS/*.sh` to check launcher syntax.
- Verify no private SQLite database or secret file is in the archive.
- Back up the current code/configuration/data **before** any promotion.
- The Supervisor memory migration to SQLite v2 creates a private pre-v2 backup
  on first application use; treat it as part of the rollback procedure.
- Rollback: stop the new process; restore the prior code version AND its
  coherent SQLite backup; never mix an older DB with newer WAL/SHM files.
- Re-qualify CP1 after **any source edit**, because source digests determine
  whether a command remains qualified.

## Pending qualification

1. Actual installation on the VPS with its existing private data and TLS identity.
2. Full process health checks for every Engine, not merely `require()` smoke tests.
3. External HTTPS / domain and backup correctness.
4. Real OKX Demo exchange testing before any financial LIVE activation.
5. Feature completion beyond Spot Market and Supervisor foundation.

**This artifact is complete as source, but not a self-provisioning or preauthorized LIVE deployment.**
