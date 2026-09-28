# DevStation Bridge v0.2

Lightweight local development bridge for IA-TB and future projects.

## Current features
- Node.js built-ins only; no npm install
- localhost-only by default
- dashboard for machine + IA-TB Git state
- structured Git changes (modified/added/deleted/untracked)
- screenshot inbox and automatic `latest.png`
- safe read-only/allowlisted actions
- smoke tests
- automatic repository-root discovery

## Start
```bash
cd tools/DevStation
node test.js
node server.js
```
Dashboard: http://127.0.0.1:8765/

## Screenshot Bridge — macOS
DevStation watches files placed in:
```
tools/DevStation/workspace/screenshots/
```
The newest PNG/JPG/WebP is mirrored as `latest.png` and displayed on the dashboard.

To route macOS screenshots directly there, from the repository root:
```bash
mkdir -p "$PWD/tools/DevStation/workspace/screenshots"
defaults write com.apple.screencapture location "$PWD/tools/DevStation/workspace/screenshots"
killall SystemUIServer
```
Take a screenshot with Cmd-Shift-3 or Cmd-Shift-4, then refresh the dashboard.

To restore Desktop:
```bash
defaults write com.apple.screencapture location "$HOME/Desktop"
killall SystemUIServer
```

## Security
v0.2 binds to 127.0.0.1. Do not expose port 8765 directly to the Internet.
Remote ChatGPT access will be added separately through an authenticated bridge/tunnel with explicit permission levels.

## Next
- CP/1 read-only adapter
- logs/crash collector
- benchmark module
- authenticated remote screenshot/file bridge
- permission-gated DEV/WRITE actions
