# Registra tarea Windows: extracción diaria Wisetrack a las 01:00 (hora local del equipo).
# El script usa calendario America/Santiago para determinar el "día anterior".
param(
  [string]$At = '01:00',
  [string]$TaskName = 'UCMFleet_WisetrackDailyPings'
)

$ErrorActionPreference = 'Stop'

$Root = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$Runner = Join-Path $PSScriptRoot 'run-daily-wisetrack-pings.ps1'

if (-not (Test-Path $Runner)) {
  throw "No se encontró $Runner"
}

$Node = (Get-Command node -ErrorAction Stop).Source
Write-Host "Node: $Node"
Write-Host "Runner: $Runner"
Write-Host "Proyecto: $Root"

$Action = New-ScheduledTaskAction `
  -Execute 'powershell.exe' `
  -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$Runner`"" `
  -WorkingDirectory $Root

$Trigger = New-ScheduledTaskTrigger -Daily -At $At

$Settings = New-ScheduledTaskSettingsSet `
  -StartWhenAvailable `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -ExecutionTimeLimit (New-TimeSpan -Hours 6) `
  -MultipleInstances IgnoreNew

Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Force | Out-Null

Write-Host ''
Write-Host "Tarea registrada: $TaskName"
Write-Host "  Horario:      todos los días a las $At (hora local de Windows)"
Write-Host "  Día extraído: calendario anterior en America/Santiago"
Write-Host "  Log:          backend\logs\daily-wisetrack-pings.log"
Write-Host ''
Write-Host "Probar ahora:  Start-ScheduledTask -TaskName $TaskName"
Write-Host "Ver historial: taskschd.msc"
Write-Host "Eliminar:      Unregister-ScheduledTask -TaskName $TaskName -Confirm:`$false"
