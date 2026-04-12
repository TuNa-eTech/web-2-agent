# Agent Workstreams

This file records the current parallel execution split for the `mcp-first-extension` plan.

## Team

### Workstream A: Foundation

- Agent: `Locke`
- Task groups:
  - Task Group 1: Freeze Contracts and Scaffolding
  - Task Group 2: Extension Foundation
- Write ownership:
  - root build and extension config files
  - `public/`
  - `src/shared/`
  - `src/background/`
  - minimal bootstrap files for `src/popup/`, `src/sidepanel/`, `src/options/`

### Workstream B: Config and Secure Storage

- Agent: `Darwin`
- Task groups:
  - Task Group 3: Config Editor and Secure Storage
- Write ownership:
  - `src/options/`
  - `src/core/storage/`
  - `src/shared/components/`
  - `src/shared/hooks/`
  - `src/shared/lib/` for config-storage helpers only

### Workstream C: Desktop Companion

- Agent: `Carver`
- Task groups:
  - Task Group 4: Desktop Companion
- Write ownership:
  - `companion/`
  - companion install and registration helpers under `scripts/` if needed

### Workstream D: Runtime and Broker

- Agent: `Boyle`
- Task groups:
  - Task Group 5: Shared MCP Runtime
  - Task Group 6: Tool Broker and Policy
- Write ownership:
  - `src/core/mcp/`
  - `src/core/messaging/`
  - `src/core/permissions/`
  - `src/core/utils/` for runtime helpers only

### Workstream E: AI and Side Panel

- Agent: `Hilbert`
- Task groups:
  - Task Group 7: AI Integration
- Write ownership:
  - `src/core/ai/`
  - `src/sidepanel/`

### Workstream F: Atlassian Preset and Popup

- Agent: `Singer`
- Task groups:
  - Task Group 8: Atlassian Preset v1
- Write ownership:
  - `src/presets/atlassian/`
  - `src/popup/`

### Workstream G: QA and Release Coordination

- Agent: `Halley`
- Task groups:
  - Task Group 9: Phase 2 Follow-up
  - Task Group 10: Phase 3 Follow-up
  - test checklist
  - release gates
- Write ownership:
  - `tests/`
  - verification and release-tracking docs under `docs/implementation-plan/mcp-first-extension/`
  - repo-level non-companion helper scripts under `scripts/`

## Critical Path

1. Workstream A lands frozen contracts, root build config, and extension entry shells.
2. Workstreams B, C, and D build against the shared contracts.
3. Workstreams E and F layer on top of the runtime and broker interfaces from Workstream D.
4. QA and release coordination starts as soon as the first HTTP and `stdio` flows are assembled.

## Merge Order

1. Foundation
2. Companion
3. Config and Secure Storage
4. Runtime and Broker
5. AI and Side Panel
6. Atlassian Preset and Popup
7. QA and Release verification

## Non-overlap Rules

- Shared contracts live in one place only and are owned by Workstream A.
- Runtime transport selection belongs only to Workstream D.
- Any local `stdio` process logic belongs only to Workstream C.
- Preset capability mapping must stay outside generic MCP runtime code.
- Popup remains short-action-only.
- Options remains the full configuration console.
- Side panel remains the persistent AI and workflow surface.

## Deferred Follow-up

Task Groups 9 and 10, the test matrix, and release gates are assigned to the dedicated QA and packaging workstream.
