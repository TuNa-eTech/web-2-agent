# Chrome Web Store Listing — Web2Agent

> Generated for Chrome Web Store submission. All fields are ready to copy-paste into the Developer Dashboard.

---

## Tab: Store Listing

### Extension Name
```
Web2Agent
```
*(9 / 75 characters)*

---

### Summary / Short Description
*(from manifest.json — 126 / 132 characters)*
```
Connect your browser to AI agents and MCP tools. Chat with Gemini and ChatGPT while wielding any MCP server — local or remote.
```

---

### Detailed Description
*(Plain text, no HTML)*

```
Web2Agent turns your Chrome browser into a full MCP (Model Context Protocol) client. Configure any MCP server — whether it's running remotely over HTTP or locally on your machine — and immediately start invoking its tools from a persistent side panel chat, a quick-action popup, or directly through your AI conversations.

Connect to Gemini, ChatGPT (OpenAI), or Claude and let your chosen model call any MCP tool on your behalf. Web2Agent's tool broker routes every call — whether triggered by you or your AI — through a single secure runtime with per-server and per-tool enable/disable controls. Destructive actions require explicit confirmation, so you stay in control at all times.

Setting up is simple: paste an IDE-style JSON config with your server's URL, command, or environment variables and hit Save. For local stdio servers (such as mcp-atlassian or any community MCP package), install the lightweight Web2Agent desktop companion on macOS or Windows and the extension handles the rest. An Atlassian preset auto-detects Jira and Confluence capabilities from discovered tool names for zero-config quick actions.

Your configuration and API keys are encrypted at rest. No user data is sent to any third party by the extension. Web2Agent is built for developers and power users who want full, raw control over their AI toolchain — right inside the browser they already use every day.
```

---

### Primary Category
```
Developer Tools
```

---

### Language
```
English
```

---

## Tab: Privacy Practices

### Single Purpose Description
```
Web2Agent connects the browser to MCP (Model Context Protocol) servers — local or remote — so users can invoke MCP tools directly from a side panel chat powered by Gemini, ChatGPT, or Claude.
```
*(191 chars — keep concise, ~1-2 sentences)*

---

### Permission Justifications

**`storage`**
```
Used to save MCP server configuration, AI provider settings, and user preferences. All sensitive values such as API keys are encrypted before being written to storage.
```

**`unlimitedStorage`**
```
Required to persist large MCP tool catalogs and conversation history when users connect multiple MCP servers, each of which may expose dozens of tools.
```

**`sidePanel`**
```
Powers the main persistent workspace — a side panel chat where users can talk to an AI model and invoke MCP tools without leaving the current page.
```

**`nativeMessaging`**
```
Enables communication with the Web2Agent desktop companion app (installed separately), which launches and manages local stdio MCP server processes on the user's machine.
```

**Optional host permissions (`*://*/*`)**
```
Requested at runtime only when the user configures an HTTP MCP server. The extension needs permission to reach the user-specified endpoint to establish an MCP connection.
```

---

### Remote Code Declaration
```
No
```
*(MV3 extension — no remote code executed)*

---

### Data Usage Disclosures

Check **none** of the data-collection boxes. Web2Agent:
- Does **not** collect personally identifiable information
- Does **not** collect health, financial, or authentication information
- Does **not** collect personal communications
- Does **not** collect location data
- Does **not** collect browsing history
- Does **not** collect user activity (clicks, keystrokes)
- **Does** inject content scripts into `chatgpt.com` and `gemini.google.com` to forward MCP tool results into the AI chat UI — but no data from these pages is stored or transmitted by the extension

> **Recommendation:** Check **"Website content"** to be transparent about the content script behavior, then certify all 4 Limited Use conditions.

**Limited Use Certification — certify all 4:**
1. ✅ Data is used only to provide the single purpose: routing MCP tool calls within the user's browser session.
2. ✅ No data is transferred to third parties except as necessary to reach the user's own configured MCP endpoints.
3. ✅ Data is not used for advertising of any kind.
4. ✅ No human reads user data; all processing is local or flows to the user's own configured services.

---

### Privacy Policy URL
*(Generate and push `PRIVACY_POLICY.md` to your public GitHub repo, then use:)*
```
https://github.com/TuNa-eTech/web-2-agent/blob/main/PRIVACY_POLICY.md
```
Replace `<owner>/<repo>` with your actual GitHub repository path.

---

## Tab: Distribution

### Visibility
```
Public
```

### Geographic Distribution
```
All regions
```

### In-App Purchases
```
No
```

---

## Additional Fields (Optional but Recommended)

| Field        | Suggested Value                              |
|--------------|----------------------------------------------|
| Homepage URL | Your GitHub repository URL                   |
| Support URL  | `https://github.com/TuNa-eTech/web-2-agent/issues`   |

---

## Image Assets Checklist

| Asset               | Size       | Required | Notes                              |
|---------------------|------------|----------|------------------------------------|
| Store Icon          | 128×128 px | ✅ Yes   | 96×96 artwork + 16px padding       |
| Screenshot(s)       | 1280×800 px| ✅ Yes   | Min 1, max 5                       |
| Small Promo Tile    | 440×280 px | ✅ Yes   |                                    |
| Marquee Promo Tile  | 1400×560 px| No       | Recommended for featured placement |

> Run the image generation script if needed:
> ```bash
> python3 .claude/skills/chrome-store-submit/scripts/generate_store_images.py \
>   dist/public/icons/icon128.png \
>   ./store-assets \
>   --name "Web2Agent" \
>   --color "#4F46E5"
> ```
> Adjust `--color` to match your brand color.
