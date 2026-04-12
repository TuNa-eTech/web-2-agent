# Requirements

## Product Goal

Build a Chrome extension that lets users configure and use MCP servers directly in the browser, with AI-assisted workflows and an Atlassian preset, while avoiding a custom Jira/Confluence REST implementation inside the extension.

## Primary Outcomes

- Users can paste or edit an IDE-like MCP config document and save it
- Users can test whether each configured MCP server is usable
- Users can use connected MCP tools from:
  - the popup for quick actions
  - the side panel for persistent chat and workflows
- Users can connect both:
  - remote HTTP MCP servers
  - local `stdio` MCP servers through a desktop companion
- Atlassian users can connect `mcp-atlassian` using either:
  - `command` / `args` / `env`
  - an HTTP endpoint

## In Scope

### Phase 1

- MV3 extension shell with popup, side panel, and options page
- raw JSON config editor using a top-level `mcpServers` document
- encrypted storage of config and secrets
- connection test flow for HTTP and `stdio` MCP servers
- desktop companion for local `stdio` servers
- shared MCP runtime for `initialize`, `tools/list`, `tools/call`
- tool broker with namespacing and policy gates
- AI providers:
  - OpenAI
  - Gemini
  - Claude
- Atlassian preset v1

### Phase 2

- import/export polish
- richer tool policy UI
- richer preset UX
- optional `resources/*` and `prompts/*`
- better diagnostics and summaries

### Phase 3

- enterprise auth hardening
- Linux companion
- managed relay or hosted presets if needed
- operational hardening for upgrades and changing upstream catalogs

## Out of Scope

- rebuilding Jira or Confluence APIs in extension code
- mandatory managed backend in Phase 1
- bundling the desktop companion into the extension package
- Linux support in the first companion release
- content-script product UI injection

## Target Users

### Power User

- already uses IDE-like MCP configs
- expects raw config control
- is comfortable with `command`, `args`, `env`
- may prefer manual companion install

### Guided User

- wants a simple preset-driven setup
- starts from Atlassian preset
- may rely on HTTP endpoints or companion installers
- still needs transparency around server state and tool permissions

## User Journeys

### 1. Add HTTP MCP Server

1. Open options page
2. Paste a config document with a `url`
3. Save config
4. Grant origin permission if prompted
5. Run connection test
6. Review health and discovered tools
7. Use tools in popup or side panel

### 2. Add Local `stdio` MCP Server

1. Install desktop companion
2. Paste a config document with `command`, `args`, `env`
3. Save config
4. Extension detects companion
5. Run connection test
6. Companion spawns the local MCP server
7. Review health and discovered tools
8. Use tools in popup or side panel

### 3. Add Atlassian Preset

1. Open options page
2. Choose the Atlassian preset or paste a supported config
3. Save config
4. Test the connection
5. Extension detects Jira/Confluence capabilities from tool names
6. Popup quick actions and preset flows become available

### 4. Use AI with MCP Tools

1. Open the side panel
2. Choose a model provider
3. Ask for a task
4. Model receives the enabled tool set from the broker
5. Tool calls run through the correct MCP server
6. Results stream back into the chat UI

## Functional Requirements

### Configuration

- The primary configuration surface is a raw JSON editor
- The saved document shape must support:
  - `url`
  - `transport`
  - `headers`
  - `command`
  - `args`
  - `env`
- Config must round-trip cleanly after save/load
- Secrets must never be persisted as plaintext

### Connection Testing

- Each server entry must be testable independently
- HTTP server test must prove:
  - host permission
  - reachability
  - MCP handshake success
  - tool discovery success
- `stdio` server test must prove:
  - companion availability
  - process spawn success
  - MCP handshake success
  - tool discovery success

### Tool Runtime

- The shared runtime must support:
  - `initialize`
  - `notifications/initialized`
  - `tools/list`
  - `tools/call`
- Tools from multiple servers must coexist without name collisions
- All tool calls from UI and AI must route through one broker

### Policy

- Users must be able to enable or disable servers
- Broker must support:
  - per-server enablement
  - per-tool enablement
  - destructive confirmation gates
- The broker must classify tool risk as:
  - `read`
  - `write`
  - `unknown`

### UI

- Options page is a full-page config console
- Popup only contains short actions and status
- Side panel is the main persistent workspace
- The UI must expose:
  - server health
  - tool count
  - tool list summary
  - error category

### AI

- Provider adapters must exist for OpenAI, Gemini, and Claude
- All adapters must use the same normalized tool catalog from the broker
- Provider-specific schema or message conversion must stay inside the adapter
- Destructive tool calls invoked by AI must require confirmation

### Atlassian Preset

- Atlassian must be a first-class preset
- Preset capability detection must derive from discovered tool names
- Preset must not assume a fixed upstream tool count
- Quick actions should unlock only when required tools exist

## Non-Functional Requirements

### Security

- No plaintext secrets in persisted storage
- Least-privilege host permissions
- Native messaging host id is fixed and explicit
- Companion must not execute arbitrary commands outside configured server definitions

### Packaging

- Extension remains Chrome Web Store compatible
- Companion is distributed separately
- Companion must support both:
  - installer-based setup
  - manual install for power users

### Platform Support

- Phase 1 shipping scope:
  - macOS
  - Windows

### Maintainability

- Runtime stays generic for non-Atlassian MCP servers
- Preset code stays outside the generic MCP runtime
- Public contracts are frozen before implementation work begins

## Acceptance Criteria

### Phase 1 Exit

- User can configure HTTP and local `stdio` MCP servers
- Companion works on macOS and Windows
- Connection testing succeeds for at least one HTTP server and one `stdio` server
- OpenAI, Gemini, and Claude each complete at least one tool call through the broker
- Atlassian preset works with `mcp-atlassian`
- Popup, side panel, and options page have separate responsibilities

### Phase 2 Exit

- Import/export works reliably
- Tool policy UI is usable for multi-server setups
- Preset UX is richer without breaking generic runtime assumptions
- Optional resources/prompts support is integrated safely

### Phase 3 Exit

- Companion support extends beyond the initial release scope
- Enterprise auth and reconnect flows are hardened
- Upgrade and schema drift handling is in place

## Locked Assumptions

- No required managed backend in Phase 1
- Self-hosted or user-run MCP servers are the default path
- Raw config is the primary setup method
- Wizard UX is additive, not authoritative
- Companion is a separate artifact
- Linux is deferred
