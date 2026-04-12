# Release Checklist

This checklist records the minimum release gates and evidence for Phase 1.

## Pre-Release

- Confirm the verification matrix is current.
- Confirm test inventory IDs have owners and planned evidence.
- Confirm Phase 1 scope matches the requirements and design docs.
- Confirm no scope creep into Phase 2 or Phase 3.

## Release Gates

- No plaintext secrets in persisted storage.
- Extension package is Chrome Web Store compatible.
- Companion install path exists for macOS.
- Companion install path exists for Windows.
- Raw JSON setup is usable for power users.
- Atlassian preset works with standard `mcpServers` config.
- OpenAI works through the broker.
- Gemini works through the broker.
- Claude works through the broker.
- Popup, side panel, and options responsibilities remain separate.

## Evidence Required

- Verification report completed and linked.
- One HTTP MCP tool call capture.
- One local `stdio` tool call capture.
- Confirmation gate capture for destructive tool calls.
- Config round-trip capture showing redaction and encryption behavior.

## Sign-Off

- QA owner signs after completing the verification matrix.
- Release owner signs after reviewing evidence artifacts.
