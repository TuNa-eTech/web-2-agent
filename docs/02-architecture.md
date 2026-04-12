# Architecture

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                 CHROME EXTENSION (MV3)                       │
│                                                              │
│  ┌──────────────────┐      ┌──────────────────────────────┐ │
│  │ Popup / Options  │      │ Side Panel                  │ │
│  │                  │      │                              │ │
│  │ - Add server     │      │ - AI chat                   │ │
│  │ - Test server    │      │ - Tool activity stream      │ │
│  │ - Quick actions  │      │ - Preset workflows          │ │
│  │ - Tool settings  │      │ - Server-aware responses    │ │
│  └────────┬─────────┘      └──────────────┬───────────────┘ │
│           │                                │                 │
│           │ chrome.runtime messaging       │ Port stream     │
│           ▼                                ▼                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │          BACKGROUND SERVICE WORKER                     │ │
│  │                                                        │ │
│  │  ┌──────────────────────┐  ┌────────────────────────┐ │ │
│  │  │ Server Registry      │  │ Permission Manager     │ │ │
│  │  │ - saved configs      │  │ - optional host perms  │ │ │
│  │  │ - presets            │  │ - origin checks        │ │ │
│  │  └──────────┬───────────┘  └──────────┬─────────────┘ │ │
│  │             │                         │               │ │
│  │  ┌──────────▼───────────┐  ┌──────────▼─────────────┐ │ │
│  │  │ Auth Vault           │  │ MCP Connection Manager │ │ │
│  │  │ - headers / tokens   │  │ - initialize           │ │ │
│  │  │ - OAuth state        │  │ - session handling     │ │ │
│  │  │ - encrypted storage  │  │ - tools/list cache     │ │ │
│  │  └──────────┬───────────┘  └──────────┬─────────────┘ │ │
│  │             │                         │               │ │
│  │  ┌──────────▼─────────────────────────▼─────────────┐ │ │
│  │  │ Tool Broker                                      │ │ │
│  │  │ - namespaces tool names                          │ │ │
│  │  │ - applies allow/deny rules                       │ │ │
│  │  │ - runs confirmation policy                       │ │ │
│  │  │ - routes callTool to the right server            │ │ │
│  │  └──────────┬─────────────────────────┬─────────────┘ │ │
│  │             │                         │               │ │
│  │  ┌──────────▼───────────┐  ┌──────────▼─────────────┐ │ │
│  │  │ Preset UX Layer      │  │ AI Service             │ │ │
│  │  │ - Atlassian helpers  │  │ - OpenAI/Gemini/Claude │ │ │
│  │  │ - quick actions      │  │ - dynamic tool defs    │ │ │
│  │  │ - known tool groups  │  │ - streaming chat       │ │ │
│  │  └──────────────────────┘  └────────────────────────┘ │ │
│  │                                                        │ │
│  │  Phase 2+                                              │ │
│  │  ┌───────────────────────────────────────────────────┐ │ │
│  │  │ Native Companion Bridge                           │ │ │
│  │  │ - chrome.runtime.connectNative()                  │ │ │
│  │  │ - spawn local stdio MCP servers outside MV3       │ │ │
│  │  └───────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
                 │                           │
                 │                           │
        ┌────────▼────────┐        ┌────────▼─────────┐
        │ HTTP MCP Server │        │ Desktop Companion │
        │ /mcp            │        │ local stdio bridge│
        └─────────────────┘        └───────────────────┘
                 │
                 ▼
        ┌────────────────────┐
        │ AI Provider APIs   │
        │ OpenAI / Gemini /  │
        │ Claude             │
        └────────────────────┘
```

---

## Architectural Principle

The extension is a **host application with an embedded MCP client runtime**.

It is **not** an Atlassian API implementation layer.

That means:
- upstream MCP servers own integration-specific logic
- the extension owns setup, auth UX, connection health, tool governance, and AI orchestration
- preset-specific UI is additive, not protocol-breaking

---

## Supported Server Types

### Phase 1: Streamable HTTP

Phase 1 supports MCP servers reachable over HTTP, typically at:
- `https://.../mcp`
- `http://localhost:9000/mcp`

This is the transport that fits MV3 best because:
- the service worker can call HTTP endpoints directly
- host access can be granted per origin
- the extension can test and reconnect without launching local processes

### Phase 2+: Local `stdio` via Desktop Companion

The extension cannot run arbitrary local commands inside MV3.

To support IDE-style configs such as:
- `command`
- `args`
- `env`

the product introduces a **native companion app** that:
- is installed separately
- is connected through Chrome Native Messaging
- spawns the MCP server process locally
- relays JSON-RPC messages between the extension and the local server

---

## Server Registry

Each server is stored as a **connection profile**.

Example shape:

```json
{
  "id": "atlassian-main",
  "name": "Atlassian",
  "preset": "mcp-atlassian",
  "transport": "streamable-http",
  "url": "https://mcp.example.com/mcp",
  "auth": {
    "type": "headers",
    "headers": {
      "Authorization": "Bearer <token>"
    }
  },
  "policy": {
    "enabled": true,
    "allowedTools": [],
    "blockedTools": [],
    "confirmWrites": true
  }
}
```

Phase 2 extends this model for local servers:

```json
{
  "id": "filesystem-local",
  "name": "Filesystem",
  "transport": "stdio",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-filesystem", "/Users/me/work"],
  "env": {},
  "runtime": "native-companion"
}
```

---

## Connection Lifecycle

### Add Server

1. User selects a preset or custom server
2. User enters URL or command config
3. Extension stores the draft profile
4. Extension requests required permissions
5. User provides auth if needed

### Test Connection

For HTTP servers:

1. Check host permission for the server origin
2. Build the transport with auth headers
3. Send `initialize`
4. Send `notifications/initialized`
5. Call `tools/list`
6. Cache capabilities, server info, and tool definitions
7. Mark status as `connected`, `degraded`, or `failed`

### Ongoing Use

Once a server is connected:
- the connection manager can reconnect on demand
- tool metadata is cached in `chrome.storage.session`
- the UI uses cached tools and refreshes when needed

---

## Tool Broker

The Tool Broker is the extension’s core abstraction.

It solves four problems:

### 1. Namespacing

Multiple servers may expose the same tool name. The extension rewrites tool identifiers into a namespaced form before sending them to AI providers.

Example:
- upstream tool: `jira_search`
- internal tool id: `atlassian-main__jira_search`

### 2. Policy Enforcement

Before a tool is exposed or executed, the broker applies:
- server enabled/disabled state
- per-tool allow/deny lists
- preset-specific defaults
- user confirmation requirements for write operations

### 3. Routing

When AI or UI calls a tool:
- the broker resolves the namespaced tool id
- picks the correct server profile
- invokes `callTool` on that MCP connection

### 4. Normalization

The broker stores tool descriptors in one internal format regardless of the upstream server:

```ts
type BrokerTool = {
  serverId: string;
  originalName: string;
  namespacedName: string;
  description: string;
  inputSchema: unknown;
  category?: string;
  presetHint?: string;
  risk: "read" | "write" | "unknown";
  enabled: boolean;
};
```

---

## Preset UX Layer

Presets are thin helpers on top of MCP.

For the Atlassian preset, the extension knows:
- which discovered tools unlock Jira quick search
- which tools are required for quick-create
- which tools imply Confluence page read/write support
- which tool families should be grouped under labels like `Issues`, `Comments`, `Agile`, `Pages`

The preset layer must not assume exact upstream counts.
It should adapt to the tools the server actually exposes.

---

## AI Chat Workflow

### Request Build

For each turn, the AI service gathers:
- connected server summaries
- currently enabled tools from the broker
- recent chat history
- optional preset context

### Tool Calling Flow

1. User sends a prompt
2. AI provider receives namespaced tool definitions
3. Model chooses a tool
4. Tool Broker validates policy
5. Connection Manager executes `callTool`
6. Result is streamed back to the model
7. Final answer is shown in the side panel

### Why the Side Panel Uses a Port

The side panel keeps a `chrome.runtime.Port` open during streaming so the service worker stays alive while:
- the AI provider is streaming
- the model is calling tools
- the broker is waiting on MCP responses

---

## Authentication Model

The extension supports auth at the **server connection** level, not at the product-specific API layer.

Auth modes include:
- static headers
- bearer tokens
- API keys in custom headers
- OAuth state for MCP servers that support HTTP auth flows

Sensitive data is encrypted before storage.

For MCP servers with per-request user credentials, the extension injects the relevant auth headers during transport creation.

---

## Storage Model

| Data | Storage Layer | Reason |
|------|--------------|--------|
| Server profiles | `chrome.storage.local` | persistent settings |
| Auth secrets | `chrome.storage.local` (encrypted) | sensitive and persistent |
| User preferences | `chrome.storage.sync` | sync across devices |
| Connection cache | `chrome.storage.session` | rebuilt if needed |
| Tool metadata cache | `chrome.storage.session` | fast UI load |
| Chat history | `chrome.storage.session` | ephemeral and per-session |

---

## Security Boundaries

### Host Permissions

HTTP MCP servers require origin access. The extension requests origin permissions dynamically for custom servers where possible.

### Tool Confirmation

Write-capable tools are never assumed safe just because the server exposes them.

The extension may require confirmation based on:
- tool name heuristics
- preset metadata
- user policy

### No Arbitrary Local Execution in MV3

Direct process spawning is outside the extension runtime.
That capability only exists through the optional desktop companion.

---

## Failure Modes

### Connection Test Fails

Possible causes:
- missing host permission
- invalid auth
- server does not speak MCP correctly
- server rejects the extension origin
- server is offline

### Tool Discovery Succeeds but UX Is Partial

This is expected when:
- a preset server exposes only some tool groups
- the user blocked certain tools
- the server runs in read-only mode

### AI Turn Cannot Use a Tool

Possible causes:
- tool disabled by policy
- server disconnected
- auth expired
- schema/tool mismatch after server update

The broker surfaces these conditions as explicit tool errors.

---

## Suggested Project Structure

```text
my-workflow-ext/
├── manifest.json
├── src/
│   ├── background/
│   │   ├── index.ts
│   │   ├── message-router.ts
│   │   └── port-router.ts
│   ├── core/
│   │   ├── mcp/
│   │   │   ├── connection-manager.ts
│   │   │   ├── transport/
│   │   │   │   ├── http-client.ts
│   │   │   │   └── native-bridge.ts
│   │   │   ├── server-registry.ts
│   │   │   ├── tool-broker.ts
│   │   │   └── types.ts
│   │   ├── auth/
│   │   ├── ai/
│   │   └── storage/
│   ├── presets/
│   │   └── atlassian/
│   ├── popup/
│   ├── sidepanel/
│   └── options/
└── docs/
```

For MCP client implementation details, see `docs/09-mcp-client-strategy.md`.
For user onboarding flows, see `docs/10-onboarding-ux.md`.
