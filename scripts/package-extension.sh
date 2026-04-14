#!/usr/bin/env bash
# ─────────────────────────────────────────────
#  package-extension.sh
#  Build và đóng gói Chrome extension thành ZIP
#  Usage: ./scripts/package-extension.sh [--skip-build]
# ─────────────────────────────────────────────

set -euo pipefail

# ── Colors ────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# ── Helpers ───────────────────────────────────
info()    { echo -e "${BLUE}ℹ${NC}  $*"; }
success() { echo -e "${GREEN}✔${NC}  $*"; }
warn()    { echo -e "${YELLOW}⚠${NC}  $*"; }
error()   { echo -e "${RED}✖${NC}  $*" >&2; exit 1; }
step()    { echo -e "\n${BOLD}▶ $*${NC}"; }

# ── Config ────────────────────────────────────
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="$ROOT_DIR/dist"
RELEASES_DIR="$ROOT_DIR/releases"
MANIFEST_CONFIG="$ROOT_DIR/manifest.config.ts"
SKIP_BUILD=false

# ── Parse args ────────────────────────────────
for arg in "$@"; do
  case $arg in
    --skip-build) SKIP_BUILD=true ;;
    --help|-h)
      echo "Usage: $0 [--skip-build]"
      echo "  --skip-build  Bỏ qua bước build, dùng dist/ hiện tại"
      exit 0
      ;;
    *) warn "Unknown argument: $arg" ;;
  esac
done

# ── Get version from manifest.config.ts ───────
get_version() {
  grep -v 'manifest_version' "$MANIFEST_CONFIG" \
    | grep 'version:' \
    | head -1 \
    | tr -d '\r' \
    | awk -F'"' '{print $2}'
}

VERSION=$(get_version)
if [[ -z "$VERSION" ]]; then
  error "Không đọc được version từ manifest.config.ts"
fi

OUTPUT_NAME="my-workflow-ext-v${VERSION}.zip"
OUTPUT_PATH="$RELEASES_DIR/$OUTPUT_NAME"

# ── Banner ────────────────────────────────────
echo -e "${BOLD}"
echo "  ╔═══════════════════════════════════╗"
echo "  ║   Chrome Extension Packager       ║"
echo "  ╚═══════════════════════════════════╝"
echo -e "${NC}"
info "Version:  ${BOLD}$VERSION${NC}"
info "Output:   ${BOLD}$OUTPUT_PATH${NC}"

# ── Step 1: Build ─────────────────────────────
if [[ "$SKIP_BUILD" == false ]]; then
  step "Building extension..."
  cd "$ROOT_DIR"
  npm run build || error "Build thất bại"
  success "Build hoàn thành"
else
  warn "Bỏ qua bước build (--skip-build)"
fi

# ── Step 2: Validate dist/ ────────────────────
step "Kiểm tra dist/..."
[[ -d "$DIST_DIR" ]] || error "Thư mục dist/ không tồn tại. Hãy chạy không có --skip-build"

MANIFEST_IN_DIST="$DIST_DIR/manifest.json"
[[ -f "$MANIFEST_IN_DIST" ]] || error "manifest.json không có trong dist/"

# Verify version match
DIST_VERSION=$(grep '"version"' "$MANIFEST_IN_DIST" | grep -v 'manifest_version' | head -1 | tr -d '\r' | awk -F'"' '{print $4}')
if [[ "$DIST_VERSION" != "$VERSION" ]]; then
  warn "Version trong dist/manifest.json ($DIST_VERSION) khác với manifest.config.ts ($VERSION)"
fi

success "dist/ hợp lệ (manifest.json ✔)"

# ── Step 3: Create releases/ dir ─────────────
mkdir -p "$RELEASES_DIR"

# ── Step 4: Create ZIP ────────────────────────
step "Tạo file ZIP..."

# Remove existing zip nếu có
[[ -f "$OUTPUT_PATH" ]] && { rm "$OUTPUT_PATH"; warn "Đã xóa bản ZIP cũ"; }

# Remove "key" field from manifest.json (not allowed in Chrome Web Store)
MANIFEST_JSON="$DIST_DIR/manifest.json"
MANIFEST_BACKUP="$DIST_DIR/manifest.json.bak"

if grep -q '"key"' "$MANIFEST_JSON" 2>/dev/null; then
  cp "$MANIFEST_JSON" "$MANIFEST_BACKUP"
  python3 -c "
import json, sys
with open('$MANIFEST_JSON', 'r') as f:
    m = json.load(f)
m.pop('key', None)
with open('$MANIFEST_JSON', 'w') as f:
    json.dump(m, f, indent=2, ensure_ascii=False)
"
  warn "Đã xóa field 'key' khỏi manifest.json (không được phép trên Store)"
fi

cd "$DIST_DIR"
zip -r "$OUTPUT_PATH" . \
  --exclude "*.map" \
  --exclude "*.DS_Store" \
  --exclude "__MACOSX/*" \
  --exclude "*.bak" \
  -q

# Restore manifest.json gốc
if [[ -f "$MANIFEST_BACKUP" ]]; then
  mv "$MANIFEST_BACKUP" "$MANIFEST_JSON"
fi

success "Đã tạo: $OUTPUT_PATH"

# ── Step 5: Summary ───────────────────────────
FILE_SIZE=$(du -sh "$OUTPUT_PATH" | cut -f1)
FILE_COUNT=$(unzip -l "$OUTPUT_PATH" | tail -1 | awk '{print $2}')

echo ""
echo -e "${GREEN}${BOLD}═══════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  ✔ Đóng gói thành công!${NC}"
echo -e "${GREEN}${BOLD}═══════════════════════════════════════${NC}"
echo -e "  📦 File:    ${BOLD}$OUTPUT_NAME${NC}"
echo -e "  📏 Size:    ${BOLD}$FILE_SIZE${NC}"
echo -e "  📄 Files:   ${BOLD}$FILE_COUNT${NC}"
echo -e "  📁 Saved:   ${BOLD}releases/${NC}"
echo ""
info "Upload file này lên: https://chrome.google.com/webstore/devconsole"
echo ""
