#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
OUTPUT="${REPO_ROOT}/release/myworkflowext-companion-macos.tar.gz"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --output)
      OUTPUT="$2"
      shift 2
      ;;
    --build)
      (cd "${REPO_ROOT}" && npm run build)
      shift 1
      ;;
    *)
      echo "Unknown arg: $1"
      exit 1
      ;;
  esac
done

SOURCE_COMPANION_DIR="${REPO_ROOT}/dist/companion"
SOURCE_SHARED_DIR="${REPO_ROOT}/dist/src"
if [[ ! -f "${SOURCE_COMPANION_DIR}/src/index.js" ]]; then
  echo "Missing build output: ${SOURCE_COMPANION_DIR}/src/index.js"
  echo "Run: (cd companion && yarn build) or pass --build"
  exit 1
fi

mkdir -p "$(dirname "${OUTPUT}")"

tar -czf "${OUTPUT}" -C "${REPO_ROOT}" \
  dist/companion \
  dist/src \
  scripts/native-host-macos.json \
  scripts/install-macos-manual.sh

echo "Packaged companion to:"
echo "  ${OUTPUT}"
