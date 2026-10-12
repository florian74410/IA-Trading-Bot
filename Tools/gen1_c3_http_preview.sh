#!/usr/bin/env bash
# Independent C3 HTTP preview; never restarts or modifies the active GEN-1 stack.
set -Eeuo pipefail
SOURCE_REPO="${IATB_SOURCE_REPO:-/opt/iatb/source/IA-Trading-Bot}"
WORK="${IATB_C3_PREVIEW_ROOT:-/home/iatbadmin/iatb-c3-http-preview}"
PROJECT=iatb-c3-http-preview
IMAGE=iatb:c3-http-preview
PORT="${IATB_C3_PREVIEW_PORT:-18080}"
ACTION="${1:-start}"
compose(){ docker compose -p "$PROJECT" -f "$WORK/compose.yml" "$@"; }
case "$ACTION" in
 stop)
   if [[ -f "$WORK/compose.yml" ]]; then compose down; fi
   echo C3_PREVIEW_STOPPED; exit 0;;
 status)
   compose ps; exit 0;;
 start) ;;
 *) echo "Usage: $0 start|status|stop" >&2; exit 2;;
esac
command -v git >/dev/null && command -v docker >/dev/null && command -v python3 >/dev/null
docker compose version >/dev/null
[[ -d "$SOURCE_REPO/.git" ]] || { echo REPOSITORY_NOT_FOUND >&2; exit 2; }
[[ -r "/var/lib/iatb/debug/data/Shared Data/Fundamental/fundamental.db" ]] || { echo 'FUNDAMENTAL_DB_NOT_READABLE: use sudo' >&2; exit 2; }
mkdir -p "$WORK"
if [[ -f "$WORK/compose.yml" ]] && [[ -n "$(compose ps -q)" ]]; then
  echo "C3 preview already running: stop it before rebuilding" >&2; exit 1
fi
mkdir -p "$WORK/src" "$WORK/data/Shared Data/Fundamental" "$WORK/runtime" "$WORK/state" "$WORK/annexes" "$WORK/updates"
git -C "$SOURCE_REPO" fetch origin fix/v2.0.1-debug
git -C "$SOURCE_REPO" archive FETCH_HEAD App | tar -xf - -C "$WORK/src"
python3 - "$WORK/data/Shared Data/Fundamental/fundamental.db" <<'PY'
import pathlib,sqlite3,sys,urllib.parse
src=pathlib.Path("/var/lib/iatb/debug/data/Shared Data/Fundamental/fundamental.db")
dst=pathlib.Path(sys.argv[1])
uri="file:"+urllib.parse.quote(str(src))+"?mode=ro"
with sqlite3.connect(uri,uri=True,timeout=10) as live:
    with sqlite3.connect(str(dst),timeout=10) as snapshot:
        live.backup(snapshot)
        print("C3_SNAPSHOT_PUBLICATIONS:",snapshot.execute("SELECT COUNT(*) FROM raw_items").fetchone()[0])
PY
docker build -t "$IMAGE" -f "$WORK/src/App/Dockerfile.app" "$WORK/src/App"
cat > "$WORK/compose.yml" <<YAML
name: $PROJECT
x-base: &base
  image: $IMAGE
  restart: "no"
  security_opt: ["no-new-privileges:true"]
  environment:
    IATB_RUNTIME_ROOT: /iatb/c3/runtime
    IATB_DATA_ROOT: /iatb/c3/data
    IATB_STATE_ROOT: /iatb/c3/state
    IATB_ANNEX_ROOT: /iatb/c3/annexes
    IATB_UPDATES_ROOT: /iatb/c3/updates
    IATB_AUTH_MODE: disabled
    IATB_TRADING_LIVE: "0"
    ROUTER_PORT: "8021"
    IATB_UI_PORT: "8000"
    CORE_PUBLIC_PORT: "8001"
  volumes:
    - "$WORK/runtime:/iatb/c3/runtime:rw"
    - "$WORK/data:/iatb/c3/data:rw"
    - "$WORK/state:/iatb/c3/state:rw"
    - "$WORK/annexes:/iatb/c3/annexes:rw"
    - "$WORK/updates:/iatb/c3/updates:rw"
services:
  router:
    <<: *base
    command: ["node", "Core/Router/router.js"]
    ports: ["127.0.0.1:$PORT:18080"]
    networks: [c3-private]
  fundamental:
    <<: *base
    command: ["node", "Fundamental/Engine/fundamental_service.js"]
    network_mode: "service:router"
    depends_on: [router]
  ui:
    <<: *base
    command: ["node", "UI/Gateway/ui_service.js"]
    network_mode: "service:router"
    depends_on: [router]
  bridge:
    <<: *base
    command: ["node", "-e", "const net=require('net');net.createServer(c=>{const u=net.connect(8000,'127.0.0.1');c.pipe(u);u.pipe(c);c.on('error',()=>u.destroy());u.on('error',()=>c.destroy())}).listen(18080,'0.0.0.0')"]
    network_mode: "service:router"
    depends_on: [router,ui]
networks:
  c3-private:
    internal: true
YAML
compose up -d
echo "C3_PREVIEW_STARTED; localhost:$PORT on VPS (requires SSH tunnel from Mac)"
echo "SSH: ssh -N -L $PORT:127.0.0.1:$PORT -i ~/.ssh/iatb_gen1_ed25519 iatbadmin@169.58.177.163"
echo "URL: http://127.0.0.1:$PORT/fundamental"
