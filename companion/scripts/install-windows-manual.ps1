# ─────────────────────────────────────────────────────────────────
#  install-windows-manual.ps1
#  Installs the Web2Agent desktop companion on Windows.
#
#  Usage (PowerShell):
#    powershell -ExecutionPolicy Bypass -File .\companion\scripts\install-windows-manual.ps1 `
#               -ExtensionId <CHROME_EXTENSION_ID>
#
#  Prerequisites:
#    • Node.js installed (node.exe reachable on PATH or in a standard location)
#    • Companion already built: (cd companion; npm run build)
# ─────────────────────────────────────────────────────────────────
param(
  [Parameter(Mandatory = $true)][string]$ExtensionId,
  [string]$InstallDir = "$env:LOCALAPPDATA\MyWorkflowExt\companion",
  [string]$HostDir    = "$env:LOCALAPPDATA\MyWorkflowExt\native-host"
)

$ErrorActionPreference = "Stop"

# ── Helpers ───────────────────────────────────────────────────────
function Info    { param($m) Write-Host "  $m" -ForegroundColor Cyan }
function Success { param($m) Write-Host "  ✔ $m" -ForegroundColor Green }
function Warn    { param($m) Write-Host "  ⚠ $m" -ForegroundColor Yellow }
function Fail    { param($m) Write-Host "  ✖ $m" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "  ╔══════════════════════════════════════════════╗" -ForegroundColor Blue
Write-Host "  ║   Web2Agent – Windows Companion Installer    ║" -ForegroundColor Blue
Write-Host "  ╚══════════════════════════════════════════════╝" -ForegroundColor Blue
Write-Host ""

# ── Locate repo root & compiled output ───────────────────────────
$ScriptDir           = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot            = Resolve-Path (Join-Path $ScriptDir "..")
$SourceCompanionDir  = Join-Path $RepoRoot "dist\companion"
$SourceSharedDir     = Join-Path $RepoRoot "dist\src"
$IndexJs             = Join-Path $SourceCompanionDir "src\index.js"

if (-not (Test-Path $IndexJs)) {
  Fail "Missing build output: $IndexJs`n  Run first:  cd companion && npm run build"
}

# ── Resolve node.exe ──────────────────────────────────────────────
function Find-NodeExe {
  # 1. node already on PATH
  $n = Get-Command node -ErrorAction SilentlyContinue
  if ($n) { return $n.Source }

  # 2. Common install locations
  $candidates = @(
    "$env:ProgramFiles\nodejs\node.exe",
    "${env:ProgramFiles(x86)}\nodejs\node.exe",
    "$env:APPDATA\nvm\v20.0.0\node.exe",   # nvm-windows typical pattern
    "$env:LOCALAPPDATA\Programs\nodejs\node.exe"
  )

  # 3. Try every nvm-windows version slot
  $nvmRoot = "$env:APPDATA\nvm"
  if (Test-Path $nvmRoot) {
    Get-ChildItem $nvmRoot -Directory | Sort-Object Name -Descending | ForEach-Object {
      $candidates += "$($_.FullName)\node.exe"
    }
  }

  foreach ($c in $candidates) {
    if (Test-Path $c) { return $c }
  }

  return $null
}

$NodeExe = Find-NodeExe
if (-not $NodeExe) {
  Fail "node.exe not found.`n  Install Node.js from https://nodejs.org and re-run this script."
}
Success "Node.js found: $NodeExe"

# ── Copy companion files ──────────────────────────────────────────
Info "Installing companion to: $InstallDir"
New-Item -ItemType Directory -Force -Path $InstallDir                          | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $InstallDir "companion")  | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $InstallDir "src")        | Out-Null
Copy-Item (Join-Path $SourceCompanionDir "*") (Join-Path $InstallDir "companion") -Recurse -Force
Copy-Item (Join-Path $SourceSharedDir  "*") (Join-Path $InstallDir "src")        -Recurse -Force
Success "Companion files copied"

# ── Write launcher .cmd ──────────────────────────────────────────
# Chrome NativeMessaging requires the host path to be an executable.
# On Windows .cmd files run via cmd.exe – the companion has been built
# to handle .cmd wrapper invocation transparently.
$CompanionJs  = Join-Path $InstallDir "companion\src\index.js"
$NodeExeEsc   = $NodeExe -replace '"', '""'
$CompanionEsc = $CompanionJs -replace '"', '""'
$CmdContent   = "@echo off`r`n`"$NodeExeEsc`" `"$CompanionEsc`" %*`r`n"

$CmdPath = Join-Path $InstallDir "myworkflowext-companion.cmd"
Set-Content -Path $CmdPath -Value $CmdContent -Encoding ASCII
Success "Launcher created: $CmdPath"

# ── Write native host manifest ────────────────────────────────────
New-Item -ItemType Directory -Force -Path $HostDir | Out-Null
$TemplatePath = Join-Path $ScriptDir "native-host-windows.json"
$ManifestPath = Join-Path $HostDir "com.myworkflowext.native_bridge.json"

# JSON requires forward-slash or double-backslash
$HostPathEscaped = $CmdPath -replace "\\", "\\\\"
$Json = Get-Content $TemplatePath -Raw
$Json = $Json -replace "__HOST_PATH__", $HostPathEscaped
$Json = $Json -replace "__EXTENSION_ID__", $ExtensionId
Set-Content -Path $ManifestPath -Value $Json -Encoding UTF8
Success "Native host manifest: $ManifestPath"

# ── Register in Windows Registry ──────────────────────────────────
$RegPath = "HKCU:\Software\Google\Chrome\NativeMessagingHosts\com.myworkflowext.native_bridge"
New-Item          -Path $RegPath -Force | Out-Null
New-ItemProperty  -Path $RegPath -Name "(default)" -Value $ManifestPath -PropertyType String -Force | Out-Null
Success "Registry key written: $RegPath"

# ── Summary ───────────────────────────────────────────────────────
Write-Host ""
Write-Host "  ════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  ✔  Installation complete!" -ForegroundColor Green
Write-Host "  ════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Info "Next steps:"
Info "  1. Open Chrome → chrome://extensions"
Info "  2. Find 'Web2Agent' and click the reload (↺) icon"
Info "  3. Open the Options page and test your MCP server connections"
Write-Host ""
Info "Troubleshooting:"
Info "  • If connection fails, open Options → Diagnostics / Logs"
Info "  • Use absolute paths in MCP server 'command' if a tool is not found"
Info "  • Ensure node.exe path has not changed after reinstalling Node.js"
Write-Host ""
