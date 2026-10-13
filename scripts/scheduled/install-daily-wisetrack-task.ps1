# Registra tarea Windows: extracción diaria Wisetrack a las 01:00 (hora local del equipo).
# El script usa calendario America/Santiago para determinar el "día anterior".
# Ejecutar como administrador en el servidor de producción (IIS + PM2).
param(
  [string]$At = '01:00',
  [string]$TaskName = 'UCMFleet_WisetrackDailyPings',
  [string]$AppRoot = ''
)

$ErrorActionPreference = 'Stop'

if ($AppRoot) {
  $Root = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($AppRoot)
} else {
  $Root = Resolve-Path (Join-Path $PSScriptRoot '..\..')
}
$Runner = Join-Path $PSScriptRoot 'run-daily-wisetrack-pings.ps1'

if (-not (Test-Path $Runner)) {
  throw "No se encontró $Runner"
}

$EnvFile = Join-Path $Root 'backend\.env'
if (-not (Test-Path $EnvFile)) {
  throw "Falta backend\.env en $Root. Complete credenciales antes de registrar el cron."
}

$Node = (Get-Command node -ErrorAction Stop).Source
$NodePathFile = Join-Path $PSScriptRoot 'node.exe.path'
Set-Content -Path $NodePathFile -Value $Node -Encoding ascii -NoNewline
Write-Host "Node: $Node (guardado en node.exe.path para tarea SYSTEM)"
Write-Host "Runner: $Runner"
Write-Host "Proyecto: $Root"

$wiseEnabled = $true
foreach ($line in Get-Content $EnvFile -ErrorAction SilentlyContinue) {
  if ($line -match '^\s*WISETRACK_ENABLED\s*=\s*(.+)\s*$') {
    $val = $Matches[1].Trim().Trim('"').Trim("'").ToLower()
    if ($val -in @('0', 'false', 'no', 'off')) { $wiseEnabled = $false }
    break
  }
}
if (-not $wiseEnabled) {
  Write-Warning 'WISETRACK_ENABLED=false en backend\.env — la tarea correrá pero el job no extraerá datos.'
}

$Action = New-ScheduledTaskAction `
  -Execute 'powershell.exe' `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$Runner`" -AppRoot `"$Root`"" `
  -WorkingDirectory $Root

$Trigger = New-ScheduledTaskTrigger -Daily -At $At

$Settings = New-ScheduledTaskSettingsSet `
  -StartWhenAvailable `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -ExecutionTimeLimit (New-TimeSpan -Hours 6) `
  -MultipleInstances IgnoreNew

# SYSTEM: corre a las 01:00 aunque nadie haya iniciado sesión en el servidor.
$Principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest

Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Principal $Principal -Force | Out-Null

$Info = Get-ScheduledTaskInfo -TaskName $TaskName

Write-Host ''
Write-Host "Tarea registrada: $TaskName"
Write-Host "  Estado:       $((Get-ScheduledTask -TaskName $TaskName).State)"
Write-Host "  Cuenta:       SYSTEM"
Write-Host "  Horario:      todos los dias a las $At (hora local de Windows)"
Write-Host "  Dia extraido: calendario anterior en America/Santiago"
Write-Host "  Log:          backend\logs\daily-wisetrack-pings.log"
if ($Info.LastRunTime) {
  Write-Host "  Ultima corrida: $($Info.LastRunTime)  Resultado: $($Info.LastTaskResult)"
}
Write-Host ''
Write-Host "Probar ahora:  Start-ScheduledTask -TaskName $TaskName"
Write-Host "Estado:        powershell -File scripts\scheduled\status-daily-wisetrack-task.ps1"
Write-Host "Ver historial: taskschd.msc"
Write-Host "Eliminar:      Unregister-ScheduledTask -TaskName $TaskName -Confirm:`$false"
