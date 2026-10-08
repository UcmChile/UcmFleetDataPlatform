# Libera puertos del Fleet Data Platform (dev).
$ErrorActionPreference = 'SilentlyContinue'

$ports = @(4010, 5180)
$stopped = @()

foreach ($port in $ports) {
  netstat -ano | ForEach-Object {
    if ($_ -match ":$port\s" -and $_ -match 'LISTENING|ESCUCHANDO') {
      $parts = ($_ -replace '\s+', ' ').Trim().Split(' ')
      $processId = [int]$parts[-1]
      if ($processId -gt 0) {
        Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
        $script:stopped += "puerto $port (PID $processId)"
      }
    }
  }
}

if ($stopped.Count -eq 0) {
  Write-Host 'No habia procesos escuchando en los puertos Fleet (4010/5180).'
} else {
  Write-Host 'Procesos detenidos:'
  $stopped | Select-Object -Unique | ForEach-Object { Write-Host "  - $_" }
}

Start-Sleep -Seconds 1
