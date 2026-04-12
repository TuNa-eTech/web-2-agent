# Tasks

## Usage

- Implement task groups in order.
- Before starting a task group, open its linked design sections in [02-design.md](./02-design.md).
- Treat each checkbox as a concrete deliverable, not a discussion point.
- Do not bypass the contracts defined in [01-requirements.md](./01-requirements.md) and [02-design.md](./02-design.md).

## Task Group 1: Freeze Contracts and Scaffolding

### Design references

- [Repository Layout](./02-design.md#repository-layout)
- [Canonical Config Model](./02-design.md#canonical-config-model)
- [Normalized Runtime Model](./02-design.md#normalized-runtime-model)
- [Storage Model](./02-design.md#storage-model)
- [Connection Health](./02-design.md#connection-health)
- [Tool Model](./02-design.md#tool-model)
- [Native Messaging Contract](./02-design.md#native-messaging-contract)

### Checklist

- [ ] Create top-level `companion/` package with `package.json`, `tsconfig.json`, `src/`, and `scripts/`.
- [ ] Add canonical type definitions for `RawMcpConfigDocument` and `RawMcpServerConfig`.
- [ ] Add canonical type definitions for `NormalizedServerProfile`, `ConnectionState`, and `ToolPolicy`.
- [ ] Add canonical type definitions for `EncryptedServerPayload` and `ServerIndex`.
- [ ] Add canonical type definitions for `ConnectionHealth`.
- [ ] Add canonical type definitions for `BrokerTool`.
- [ ] Add canonical type definitions for `CompanionEnvelope` and companion response shape.
- [ ] Place shared contracts where both extension and companion can import them without circular coupling.
- [ ] Verify the current `src/` boundaries match the structure already committed in the repo.
- [ ] Add TODO stubs or placeholder modules in runtime folders so later task groups do not invent parallel structures.

### Done when

- [ ] All downstream work can import the same contract definitions.
- [ ] There is no duplicated shape for config, health, tool, or companion envelopes.
- [ ] `companion/` exists and is ready for runtime implementation.

## Task Group 2: Extension Foundation

### Design references

- [High-Level Architecture](./02-design.md#high-level-architecture)
- [Repository Layout](./02-design.md#repository-layout)
- [UI Surface Rules](./02-design.md#ui-surface-rules)
- [Security Design](./02-design.md#security-design)

### Checklist

- [ ] Create `manifest.config.ts` as the source of truth for the MV3 manifest.
- [ ] Configure Vite + CRXJS for four extension entrypoints:
  - [ ] background
  - [ ] popup
  - [ ] sidepanel
  - [ ] options
- [ ] Add required extension permissions:
  - [ ] `storage`
  - [ ] `sidePanel`
  - [ ] `nativeMessaging`
- [ ] Add optional host permission support for custom HTTP MCP origins.
- [ ] Add background bootstrap file and route all runtime events through it.
- [ ] Add one-shot message router skeleton for popup and options actions.
- [ ] Add long-lived port router skeleton for side-panel chat streaming.
- [ ] Add minimal page shells for popup, side panel, and options page.
- [ ] Wire popup to only expose short, non-persistent actions.
- [ ] Wire side panel as the long-lived workspace surface.
- [ ] Wire options page as a full-page configuration console, not an embedded micro-settings form.

### Done when

- [ ] The extension loads in Chrome without manual manifest edits.
- [ ] Popup, side panel, and options page render independently.
- [ ] Background receives both messages and long-lived ports.
- [ ] Surface responsibilities match the design document.

## Task Group 3: Config Editor and Secure Storage

### Design references

- [Canonical Config Model](./02-design.md#canonical-config-model)
- [Normalized Runtime Model](./02-design.md#normalized-runtime-model)
- [Storage Model](./02-design.md#storage-model)
- [Data Flows: Save config](./02-design.md#save-config)
- [UI Surface Rules: Options page](./02-design.md#options-page)
- [Security Design](./02-design.md#security-design)

### Checklist

- [ ] Build raw JSON editor UI as the primary server configuration surface.
- [ ] Validate that saved JSON always has a top-level `mcpServers` object.
- [ ] Validate HTTP entries for `url` and optional `transport`/`headers`.
- [ ] Validate local entries for `command`, optional `args`, and optional `env`.
- [ ] Preserve unknown server-level keys only if they do not break the canonical shape strategy.
- [ ] Encrypt raw config payload before persisting it.
- [ ] Ensure secrets from `headers` and `env` never persist as plaintext.
- [ ] Derive `ServerIndex` entries from decrypted raw config on save.
- [ ] Persist `ServerIndex` separately for UI-safe rendering.
- [ ] Persist `ConnectionHealth` separately from encrypted payload.
- [ ] Rehydrate the raw editor from encrypted payload with round-trip fidelity.
- [ ] Mask or redact sensitive values when rendering summaries outside the editor.
- [ ] Add explicit error states for:
  - [ ] invalid JSON
  - [ ] invalid top-level shape
  - [ ] invalid HTTP server entry
  - [ ] invalid local `stdio` entry

### Done when

- [ ] A user can paste, save, reload, and edit a config document without shape drift.
- [ ] No persisted storage contains plaintext secrets.
- [ ] The options page can render server summaries without decrypting the full payload by default.

## Task Group 4: Desktop Companion

### Design references

- [Companion layout](./02-design.md#companion-layout)
- [Native Messaging Contract](./02-design.md#native-messaging-contract)
- [Data Flows: Test local `stdio` server](./02-design.md#test-local-stdio-server)
- [Companion Design](./02-design.md#companion-design)
- [Companion Design: Process handling](./02-design.md#process-handling)
- [Companion Design: Packaging](./02-design.md#packaging)
- [Security Design](./02-design.md#security-design)

### Checklist

- [ ] Implement native host entrypoint in `companion/src/index.ts`.
- [ ] Implement stdin/stdout framing for Chrome native messaging protocol.
- [ ] Implement `spawn` command handling.
- [ ] Implement `stop` command handling.
- [ ] Implement `initialize` command handling for a running MCP process.
- [ ] Implement `listTools` command handling.
- [ ] Implement `callTool` command handling.
- [ ] Implement `diagnostics` command handling.
- [ ] Add process registry keyed by `serverId`.
- [ ] Reuse an existing local MCP process when a matching `serverId` session is active.
- [ ] Capture stdout and stderr for each spawned server.
- [ ] Capture exit code and unexpected termination state.
- [ ] Return structured companion errors that the extension can map to `errorCategory = "companion"`.
- [ ] Add macOS native host manifest template.
- [ ] Add macOS registration flow for manual install.
- [ ] Add macOS installer path or packaging script.
- [ ] Add Windows native host manifest template.
- [ ] Add Windows registry/native host registration flow for manual install.
- [ ] Add Windows installer path or packaging script.
- [ ] Add developer-facing manual install scripts for both platforms.
- [ ] Add diagnostics output sufficient to debug:
  - [ ] companion not installed
  - [ ] native host not registered
  - [ ] command not found
  - [ ] process crash
  - [ ] MCP handshake failure

### Done when

- [ ] The extension can open a native messaging connection to `com.myworkflowext.native_bridge`.
- [ ] The companion can spawn and reuse a local MCP server from `command` / `args` / `env`.
- [ ] macOS and Windows installation paths are both documented and scriptable.

## Task Group 5: Shared MCP Runtime

### Design references

- [Connection Manager](./02-design.md#connection-manager)
- [Data Flows](./02-design.md#data-flows)
- [Data Flows: Test HTTP server](./02-design.md#test-http-server)
- [Data Flows: Test local `stdio` server](./02-design.md#test-local-stdio-server)
- [Connection Health](./02-design.md#connection-health)
- [Native Messaging Contract](./02-design.md#native-messaging-contract)

### Checklist

- [ ] Implement HTTP MCP transport wrapper in the service worker.
- [ ] Inject configured headers into HTTP transport creation.
- [ ] Request or verify host permission before HTTP connection attempts.
- [ ] Implement companion-backed stdio transport wrapper in the extension.
- [ ] Build `ConnectionManager` as the only transport-selection entrypoint.
- [ ] Support the required MCP lifecycle for HTTP servers:
  - [ ] `initialize`
  - [ ] `notifications/initialized`
  - [ ] `tools/list`
  - [ ] `tools/call`
- [ ] Support the required MCP lifecycle for companion-backed stdio servers:
  - [ ] `spawn`
  - [ ] `initialize`
  - [ ] `tools/list`
  - [ ] `tools/call`
- [ ] Persist tool discovery results per server.
- [ ] Persist `ConnectionHealth` snapshots per server.
- [ ] Normalize connection errors into the locked categories:
  - [ ] `permission`
  - [ ] `auth`
  - [ ] `transport`
  - [ ] `companion`
  - [ ] `tool`
  - [ ] `policy`
- [ ] Add reconnect or retry behavior that does not bypass health updates.
- [ ] Make connection test logic reuse the same `ConnectionManager` path used by production tool calls.

### Done when

- [ ] HTTP and local stdio servers can be exercised through one runtime API.
- [ ] Connection tests update health and tool cache consistently.
- [ ] No UI surface contains its own ad hoc MCP client logic.

## Task Group 6: Tool Broker and Policy

### Design references

- [Tool Model](./02-design.md#tool-model)
- [Tool naming rule](./02-design.md#tool-naming-rule)
- [Tool Broker](./02-design.md#tool-broker)
- [Normalized Runtime Model](./02-design.md#normalized-runtime-model)
- [Data Flows: Execute tool from UI or AI](./02-design.md#execute-tool-from-ui-or-ai)
- [Security Design](./02-design.md#security-design)

### Checklist

- [ ] Normalize all discovered tools into `BrokerTool`.
- [ ] Generate namespaced tool ids using `serverId__toolName`.
- [ ] Add reverse mapping from namespaced tool id back to `{ serverId, originalName }`.
- [ ] Add per-server enabled or disabled gating.
- [ ] Add per-tool allowlist support.
- [ ] Add per-tool denylist support.
- [ ] Add risk classification heuristics for `read`, `write`, and `unknown`.
- [ ] Add destructive confirmation policy for write-like or unknown-risk tools where required.
- [ ] Ensure popup quick actions route through the broker.
- [ ] Ensure side panel preset actions route through the broker.
- [ ] Ensure AI tool calls route through the broker.
- [ ] Prevent any direct `tools/call` path that bypasses broker policy.
- [ ] Surface broker-level policy rejection in a UI-readable error shape.

### Done when

- [ ] Two servers exposing the same original tool name do not collide.
- [ ] Blocked tools never appear executable from UI or AI.
- [ ] All tool execution paths enforce the same policy rules.

## Task Group 7: AI Integration

### Design references

- [AI Design](./02-design.md#ai-design)
- [Provider adapters](./02-design.md#provider-adapters)
- [Chat orchestration](./02-design.md#chat-orchestration)
- [Tool Broker](./02-design.md#tool-broker)
- [UI Surface Rules: Side panel](./02-design.md#side-panel)

### Checklist

- [ ] Implement OpenAI adapter.
- [ ] Implement Gemini adapter.
- [ ] Implement Claude adapter.
- [ ] Build one normalized tool-definition layer for all providers.
- [ ] Keep provider-specific schema translation inside each adapter.
- [ ] Add side-panel chat state model.
- [ ] Add background port lifecycle that stays open during streaming turns.
- [ ] Build streaming UI for assistant tokens.
- [ ] Render tool activity cards during tool execution.
- [ ] Route provider tool calls back into the broker.
- [ ] Feed normalized tool results back into the provider loop.
- [ ] Surface provider errors distinctly from broker or MCP errors.
- [ ] Enforce confirmation gates before destructive AI-initiated tool execution.

### Done when

- [ ] OpenAI completes at least one tool call through the broker.
- [ ] Gemini completes at least one tool call through the broker.
- [ ] Claude completes at least one tool call through the broker.
- [ ] Provider code does not own business logic that belongs in the broker.

## Task Group 8: Atlassian Preset v1

### Design references

- [Atlassian Preset](./02-design.md#atlassian-preset)
- [UI Surface Rules: Popup](./02-design.md#popup)
- [UI Surface Rules: Side panel](./02-design.md#side-panel)
- [Canonical Config Model](./02-design.md#canonical-config-model)
- [Tool Broker](./02-design.md#tool-broker)

### Checklist

- [ ] Add starter raw config example for `uvx mcp-atlassian`.
- [ ] Add starter raw config example for the HTTP endpoint variant.
- [ ] Implement capability mapping for Jira-related discovered tools.
- [ ] Implement capability mapping for Confluence-related discovered tools.
- [ ] Derive quick-action availability from required tool presence, not fixed tool counts.
- [ ] Add popup quick actions for:
  - [ ] Jira search
  - [ ] recent issues
  - [ ] create issue
  - [ ] Confluence search or page actions when supported
- [ ] Add side-panel labels and preset-aware groupings for Jira and Confluence capabilities.
- [ ] Add Atlassian-specific prompt hints without hard-coding upstream catalog size.
- [ ] Keep preset code isolated from the generic runtime.

### Done when

- [ ] `mcp-atlassian` works through either `command`/`args`/`env` or HTTP endpoint config.
- [ ] Popup quick actions only appear when the required tools actually exist.
- [ ] The preset remains additive and does not mutate generic MCP runtime rules.

## Task Group 9: Phase 2 Follow-up

### Design references

- [Canonical Config Model](./02-design.md#canonical-config-model)
- [UI Surface Rules: Options page](./02-design.md#options-page)
- [Tool Broker](./02-design.md#tool-broker)
- [Atlassian Preset](./02-design.md#atlassian-preset)

### Checklist

- [ ] Add import UX for external MCP config documents.
- [ ] Add export UX for the saved config document.
- [ ] Add per-tool policy editor in the options page.
- [ ] Add read-only profile support and summaries.
- [ ] Add richer Atlassian preset forms layered on top of raw config.
- [ ] Add richer preset flows in the side panel.
- [ ] Add optional support for `resources/*`.
- [ ] Add optional support for `prompts/*`.
- [ ] Ensure optional resources/prompts support does not become a prerequisite for core tool flows.

### Planning scaffolds

- [ ] Define import and export payload formats and backward-compat rules.
- [ ] Define the policy editor states for server enablement, tool allowlist, tool denylist, and confirm-writes.
- [ ] Define the read-only profile data contract and redaction rules.
- [ ] Define preset form fields and the mapping back to raw config.
- [ ] Define storage and runtime boundaries for optional `resources/*` and `prompts/*`.
- [ ] Add Phase 2 verification cases to the test matrix and test plan.

### Done when

- [ ] Multi-server administration is practical without using raw JSON only.
- [ ] Optional MCP features are integrated without weakening the Phase 1 runtime contract.

## Task Group 10: Phase 3 Follow-up

### Design references

- [Connection Manager](./02-design.md#connection-manager)
- [Connection Health](./02-design.md#connection-health)
- [Companion Design](./02-design.md#companion-design)
- [Security Design](./02-design.md#security-design)

### Checklist

- [ ] Add auth refresh and reconnect hardening for longer-lived sessions.
- [ ] Add Linux companion support.
- [ ] Add schema migration handling for saved config documents.
- [ ] Add tool-catalog drift handling when upstream MCP servers change.
- [ ] Add crash diagnostics and recovery behavior for extension and companion runtime failures.
- [ ] Evaluate managed relay or hosted preset paths only if they preserve the MCP-first architecture.

### Planning scaffolds

- [ ] Define the migration versioning strategy for saved config documents.
- [ ] Define catalog drift detection and rollback behavior for tool changes.
- [ ] Define auth refresh triggers and reconnect backoff behavior.
- [ ] Define Linux companion packaging constraints and registration flow.
- [ ] Define crash reporting surfaces and minimum diagnostics payload.
- [ ] Add Phase 3 verification cases to the test matrix and test plan.

### Done when

- [ ] The runtime survives auth churn, disconnects, and upstream catalog changes with controlled degradation.
- [ ] Companion support expands beyond the initial macOS + Windows scope.

## Test Checklist

### Unit

- [ ] Parse and validate `mcpServers`.
- [ ] Encrypt and decrypt config payload.
- [ ] Normalize config into `ServerIndex`.
- [ ] Namespace tools correctly.
- [ ] Classify risk correctly.
- [ ] Convert normalized tools for OpenAI.
- [ ] Convert normalized tools for Gemini.
- [ ] Convert normalized tools for Claude.
- [ ] Normalize and redact summaries without decrypting full payload by default.
- [ ] Map errors into the locked categories.

### Integration

- [ ] Extension to companion messaging works.
- [ ] Spawn and stop stdio server works.
- [ ] HTTP MCP `initialize` / `tools/list` / `tools/call` works.
- [ ] Reconnect and session recovery works.
- [ ] Options save/load with encrypted payload works.
- [ ] Broker routing and policy gates work.
- [ ] Atlassian capability detection works.
- [ ] Host permission request flow is enforced before HTTP connect.
- [ ] Connection test path matches the production runtime path.

### E2E

#### macOS

- [ ] Install extension and companion.
- [ ] Paste `uvx mcp-atlassian` config.
- [ ] Detect companion.
- [ ] Connect, list tools, and execute one read tool.

#### Windows

- [ ] Install extension and companion.
- [ ] Verify native host registration.
- [ ] Repeat the same core flow.

#### HTTP server flow

- [ ] Add URL config.
- [ ] Grant host permission.
- [ ] Test connection.
- [ ] List tools.
- [ ] Execute one tool.

#### AI flow

- [ ] OpenAI performs one tool call.
- [ ] Gemini performs one tool call.
- [ ] Claude performs one tool call.
- [ ] Destructive tool requires confirmation.

#### Failure flow

- [ ] Missing companion is surfaced clearly.
- [ ] Invalid JSON config is surfaced clearly.
- [ ] Invalid auth token or header is surfaced clearly.
- [ ] Unreachable HTTP server is surfaced clearly.
- [ ] stdio process crash is surfaced clearly.
- [ ] Tool policy rejection is surfaced clearly.

## Release Gates

- [ ] No plaintext secrets in persisted storage.
- [ ] Extension package is Chrome Web Store compatible.
- [ ] Companion installs on macOS.
- [ ] Companion installs on Windows.
- [ ] Raw JSON setup is usable for power users.
- [ ] Atlassian preset works with standard `mcpServers` config.
- [ ] OpenAI works through the broker.
- [ ] Gemini works through the broker.
- [ ] Claude works through the broker.
- [ ] Popup, side panel, and options responsibilities remain separate.
- [ ] Verification matrix results are recorded for this release.
