# Onboarding UX

## Problem

The MCP-first approach means users must configure at least one MCP server before the extension is useful. This is more friction than a standalone extension. The onboarding must make this feel fast and simple.

---

## First-Time User Flow

```
Install extension
  │
  ▼
Open popup → "Welcome! Let's connect your first server."
  │
  ├── [Atlassian Preset] ← recommended, prominent
  ├── [Custom MCP Server]
  └── [Import from IDE config]
```

### Path 1: Atlassian Preset (most users)

```
Step 1: Choose setup mode
  ├── [A] Use a managed endpoint (easiest)
  ├── [B] Self-hosted HTTP server
  └── [C] Local stdio server (coming soon)

Step 2A (managed):
  → Enter managed endpoint URL
  → Enter auth token
  → Test Connection
  → Done ✓

Step 2B (self-hosted):
  → Show quick-start command:
     "uvx mcp-atlassian --transport streamable-http --port 9000"
  → User enters http://localhost:9000/mcp
  → Configure Atlassian credentials in server env
  → Test Connection
  → Done ✓

Step 2C (local stdio):
  → Show: "Requires desktop companion (coming in Phase 3)"
  → Option to save config for later
```

### Path 2: Custom MCP Server

```
Step 1: Enter server URL
  → e.g., https://my-mcp-server.com/mcp

Step 2: Configure auth (optional)
  → Add custom headers
  → Or: no auth

Step 3: Grant host permission
  → chrome.permissions.request() for the origin

Step 4: Test Connection
  → Show discovered tools
  → Done ✓
```

### Path 3: Import IDE Config

```
Step 1: Paste or upload JSON config
  {
    "mcpServers": {
      "atlassian": {
        "transport": "streamable-http",
        "url": "https://...",
        "headers": { "Authorization": "Bearer ..." }
      }
    }
  }

Step 2: Extension parses and creates server profiles
  → HTTP servers: ready to test
  → stdio servers: saved but marked inactive

Step 3: Test each HTTP server
  → Done ✓
```

---

## Setup Modes for Atlassian

### Mode A: Managed Endpoint

**Target**: Non-technical users, teams with centralized MCP deployment.

The user provides:
- A URL to a running mcp-atlassian HTTP server
- Auth credentials (typically a Bearer token)

The extension:
- Tests the connection
- Discovers tools
- Ready to use

**Who runs the server?** The user's team/company deploys mcp-atlassian as a shared service. This is the simplest path for end users but requires someone to host the server.

### Mode B: Self-Hosted HTTP Server

**Target**: Technical users who want full control.

Quick-start helpers the extension should provide:

**One-liner (requires Python/uv):**
```bash
uvx mcp-atlassian \
  --transport streamable-http \
  --port 9000 \
  --jira-url https://your-domain.atlassian.net \
  --jira-username your@email.com \
  --jira-api-token YOUR_API_TOKEN
```

**Docker (no Python needed):**
```bash
docker run -p 9000:9000 \
  -e JIRA_URL=https://your-domain.atlassian.net \
  -e JIRA_USERNAME=your@email.com \
  -e JIRA_API_TOKEN=YOUR_API_TOKEN \
  ghcr.io/sooperset/mcp-atlassian \
  --transport streamable-http --port 9000
```

**Docker Compose (persistent):**
```yaml
# docker-compose.yml
services:
  mcp-atlassian:
    image: ghcr.io/sooperset/mcp-atlassian
    ports:
      - "9000:9000"
    environment:
      - JIRA_URL=https://your-domain.atlassian.net
      - JIRA_USERNAME=your@email.com
      - JIRA_API_TOKEN=${JIRA_API_TOKEN}
    command: ["--transport", "streamable-http", "--port", "9000"]
    restart: unless-stopped
```

The extension should:
- Show these commands in a copyable format
- Auto-fill `http://localhost:9000/mcp` as the server URL
- Provide a "Test Connection" button
- Link to mcp-atlassian docs for advanced configuration

### Mode C: Local stdio (Phase 3)

Requires the desktop companion app. The extension should:
- Explain why this requires a separate install
- Allow saving the config now for future use
- Link to companion download when available

---

## AI Provider Setup

After connecting at least one MCP server:

```
"Now let's configure your AI assistant."
  │
  ├── Choose provider: [OpenAI] [Gemini] [Claude]
  │
  ├── Enter API key
  │   → Key is encrypted and stored locally
  │   → Never sent anywhere except to the chosen provider
  │
  ├── Select model (optional, has sensible defaults)
  │
  └── Done ✓ → Open AI chat in side panel
```

---

## Connection Test UX

The test connection flow should be informative and actionable:

```
┌──────────────────────────────────────┐
│  Testing: https://mcp.example.com    │
│                                      │
│  ✓ Host permission granted           │
│  ✓ Server reachable                  │
│  ✓ MCP initialized                   │
│  ✓ 47 tools discovered               │
│                                      │
│  Jira: 35 tools available            │
│  Confluence: 12 tools available      │
│                                      │
│  [View All Tools]  [Save & Enable]   │
└──────────────────────────────────────┘
```

On failure:

```
┌──────────────────────────────────────┐
│  Testing: https://mcp.example.com    │
│                                      │
│  ✓ Host permission granted           │
│  ✗ Auth failed (HTTP 401)            │
│                                      │
│  Your auth token may be expired      │
│  or incorrect.                       │
│                                      │
│  [Update Auth]  [Retry]              │
└──────────────────────────────────────┘
```

---

## Empty States

### No servers connected
```
"Connect an MCP server to get started.
 The Atlassian preset is the easiest way to begin."

 [+ Add Atlassian Server]
 [+ Add Custom Server]
```

### Server connected but no AI key
```
"Your Atlassian server is connected! (47 tools ready)
 Add an AI API key to start chatting."

 [Configure AI Provider]
```

### Server disconnected
```
"atlassian-main is currently unreachable.
 Last connected: 2 hours ago."

 [Reconnect]  [Edit Settings]
```

---

## Progressive Disclosure

The extension should not overwhelm new users with all 70 tools.

**Level 1 (default):** Show preset quick actions only
- Search issues
- Recent work
- Quick create

**Level 2 (side panel):** AI chat with full tool access
- User asks natural language questions
- AI decides which tools to use

**Level 3 (settings):** Per-tool management
- Enable/disable individual tools
- Set confirmation policies
- View tool schemas

---

## Returning Users

After initial setup, the extension should:
- Auto-reconnect to saved servers on browser start (lazy, on first use)
- Show connection status in popup header
- Remember last-used AI provider and model
- Preserve chat history in session storage
