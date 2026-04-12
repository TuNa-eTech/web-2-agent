# Standard Project Structure

## Purpose

This document defines the recommended folder structure for the Chrome extension codebase.

It is optimized for:
- Manifest V3
- Vite + CRXJS
- popup + side panel + options page
- MCP-first architecture
- long-term maintainability

The goal is to keep **runtime boundaries** and **product boundaries** obvious:
- extension entrypoints stay isolated
- domain logic stays reusable
- preset-specific code does not leak into the core

---

## Design Principles

### 1. Separate UI Surfaces by Entry Point

Use different folders for:
- popup
- side panel
- options
- background service worker

These surfaces have different lifecycle constraints and should not share page-specific code directly.

### 2. Keep Domain Logic out of React Entry Points

Anything that can run without React or DOM should live under `src/core/`.

Examples:
- MCP connection management
- tool brokering
- auth state
- encrypted storage
- AI orchestration

### 3. Make Presets Additive

Atlassian-specific helpers should live under `src/presets/atlassian/`, not inside `src/core/`.

That keeps the runtime generic enough for future MCP servers.

### 4. Treat the Side Panel as the Main Workspace

Per the extension UI rules:
- popup is for quick, one-shot actions
- side panel is for persistent workflows like AI chat and tool activity

### 5. Keep Settings as a First-Class Surface

This project’s settings are not "simple options".
They include:
- multiple server profiles
- auth
- connection testing
- tool policy

So the options area should be treated like a real app surface, not a tiny embedded form.

---

## Recommended Top-Level Tree

```text
my-workflow-ext/
├── public/
│   └── icons/
├── src/
│   ├── background/
│   ├── popup/
│   ├── sidepanel/
│   ├── options/
│   ├── core/
│   ├── presets/
│   └── shared/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── scripts/
├── docs/
├── manifest.config.ts
├── vite.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## Source Tree

```text
src/
├── background/
│   ├── index.ts
│   ├── message-router.ts
│   ├── port-router.ts
│   └── alarm-router.ts
│
├── popup/
│   ├── index.html
│   ├── main.tsx
│   ├── App.tsx
│   ├── pages/
│   └── components/
│
├── sidepanel/
│   ├── index.html
│   ├── main.tsx
│   ├── App.tsx
│   ├── pages/
│   └── components/
│
├── options/
│   ├── index.html
│   ├── main.tsx
│   ├── App.tsx
│   ├── pages/
│   └── components/
│
├── core/
│   ├── ai/
│   ├── auth/
│   ├── mcp/
│   ├── messaging/
│   ├── storage/
│   ├── permissions/
│   ├── telemetry/
│   └── utils/
│
├── presets/
│   └── atlassian/
│       ├── config/
│       ├── capability-map/
│       ├── quick-actions/
│       ├── prompts/
│       └── ui/
│
└── shared/
    ├── components/
    │   └── ui/
    ├── hooks/
    ├── lib/
    ├── styles/
    ├── constants/
    ├── schemas/
    └── types/
```

---

## Folder Responsibilities

### `src/background/`

Contains service-worker-only entry code.

Put here:
- Chrome runtime listeners
- message and port handlers
- alarm handlers
- service bootstrap

Do not put here:
- preset logic
- React UI code
- product business logic that belongs in `core`

Keep these files thin. They should delegate quickly to `core`.

### `src/popup/`

Use for short-lived, quick actions.

Put here:
- compact search entry
- status snapshot
- shortcuts to full workflows

Do not put here:
- long-running chat state
- multi-step configuration flows

### `src/sidepanel/`

This is the main workspace.

Put here:
- AI chat
- tool activity timeline
- result viewers
- persistent contextual workflows

Design it for variable width and long sessions.

### `src/options/`

Use this as the configuration console.

Put here:
- server registry management
- connection tests
- auth flows
- tool policy and permissions
- advanced diagnostics

Because this product has non-trivial configuration, `options` should be a full page, not a tiny embedded settings sheet.

### `src/core/`

Pure or mostly pure application logic.

Recommended modules:

#### `src/core/mcp/`

- connection manager
- transport wrappers
- tool broker
- tool normalization
- server registry
- MCP-specific types

#### `src/core/ai/`

- provider adapters
- chat orchestration
- prompt assembly
- streaming state helpers

#### `src/core/auth/`

- encrypted secret handling
- OAuth state
- per-server auth models

#### `src/core/storage/`

- `chrome.storage` wrappers
- cache helpers
- migrations

#### `src/core/messaging/`

- message contracts
- request/response helpers
- port event typing

#### `src/core/permissions/`

- host permission checks
- origin request helpers

#### `src/core/telemetry/`

- local diagnostics
- dev logging
- optional metrics hooks

### `src/presets/`

Preset-specific code only.

For Atlassian:
- map discovered tool names to product capabilities
- define quick actions
- group tool families for UI
- add preset-specific prompting hints

Do not place generic MCP or AI code here.

### `src/shared/`

Shared UI and browser-safe helpers.

Use it for:
- reusable components
- hooks that bridge UI to background messaging
- common schemas and types used by multiple entrypoints
- global styles and tokens

If something is only used by one surface, keep it local to that surface instead of promoting it too early.

---

## Naming Conventions

### Files

- Use `kebab-case` for non-component files:
  - `message-router.ts`
  - `tool-broker.ts`
  - `server-registry.ts`
- Use `PascalCase` for React components:
  - `ServerCard.tsx`
  - `ChatComposer.tsx`
  - `ConnectionStatusBadge.tsx`

### Folders

- Use short, role-based folder names
- Prefer nouns over verbs:
  - `permissions/`
  - `storage/`
  - `quick-actions/`

### Types

- Put shared domain types close to the owning module
- Only lift types into `src/shared/types/` when they are truly cross-cutting

---

## Dependency Rules

Use these import boundaries:

### Allowed

- `background` -> `core`, `shared`
- `popup` -> `shared`, `core/messaging` through hooks
- `sidepanel` -> `shared`, `core/messaging` through hooks
- `options` -> `shared`, `core/messaging` through hooks
- `presets` -> `core`, `shared`
- `shared` -> `shared/lib`, `shared/constants`, `shared/schemas`

### Avoid

- `core` importing UI modules
- `shared` importing entrypoint-specific pages
- one entrypoint importing another entrypoint’s components directly
- `presets` becoming a dumping ground for generic utilities

Keep the dependency direction flowing inward toward `core`, never the reverse.

---

## Testing Structure

```text
tests/
├── unit/
│   ├── core/
│   ├── presets/
│   └── shared/
├── integration/
│   ├── background/
│   ├── mcp/
│   └── ai/
└── e2e/
    ├── popup/
    ├── sidepanel/
    └── options/
```

### Unit tests

Focus on:
- tool normalization
- policy rules
- auth helpers
- storage adapters
- preset capability mapping

### Integration tests

Focus on:
- background-to-core wiring
- MCP transport behavior
- AI + broker orchestration

### E2E tests

Focus on:
- add server flow
- test connection flow
- tool execution from UI
- side panel chat behavior

---

## Config Files

### `manifest.config.ts`

Prefer a typed manifest source rather than a hand-maintained JSON manifest when using Vite + CRXJS.

Benefits:
- environment-aware values
- easier path composition
- less duplication

### `vite.config.ts`

Keep build config at root.
Do not scatter bundler config inside `src/`.

### `tsconfig.json`

Use path aliases carefully.
Keep them shallow and obvious, for example:

```json
{
  "compilerOptions": {
    "paths": {
      "@core/*": ["src/core/*"],
      "@shared/*": ["src/shared/*"],
      "@presets/*": ["src/presets/*"]
    }
  }
}
```

Do not create too many aliases.

---

## What Not to Do

- Do not put all extension code under one flat `src/` directory
- Do not mix React page code with service worker logic
- Do not bury all business logic inside hooks
- Do not let preset code leak into the generic MCP runtime
- Do not make popup the primary workflow surface for long-lived tasks

---

## Recommended First Scaffold

If starting from an empty repo, create these folders first:

```text
public/icons
src/background
src/popup/pages
src/popup/components
src/sidepanel/pages
src/sidepanel/components
src/options/pages
src/options/components
src/core/ai
src/core/auth
src/core/mcp
src/core/messaging
src/core/permissions
src/core/storage
src/presets/atlassian
src/shared/components/ui
src/shared/hooks
src/shared/lib
src/shared/styles
tests/unit
tests/integration
tests/e2e
scripts
```

That gives you enough structure to start building without committing to premature subfolders.
