# Integration Test Plan

## Planned Cases

| ID | Flow | Purpose | Notes |
| --- | --- | --- | --- |
| IT-001 | Options save/load | Encrypted payload and UI-safe index are persisted. | No plaintext secrets. |
| IT-002 | HTTP MCP flow | Permission, initialize, tools/list, tools/call. | Uses same runtime path as prod. |
| IT-003 | Native messaging | Handshake and stdio spawn lifecycle. | Requires companion running. |
| IT-004 | Broker policy | Blocked tools are not executable. | Confirm gate enforced. |
| IT-005 | Host permission | Host permission requested before connect. | Rejects unauthorized origin. |

## Notes

- Add test harness once background/runtime surfaces land.
