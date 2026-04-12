# E2E Test Plan

## Planned Cases

| ID | Scenario | Purpose | Notes |
| --- | --- | --- | --- |
| E2E-001 | macOS local stdio | Companion install and local `stdio` MCP flow. | Uses `uvx mcp-atlassian`. |
| E2E-002 | Windows local stdio | Companion install and local `stdio` MCP flow. | Native host registration required. |
| E2E-003 | HTTP MCP | Permission prompt and tool call. | Use a known HTTP MCP server. |
| E2E-004 | AI tool loop | OpenAI, Gemini, Claude tool call via broker. | Confirm gates enforced. |
| E2E-005 | Failure handling | Missing companion, bad config, unreachable server. | Validate UI error categories. |

## Notes

- Capture logs or screenshots for release evidence.
