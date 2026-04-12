# Verification Matrix

This file translates the plan checklist into a practical verification order for the current parallel workstreams.

## Readiness Dependencies

1. Foundation build and shared contracts compile.
2. Config storage can save and reload one encrypted `mcpServers` document.
3. Companion can register and answer the native messaging envelope.
4. Runtime and broker can connect to one HTTP server and one local `stdio` server.
5. AI and preset surfaces can consume the shared broker catalog.

## Test Inventory

| ID | Scope | Description | Source |
| --- | --- | --- | --- |
| UT-001 | Unit | Validate top-level `mcpServers` shape and error cases. | tests/unit/README.md |
| UT-002 | Unit | Encrypt and decrypt config payload with round-trip fidelity. | tests/unit/README.md |
| UT-003 | Unit | Derive `ServerIndex` and redact secrets for summaries. | tests/unit/README.md |
| UT-004 | Unit | Namespace tools and reverse-map to `{ serverId, originalName }`. | tests/unit/README.md |
| UT-005 | Unit | Risk classification and error category mapping. | tests/unit/README.md |
| IT-001 | Integration | Options save/load flow uses encrypted payload and UI-safe index. | tests/integration/README.md |
| IT-002 | Integration | HTTP MCP flow completes `initialize` to `tools/call`. | tests/integration/README.md |
| IT-003 | Integration | Native messaging handshake and stdio spawn lifecycle. | tests/integration/README.md |
| IT-004 | Integration | Broker policy gating blocks disallowed tools. | tests/integration/README.md |
| IT-005 | Integration | Host permission request enforced before HTTP connect. | tests/integration/README.md |
| E2E-001 | E2E | macOS local `stdio` flow via companion. | tests/e2e/README.md |
| E2E-002 | E2E | Windows local `stdio` flow via companion. | tests/e2e/README.md |
| E2E-003 | E2E | HTTP MCP flow with permission prompt. | tests/e2e/README.md |
| E2E-004 | E2E | AI provider tool-call loop with confirmation gates. | tests/e2e/README.md |
| E2E-005 | E2E | Failure handling for missing companion and bad config. | tests/e2e/README.md |

## Unit Scope

### Contracts and Config

- parse and validate top-level `mcpServers`
- validate HTTP config entries
- validate local `stdio` entries
- encrypt and decrypt persisted config payload
- derive `ServerIndex` safely from decrypted raw config
- round-trip raw config without shape drift

### Runtime and Broker

- namespace tools using `serverId__toolName`
- reverse map namespaced tool ids back to `{ serverId, originalName }`
- classify risk as `read`, `write`, or `unknown`
- normalize runtime errors to:
  - `permission`
  - `auth`
  - `transport`
  - `companion`
  - `tool`
  - `policy`

### AI

- convert normalized tools for OpenAI
- convert normalized tools for Gemini
- convert normalized tools for Claude
- preserve adapter boundaries so business logic stays outside provider code

## Integration Scope

### Extension and Storage

- options page save and load uses encrypted payload
- `ServerIndex` persists separately from encrypted payload
- `ConnectionHealth` persists separately from encrypted payload
- summaries can render without decrypting the full payload

### Extension and Companion

- extension can connect to native host id `com.myworkflowext.native_bridge`
- spawn and stop lifecycle works for one local `stdio` server
- diagnostics flow returns structured companion errors
- process reuse works when the same `serverId` is already active

### MCP Runtime

- HTTP flow completes:
  - permission check
  - `initialize`
  - `notifications/initialized`
  - `tools/list`
  - `tools/call`
- local `stdio` flow completes:
  - `spawn`
  - `initialize`
  - `tools/list`
  - `tools/call`
- connection test path matches production runtime path

### Broker

- popup, side panel, and AI all route tool execution through one broker
- blocked tools are not executable
- destructive confirmation is required for write-like or unknown tools

## E2E Scope

### macOS

- install extension
- install companion
- register native host
- paste `uvx mcp-atlassian` config
- detect companion
- connect and list tools
- execute one read tool

### Windows

- install extension
- install companion
- register native host
- repeat the same core local `stdio` flow

### HTTP

- add HTTP MCP config
- grant host permission
- connect
- list tools
- execute one tool

### AI

- OpenAI completes one tool call through the broker
- Gemini completes one tool call through the broker
- Claude completes one tool call through the broker
- destructive tool execution requires confirmation

### Failure Handling

- missing companion is surfaced clearly
- invalid JSON config is surfaced clearly
- invalid top-level config shape is surfaced clearly
- invalid auth header is surfaced clearly
- unreachable HTTP server is surfaced clearly
- local `stdio` process crash is surfaced clearly

## Release Gates

- no plaintext secrets in persisted storage
- extension package remains Chrome Web Store compatible
- companion install path exists for macOS
- companion install path exists for Windows
- raw JSON setup is usable for power users
- Atlassian preset works with standard `mcpServers` config
- OpenAI works through the broker
- Gemini works through the broker
- Claude works through the broker
- popup, side panel, and options responsibilities stay separate

## Release Gate Evidence

- Link to the filled verification report.
- Logs or screenshots for one HTTP MCP tool call.
- Logs or screenshots for one local `stdio` tool call.
- Confirmation gate proof for destructive tools.
- Config round-trip proof showing no plaintext secrets.

## Verification Placeholders

- `scripts/verify-matrix.sh` prints the current verification matrix and test inventory.
- `scripts/release-gate-status.sh` prints release gate checklist and evidence placeholders.

## Suggested Verification Order

1. Foundation compile and page-entry smoke check
2. Options save/load with encrypted payload
3. HTTP server connection test and tool execution
4. Native messaging handshake and local `stdio` flow
5. Broker gating and namespaced tool execution
6. Atlassian preset capability detection and popup quick actions
7. AI provider tool-call loop
8. Packaging and release gate review
