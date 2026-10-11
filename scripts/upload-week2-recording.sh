#!/bin/sh
# Upload the film cohort's Session 2 recording to Vercel Blob and print its URL.
# Mirrors upload-week1-recording.sh: pull the production BLOB_READ_WRITE_TOKEN
# into a temp file (deleted afterwards), then put the file as a public Blob with
# a random suffix so the URL is unguessable (the URL is the access key).
#
# The source .mp4 is remuxed with +faststart (moov atom at the front) so it
# streams/scrubs in the browser, if ffmpeg is available; otherwise it uploads
# the source as-is.
#
# Usage: sh scripts/upload-week2-recording.sh "/path/to/session-2.mp4"
set -e
cd "$(dirname "$0")/.."

SRC="$1"
[ -n "$SRC" ] || { echo "Usage: sh scripts/upload-week2-recording.sh <source.mp4>"; exit 1; }
[ -f "$SRC" ] || { echo "Missing source file: $SRC"; exit 1; }

WORK=/tmp/aimg-wk2
mkdir -p "$WORK"
FILE="$WORK/week2-session.mp4"
if command -v ffmpeg >/dev/null 2>&1; then
  echo "Remuxing with +faststart ..."
  ffmpeg -y -i "$SRC" -c copy -movflags +faststart "$FILE" >/dev/null 2>&1
else
  echo "ffmpeg not found — uploading source as-is."
  FILE="$SRC"
fi

TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT
vercel env pull "$TMP" --environment=production --yes >/dev/null 2>&1
BLOB_READ_WRITE_TOKEN="$(sed -n 's/^BLOB_READ_WRITE_TOKEN="\{0,1\}\([^"]*\)"\{0,1\}$/\1/p' "$TMP")"
[ -n "$BLOB_READ_WRITE_TOKEN" ] || { echo "No BLOB_READ_WRITE_TOKEN in production env"; exit 1; }

cd /tmp
vercel blob put "$FILE" --access public \
  --pathname materials/october-2026-film/week-2/session-2-recording.mp4 \
  --add-random-suffix true --content-type video/mp4 \
  --rw-token "$BLOB_READ_WRITE_TOKEN" --non-interactive 2>&1 | tee "$WORK/recording-upload.log"
