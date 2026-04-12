# My Workflow Ext - Overview

## Project Summary

**My Workflow Ext** is a Chrome Extension (Manifest V3) that acts as an MCP-native workspace inside the browser.

Instead of reimplementing Jira and Confluence APIs inside the extension, the product connects to one or more **MCP servers**, discovers their tools dynamically, and exposes those tools through:

- A lightweight popup for quick actions
- A side panel for AI chat and guided workflows
- A settings area for server setup, connection testing, and tool permissions

The first-class preset is **Atlassian via `mcp-atlassian`**. The architecture is intentionally generic so users can add other MCP servers later without requiring new extension code for each integration.

---

## Product Direction

1. **Reuse Existing MCP Servers** - Prefer mature upstream MCP servers over rebuilding their logic in TypeScript
2. **IDE-Like Setup** - Let users configure MCP servers in the extension similarly to IDE MCP settings
3. **Connection Confidence** - Users should be able to test a server, inspect available tools, and see whether it is usable before relying on it
4. **Tool Governance** - Users can enable/disable tools per server and control which tools the AI may call
5. **HTTP-First MVP** - Start with Streamable HTTP MCP servers, then add local `stdio` support through a desktop companion

---

## Goals

1. **Simple User Setup** - Add an MCP server, test it, and start using it in minutes
2. **Atlassian Preset** - Ship a polished preset for Jira and Confluence via `mcp-atlassian`
3. **Multi-Server Support** - Allow users to connect multiple MCP servers at once
4. **Multi-AI Support** - Users bring their own API keys for Gemini, OpenAI, or Claude
5. **Safety and Transparency** - Show server status, available tools, and require confirmation for risky actions

---

## Core Concepts

### 1. Server Preset

A preset is a guided setup flow for a known MCP server family.

Example:
- **Atlassian preset** for `mcp-atlassian`

The preset does not replace MCP. It simply:
- pre-fills expected configuration
- explains authentication requirements
- knows which tool groups unlock which UI features

### 2. Custom MCP Server

Users can add any MCP server the extension supports, starting with:
- `streamable-http` / remote HTTP MCP endpoints in Phase 1

Later phases add:
- `stdio` MCP servers through a desktop companion

### 3. Connection Profile

Each configured server is stored as a connection profile containing:
- name
- transport
- URL or command configuration
- auth method
- enabled/disabled state
- tool allowlist / denylist

### 4. Tool Broker

The extension does not hard-code product logic around Jira or Confluence APIs. It brokers tools exposed by connected MCP servers and presents them to:
- quick actions
- preset-specific flows
- AI models through function/tool calling

---

## Key User Flows

### Add Atlassian Preset

1. User chooses **Add Server**
2. User selects **Atlassian**
3. User enters MCP endpoint URL or chooses a managed endpoint
4. User configures auth headers or OAuth
5. Extension tests the server
6. Extension discovers available tools and suggests a default tool policy

### Add Custom MCP Server

1. User pastes a Streamable HTTP MCP URL
2. Extension requests host permission for that origin
3. User provides auth if required
4. Extension runs connection test
5. User reviews discovered tools and enables the server

### Test Connection

The extension validates:
- origin permission granted
- server responds to MCP initialization
- tool discovery works
- auth is valid
- the server is currently reachable

### Use Tools in AI Chat

1. User opens the side panel
2. User asks for a task in natural language
3. AI receives the currently allowed tools from connected servers
4. AI calls tools through the MCP broker
5. Extension streams results and shows tool activity inline

### Quick Actions for Known Presets

The popup can offer curated actions when a preset is connected.

For Atlassian this may include:
- search Jira issues
- open recent work
- quick-create an issue
- open Confluence search

These actions still execute through MCP tools exposed by the configured server.

---

## Non-Goals

- No full Jira/Confluence REST client implemented inside the extension
- No requirement to manually mirror every upstream MCP tool in extension code
- No arbitrary process execution directly inside the extension runtime
- No mandatory backend for the MVP
- No content-script UI injection into product pages

---

## Scope by Phase

### Phase 1

- Streamable HTTP MCP servers
- Atlassian preset
- Server registry
- Connection testing
- Tool discovery
- AI chat with dynamic tool calling

### Phase 2

- Better server management
- Import/export of IDE-like MCP configs
- Per-tool permissions and confirmation policies
- Optional support for MCP resources/prompts

### Phase 3

- Desktop companion for local `stdio` MCP servers
- Better enterprise auth flows
- Optional managed relay / hosted presets where justified
