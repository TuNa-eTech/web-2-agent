# Implementation Phases

For the execution-spec version of this roadmap, see the docs pack in `docs/implementation-plan/`.

## Phase Overview

| Phase | Scope | Key Deliverables |
|-------|-------|------------------|
| **Phase 1** | HTTP-first MCP foundation | server registry, connection test, tool discovery, AI chat |
| **Phase 2** | Better server management | presets, import/export, per-tool policy, richer preset UX |
| **Phase 3** | Local MCP and enterprise polish | desktop companion for `stdio`, better auth, operational hardening |

---

## Phase 1: HTTP-First MCP MVP

### Milestone 1.1: Extension Foundation

**Deliverables**
- Vite + CRXJS + React + TypeScript scaffold
- popup, side panel, options/settings surfaces
- background service worker with message and port routing

**Core files**
```text
manifest.json
package.json
vite.config.ts
src/background/index.ts
src/background/message-router.ts
src/background/port-router.ts
src/popup/
src/sidepanel/
src/options/
```

**Acceptance Criteria**
- extension loads in Chrome
- popup opens
- side panel opens
- background service worker handles one-shot messages and streaming ports

---

### Milestone 1.2: Server Registry and Secure Storage

**Deliverables**
- persistent server profile storage
- encrypted auth storage
- user preferences
- host-permission helpers

**Core files**
```text
src/core/storage/
src/core/auth/
src/core/mcp/server-registry.ts
src/core/mcp/permission-manager.ts
```

**Acceptance Criteria**
- user can save one or more server profiles
- secrets are encrypted before storage
- custom server origins can request permission dynamically

---

### Milestone 1.3: MCP HTTP Runtime

**Deliverables**
- HTTP transport integration
- connection manager
- initialize / tools/list / tools/call support
- session and reconnect handling

**Core files**
```text
src/core/mcp/connection-manager.ts
src/core/mcp/transport/http-client.ts
src/core/mcp/types.ts
src/core/mcp/errors.ts
```

**Acceptance Criteria**
- extension can connect to a Streamable HTTP MCP server
- tool discovery works
- tool calls work from the background service worker
- disconnected or invalid sessions can be recovered cleanly

---

### Milestone 1.4: Connection Test UX

**Deliverables**
- Add Server flow
- Test Connection button
- status display
- discovered tool list

**Core files**
```text
src/options/pages/Servers.tsx
src/options/components/ServerForm.tsx
src/options/components/ConnectionTestCard.tsx
src/shared/hooks/useServers.ts
```

**Acceptance Criteria**
- user can add a server
- user can run a connection test
- tool count and discovered tool names are visible
- failures are explained as permission/auth/transport/tool errors

---

### Milestone 1.5: Tool Broker

**Deliverables**
- namespaced tool ids
- allow/deny policy
- confirmation policy
- unified execution path for quick actions and AI

**Core files**
```text
src/core/mcp/tool-broker.ts
src/core/mcp/tool-policy.ts
src/core/mcp/tool-normalizer.ts
```

**Acceptance Criteria**
- multiple connected servers can coexist without tool name collisions
- blocked tools are hidden from AI and preset UI
- destructive tools can require confirmation

---

### Milestone 1.6: Atlassian Preset MVP

**Deliverables**
- Atlassian preset setup flow
- Atlassian quick actions
- tool grouping for Jira and Confluence

**Core files**
```text
src/presets/atlassian/
src/popup/pages/QuickActions.tsx
src/sidepanel/pages/PresetTools.tsx
```

**Acceptance Criteria**
- user can choose the Atlassian preset during setup
- preset recognizes common Jira and Confluence tool names
- quick actions unlock only when required tools exist

---

### Milestone 1.7: AI Chat with Dynamic MCP Tools

**Deliverables**
- AI provider adapters
- dynamic tool list from the broker
- streaming side-panel chat
- inline tool activity cards

**Core files**
```text
src/core/ai/ai-service.ts
src/core/ai/adapters/
src/sidepanel/pages/Chat.tsx
src/shared/hooks/useAIChat.ts
```

**Acceptance Criteria**
- AI can call discovered MCP tools
- chat works with OpenAI, Gemini, and Claude
- tool activity is visible in the UI
- tool execution uses broker policies

---

## Phase 2: Better Server Management and Richer Presets

### Milestone 2.1: IDE-Like Config Import / Export

**Deliverables**
- import JSON configs in familiar MCP format
- export user-configured profiles
- preserve unsupported `stdio` configs for later use

**Acceptance Criteria**
- HTTP configs can be imported and tested immediately
- `stdio` configs are preserved but clearly marked unsupported until companion install

---

### Milestone 2.2: Per-Tool Permissions and Profiles

**Deliverables**
- tool-level toggles
- read-only profiles
- confirmation profiles
- default templates for common server types

**Acceptance Criteria**
- user can restrict AI to read-only tools
- user can disable individual write tools
- profile changes take effect without rebuilding the extension

---

### Milestone 2.3: Richer Atlassian Preset UX

**Deliverables**
- better Jira issue forms
- richer Confluence page flows
- server capability badges
- tool-family summaries

**Acceptance Criteria**
- preset UX degrades gracefully when some tools are missing
- users understand exactly which capabilities are live

---

### Milestone 2.4: Optional MCP Resources / Prompts

**Deliverables**
- inspect server resources and prompts when available
- use them selectively in AI workflows

**Acceptance Criteria**
- resources/prompts remain optional
- tools continue to be the main MVP path

---

## Phase 3: Local MCP and Enterprise Polish

### Milestone 3.1: Desktop Companion for `stdio`

**Deliverables**
- native messaging host
- local process bridge
- support for `command`, `args`, and `env`

**Acceptance Criteria**
- extension can connect to a local stdio MCP server through the companion
- local server lifecycle is visible to the user
- failures in the companion are surfaced clearly

---

### Milestone 3.2: Better Auth and Operations

**Deliverables**
- improved OAuth support for MCP HTTP servers
- better reconnection flows
- optional org-wide deployment patterns

**Acceptance Criteria**
- auth failures can be recovered without deleting the profile
- enterprise users can standardize preset connections

---

### Milestone 3.3: Operational Hardening

**Deliverables**
- metrics / logging
- better error taxonomy
- stale-session recovery
- upgrade safety for changing upstream tool catalogs

**Acceptance Criteria**
- extension handles common disconnect and schema-change cases without breaking UX

---

## Recommended Build Order

1. Extension foundation
2. Secure storage + server registry
3. HTTP MCP runtime
4. Connection test UX
5. Tool broker
6. Atlassian preset
7. AI chat
8. Import/export and policy controls
9. Desktop companion

This keeps the early product focused on the user’s highest-value path:
**configure an MCP server, verify it works, and use it immediately.**
