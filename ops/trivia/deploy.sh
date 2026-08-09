#!/usr/bin/env bash
set -euo pipefail

if [[ ${EUID:-$(id -u)} -ne 0 ]]; then
  echo "Run as root" >&2
  exit 1
fi

REPO="${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
APP=/opt/ajew-trivia-api
STATE=/var/lib/ajew-trivia
SERVICE=/etc/systemd/system/ajew-trivia-api.service
install -d -m 0755 "$APP"
install -d -o www-data -g www-data -m 0750 "$STATE"
TMP="$(mktemp -d "$APP/.deploy.XXXXXX")"
trap 'rm -rf "$TMP"' EXIT

install -m 0755 "$REPO/ops/trivia/trivia_api.py" "$TMP/trivia_api.py"
install -m 0644 "$REPO/public/data/trivia/questions.json" "$TMP/questions.json"
install -m 0644 "$REPO/ops/trivia/ajew-trivia-api.service" "$TMP/ajew-trivia-api.service"
python3 -m py_compile "$TMP/trivia_api.py"

for f in trivia_api.py questions.json; do
  [[ ! -e "$APP/$f" ]] || cp -a "$APP/$f" "$APP/$f.previous"
done
[[ ! -e "$SERVICE" ]] || cp -a "$SERVICE" "$SERVICE.previous"

rollback() {
  echo "Trivia API deploy failed; restoring previous version" >&2
  for f in trivia_api.py questions.json; do
    if [[ -e "$APP/$f.previous" ]]; then mv -f "$APP/$f.previous" "$APP/$f"; else rm -f "$APP/$f"; fi
  done
  if [[ -e "$SERVICE.previous" ]]; then mv -f "$SERVICE.previous" "$SERVICE"; else rm -f "$SERVICE"; fi
  systemctl daemon-reload
  systemctl restart ajew-trivia-api || true
  exit 1
}

mv -f "$TMP/trivia_api.py" "$APP/trivia_api.py"
mv -f "$TMP/questions.json" "$APP/questions.json"
install -m 0644 "$TMP/ajew-trivia-api.service" "$SERVICE"
systemctl daemon-reload
systemctl restart ajew-trivia-api || rollback

healthy=0
for _ in $(seq 1 30); do
  if python3 -c 'import json,urllib.request; d=json.load(urllib.request.urlopen("http://127.0.0.1:8766/api/trivia/health",timeout=2)); assert d.get("ok") and d.get("questions",0)>1000' 2>/dev/null; then
    healthy=1
    break
  fi
  sleep .2
done
[[ $healthy -eq 1 ]] || rollback

rm -f "$APP/trivia_api.py.previous" "$APP/questions.json.previous" "$SERVICE.previous"
systemctl is-active ajew-trivia-api
systemctl show ajew-trivia-api -p MainPID -p MemoryCurrent -p TasksCurrent --no-pager
echo "Trivia API deployed and healthy"
