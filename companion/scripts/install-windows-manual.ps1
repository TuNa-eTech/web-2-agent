param(
  [Parameter(Mandatory = $true)][string]$ExtensionId,
  [string]$InstallDir = "$env:LOCALAPPDATA\MyWorkflowExt\companion",
  [string]$HostDir = "$env:LOCALAPPDATA\MyWorkflowExt\native-host"
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Resolve-Path (Join-Path $ScriptDir "..")
$SourceCompanionDir = Join-Path $RepoRoot "dist\companion"
$SourceSharedDir = Join-Path $RepoRoot "dist\src"
$HostEntry = Join-Path $InstallDir "companion\src\index.js"

if (-not (Test-Path (Join-Path $SourceCompanionDir "src\index.js"))) {
  Write-Error "Missing build output: $(Join-Path $SourceCompanionDir 'src\index.js')"
  Write-Error "Run: (cd companion; yarn build)"
  exit 1
}

New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $InstallDir "companion") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $InstallDir "src") | Out-Null
Copy-Item (Join-Path $SourceCompanionDir "*") (Join-Path $InstallDir "companion") -Recurse -Force
Copy-Item (Join-Path $SourceSharedDir "*") (Join-Path $InstallDir "src") -Recurse -Force

$CmdPath = Join-Path $InstallDir "myworkflowext-companion.cmd"
Set-Content -Path $CmdPath -Value "@echo off`r`nnode `"%~dp0\companion\src\index.js`""

New-Item -ItemType Directory -Force -Path $HostDir | Out-Null
$TemplatePath = Join-Path $ScriptDir "native-host-windows.json"
$ManifestPath = Join-Path $HostDir "com.myworkflowext.native_bridge.json"

$HostPathEscaped = $CmdPath -replace "\\", "\\\\"
$Json = Get-Content $TemplatePath -Raw
$Json = $Json -replace "__HOST_PATH__", $HostPathEscaped
$Json = $Json -replace "__EXTENSION_ID__", $ExtensionId
Set-Content -Path $ManifestPath -Value $Json

$RegPath = "HKCU:\Software\Google\Chrome\NativeMessagingHosts\com.myworkflowext.native_bridge"
New-Item -Path $RegPath -Force | Out-Null
New-ItemProperty -Path $RegPath -Name "(default)" -Value $ManifestPath -PropertyType String -Force | Out-Null

Write-Host "Installed native host manifest:"
Write-Host "  $ManifestPath"
Write-Host "Registry key:"
Write-Host "  $RegPath"
Write-Host "Host command:"
Write-Host "  $CmdPath"
