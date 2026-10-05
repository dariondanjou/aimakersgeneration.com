#!/bin/sh
# Upload the film cohort's Session 1 recording to Vercel Blob and print its URL.
# Uses the production BLOB_READ_WRITE_TOKEN, pulled into a temp file that is
# deleted afterwards. The recording is the faststart remux in /tmp/aimg-wk1.
# Usage: sh scripts/upload-week1-recording.sh
set -e
cd "$(dirname "$0")/.."
FILE=/tmp/aimg-wk1/week1-session.mp4
[ -f "$FILE" ] || { echo "Missing $FILE"; exit 1; }
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT
vercel env pull "$TMP" --environment=production --yes >/dev/null 2>&1
BLOB_READ_WRITE_TOKEN="$(sed -n 's/^BLOB_READ_WRITE_TOKEN="\{0,1\}\([^"]*\)"\{0,1\}$/\1/p' "$TMP")"
[ -n "$BLOB_READ_WRITE_TOKEN" ] || { echo "No BLOB_READ_WRITE_TOKEN in production env"; exit 1; }
cd /tmp
vercel blob put "$FILE" --access public \
  --pathname materials/october-2026-film/week-1/session-1-recording.mp4 \
  --add-random-suffix true --content-type video/mp4 \
  --rw-token "$BLOB_READ_WRITE_TOKEN" --non-interactive 2>&1 | tee /tmp/aimg-wk1/recording-upload.log
