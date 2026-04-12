import { defineManifest } from "@crxjs/vite-plugin";

const EXTENSION_PUBLIC_KEY =
  "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAuTPciwEz6tzsxIcjqlKT8CDwk9dmlhnt0AlS0cGVDYhijVulMdatN5PIfImdMWyqPR7zdSryCussv07z7lwbr8fpORkEkR3H7zY+c55TBhOyVVACdEwU2T0F6frPXH8nIN8d4CuSuk44obl+X0LafhgK8uA6ms8RXJupcfsd0enwumshFhgWMJgA1JF3lU2AYyWGSM4hcVO17FPnHV3BldfmtGyRu5OxPfIyOJKMKdppclPxvvuBcsjKMRxHHfq9aOQCKJ6uU8ZvwyytjaJCIzTy39RXI5+XnbUXxf54Aw2htT1cFhuw2QlxyZ0mP+RtvEat/DWvBdOy7xMBP4dRGwIDAQAB";

export default defineManifest({
  manifest_version: 3,
  name: "MCP First Extension",
  version: "0.0.0",
  key: EXTENSION_PUBLIC_KEY,
  description: "MCP-first Chrome extension shell.",
  action: {},
  side_panel: {
    default_path: "src/sidepanel/index.html"
  },
  options_page: "src/options/index.html",
  background: {
    service_worker: "src/background/index.ts",
    type: "module"
  },
  permissions: ["storage", "sidePanel", "nativeMessaging"],
  optional_host_permissions: ["*://*/*"],
  icons: {
    "16": "public/icons/icon16.png",
    "32": "public/icons/icon32.png",
    "48": "public/icons/icon48.png",
    "128": "public/icons/icon128.png"
  }
});
