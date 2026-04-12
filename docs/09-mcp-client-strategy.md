# MCP Client Strategy

## Problem

The extension needs to act as an MCP client inside a Chrome MV3 background service worker. This environment has constraints:

- No Node.js APIs (no `fs`, `net`, `child_process`)
- Service worker can terminate after ~30 seconds of inactivity
- `fetch()` and SSE are available but behave differently than in Node.js
- Bundle size matters for extension performance

---

## Decision: SDK-First with Lightweight Fallback

### Primary: Try `@modelcontextprotocol/sdk`

The official TypeScript SDK provides `StreamableHTTPClientTransport` which uses `fetch()` internally.

**How to use in extension:**
```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const transport = new StreamableHTTPClientTransport(
  new URL("https://mcp.example.com/mcp"),
  { requestInit: { headers: { Authorization: "Bearer <token>" } } }
);

const client = new Client({ name: "my-workflow-ext", version: "1.0.0" });
await client.connect(transport);

const tools = await client.listTools();
const result = await client.callTool({ name: "jira_search", arguments: { jql: "..." } });
```

**Risks and mitigations:**

| Risk | Mitigation |
|------|-----------|
| SDK imports Node.js server modules | Use deep imports (`/client/index.js`) to avoid server code. Verify tree-shaking in Vite build. |
| SSE handling differs in service worker | SDK's `StreamableHTTPClientTransport` uses `fetch()` for POST and response streaming, not `EventSource`. Should work in SW. |
| Bundle size too large | Measure after build. If >50KB gzipped for client-only code, switch to fallback. |

### Fallback: Lightweight Custom MCP Client

If the SDK has compatibility issues, implement a minimal client (~300 LOC) that covers exactly what the extension needs:

```typescript
class MCPClient {
  private sessionId?: string;

  constructor(
    private url: string,
    private headers: Record<string, string> = {}
  ) {}

  async initialize(): Promise<ServerInfo> {
    const response = await this.request("initialize", {
      protocolVersion: "2025-03-26",
      clientInfo: { name: "my-workflow-ext", version: "1.0.0" },
      capabilities: {}
    });
    this.sessionId = response.headers.get("mcp-session-id") ?? undefined;
    await this.notify("notifications/initialized", {});
    return response.json();
  }

  async listTools(): Promise<Tool[]> {
    const result = await this.request("tools/list", {});
    return result.tools;
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    return this.request("tools/call", { name, arguments: args });
  }

  private async request(method: string, params: unknown): Promise<any> {
    const body = {
      jsonrpc: "2.0",
      id: crypto.randomUUID(),
      method,
      params
    };
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      ...this.headers
    };
    if (this.sessionId) {
      headers["mcp-session-id"] = this.sessionId;
    }
    const res = await fetch(this.url, { method: "POST", headers, body: JSON.stringify(body) });
    if (!res.ok) throw new MCPError(res.status, await res.text());

    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("text/event-stream")) {
      return this.parseSSEResponse(res);
    }
    return (await res.json()).result;
  }

  private async notify(method: string, params: unknown): Promise<void> {
    await fetch(this.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...this.headers,
        ...(this.sessionId ? { "mcp-session-id": this.sessionId } : {})
      },
      body: JSON.stringify({ jsonrpc: "2.0", method, params })
    });
  }

  private async parseSSEResponse(res: Response): Promise<any> {
    // Parse SSE stream from response body
    // Extract JSON-RPC result from event data
  }
}
```

This is sufficient for Phase 1 and avoids any Node.js dependency risk.

---

## Connection Lifecycle

### On-Demand Connections

The extension does **not** maintain persistent connections.

```
User action (search, chat, quick action)
  │
  ├── Check cached tools in chrome.storage.session
  │   ├── Cache hit + server was recently healthy → use cached tools
  │   └── Cache miss or stale → reconnect
  │
  ├── Reconnect if needed:
  │   1. Create transport with stored auth
  │   2. Send initialize
  │   3. Send notifications/initialized
  │   4. Call tools/list
  │   5. Cache tools + update server status
  │
  └── Execute tools/call as needed
```

### Why Not Persistent

- Service workers terminate after ~30s of inactivity
- Persistent SSE connections would break on every termination
- On-demand connections are simpler and more resilient
- Tool metadata changes rarely; caching is effective

### Keeping Service Worker Alive

When the side panel is open and AI chat is streaming:
- `chrome.runtime.Port` connection keeps the SW alive
- Port disconnects when side panel closes
- SW can safely terminate; next interaction will reconnect

---

## Tool Metadata Caching

```
tools/list response
  │
  ▼
chrome.storage.session (per server)
  │
  │  Stored:
  │  - tool definitions (name, description, inputSchema)
  │  - last refresh timestamp
  │  - server info
  │
  │  TTL: 5 minutes (configurable)
  │  Invalidated: manual refresh, server reconnect
  │
  ▼
Tool Broker reads from cache
  │
  ▼
AI Service receives normalized tool list
```

---

## Error Recovery

| Error | Recovery |
|-------|----------|
| `fetch()` network error | Retry with backoff (max 3 attempts) |
| HTTP 401/403 | Mark server as auth-failed, prompt re-auth |
| HTTP 404 (server gone) | Mark server as unreachable |
| Invalid JSON-RPC response | Log error, mark degraded |
| Session expired (no mcp-session-id) | Re-initialize |
| Service worker restart | Reconnect on next user action |

---

## Build Verification

Before shipping, verify:

1. `npm run build` produces no Node.js import warnings
2. Extension loads and background SW initializes without errors
3. `tools/list` works against a local `mcp-atlassian --transport streamable-http`
4. `tools/call` works for at least `jira_search`
5. Bundle size for MCP client code is under 50KB gzipped
