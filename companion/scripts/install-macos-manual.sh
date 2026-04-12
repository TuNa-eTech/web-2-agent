#!/usr/bin/env bash
set -euo pipefail

EXTENSION_ID=""
INSTALL_DIR="${HOME}/Library/Application Support/MyWorkflowExt/companion"
HOST_DIR="${HOME}/Library/Application Support/Google/Chrome/NativeMessagingHosts"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --extension-id)
      EXTENSION_ID="$2"
      shift 2
      ;;
    --install-dir)
      INSTALL_DIR="$2"
      shift 2
      ;;
    --host-dir)
      HOST_DIR="$2"
      shift 2
      ;;
    *)
      echo "Unknown arg: $1"
      exit 1
      ;;
  esac
done

if [[ -z "${EXTENSION_ID}" ]]; then
  echo "Missing --extension-id"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
SOURCE_COMPANION_DIR="${REPO_ROOT}/dist/companion"
SOURCE_SHARED_DIR="${REPO_ROOT}/dist/src"
HOST_ENTRY_RELATIVE="companion/src/index.js"
HOST_ENTRY="${INSTALL_DIR}/${HOST_ENTRY_RELATIVE}"
HOST_WRAPPER="${INSTALL_DIR}/myworkflowext-companion"

if [[ ! -f "${SOURCE_COMPANION_DIR}/src/index.js" ]]; then
  echo "Missing build output: ${SOURCE_COMPANION_DIR}/src/index.js"
  echo "Run: (cd companion && yarn build)"
  exit 1
fi

NODE_BIN="$(command -v node || true)"
if [[ -z "${NODE_BIN}" ]]; then
  echo "Missing node in PATH while installing companion."
  exit 1
fi

mkdir -p "${INSTALL_DIR}"
mkdir -p "${INSTALL_DIR}/companion" "${INSTALL_DIR}/src"
cp -R "${SOURCE_COMPANION_DIR}/." "${INSTALL_DIR}/companion/"
cp -R "${SOURCE_SHARED_DIR}/." "${INSTALL_DIR}/src/"
chmod +x "${HOST_ENTRY}"

cat > "${HOST_WRAPPER}" <<EOF
#!/bin/bash
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:\${PATH:-}"
exec "${NODE_BIN}" "${HOST_ENTRY}" "\$@"
EOF
chmod +x "${HOST_WRAPPER}"

TEMPLATE="${SCRIPT_DIR}/native-host-macos.json"
MANIFEST_PATH="${HOST_DIR}/com.myworkflowext.native_bridge.json"
mkdir -p "${HOST_DIR}"

ESCAPED_HOST_PATH="$(printf '%s' "${HOST_WRAPPER}" | sed 's/[\\/&]/\\&/g')"
ESCAPED_EXT_ID="$(printf '%s' "${EXTENSION_ID}" | sed 's/[\\/&]/\\&/g')"

sed -e "s/__HOST_PATH__/${ESCAPED_HOST_PATH}/g" \
    -e "s/__EXTENSION_ID__/${ESCAPED_EXT_ID}/g" \
    "${TEMPLATE}" > "${MANIFEST_PATH}"

echo "Installed native host manifest:"
echo "  ${MANIFEST_PATH}"
echo "Host binary:"
echo "  ${HOST_WRAPPER}"
