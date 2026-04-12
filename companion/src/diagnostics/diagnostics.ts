import { delimiter } from "path";

export function buildHostDiagnostics() {
  return {
    pid: process.pid,
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    startedAt: new Date(Date.now() - process.uptime() * 1000).toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    nativeHostId: "com.myworkflowext.native_bridge",
    pathPreview: (process.env.PATH ?? "")
      .split(delimiter)
      .filter(Boolean)
      .slice(0, 12),
  };
}
