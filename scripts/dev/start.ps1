# Arranque limpio: backend (4010) + frontend (5180) con proxy /api.
$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..\..')

& (Join-Path $PSScriptRoot 'stop.ps1')

$backendDir = Join-Path $root 'backend'
$frontendDir = Join-Path $root 'frontend'

Write-Host ''
Write-Host 'Iniciando backend en http://localhost:4010 ...'
Start-Process powershell -WorkingDirectory $backendDir -ArgumentList '-NoExit', '-Command', 'npm run dev' | Out-Null

$deadline = (Get-Date).AddSeconds(30)
do {
  Start-Sleep -Milliseconds 500
  try {
    $health = Invoke-RestMethod -Uri 'http://localhost:4010/api/health' -TimeoutSec 2
    if ($health.ok) { break }
  } catch {
    if ((Get-Date) -gt $deadline) {
      throw 'El backend no respondio en el puerto 4010. Revisa la terminal del backend.'
    }
  }
} while ($true)

Write-Host 'Backend listo.'
Write-Host 'Iniciando frontend en http://localhost:5180 (API via /api -> 4010) ...'
Write-Host ''
Write-Host 'Credenciales seed: admin / 123456'
Write-Host ''

Set-Location $frontendDir
npm run dev
