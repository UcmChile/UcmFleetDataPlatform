# Ejecuta extracción diaria Wisetrack (pings del día anterior, calendario Chile).
param(
  [string]$AppRoot = ''
)

$ErrorActionPreference = 'Stop'
# Node escribe advertencias en stderr; no deben abortar este script (PowerShell 7.4+).
if (Get-Variable -Name PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue) {
  $PSNativeCommandUseErrorActionPreference = $false
}

function Resolve-FleetNodeExe {
  param([string]$ScriptsDir)
  $pathFile = Join-Path $ScriptsDir 'node.exe.path'
  if (Test-Path $pathFile) {
    $saved = (Get-Content $pathFile -Raw).Trim()
    if ($saved -and (Test-Path -LiteralPath $saved)) { return $saved }
  }
  $cmd = Get-Command node -ErrorAction SilentlyContinue
  if ($cmd -and $cmd.Source) { return $cmd.Source }
  foreach ($candidate in @(
    "$env:ProgramFiles\nodejs\node.exe",
    ${env:ProgramFiles(x86)} + '\nodejs\node.exe'
  )) {
    if ($candidate -and (Test-Path -LiteralPath $candidate)) { return $candidate }
  }
  throw 'No se encontro node.exe (tarea SYSTEM no tiene PATH de usuario). Ejecute wisetrack:install-daily-task como admin.'
}

if ($AppRoot) {
  $Root = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($AppRoot)
} else {
  $Root = Resolve-Path (Join-Path $PSScriptRoot '..\..')
}
$Backend = Join-Path $Root 'backend'
$LogDir = Join-Path $Backend 'logs'
$LogFile = Join-Path $LogDir 'daily-wisetrack-pings.log'
$EnvFile = Join-Path $Backend '.env'
$NodeExe = Resolve-FleetNodeExe -ScriptsDir $PSScriptRoot

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

$Stamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
$whoami = whoami.exe 2>$null
"`n===== $Stamp user=$whoami =====" | Out-File -FilePath $LogFile -Append -Encoding utf8
"node=$NodeExe" | Out-File -FilePath $LogFile -Append -Encoding utf8
"backend=$Backend env_exists=$(Test-Path $EnvFile)" | Out-File -FilePath $LogFile -Append -Encoding utf8

if (-not (Test-Path $EnvFile)) {
  "[runner] FALTA backend\.env" | Out-File -FilePath $LogFile -Append -Encoding utf8
  exit 1
}

Push-Location $Backend
try {
  if (-not (Test-Path -LiteralPath $NodeExe)) {
    "[runner] node.exe no existe: $NodeExe" | Out-File -FilePath $LogFile -Append -Encoding utf8
    exit 1
  }
  $proc = Start-Process -FilePath $NodeExe `
    -ArgumentList @('--no-deprecation', 'src/scripts/daily-wisetrack-pings.js') `
    -WorkingDirectory $Backend `
    -Wait -PassThru -NoNewWindow
  $exit = $proc.ExitCode
  if ($exit -ne 0) {
    "[runner] exit code $exit (ver lineas [daily-pings] arriba en este log)" | Out-File -FilePath $LogFile -Append -Encoding utf8
    exit $exit
  }
  "[runner] ok exit=0" | Out-File -FilePath $LogFile -Append -Encoding utf8
} catch {
  "[runner] ERROR $($_.Exception.Message)" | Out-File -FilePath $LogFile -Append -Encoding utf8
  exit 1
} finally {
  Pop-Location
}
