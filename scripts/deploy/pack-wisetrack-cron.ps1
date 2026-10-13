# Empaqueta solo archivos del cron Wisetrack (servidor sin Git).
# En tu PC: npm run pack:wisetrack-cron
# Copie el ZIP al servidor y descomprima en C:\inetpub\Apps\UCMFleet (sobrescribir).
param(
  [string]$OutZip = ''
)

$ErrorActionPreference = 'Stop'
$Root = Resolve-Path (Join-Path $PSScriptRoot '..\..')

$Files = @(
  'package.json',
  'scripts\scheduled\install-daily-wisetrack-task.ps1',
  'scripts\scheduled\run-daily-wisetrack-pings.ps1',
  'scripts\scheduled\status-daily-wisetrack-task.ps1',
  'backend\src\config\env.js',
  'backend\src\scripts\daily-wisetrack-pings.js'
)

$Staging = Join-Path $env:TEMP "UCMFleet-cron-patch-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
New-Item -ItemType Directory -Path $Staging -Force | Out-Null

foreach ($rel in $Files) {
  $src = Join-Path $Root $rel
  if (-not (Test-Path $src)) { throw "Falta en repo: $rel" }
  $dest = Join-Path $Staging $rel
  $parent = Split-Path $dest -Parent
  if (-not (Test-Path $parent)) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
  Copy-Item $src $dest -Force
}

if (-not $OutZip) {
  $OutZip = Join-Path $Root "release\UCMFleet-wisetrack-cron-patch.zip"
}
$zipDir = Split-Path $OutZip -Parent
if (-not (Test-Path $zipDir)) { New-Item -ItemType Directory -Path $zipDir -Force | Out-Null }
if (Test-Path $OutZip) { Remove-Item -Force $OutZip }

Compress-Archive -Path (Join-Path $Staging '*') -DestinationPath $OutZip -Force
Remove-Item -Recurse -Force $Staging

Write-Host ''
Write-Host "ZIP listo: $OutZip"
Write-Host ''
Write-Host 'En el servidor (PowerShell Admin):'
Write-Host '  Expand-Archive -Path .\UCMFleet-wisetrack-cron-patch.zip -DestinationPath C:\inetpub\Apps\UCMFleet -Force'
Write-Host '  cd C:\inetpub\Apps\UCMFleet'
Write-Host '  npm run wisetrack:install-daily-task'
Write-Host '  npm run wisetrack:cron-status'
Write-Host '  Start-ScheduledTask -TaskName UCMFleet_WisetrackDailyPings'
