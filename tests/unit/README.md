# Unit Test Plan

## Planned Cases

| ID | Target | Purpose | Notes |
| --- | --- | --- | --- |
| UT-001 | Config parsing | Validate top-level `mcpServers` shape and error cases. | Covers invalid JSON and invalid shape. |
| UT-002 | Crypto wrapper | Encrypt and decrypt config payload with round-trip fidelity. | Ensure no plaintext persists. |
| UT-003 | Index derivation | Derive `ServerIndex` and redact secrets for summaries. | Index must be UI-safe. |
| UT-004 | Tool namespacing | Namespace tools and reverse-map ids. | `serverId__toolName` is canonical. |
| UT-005 | Risk and errors | Classify risk and map error categories. | Uses locked categories. |
| UT-006 | Adapter mapping | Convert normalized tools for AI providers. | Provider mapping only. |

## Notes

- Add test file naming once the code surfaces land.
