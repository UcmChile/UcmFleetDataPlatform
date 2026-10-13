# Diagnóstico rápido del cron Wisetrack en el servidor de producción.
param(
  [string]$TaskName = 'UCMFleet_WisetrackDailyPings',
  [string]$AppRoot = ''
)

$ErrorActionPreference = 'Continue'

if ($AppRoot) {
  $Root = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($AppRoot)
} else {
  $Root = Resolve-Path (Join-Path $PSScriptRoot '..\..')
}

$LogFile = Join-Path $Root 'backend\logs\daily-wisetrack-pings.log'
$EnvFile = Join-Path $Root 'backend\.env'

Write-Host "App root: $Root"
Write-Host ''

$task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if (-not $task) {
  Write-Host "[FALTA] No existe la tarea $TaskName" -ForegroundColor Red
  Write-Host "Registrar: npm run wisetrack:install-daily-task"
  Write-Host "  o: powershell -ExecutionPolicy Bypass -File scripts\scheduled\install-daily-wisetrack-task.ps1 -AppRoot `"$Root`""
  exit 1
}

$info = Get-ScheduledTaskInfo -TaskName $TaskName
Write-Host "[OK] Tarea: $TaskName"
Write-Host "  Estado:         $($task.State)"
Write-Host "  Usuario:        $($task.Principal.UserId)"
Write-Host "  Proxima corrida: $($info.NextRunTime)"
Write-Host "  Ultima corrida:  $($info.LastRunTime)"
Write-Host "  Codigo salida:   $($info.LastTaskResult) (0 = OK)"

if (-not (Test-Path $EnvFile)) {
  Write-Host "[FALTA] backend\.env" -ForegroundColor Red
} else {
  Write-Host "[OK] backend\.env"
}

if (Test-Path $LogFile) {
  Write-Host ''
  Write-Host "Ultimas lineas de $LogFile :"
  Get-Content $LogFile -Tail 25 -ErrorAction SilentlyContinue
} else {
  Write-Host ''
  Write-Host "[INFO] Aun no hay log (la tarea nunca corrio o fallo antes de escribir)." -ForegroundColor Yellow
  Write-Host "Probar: Start-ScheduledTask -TaskName $TaskName"
}
