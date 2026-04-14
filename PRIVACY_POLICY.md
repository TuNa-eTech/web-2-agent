# Privacy Policy for Web2Agent

Last updated: April 14, 2026

## Overview

Web2Agent ("the Extension") is a browser extension that connects your Chrome browser to MCP (Model Context Protocol) servers — local or remote — and lets you invoke their tools from a side panel chat powered by AI providers such as Gemini, ChatGPT (OpenAI), or Claude.

## Data Collection

This extension does not collect, store, or transmit any personal data to Anthropic, the extension author, or any third party operated by the extension author.

The Extension stores only the following data locally in your browser:

- **MCP server configuration** you enter manually (server URLs, command arguments, environment variable names). Sensitive values such as API keys and authentication tokens are encrypted before being written to `chrome.storage`.
- **AI provider settings** you configure (selected provider, model preferences). API keys are encrypted at rest.
- **Conversation history** from your side panel chat sessions, stored locally only.

## Data Usage

Locally stored configuration and conversation data are used exclusively to operate the Extension's features:

- MCP server configurations are used to establish connections to the servers you specify.
- AI provider settings are used to route your messages to the model you choose.
- Conversation history is displayed in the side panel for your reference.

No data is used for analytics, advertising, profiling, or any purpose unrelated to the Extension's core functionality.

## Data Storage

All data is stored locally in your browser using Chrome's `storage` API with encryption for sensitive fields. No data is stored on servers operated by the Extension author. Data persists until you clear the Extension's storage or uninstall the Extension.

## Data Sharing

The Extension does not share your data with any third party except:

- **MCP servers you configure**: The Extension connects to the MCP endpoint URLs you provide. Any data sent to those endpoints is governed by the privacy policy of the service running that endpoint.
- **AI providers you select**: When you send a message, it is forwarded to the AI provider (OpenAI, Google Gemini, or Anthropic Claude) whose API key you have configured. Your use of those services is governed by their respective privacy policies.

## Content Script Behavior

Web2Agent injects a content script into `chatgpt.com`, `chat.openai.com`, and `gemini.google.com` to display MCP tool results inside the AI chat interface. This script reads page content only to locate the correct injection point and to forward tool results into the chat. No content from these pages is collected, stored, or transmitted by the Extension.

## Permissions

The Extension requests the following Chrome permissions and uses them as described:

- **`storage`** — Saves your MCP server configuration, AI provider settings, and conversation history locally in encrypted form.
- **`unlimitedStorage`** — Stores large MCP tool catalogs discovered from multiple connected servers.
- **`sidePanel`** — Enables the persistent side panel chat workspace.
- **`nativeMessaging`** — Communicates with the Web2Agent desktop companion app (installed separately) to launch and manage local stdio MCP server processes on your machine.
- **Optional host permissions (`*://*/*`)** — Requested at runtime only when you add an HTTP MCP server. The Extension uses this permission solely to connect to the MCP endpoint URL you specify.

## Changes to This Privacy Policy

We may update this Privacy Policy from time to time. Any changes will be posted on this page with an updated revision date.

## Contact

If you have any questions about this Privacy Policy, please create an issue on the [GitHub repository](https://github.com/TuNa-eTech/web-2-agent).
