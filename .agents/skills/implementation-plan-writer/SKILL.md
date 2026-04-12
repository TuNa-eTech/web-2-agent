---
name: implementation-plan-writer
description: Create or update a docs-based implementation plan pack for a repository. Use when users ask for an implementation plan, execution spec, roadmap docs, or a Requirements > Design > Tasks breakdown. Produces a slugged plan folder under docs/implementation-plan/<plan-slug>/ with README.md, 01-requirements.md, 02-design.md, and 03-tasks.md using relative links and task-to-design traceability.
---

# Implementation Plan Writer

Use this skill when the user wants a repo-local implementation plan that another engineer or agent can execute directly.

## Default output

- Default base folder: `docs/implementation-plan/`
- Default plan folder: `docs/implementation-plan/<plan-slug>/`
- If the user specifies another subfolder under `docs/`, keep the same pattern and create the plan in a slugged subfolder there
- Default file set inside the slugged folder:
  - `README.md`
  - `01-requirements.md`
  - `02-design.md`
  - `03-tasks.md`
- Default index file at the base folder:
  - `README.md`

If the slugged plan folder already exists, update it instead of creating a parallel duplicate.

## Slug rule

Every implementation plan must live in its own slugged folder.

Examples:

- `docs/implementation-plan/mcp-first-extension/`
- `docs/implementation-plan/browser-native-bridge/`
- `docs/implementation-plan/2026-04-12-mcp-first-extension/`

Do not write plan packs directly into `docs/implementation-plan/` without a plan slug unless the user explicitly asks for a single-file exception.

## Workflow

### 1. Ground in the repo

Before writing the plan:

- inspect existing docs, architecture notes, and source tree
- read build and runtime entrypoints when relevant
- identify current constraints, platform assumptions, and existing structure
- reuse stable terminology already present in the repo when it is still correct

The plan must be grounded in repo reality, not written as a generic template.

### 2. Write `01-requirements.md`

Capture the implementation target in decision-complete form:

- product goal
- primary outcomes
- in scope / out of scope
- target users or operators
- main user journeys
- functional requirements
- non-functional requirements
- acceptance criteria by phase if relevant
- locked assumptions and defaults

Keep it implementation-facing. Do not turn it into product marketing copy.

### 3. Write `02-design.md`

Describe the implementation design that satisfies the requirements:

- high-level architecture
- repo layout or package layout
- public contracts, interfaces, and types
- storage and security model
- runtime boundaries
- data flows
- UI surface responsibilities if there is UI
- integration points
- packaging and platform strategy if relevant

Every contract or runtime rule that tasks rely on must appear here once as the source of truth.

### 4. Write `03-tasks.md`

Turn the design into an execution checklist:

- implementation order is explicit
- group tasks by subsystem or workstream
- for each task group include:
  - `Design references`
  - `Checklist`
  - `Done when`
- add test checklist
- add release gates if the project needs them

Each checklist item should be concrete enough that someone can mark it done without interpretation.

## Traceability rules

The plan pack must support top-down execution:

- base-folder `README.md` acts as an index of available plans
- slug-folder `README.md` explains reading order
- `03-tasks.md` links each task group to the relevant sections in `02-design.md`
- tasks must not reference behavior that is missing from `02-design.md`
- `02-design.md` should not define contracts that never appear in tasks unless they are clearly future-phase only

## Link rules

Use relative Markdown links only.

Examples:

- same folder: `[02-design.md](./02-design.md)`
- same folder with heading: `[Tool Broker](./02-design.md#tool-broker)`
- docs-level file from a slug folder: `[09-project-structure.md](../../09-project-structure.md)`

Do not use:

- absolute filesystem paths
- raw URLs for repo-local docs
- mixed relative and absolute styles in the same plan pack

## Quality bar

The output should be optimized for handoff to another engineer or agent.

Required qualities:

- decision-complete
- concise but specific
- implementation-ordered
- internally consistent
- grounded in the current repo
- no unresolved core architecture choices left to the implementer

## Preferred file shapes

### base-folder `README.md`

Keep it short:

- explain that this is a plan index
- document the slugged folder convention
- list available plans

### slug-folder `README.md`

Keep it short:

- intent
- reading order
- locked decisions
- deliverable sequence

### `01-requirements.md`

Prefer short sections and flat bullets.

### `02-design.md`

Prefer:

- one heading per important design area
- code blocks for canonical types
- one canonical definition per contract

### `03-tasks.md`

Prefer checklists over paragraphs.

Use this pattern:

```md
## Task Group N: Name

### Design references

- [Relevant section](./02-design.md#relevant-section)

### Checklist

- [ ] Concrete implementation step
- [ ] Concrete implementation step

### Done when

- [ ] Observable completion condition
```

## Updating an existing plan

When the repo already contains a plan pack:

- preserve the established slug folder unless the user requests a rename
- update the base-folder index when adding a new plan
- update links to stay relative
- merge new scope into the existing structure instead of creating overlapping files
- keep headings stable when task links depend on them

## Avoid

- writing the plan as a vague roadmap with no executable tasks
- writing plan files directly into `docs/implementation-plan/` so future plans overwrite them
- file-by-file dump without architecture
- architecture with no checklists
- checklists with no design references
- absolute local links in Markdown
- duplicating the same contract in multiple files with slight variations
