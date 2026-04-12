# Design

## High-Level Architecture

The system is split into two runtimes:

- the Chrome extension
- the desktop companion

The extension owns:
- configuration
- encrypted storage
- host permission management
- UI surfaces
- AI orchestration
- tool brokering

The companion owns:
- local process spawning for `stdio` MCP servers
- native messaging bridge behavior
- process lifecycle and diagnostics

## Repository Layout

The repo stays single-rooted.

```text
my-workflow-ext/
├── companion/
├── docs/
├── public/
├── scripts/
├── src/
└── tests/
```

### Extension source layout

The extension follows the existing structure already documented in [09-project-structure.md](../../09-project-structure.md):

- `src/background/`
- `src/popup/`
- `src/sidepanel/`
- `src/options/`
- `src/core/`
- `src/presets/`
- `src/shared/`

### Companion layout

```text
companion/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts
│   ├── native-host/
│   ├── process-manager/
│   ├── mcp/
│   ├── diagnostics/
│   └── types/
└── scripts/
```

## Canonical Config Model

The user-facing document is `RawMcpConfigDocument`.

```ts
type RawMcpConfigDocument = {
  mcpServers: Record<string, RawMcpServerConfig>;
};
```

Each server entry may be HTTP or local `stdio`.

```ts
type RawMcpServerConfig =
  | {
      transport?: "streamable-http";
      url: string;
      headers?: Record<string, string>;
      preset?: string;
    }
  | {
      command: string;
      args?: string[];
      env?: Record<string, string>;
      preset?: string;
    };
```

### Config rules

- `url` implies HTTP runtime
- `command` implies `stdio` runtime through companion
- `preset` is optional metadata only
- raw config is the source of truth

## Normalized Runtime Model

The extension derives one `NormalizedServerProfile` per server.

```ts
type NormalizedServerProfile = {
  id: string;
  name: string;
  transport: "streamable-http" | "stdio";
  runtime: "extension-http" | "desktop-companion";
  preset: string | null;
  status: ConnectionState;
  toolPolicy: ToolPolicy;
};
```

Supporting types:

```ts
type ConnectionState =
  | "draft"
  | "connecting"
  | "connected"
  | "degraded"
  | "failed"
  | "disabled";

type ToolPolicy = {
  serverEnabled: boolean;
  allowedTools: string[];
  blockedTools: string[];
  confirmWrites: boolean;
};
```

## Storage Model

Storage is split into two layers.

### 1. Encrypted payload

```ts
type EncryptedServerPayload = {
  version: 1;
  cipherText: string;
  iv: string;
  salt: string;
};
```

This stores:
- the raw config document
- secrets from headers and env

### 2. Renderable index

```ts
type ServerIndex = {
  id: string;
  name: string;
  preset: string | null;
  transport: "streamable-http" | "stdio";
  runtime: "extension-http" | "desktop-companion";
  status: ConnectionState;
  hasSecrets: boolean;
  lastCheckedAt: string | null;
};
```

This index is safe to render in the UI without decrypting secrets.

## Connection Health

Every server stores a `ConnectionHealth` snapshot.

```ts
type ConnectionHealth = {
  state: ConnectionState;
  lastCheckedAt: string | null;
  serverInfo: {
    name?: string;
    version?: string;
  } | null;
  toolCount: number;
  capabilities: string[];
  errorCategory:
    | "permission"
    | "auth"
    | "transport"
    | "companion"
    | "tool"
    | "policy"
    | null;
  errorMessage: string | null;
};
```

## Tool Model

All tools are normalized into `BrokerTool`.

```ts
type BrokerTool = {
  serverId: string;
  originalName: string;
  namespacedName: string;
  description: string;
  inputSchema: unknown;
  risk: "read" | "write" | "unknown";
  enabled: boolean;
};
```

### Tool naming rule

- Namespaced format is fixed: `serverId__toolName`
- The broker must be able to map the namespaced form back to:
  - `serverId`
  - `originalName`

## Native Messaging Contract

The extension talks to the companion through one envelope format.

Native host id is fixed:

```text
com.myworkflowext.native_bridge
```

Message shape:

```ts
type CompanionEnvelope =
  | { type: "spawn"; serverId: string; config: RawMcpServerConfig }
  | { type: "stop"; serverId: string }
  | { type: "initialize"; serverId: string }
  | { type: "listTools"; serverId: string }
  | { type: "callTool"; serverId: string; toolName: string; input: unknown }
  | { type: "diagnostics"; serverId?: string };
```

Companion responses should always include:
- `ok`
- `serverId`
- response payload or error payload

## Connection Manager

The extension exposes one `ConnectionManager` that hides transport differences.

Responsibilities:
- resolve server profile
- create HTTP transport in the service worker
- create or reuse companion-backed `stdio` session
- run:
  - `initialize`
  - `notifications/initialized`
  - `tools/list`
  - `tools/call`
- update cached health and tool snapshots

## Data Flows

### Save config

1. User edits raw JSON
2. Extension validates the document shape
3. Raw config is encrypted
4. `ServerIndex` entries are rebuilt
5. UI reloads from index

### Test HTTP server

1. Resolve `url`
2. Check or request host permission
3. Build HTTP transport with headers
4. Run `initialize`
5. Send `notifications/initialized`
6. Run `tools/list`
7. Save `ConnectionHealth` and tool catalog

### Test local `stdio` server

1. Verify native messaging bridge availability
2. Send `spawn`
3. Send `initialize`
4. Send `listTools`
5. Save `ConnectionHealth` and tool catalog

### Execute tool from UI or AI

1. Caller selects namespaced tool
2. Broker resolves server and original name
3. Broker validates policy
4. Broker routes to `ConnectionManager`
5. Tool result returns in normalized shape

## Tool Broker

The broker is mandatory for all tool execution.

Responsibilities:
- normalize tool metadata
- namespace tool names
- apply per-server and per-tool policy
- classify risk
- gate destructive actions behind confirmation
- expose a unified tool catalog to AI and preset UIs

The extension must not bypass the broker.

## AI Design

### Provider adapters

Implement adapters for:
- OpenAI
- Gemini
- Claude

Each adapter is responsible for:
- request shaping
- tool definition conversion
- streaming response parsing
- tool call extraction

The broker owns normalized tools. Adapters only translate them.

### Chat orchestration

The side panel keeps a long-lived port open to the background worker.

Flow:
1. build model request from current enabled broker tools
2. stream provider output
3. intercept tool calls
4. route through broker
5. feed results back to the model
6. stream final response to UI

## UI Surface Rules

### Options page

- primary config console
- raw JSON editor first
- server health view
- connection test controls
- tool inventory and policy controls

### Popup

- quick actions only
- no persistent or multi-step flows
- shortcuts into the side panel or options page

### Side panel

- main persistent workspace
- chat
- tool activity
- preset flows
- result viewers

## Atlassian Preset

Atlassian is a thin preset on top of generic MCP runtime.

Responsibilities:
- recognize Jira and Confluence capability by tool names
- generate starter config examples for:
  - `uvx mcp-atlassian`
  - HTTP endpoint variant
- unlock quick actions only when required tools exist
- provide preset-specific labels and prompt hints

The preset must not hard-code exact tool counts.

## Companion Design

### Process handling

The companion must:
- spawn local MCP servers from `command`, `args`, `env`
- reuse running processes by `serverId`
- capture stdout/stderr for diagnostics
- report process exit and crash events

### Packaging

Phase 1 packaging targets:
- macOS installer + native host registration
- Windows installer + native host registration
- manual install scripts for both OSes

## Security Design

- raw config secrets never remain in plaintext storage
- HTTP origins use optional host permissions
- companion only spawns commands from saved config
- destructive tools require broker confirmation
- UI renders from safe index data whenever possible
