# Jira Features - Atlassian Preset

## Purpose

This document describes how Jira functionality is delivered in the extension when the user connects an **Atlassian MCP server**, typically `mcp-atlassian`.

The extension does **not** implement Jira REST logic directly.
It relies on whatever Jira tools the connected server exposes and adapts the UI around those tools.

---

## What the Extension Owns

For Jira workflows, the extension is responsible for:

- guiding the user through server setup
- testing the MCP connection
- discovering available Jira-related tools
- enabling quick actions when required tools are present
- exposing Jira tools to the AI assistant
- applying confirmation policy for risky operations

The extension is **not** responsible for:
- Jira REST endpoint compatibility
- Cloud vs Server/Data Center translation
- Jira-specific auth rules inside the MCP server
- upstream tool implementation details

Those remain the MCP server’s responsibility.

---

## Recommended Setup Modes

### 1. Managed / Remote HTTP Endpoint

Best user experience.

User provides:
- MCP URL
- auth token or OAuth flow

Best for:
- non-technical users
- shared company deployment
- minimal setup friction

### 2. Self-Hosted Local HTTP Server

User runs `mcp-atlassian` locally in `streamable-http` mode and connects the extension to `http://localhost:<port>/mcp`.

Best for:
- technical users
- local testing
- users who want direct control of the server

Recommended flags:
- `--transport streamable-http`
- `--stateless` when practical
- `READ_ONLY_MODE=true` for the initial connection test

### 3. Local `stdio` Server

Not part of the HTTP-only MVP.

This requires the future desktop companion because the extension cannot spawn local commands on its own.

---

## Jira Tool Families

The extension should group discovered Jira tools into user-facing families instead of showing a flat raw list first.

### Core Families

- Issues
- Search & fields
- Comments & worklogs
- Workflow / transitions
- Agile
- Links / versions / components
- Attachments
- Service desk
- Forms / metrics / development info

This grouping is a **presentation layer**. It should be derived from discovered tool names, not hard-coded assumptions about exact counts.

---

## Quick Actions and Required Tools

The popup can expose curated Jira actions when the connected server provides the required tools.

| UI Feature | Required Tool(s) | Notes |
|------------|------------------|-------|
| Quick issue search | `jira_search` | baseline Jira quick action |
| Recent work | `jira_search` or `jira_get_project_issues` | extension builds the JQL/query |
| Quick create issue | `jira_create_issue` | may also use `jira_search_fields` / `jira_get_field_options` for richer forms |
| Issue detail view | `jira_get_issue` | optional add-ons: transitions, worklog, comments |
| Add comment | `jira_add_comment` | hidden if server is read-only or tool blocked |
| Move issue status | `jira_get_transitions`, `jira_transition_issue` | confirmation recommended |
| Sprint actions | Agile family tools | only enabled when those tools are present |

If a tool is unavailable, the UI should gracefully degrade instead of failing.

---

## AI Workflows with Jira

The AI assistant can use Jira through the broker once the Jira tools are discovered and allowed.

Typical tasks:
- find issues by JQL
- summarize an issue
- create a bug or story
- add comments
- transition issues
- collect issues for sprint planning

The AI layer should not assume all Jira tools are present.
It should reason over the tools currently enabled for that server.

---

## Safety Rules for Jira

Jira tools should be treated with different risk levels.

### Read-Like

Examples:
- `jira_search`
- `jira_get_issue`
- `jira_get_worklog`
- `jira_get_user_profile`

Default behavior:
- allow without confirmation unless user policy says otherwise

### Write-Like

Examples:
- `jira_create_issue`
- `jira_update_issue`
- `jira_add_comment`
- `jira_transition_issue`

Default behavior:
- allow from quick actions
- optionally confirm when invoked by AI depending on policy

### High-Risk / Destructive

Examples:
- `jira_delete_issue`
- bulk mutation tools
- tools that can move many issues at once

Default behavior:
- always require explicit confirmation

---

## Read-Only Onboarding Recommendation

For the first setup, the preset should recommend a read-only posture:

1. Connect to a read-only server profile if available
2. Run connection test
3. Verify discovered tools and issue visibility
4. Only then enable write-capable tools

This lowers user anxiety and makes debugging easier.

---

## Compatibility Notes

The extension inherits Jira compatibility from the connected MCP server.

For `mcp-atlassian`, that generally means the server determines:
- Cloud vs Server/Data Center handling
- field mapping differences
- pagination behavior
- Jira auth strategy

The preset should therefore communicate compatibility as:
- **server capability**
- not **extension-owned API coverage**

---

## UX Expectations for Jira

When a Jira-capable server is connected, the extension should make it obvious:

- which server provides Jira access
- whether the server is connected right now
- how many Jira tools are available
- whether write tools are enabled
- which quick actions are unlocked

This is more useful to the user than listing raw protocol details.
