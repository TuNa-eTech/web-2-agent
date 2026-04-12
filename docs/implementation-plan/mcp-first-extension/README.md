# MCP-First Extension Plan

This folder is the execution spec for agents implementing the MCP-first Chrome extension.

## Reading Order

1. [01-requirements.md](./01-requirements.md)
2. [02-design.md](./02-design.md)
3. [03-tasks.md](./03-tasks.md)
4. [04-agent-workstreams.md](./04-agent-workstreams.md)
5. [05-verification-matrix.md](./05-verification-matrix.md)
6. [06-release-checklist.md](./06-release-checklist.md)
7. [07-verification-report.md](./07-verification-report.md)

## Intent

The implementation must follow this direction:
- Chrome extension is an MCP host/client, not an Atlassian REST reimplementation
- setup is raw-config-first with an IDE-like `mcpServers` document
- Phase 1 must support both:
  - HTTP MCP servers
  - local `stdio` MCP servers via desktop companion
- Atlassian is a first-class preset, but the runtime stays generic
- OpenAI, Gemini, and Claude are included in Phase 1

## Locked Decisions

- Extension stays at the current repo root
- Desktop companion is added as top-level `companion/`
- Companion stack is Node.js + TypeScript
- Companion release scope is macOS + Windows in the first shipping version
- Companion distribution supports both installer and manual install
- Options page is a full-page configuration console
- Popup is only for short actions
- Side panel is the main persistent workspace
- Tool namespacing format is `serverId__toolName`
- Native host id is `com.myworkflowext.native_bridge`

## Deliverable Shape

The implementation should be delivered in this order:
- contracts and runtime scaffolding
- extension shell and secure config flow
- desktop companion and native bridge
- MCP runtime and broker
- AI integration
- Atlassian preset and quick actions
- tests, packaging, and release gates
