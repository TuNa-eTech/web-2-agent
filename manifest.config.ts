import { defineManifest } from "@crxjs/vite-plugin";

const EXTENSION_PUBLIC_KEY =
  "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAuTPciwEz6tzsxIcjqlKT8CDwk9dmlhnt0AlS0cGVDYhijVulMdatN5PIfImdMWyqPR7zdSryCussv07z7lwbr8fpORkEkR3H7zY+c55TBhOyVVACdEwU2T0F6frPXH8nIN8d4CuSuk44obl+X0LafhgK8uA6ms8RXJupcfsd0enwumshFhgWMJgA1JF3lU2AYyWGSM4hcVO17FPnHV3BldfmtGyRu5OxPfIyOJKMKdppclPxvvuBcsjKMRxHHfq9aOQCKJ6uU8ZvwyytjaJCIzTy39RXI5+XnbUXxf54Aw2htT1cFhuw2QlxyZ0mP+RtvEat/DWvBdOy7xMBP4dRGwIDAQAB";

export default defineManifest({
  manifest_version: 3,
  name: "Web2Agent",
  version: "0.0.0",
  key: EXTENSION_PUBLIC_KEY,
  description: "Connect your browser to AI agents and MCP tools. Chat with Gemini and ChatGPT while wielding any MCP server — local or remote.",
  action: {},
  side_panel: {
    default_path: "src/sidepanel/index.html"
  },
  options_page: "src/options/index.html",
  background: {
    service_worker: "src/background/index.ts",
    type: "module"
  },
  permissions: ["storage", "unlimitedStorage", "sidePanel", "nativeMessaging"],
  optional_host_permissions: ["*://*/*"],
  content_scripts: [
    {
      matches: [
        "*://gemini.google.com/*",
        "*://chatgpt.com/*",
        "*://chat.openai.com/*"
      ],
      js: ["src/content/index.tsx"],
      run_at: "document_idle"
    }
  ],
  web_accessible_resources: [
    {
      resources: ["content/*", "*.css", "public/*"],
      matches: [
        "*://gemini.google.com/*",
        "*://chatgpt.com/*",
        "*://chat.openai.com/*"
      ]
    }
  ],
  icons: {
    "16": "public/icons/icon16.png",
    "32": "public/icons/icon32.png",
    "48": "public/icons/icon48.png",
    "128": "public/icons/icon128.png"
  }
});
