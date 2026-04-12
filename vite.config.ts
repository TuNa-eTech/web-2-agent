import { defineConfig } from "vite";
import { crx } from "@crxjs/vite-plugin";
import react from "@vitejs/plugin-react";
import manifest from "./manifest.config";

export default defineConfig(({ command }) => ({
  plugins: [react(), crx({ manifest })],
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    cors: true,
  },
  build: {
    // Keep dev-loader output separate so `yarn dev` never overwrites the
    // production-ready `dist/` bundle that should be loaded when no dev
    // server is running.
    outDir: command === "serve" ? ".dev-dist" : "dist",
    emptyOutDir: true,
  },
}));
