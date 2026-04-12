# Extension-to-MCP Mapping

## Purpose

This document replaces the old REST endpoint mapping.

The extension no longer maps UI actions to Atlassian REST endpoints directly.
Instead, it maps:
- extension UX actions
- connection flows
- AI tool execution

to **standard MCP operations** and **discovered server tools**.

---

## Protocol Surface Used by the Extension

### Phase 1 Required

- `initialize`
- `notifications/initialized`
- `tools/list`
- `tools/call`

### Optional in Later Phases

- `resources/list`
- `resources/read`
- `prompts/list`
- `prompts/get`

The MVP should focus on tools because that unlocks both quick actions and AI workflows immediately.

---

## IDE-Like Config Import Model

The extension should accept a config model close to existing IDE MCP setups.

Example import shape:

```json
{
  "mcpServers": {
    "atlassian": {
      "transport": "streamable-http",
      "url": "https://mcp.example.com/mcp",
      "headers": {
        "Authorization": "Bearer <token>"
      }
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/Users/me/work"]
    }
  }
}
```

### MVP Behavior

| Imported Field | Extension Behavior |
|----------------|-------------------|
| `url` | supported for HTTP MCP |
| `headers` | supported and stored securely |
| `transport` | supported when value is `streamable-http` |
| `command` / `args` / `env` | stored but marked inactive until desktop companion exists |

This lets the extension feel familiar to IDE users without overpromising unsupported runtime behavior.

---

## Connection Test Sequence

When the user clicks **Test Connection**, the extension should run:

1. validate config locally
2. request/check host permission for the server origin
3. create transport
4. send `initialize`
5. send `notifications/initialized`
6. call `tools/list`
7. record:
   - server status
   - server info if available
   - tool count
   - tool names
   - auth / transport errors if any

There is no need for a custom "ping" endpoint when MCP initialization and tool discovery already prove usefulness.

---

## UI Action to MCP Operation Mapping

| Extension Action | MCP Operation(s) | Notes |
|------------------|------------------|-------|
| Save server config | none | local storage only |
| Test connection | `initialize`, `notifications/initialized`, `tools/list` | validates reachability and auth |
| Refresh tools | `tools/list` | updates cache after server changes |
| Execute quick action | `tools/call` | tool chosen by preset UX |
| AI chat turn | `tools/list` cache + `tools/call` | broker chooses allowed tools |
| Disable a tool | none | local broker policy only |
| Disconnect server | none | local state; may clear cached session |

---

## Tool Normalization Mapping

The extension should transform each discovered tool into an internal descriptor:

```ts
type DiscoveredTool = {
  serverId: string;
  originalName: string;
  namespacedName: string;
  description: string;
  inputSchema: unknown;
  enabled: boolean;
  risk: "read" | "write" | "unknown";
};
```

### Name Mapping Rule

| Source | Example |
|--------|---------|
| Server id | `atlassian-main` |
| Upstream tool | `jira_search` |
| Internal / AI-visible tool | `atlassian-main__jira_search` |

This rule must be deterministic and reversible.

---

## Atlassian Preset Mapping

The Atlassian preset should map friendly UI features to expected tool names.

| Preset UX Feature | Preferred Tool(s) | Fallback |
|-------------------|-------------------|----------|
| Jira quick search | `jira_search` | hide feature if absent |
| Recent issues | `jira_search` | `jira_get_project_issues` |
| Quick create issue | `jira_create_issue` | hide if absent |
| Issue detail | `jira_get_issue` | hide if absent |
| Confluence search | `confluence_search` | hide if absent |
| Page detail | `confluence_get_page` | hide if absent |
| Create page | `confluence_create_page` | hide if absent |

The preset should not depend on the exact upstream tool count.
It should only depend on the presence or absence of named capabilities.

---

## Auth Mapping

The extension applies auth at the connection profile level.

### HTTP Header Auth

Typical stored form:

```json
{
  "auth": {
    "type": "headers",
    "headers": {
      "Authorization": "Bearer <token>"
    }
  }
}
```

### OAuth-Aware MCP Servers

If a server supports HTTP auth flows:
- the extension stores the resulting tokens or auth state
- transport creation injects the current bearer token
- failed auth can trigger a reconnect / reauth path

---

## Status Model

Each server should expose a simple connection state in the UI:

| State | Meaning |
|-------|---------|
| `draft` | config exists but not tested |
| `connecting` | initialization in progress |
| `connected` | tools discovered and usable |
| `degraded` | partial success, some features unavailable |
| `failed` | connection or auth failure |
| `disabled` | intentionally turned off by user |

This status model is more important to the product than low-level transport details.

---

## Error Mapping

The extension should normalize errors from transport, auth, and tool execution into user-facing categories:

| Category | Typical Cause |
|----------|---------------|
| Permission error | host access not granted |
| Auth error | invalid header/token/OAuth state |
| Transport error | unreachable server, invalid MCP response |
| Policy error | tool blocked or confirmation denied |
| Tool error | server executed the tool and returned an error |

This helps the user understand whether they need to:
- change settings
- reauthenticate
- retry
- contact the server owner

---

## Deliberate Non-Mapping

The extension does **not** map:
- Jira tool names to REST endpoints
- Confluence tool names to REST endpoints
- server-specific implementation behavior

Those mappings remain upstream-server concerns.

This keeps the extension generic and reduces maintenance cost.
