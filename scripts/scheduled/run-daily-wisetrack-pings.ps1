# Ejecuta extracción diaria Wisetrack (pings del día anterior, calendario Chile).
$ErrorActionPreference = 'Stop'

$Root = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$Backend = Join-Path $Root 'backend'
$LogDir = Join-Path $Backend 'logs'
$LogFile = Join-Path $LogDir 'daily-wisetrack-pings.log'

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

$Stamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
"`n===== $Stamp =====" | Out-File -FilePath $LogFile -Append -Encoding utf8

Push-Location $Backend
try {
  & node src/scripts/daily-wisetrack-pings.js 2>&1 | Tee-Object -FilePath $LogFile -Append
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
} finally {
  Pop-Location
}
