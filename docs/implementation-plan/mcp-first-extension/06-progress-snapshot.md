# Progress Snapshot

Snapshot date: 2026-04-12

## Completed Workstreams

- Foundation:
  - root Vite + CRXJS scaffold added
  - MV3 manifest source added
  - background bootstrap and routing skeleton added
  - canonical shared contracts added under `src/shared/types/`
- Config and Secure Storage:
  - raw JSON-first options console implemented
  - config validation, redaction, encryption, and split persistence added
  - manual connection test controls added to the Server Connections dashboard
- Runtime and Broker:
  - duplicate contracts removed from runtime code
  - runtime helpers now import canonical shared contracts
- AI and Side Panel:
  - provider adapter scaffolds added
  - chat orchestration and side-panel UI shells added
- Desktop Companion:
  - native messaging host, process registry, diagnostics, and packaging scripts added
  - shared protocol shapes re-exported from canonical contracts
- Atlassian Preset and Popup:
  - Atlassian capability mapping, labels, prompt hints, and config examples added
  - popup renders status from persisted state and exposes quick-action plus navigation shortcuts
- QA and Release:
  - Phase 2 and 3 planning scaffolds expanded
  - release checklist and verification report templates added
  - test-plan scaffolds and helper scripts added

## Coordinator Integration Fixes

- Reconciled UI stack by adding React build support in root tooling.
- Replaced vanilla options and side-panel entrypoints with React mount points.
- Replaced popup demo state with storage-backed popup state loading.
- Fixed companion typing so `stdio`-only process code narrows from the shared config union.
- Completed the first successful build pass for both extension and companion.
- Added a first real runtime slice for `save config -> test connections -> persist health/tool catalog -> popup reads live state`.
- Recorded workstream ownership and verification order in plan docs.

## Open Integration Checks

- Verify popup, options, and side panel still match their locked responsibilities after merge.
- Run verification against [05-verification-matrix.md](./05-verification-matrix.md).
