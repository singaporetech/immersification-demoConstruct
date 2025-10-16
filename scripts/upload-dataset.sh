#!/usr/bin/env bash
# Upload a dataset .db file to the FastAPI endpoint via curl.
#
# Usage:
#   # 0 args: use default (captures/sofa_partial/datasets/2042-10.db)
#   ./scripts/upload-dataset.sh
#
#   # 1 arg: treat as path_to_db, derive capture_id from filename
#   ./scripts/upload-dataset.sh <path_to_db>
#
# Examples:
#   ./scripts/upload-dataset.sh edgeServer/captures/sofa_partial/datasets/2042-10.db
#
# Notes:
# - Uses -k to allow self-signed TLS certs for https://localhost:8000
# - You can run from anywhere; defaults are resolved from the repo root.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

DEFAULT_DB_PATH="$ROOT_DIR/edgeServer/captures/sofa_partial/datasets/2042-10.db"

arg1="${1-}"

# Determine DB_PATH and CAPTURE_ID based on provided args
DB_PATH=""
CAPTURE_ID=""

if [[ -z "$arg1" ]]; then
  DB_PATH="$DEFAULT_DB_PATH"
else
  # Argument given: treat as DB path and derive capture ID from filename
  DB_PATH="$ROOT_DIR/$arg1"
fi

# Expand ~ and make DB_PATH absolute if needed
DB_PATH="${DB_PATH/#\~/$HOME}"
if [[ "$DB_PATH" != /* ]]; then
  DB_PATH="$(cd "$PWD" && cd "$(dirname "$DB_PATH")" && pwd)/$(basename "$DB_PATH")"
fi

if [[ ! -f "$DB_PATH" ]]; then
  echo "Error: File not found: $DB_PATH" >&2
  exit 66
fi

# Derive capture ID from filename if not explicitly provided or set to 'auto'
base_name="$(basename "$DB_PATH")"
derived_id="${base_name%%-*}"
CAPTURE_ID="$derived_id"

# Validate capture ID is numeric
if [[ ! "$CAPTURE_ID" =~ ^[0-9]+$ ]]; then
  echo "Error: Could not derive a numeric capture ID from filename. Got: '$CAPTURE_ID' from '$(basename "$DB_PATH")'" >&2
  exit 65
fi

HOST="${HOST:-localhost}"
PORT="${PORT:-8000}"
SCHEME="${SCHEME:-https}"
URL="$SCHEME://$HOST:$PORT/uploaddataset/$CAPTURE_ID"

echo "Uploading:"
echo "  DB file     : $DB_PATH"
echo "  Capture ID  : $CAPTURE_ID"
echo "  Endpoint    : $URL"
echo

set -x
curl -k -X POST \
  "$URL" \
  -H "accept: application/json" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@$DB_PATH"
set +x

# Optionally delete the capture directory after upload
CAPTURE_DIR="$ROOT_DIR/edgeServer/captures/$CAPTURE_ID"
if [[ -d "$CAPTURE_DIR" ]]; then
  echo
  read -r -p "Delete capture directory '$CAPTURE_DIR'? [y/N] " reply
  case "$reply" in
    [yY][eE][sS]|[yY])
      # Safety: ensure path is within expected root and CAPTURE_ID is set
      if [[ "$CAPTURE_DIR" == "$ROOT_DIR/edgeServer/captures/"* && -n "$CAPTURE_ID" ]]; then
        echo "Deleting: $CAPTURE_DIR"
        rm -r -- "$CAPTURE_DIR"
      else
        echo "Refusing to delete unexpected path: $CAPTURE_DIR" >&2
        exit 64
      fi
      ;;
    *)
      echo "Skipping delete."
      ;;
  esac
else
  echo "Capture directory not found, skipping delete: $CAPTURE_DIR"
fi
