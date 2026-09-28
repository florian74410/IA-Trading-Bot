# DevStation Bridge v0.1

Lightweight local development bridge for IA-TB and other projects.

## v0.1 goals
- zero npm dependencies (Node.js built-ins only)
- local-only HTTP API by default
- screenshot inbox with latest.png
- machine snapshot (CPU/RAM/load/uptime)
- project adapter for IA-TB
- read-only Git status/log inspection
- controlled command allowlist (no arbitrary shell)
- reports and crash inbox
- compatible with the IA-TB DEBUG philosophy: explicit capabilities, audit, least privilege

## Start
```bash
cd tools/DevStation
node server.js
```
Open http://127.0.0.1:8765/

Optional:
```bash
DEVSTATION_PORT=8765 DEVSTATION_HOST=127.0.0.1 node server.js
```

## API
- GET /api/health
- GET /api/system
- GET /api/screenshots
- GET /api/screenshots/latest
- GET /api/projects
- GET /api/projects/ia-tb/status
- POST /api/actions with {"action":"ia-tb.git-status"}

The first release deliberately binds to localhost and does not expose SSH or a public port.
Remote access should later be provided through an authenticated connector/VPN, never by exposing this service directly.

## Screenshot folder
Drop PNG/JPG/WebP files in `workspace/screenshots/`. The newest image is returned by `/api/screenshots/latest`.

## IA-TB integration
DevStation does not modify IA-TB runtime. It detects the repository root and exposes safe diagnostics. Existing CP/1/Admin Debug modules remain authoritative for IA-TB engine control; a later adapter can call their whitelisted interfaces instead of duplicating them.
