import { existsSync } from "fs";
import { homedir } from "os";
import { delimiter, isAbsolute, join } from "path";

// ─── Platform detection ────────────────────────────────────────────────────

export const IS_WINDOWS = process.platform === "win32";

// ─── Common PATH entries per platform ─────────────────────────────────────

/**
 * Directories injected into PATH when spawning MCP child processes.
 *
 * macOS / Linux – Homebrew, system, and user-local bins that are commonly
 * absent when the companion is launched via Chrome Native Messaging (which
 * does not inherit a login-shell PATH).
 *
 * Windows – npm global installs, Python launchers (py/uv/uvx), and
 * Scoop/chocolatey shims live in user-specific AppData or Program Files
 * locations not always on the system PATH.
 */
const COMMON_PATH_ENTRIES_UNIX = [
  "/opt/homebrew/bin",
  "/opt/homebrew/sbin",
  "/usr/local/bin",
  "/usr/local/sbin",
  "/usr/bin",
  "/bin",
  "/usr/sbin",
  "/sbin",
  `${homedir()}/.local/bin`,
  `${homedir()}/.cargo/bin`,   // Rust / uv CLI
  `${homedir()}/.nvm/versions/node/default/bin`,
];

/**
 * Windows-specific PATH entries.
 * We use `|| ""` guards so undefined env vars don't crash at module init.
 */
const COMMON_PATH_ENTRIES_WIN32 = (() => {
  const appData = process.env.APPDATA || "";
  const localAppData = process.env.LOCALAPPDATA || "";
  const programFiles = process.env.ProgramFiles || "C:\\Program Files";
  const programFilesX86 = process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";
  const userProfile = process.env.USERPROFILE || homedir();

  return [
    // npm global (per-user install via nvm-windows or direct)
    `${appData}\\npm`,
    // uv / uvx (Astral's Python package manager, very popular for MCP servers)
    `${localAppData}\\Programs\\uv`,
    `${localAppData}\\uv\\bin`,
    `${userProfile}\\.local\\bin`,
    `${userProfile}\\.cargo\\bin`,
    // Python launchers installed by python.org
    `${localAppData}\\Programs\\Python\\Python312`,
    `${localAppData}\\Programs\\Python\\Python311`,
    `${localAppData}\\Programs\\Python\\Python310`,
    `${localAppData}\\Programs\\Python\\Python39`,
    `${localAppData}\\Programs\\Python\\Python38`,
    `${localAppData}\\Programs\\Python\\Launcher`,
    // Scoop shims (popular Windows package manager)
    `${userProfile}\\scoop\\shims`,
    // Chocolatey shims
    `${programData()}\\chocolatey\\bin`,
    // Node.js system-wide
    `${programFiles}\\nodejs`,
    `${programFilesX86}\\nodejs`,
    // Git for Windows (includes many Unix tools)
    `${programFiles}\\Git\\bin`,
    `${programFiles}\\Git\\cmd`,
    `${programFilesX86}\\Git\\bin`,
    `${programFilesX86}\\Git\\cmd`,
    // Windows system dirs (always last as fallback)
    `${process.env.SystemRoot || "C:\\Windows"}\\System32`,
    `${process.env.SystemRoot || "C:\\Windows"}`,
  ].filter(Boolean);
})();

function programData(): string {
  return process.env.ProgramData || "C:\\ProgramData";
}

export const COMMON_PATH_ENTRIES: readonly string[] = IS_WINDOWS
  ? COMMON_PATH_ENTRIES_WIN32
  : COMMON_PATH_ENTRIES_UNIX;

// ─── PATH helpers ──────────────────────────────────────────────────────────

export const splitPathEntries = (value?: string): string[] =>
  (value ?? "")
    .split(delimiter)
    .map((entry) => entry.trim())
    .filter(Boolean);

const uniqueEntries = (entries: string[]): string[] => [...new Set(entries)];

export const buildSpawnPath = (existingPath?: string): string =>
  uniqueEntries([...splitPathEntries(existingPath), ...COMMON_PATH_ENTRIES]).join(delimiter);

// ─── Executable resolution ─────────────────────────────────────────────────

/**
 * Windows executable extensions searched in order when no extension is given.
 * Mirrors the system PATHEXT default.
 */
const WIN32_EXEC_EXTENSIONS = [".cmd", ".bat", ".exe", ".com", ".ps1"];

/**
 * On Windows many CLI tools (node, npm, uvx, npx …) are installed as `.cmd`
 * batch-file wrappers. When the user does not specify an extension we try each
 * PATHEXT candidate in turn so we can find the right wrapper.
 */
const resolveWindowsExecutable = (command: string, pathValue: string): string => {
  const directories = splitPathEntries(pathValue);

  for (const directory of directories) {
    // 1. Try the bare command first (already has extension or is absolute)
    const bare = join(directory, command);
    if (existsSync(bare)) return bare;

    // 2. Try each PATHEXT extension
    for (const ext of WIN32_EXEC_EXTENSIONS) {
      const candidate = join(directory, `${command}${ext}`);
      if (existsSync(candidate)) return candidate;
    }
  }

  return command; // let the OS / shell handle it
};

export const resolveExecutablePath = (command: string, pathValue: string): string => {
  // If the command looks like an absolute path – use it directly.
  if (!command || command.includes("/") || command.includes("\\") || isAbsolute(command)) {
    return command;
  }

  if (IS_WINDOWS) {
    return resolveWindowsExecutable(command, pathValue);
  }

  // Unix: simple directory scan
  for (const directory of splitPathEntries(pathValue)) {
    const candidate = join(directory, command);
    if (existsSync(candidate)) return candidate;
  }

  return command;
};

// ─── Spawn options ─────────────────────────────────────────────────────────

/**
 * Returns the `shell` option that should be passed to `child_process.spawn`.
 *
 * On Windows, batch files (.cmd / .bat) MUST be launched through cmd.exe –
 * they are not directly executable as native processes.  We set `shell: true`
 * only on win32 so we don't accidentally break argument quoting on Unix.
 */
export const getSpawnShellOption = (resolvedCommand: string): boolean => {
  if (!IS_WINDOWS) return false;
  const lower = resolvedCommand.toLowerCase();
  return lower.endsWith(".cmd") || lower.endsWith(".bat") || lower.endsWith(".ps1");
};

// ─── Error messages ────────────────────────────────────────────────────────

export const buildCommandNotFoundHint = (command: string): string => {
  if (IS_WINDOWS) {
    return (
      `Failed to start MCP command "${command}". ` +
      `The companion could not find that executable on PATH. ` +
      `Common fixes on Windows:\n` +
      `  • Use the full absolute path (e.g. C:\\Users\\You\\AppData\\Roaming\\npm\\uvx.cmd)\n` +
      `  • Ensure npm global bin is on PATH: %APPDATA%\\npm\n` +
      `  • For uv/uvx: %LOCALAPPDATA%\\Programs\\uv or %LOCALAPPDATA%\\uv\\bin\n` +
      `  • For Python: %LOCALAPPDATA%\\Programs\\Python\\PythonXXX\n` +
      `  • For Scoop: %USERPROFILE%\\scoop\\shims\n` +
      `  • Restart Chrome after changing system PATH.`
    );
  }

  return (
    `Failed to start MCP command "${command}". ` +
    `Desktop companion PATH does not contain that executable. ` +
    `Use an absolute command path or ensure PATH includes common bin directories ` +
    `such as /opt/homebrew/bin, /usr/local/bin, or ~/.local/bin.`
  );
};
