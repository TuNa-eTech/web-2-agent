param(
  [string]$Output = "$PSScriptRoot\..\release\myworkflowext-companion-windows.zip",
  [switch]$Build
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Resolve-Path (Join-Path $ScriptDir "..")

if ($Build) {
  Push-Location $RepoRoot
  npm run build
  Pop-Location
}

$SourceCompanionDir = Join-Path $RepoRoot "dist\companion"
$SourceSharedDir = Join-Path $RepoRoot "dist\src"
if (-not (Test-Path (Join-Path $SourceCompanionDir "src\index.js"))) {
  Write-Error "Missing build output: $(Join-Path $SourceCompanionDir 'src\index.js')"
  Write-Error "Run: (cd companion; yarn build) or pass -Build"
  exit 1
}

$OutputDir = Split-Path -Parent $Output
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

$Items = @(
  $SourceCompanionDir,
  $SourceSharedDir,
  (Join-Path $ScriptDir "native-host-windows.json"),
  (Join-Path $ScriptDir "install-windows-manual.ps1")
)

Compress-Archive -Path $Items -DestinationPath $Output -Force
Write-Host "Packaged companion to:"
Write-Host "  $Output"
