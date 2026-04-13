# Web2Agent

`Web2Agent` is a Manifest V3 Chrome extension that connects your browser to AI agents and MCP tools. Chat with Gemini and ChatGPT while wielding any MCP server — local or remote.

The extension can:

- connect to HTTP MCP servers directly from the browser
- connect to local `stdio` MCP servers through a native messaging desktop companion
- store a raw `mcpServers` document, validate it, and persist runtime health/tool discovery state
- surface connection status and quick actions in the popup
- reserve the side panel as the long-lived workspace

The first-class preset is Atlassian via `uvx mcp-atlassian`, but the runtime stays generic.

## Status

Implemented today:

- MV3 extension shell with popup, options page, side panel, and background service worker
- raw JSON-first config console
- config validation, redaction, split persistence, and encrypted config storage
- connection testing for HTTP and `stdio` MCP servers
- desktop companion for local `stdio` servers through Chrome native messaging
- tool discovery and persisted tool catalog
- Atlassian capability mapping and popup quick actions driven by discovered tools

Present but still scaffold-level:

- AI provider adapters for OpenAI, Gemini, and Claude
- side-panel chat shell and orchestration types
- richer preset setup flows
- automated end-to-end verification

The currently validated runtime slice is:

`save config -> test connections -> initialize/list tools -> persist health/tool catalog -> popup reads live state`

## Architecture

The project is split into two runtimes:

1. Chrome extension runtime
2. Desktop companion runtime

### Chrome extension

- `src/options/`: full-page configuration console
- `src/popup/`: compact status and quick-action surface
- `src/sidepanel/`: persistent workspace shell
- `src/background/`: service worker bootstrap, messaging, connection manager
- `src/core/`: transports, storage, permissions, AI scaffolding
- `src/presets/atlassian/`: Atlassian-specific labels, capability mapping, examples
- `src/shared/`: canonical contracts, config parsing, validation, helpers

### Desktop companion

- `companion/src/native-host/`: Chrome native messaging bridge
- `companion/src/process-manager/`: child process lifecycle, logs, diagnostics
- `companion/src/mcp/`: stdio JSON-RPC transport and MCP RPC client

The native host id is:

```text
com.myworkflowext.native_bridge
```

Tool names are normalized as:

```text
serverId__toolName
```

## Prerequisites

- Node.js 20+
- Yarn 1.x
- Google Chrome
- for local `stdio` MCP servers:
  - the desktop companion
  - any server-specific runtime requirements

For the Atlassian preset shown in this repo:

- `uvx`
- `mcp-atlassian`
- Atlassian credentials in environment variables

## Quick Start

Install dependencies:

```bash
yarn
(cd companion && yarn)
```

Build both runtimes:

```bash
yarn build
(cd companion && yarn build)
```

Load the extension in Chrome:

1. Open `chrome://extensions`
2. Turn on Developer mode
3. Click `Load unpacked`
4. Select `dist/`

If you only use HTTP MCP servers, that is enough to start testing the options page and popup.

## Development Mode

Run the extension dev server:

```bash
yarn dev
```

Important output directories:

- `.dev-dist/`: load this when `yarn dev` is running
- `dist/`: production build output from `yarn build`
- `companion/dist/`: desktop companion build output

This separation is intentional so dev output never overwrites the production-ready extension bundle.

## Desktop Companion Installation

Use the companion if you want to run local `stdio` MCP servers such as `uvx mcp-atlassian`.

### macOS

1. Build the companion:

```bash
(cd companion && yarn build)
```

2. Find the extension ID in `chrome://extensions`

3. Install the native host:

```bash
bash companion/scripts/install-macos-manual.sh --extension-id <EXTENSION_ID>
```

4. Reload the extension in Chrome

### Windows

1. Build the companion:

```powershell
cd companion
yarn build
cd ..
```

2. Find the extension ID in `chrome://extensions`

3. Install the native host:

```powershell
powershell -ExecutionPolicy Bypass -File .\companion\scripts\install-windows-manual.ps1 -ExtensionId <EXTENSION_ID>
```

4. Reload the extension in Chrome

## Example Configs

### Atlassian via local `uvx`

```json
{
  "mcpServers": {
    "mcp-atlassian": {
      "command": "uvx",
      "args": ["mcp-atlassian"],
      "stdioProtocol": "json-lines",
      "env": {
        "JIRA_URL": "https://your-domain.atlassian.net",
        "JIRA_USERNAME": "you@example.com",
        "JIRA_API_TOKEN": "your_jira_api_token",
        "CONFLUENCE_URL": "https://your-domain.atlassian.net/wiki",
        "CONFLUENCE_USERNAME": "you@example.com",
        "CONFLUENCE_API_TOKEN": "your_confluence_api_token"
      },
      "preset": "atlassian"
    }
  }
}
```

Notes:

- `mcp-atlassian` currently works through the companion using `json-lines` stdio behavior
- the companion auto-detects this for `mcp-atlassian`, but keeping `stdioProtocol: "json-lines"` in config is explicit and easier to debug

### Generic HTTP MCP server

```json
{
  "mcpServers": {
    "remote-server": {
      "transport": "streamable-http",
      "url": "https://example.com/mcp",
      "headers": {
        "Authorization": "Bearer your_token"
      }
    }
  }
}
```

## Working With the UI

- Options page:
  - the main place to edit raw config JSON
  - validates, saves, and tests connections
  - shows server index, health, and discovered tools
- Popup:
  - reads persisted runtime state
  - shows status for Atlassian servers first
  - exposes quick actions and shortcuts into options and side panel
- Side panel:
  - currently a workspace/chat shell
  - not yet fully wired to live provider + tool execution flow

## Troubleshooting

### `Companion connection disconnected.`

Typical causes:

- native host was not installed
- native host manifest does not allow the current extension ID
- Chrome needs the extension to be reloaded after companion installation

### `Failed to start MCP command "uvx"`

Typical causes:

- `uvx` is not installed
- `uvx` is not in the PATH visible to the native host
- the command should be given as an absolute path

The macOS install script exports a safer PATH for Homebrew-based setups, but using an absolute command path is still the least ambiguous option.

### `MCP request timed out: initialize`

For `mcp-atlassian`, this usually means the wrong stdio framing was used. This repo now supports `json-lines` for that server.

If you still see this:

- rebuild the companion
- reinstall the native host
- reload the extension
- keep `stdioProtocol: "json-lines"` in the config for `mcp-atlassian`

### `tools: 0`

That means transport and initialize likely worked, but the upstream server did not expose any tools.

Typical causes:

- missing or invalid credentials
- server-side tool filtering
- upstream configuration that disables toolsets

## Repository Layout

```text
.
├── companion/
├── docs/
├── public/
├── scripts/
├── src/
│   ├── background/
│   ├── core/
│   ├── options/
│   ├── popup/
│   ├── presets/
│   ├── shared/
│   └── sidepanel/
├── manifest.config.ts
├── package.json
└── vite.config.ts
```

## Key Docs

- Implementation plan: `docs/implementation-plan/web2agent/README.md`
- Requirements: `docs/implementation-plan/web2agent/01-requirements.md`
- Design: `docs/implementation-plan/web2agent/02-design.md`
- Tasks: `docs/implementation-plan/web2agent/03-tasks.md`
- Verification matrix: `docs/implementation-plan/web2agent/05-verification-matrix.md`
- Progress snapshot: `docs/implementation-plan/web2agent/06-progress-snapshot.md`

## Build Commands

Root extension:

```bash
yarn build
```

Desktop companion:

```bash
(cd companion && yarn build)
```

## Current Limitations

- the side-panel AI flow is not fully integrated end-to-end yet
- automated tests and packaging verification are not complete
- this repo is currently optimized for local development and manual native-host installation while the product shape stabilizes
