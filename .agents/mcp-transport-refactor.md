# MCP Transport Refactor Plan

## Mục tiêu
1. Fix streaming SSE tool response (multi-event)
2. Thêm Legacy SSE Transport (spec 2024-11-05)
3. Type-safe transport detection
4. Unified transport interface

## Thay đổi

### 1. `src/shared/types/mcp-contracts.ts`
- Thêm `RawMcpSseServerConfig` (url + `transport: "sse"`)
- `RawMcpServerConfig` = union của 3 types

### 2. `src/shared/lib/configDocument.ts`
- Thêm `isSseServerConfig()` type guard
- `isHttpServerConfig()` chỉ match `transport: "streamable-http"` hoặc auto-detect

### 3. `src/core/mcp/sseParser.ts` (MỚI)
- Shared SSE parser: extract + collect multi-event JSON-RPC objects
- Dùng cho cả streamable-http và legacy SSE

### 4. `src/core/mcp/httpTransport.ts`
- SSE streaming: collect TẤT CẢ data events thay vì chỉ lấy đầu tiên
- Merge multi-part tool results

### 5. `src/core/mcp/legacySseTransport.ts` (MỚI)
- Legacy GET /sse + POST /messages (spec 2024-11-05)

### 6. `src/background/runtime/connection-manager.ts`
- Thêm nhánh `isSseServerConfig` → `createLegacySseTransport`

### 7. `src/core/storage/configStorage.ts`
- `getTransport()`: nhận biết "sse" transport type
