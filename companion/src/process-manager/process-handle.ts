import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import { CompanionError } from "../types/companion";
import { LogBuffer, type LogEntry } from "./log-buffer";
import { StdioJsonRpcTransport, type StdioProtocolMode } from "../mcp/stdio-transport";
import { McpRpcClient } from "../mcp/rpc-client";
import type { RawMcpStdioServerConfig } from "../types/companion";
import {
  buildSpawnPath,
  buildCommandNotFoundHint,
  getSpawnShellOption,
  resolveExecutablePath,
  splitPathEntries,
  IS_WINDOWS,
} from "./platform";

export type ProcessStatus = "starting" | "running" | "exited" | "failed";

const DEFAULT_PROTOCOL_VERSION = process.env.MCP_PROTOCOL_VERSION || "2024-11-05";
const MAX_LOG_TAIL_LENGTH = 240;

// Platform helpers are imported from ./platform

const flattenLogMessage = (value: string): string => value.replace(/\s+/g, " ").trim();

const getLatestLogMessage = (entries: LogEntry[]): string | null => {
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const flattened = flattenLogMessage(entries[index].message);
    if (!flattened) continue;
    return flattened.length <= MAX_LOG_TAIL_LENGTH
      ? flattened
      : `${flattened.slice(0, MAX_LOG_TAIL_LENGTH - 1)}…`;
  }
  return null;
};

const buildSpawnEnv = (config: RawMcpStdioServerConfig): NodeJS.ProcessEnv => {
  const env = { ...process.env, ...(config.env ?? {}) };
  env.PATH = buildSpawnPath(typeof env.PATH === "string" ? env.PATH : undefined);
  return env;
};

const resolveProtocolMode = (config: RawMcpStdioServerConfig): StdioProtocolMode => {
  if (config.stdioProtocol === "json-lines") {
    return "json-lines";
  }
  if (config.stdioProtocol === "content-length") {
    return "content-length";
  }

  const command = config.command.toLowerCase();
  const args = (config.args ?? []).map((arg) => arg.toLowerCase());
  if (command.includes("mcp-atlassian") || args.some((arg) => arg.includes("mcp-atlassian"))) {
    return "json-lines";
  }

  return "content-length";
};

const buildSpawnError = (
  command: string,
  resolvedCommand: string,
  spawnPath: string,
  error: NodeJS.ErrnoException,
): CompanionError => {
  const pathPreview = splitPathEntries(spawnPath).slice(0, 12);
  const details = {
    command,
    resolvedCommand,
    pathPreview,
    osCode: error.code ?? null,
  };

  if (error.code === "ENOENT") {
    return new CompanionError(
      "COMMAND_NOT_FOUND",
      buildCommandNotFoundHint(command),
      details,
    );
  }

  return new CompanionError(
    "SPAWN_FAILED",
    `Failed to start MCP command "${command}": ${error.message}`,
    details,
  );
};

export class ProcessHandle {
  readonly serverId: string;
  readonly config: RawMcpStdioServerConfig;
  readonly stdoutLog: LogBuffer;
  readonly stderrLog: LogBuffer;
  readonly systemLog: LogBuffer;
  readonly startedAt: string;
  readonly resolvedCommand: string;
  readonly spawnPath: string;
  readonly protocolMode: StdioProtocolMode;

  status: ProcessStatus = "starting";
  exitCode: number | null = null;
  exitSignal: NodeJS.Signals | null = null;
  lastError: CompanionError | null = null;
  initialized = false;
  initializeResult: unknown | null = null;

  private child: ChildProcessWithoutNullStreams;
  private transport: StdioJsonRpcTransport;
  private rpc: McpRpcClient;

  constructor(serverId: string, config: RawMcpStdioServerConfig) {
    this.serverId = serverId;
    this.config = config;
    this.startedAt = new Date().toISOString();
    this.stdoutLog = new LogBuffer(200);
    this.stderrLog = new LogBuffer(200);
    this.systemLog = new LogBuffer(200);
    this.protocolMode = resolveProtocolMode(config);
    const spawnEnv = buildSpawnEnv(config);
    this.spawnPath = typeof spawnEnv.PATH === "string" ? spawnEnv.PATH : "";
    this.resolvedCommand = resolveExecutablePath(config.command, this.spawnPath);
    const useShell = getSpawnShellOption(this.resolvedCommand);
    this.systemLog.push({
      ts: new Date().toISOString(),
      stream: "system",
      message: `spawning command: requested="${config.command}" resolved="${this.resolvedCommand}" protocol="${this.protocolMode}" platform="${process.platform}" shell=${useShell}`,
    });

    const child = spawn(this.resolvedCommand, config.args ?? [], {
      env: spawnEnv,
      stdio: ["pipe", "pipe", "pipe"],
      // On Windows, batch files (.cmd/.bat) must be launched via cmd.exe.
      // On Unix this must stay false to avoid shell argument quoting issues.
      shell: useShell,
      // Suppress any console window that would flash when spawning on Windows.
      windowsHide: IS_WINDOWS,
    });
    this.child = child;

    child.stderr.on("data", (chunk) => {
      this.stderrLog.push({
        ts: new Date().toISOString(),
        stream: "stderr",
        message: chunk.toString("utf8"),
      });
    });

    child.on("error", (err) => {
      const companionError = buildSpawnError(
        config.command,
        this.resolvedCommand,
        this.spawnPath,
        err as NodeJS.ErrnoException,
      );
      this.lastError = companionError;
      this.status = "failed";
      this.systemLog.push({
        ts: new Date().toISOString(),
        stream: "system",
        message: `spawn error: ${companionError.message}`,
      });
    });

    child.on("exit", (code, signal) => {
      this.exitCode = code;
      this.exitSignal = signal;
      this.status = this.status === "failed" ? "failed" : "exited";
      this.systemLog.push({
        ts: new Date().toISOString(),
        stream: "system",
        message: `process exited: code=${code ?? "null"} signal=${signal ?? "null"}`,
      });
      this.transport.close();
    });

    this.transport = new StdioJsonRpcTransport(
      child.stdout,
      child.stdin,
      this.stdoutLog,
      this.protocolMode,
    );
    this.transport.on("error", (err: CompanionError) => {
      this.lastError = err;
    });
    this.rpc = new McpRpcClient(this.transport);

    this.status = "running";
  }

  isAlive() {
    return this.status === "running";
  }

  async stop() {
    if (this.status !== "running") return;
    this.child.kill();
  }

  async initialize() {
    if (this.initialized) {
      return this.initializeResult;
    }
    try {
      const result = await this.rpc.request("initialize", {
        protocolVersion: DEFAULT_PROTOCOL_VERSION,
        clientInfo: {
          name: "my-workflow-ext-companion",
          version: "0.1.0",
        },
        capabilities: {},
      });
      this.rpc.notify("notifications/initialized");
      this.initialized = true;
      this.initializeResult = result;
      return result;
    } catch (err) {
      const error =
        err instanceof CompanionError
          ? this.decorateLifecycleError(err, "during initialize")
          : new CompanionError("INITIALIZE_FAILED", "Failed to initialize MCP server.", {
            message: err instanceof Error ? err.message : String(err),
          });
      this.lastError = error;
      throw error;
    }
  }

  async listTools() {
    try {
      return await this.rpc.request("tools/list", {});
    } catch (err) {
      const error =
        err instanceof CompanionError
          ? this.decorateLifecycleError(err, "during tools/list")
          : new CompanionError("TOOLS_LIST_FAILED", "Failed to list tools.", {
            message: err instanceof Error ? err.message : String(err),
          });
      this.lastError = error;
      throw error;
    }
  }

  async callTool(toolName: string, input: unknown) {
    try {
      return await this.rpc.request("tools/call", { name: toolName, arguments: input ?? {} });
    } catch (err) {
      const error =
        err instanceof CompanionError
          ? this.decorateLifecycleError(err, `during tools/call (${toolName})`)
          : new CompanionError("TOOL_CALL_FAILED", "Failed to call tool.", {
            message: err instanceof Error ? err.message : String(err),
          });
      this.lastError = error;
      throw error;
    }
  }

  private decorateLifecycleError(error: CompanionError, action: string): CompanionError {
    if (this.lastError?.code === "COMMAND_NOT_FOUND" || this.lastError?.code === "SPAWN_FAILED") {
      return this.lastError;
    }

    if (error.code !== "PROCESS_EXITED") {
      return error;
    }

    const exitDescriptor =
      this.exitCode !== null
        ? `exit code ${this.exitCode}`
        : this.exitSignal
          ? `signal ${this.exitSignal}`
          : "no exit code";
    const stderrTail = getLatestLogMessage(this.stderrLog.snapshot());
    const systemTail = getLatestLogMessage(this.systemLog.snapshot());
    const details = {
      command: this.config.command,
      resolvedCommand: this.resolvedCommand,
      protocolMode: this.protocolMode,
      exitCode: this.exitCode,
      exitSignal: this.exitSignal,
      transport: error.details,
      stderrTail,
      systemTail,
      pathPreview: splitPathEntries(this.spawnPath).slice(0, 12),
    };
    const detailMessage = stderrTail
      ? ` stderr: ${stderrTail}`
      : systemTail
        ? ` system: ${systemTail}`
        : "";

    return new CompanionError(
      "PROCESS_EXITED",
      `MCP process closed ${action} (${exitDescriptor}).${detailMessage}`,
      details,
    );
  }

  snapshot() {
    return {
      serverId: this.serverId,
      status: this.status,
      startedAt: this.startedAt,
      exitCode: this.exitCode,
      exitSignal: this.exitSignal,
      config: {
        command: this.config.command ?? null,
        resolvedCommand: this.resolvedCommand,
        args: this.config.args ?? [],
        envKeys: Object.keys(this.config.env ?? {}),
        stdioProtocol: this.config.stdioProtocol ?? "auto",
        resolvedProtocol: this.protocolMode,
        pathPreview: splitPathEntries(this.spawnPath).slice(0, 12),
        platform: process.platform,
        shell: getSpawnShellOption(this.resolvedCommand),
      },
      initialized: this.initialized,
      lastError: this.lastError
        ? { code: this.lastError.code, message: this.lastError.message, details: this.lastError.details }
        : null,
      stdout: this.stdoutLog.snapshot(),
      stderr: this.stderrLog.snapshot(),
      system: this.systemLog.snapshot(),
    };
  }
}
