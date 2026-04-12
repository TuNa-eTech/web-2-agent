# Confluence Features - Atlassian Preset

## Purpose

This document describes how Confluence functionality appears in the extension when the user connects an Atlassian MCP server such as `mcp-atlassian`.

The extension does **not** implement Confluence storage formats, REST endpoints, or versioning logic directly.
It uses the tools discovered from the connected MCP server and layers a better browser UX on top.

---

## What the Extension Owns

For Confluence workflows, the extension is responsible for:

- server setup and connection guidance
- connection testing
- tool discovery and grouping
- exposing Confluence actions in popup and side panel
- sending Confluence-capable tools to the AI assistant
- enforcing per-tool policy and confirmations

The extension does **not** own:
- Confluence API translation
- storage-format conversion logic inside the server
- page versioning semantics
- Cloud vs Server/Data Center compatibility details

---

## Core Confluence Tool Families

The preset should organize discovered Confluence tools into families:

- Search
- Pages
- Comments
- Labels
- Navigation / page tree
- History / diff
- Attachments
- Analytics
- User search

These are UI groupings only.
The actual source of truth remains the tools exposed by the server.

---

## Quick Actions and Required Tools

| UI Feature | Required Tool(s) | Notes |
|------------|------------------|-------|
| Confluence search | `confluence_search` | baseline page lookup |
| Open page detail | `confluence_get_page` | can power a side-panel detail view |
| Create page | `confluence_create_page` | write-capable, confirmation optional by policy |
| Update page | `confluence_update_page` | should surface version conflict errors clearly |
| Page comments | `confluence_get_comments`, `confluence_add_comment` | comment tools can be shown independently |
| Labels | `confluence_get_labels`, `confluence_add_label` | hidden if label tools missing |
| Page tree | `confluence_get_space_page_tree` or child-page tools | depends on discovered server capabilities |
| Attachments | attachment family tools | optionally hidden behind advanced UI |

The UI should remain usable even when only part of this matrix is available.

---

## AI Workflows with Confluence

Once Confluence tools are discovered, the AI assistant can support workflows such as:

- find relevant documentation
- summarize a page
- compare or audit documentation history
- draft a new page
- append notes or comments
- collect material from Jira and publish release notes

The key design rule is that the AI uses **currently available tools**, not a fixed hard-coded Confluence capability set.

---

## Safety Rules for Confluence

### Read-Like

Examples:
- `confluence_search`
- `confluence_get_page`
- `confluence_get_comments`
- `confluence_get_page_history`

Default behavior:
- allow without confirmation unless user policy overrides it

### Write-Like

Examples:
- `confluence_create_page`
- `confluence_update_page`
- `confluence_add_comment`
- `confluence_add_label`

Default behavior:
- may require confirmation when called by AI
- should always be clearly attributed to the source server

### Destructive

Examples:
- `confluence_delete_page`
- `confluence_delete_attachment`

Default behavior:
- explicit confirmation required

---

## Recommended Onboarding

For users new to the extension:

1. Connect the Atlassian server
2. Test the connection
3. Start with search and page-read tools
4. Verify the returned pages and spaces are correct
5. Enable page-write and attachment tools after trust is established

This is especially important for Confluence because write tools can affect shared documentation.

---

## UX Expectations for Confluence

When a Confluence-capable server is connected, the extension should show:

- whether Confluence search is available
- whether write tools are enabled
- whether attachments are supported
- which spaces or pages the server can access, when discoverable
- whether the server is currently healthy

That gives the user actionable confidence without exposing unnecessary protocol noise.

---

## Compatibility Notes

Compatibility is inherited from the connected server.

For `mcp-atlassian`, the extension should treat Confluence capability as:
- dynamic
- server-defined
- discoverable at runtime

The extension should avoid promises like "we implement all Confluence endpoints ourselves".
