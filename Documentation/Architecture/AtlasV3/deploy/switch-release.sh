#!/usr/bin/env bash
# IA-TB Architecture only. Does not modify Caddy, Docker or other deployments.
# DRY RUN unless APPLY=1. Dedicated unprivileged account required.
set -Eeuo pipefail
umask 027
BASE="/srv/iatb-architecture"
if [[ "$(id -un)" != "iatb-arch-deploy" ]]; then
  echo "REFUSED: only iatb-arch-deploy may execute this tool" >&2; exit 13
fi
if (( $# != 1 )) || [[ ! -d "$1" ]]; then
  echo "Usage: switch-release.sh /absolute/path/to/validated/dist" >&2; exit 2
fi
SOURCE="$(realpath -e -- "$1")"
if [[ ! -f "$SOURCE/index.html" ]]; then
  echo "REFUSED: no index.html in build output" >&2; exit 2
fi
if [[ "$SOURCE" == "$BASE" || "$SOURCE" == "$BASE/"* ]]; then
  echo "REFUSED: source must come from an isolated staging workspace" >&2; exit 13
fi
if find "$SOURCE" \( -type l -o -type b -o -type c -o -type p -o -type s \) -print -quit | grep -q .; then
  echo "REFUSED: symlink or special file in artifact" >&2; exit 13
fi
if (( $(du -sk -- "$SOURCE" | awk '{print $1}') > 102400 )); then
  echo "REFUSED: artifact exceeds 100 MiB" >&2; exit 13
fi
if [[ ! -d "$BASE/releases" || ! -d "$BASE/staging" ]]; then
  echo "REFUSED: Architecture-only paths not provisioned" >&2; exit 13
fi
HASH="$(sha256sum -- "$SOURCE/index.html" | cut -c1-12)"
TAG="$(date -u +%Y%m%dT%H%M%SZ)-$HASH"
RELEASE="$BASE/releases/$TAG"
echo "Candidate: $TAG"
echo "Source: $SOURCE"
echo "Architecture destination: $RELEASE"
if [[ "$(printenv APPLY || true)" != "1" ]]; then
  echo "DRY-RUN: explicitly set APPLY=1 to publish after review."
  exit 0
fi
if [[ -e "$RELEASE" ]]; then
  echo "REFUSED: release already exists" >&2; exit 13
fi
mkdir -m 0750 -- "$RELEASE"
cp -R -- "$SOURCE/." "$RELEASE/"
find "$RELEASE" -type d -exec chmod 0750 '{}' +
find "$RELEASE" -type f -exec chmod 0640 '{}' +
ln -s -- "releases/$TAG" "$BASE/.current-next"
mv -Tf -- "$BASE/.current-next" "$BASE/current"
echo "Published Architecture release: $TAG"
