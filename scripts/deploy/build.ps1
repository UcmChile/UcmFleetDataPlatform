# Build de producción: frontend estático en dist/frontend + web.config IIS.
$ErrorActionPreference = 'Stop'

$Root = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$DistFrontend = Join-Path $Root 'dist\frontend'

Write-Host "[build] Raiz: $Root"

Push-Location $Root
try {
  Write-Host '[build] backend: npm ci'
  Push-Location (Join-Path $Root 'backend')
  if (Test-Path 'package-lock.json') { npm ci } else { npm install }
  if ($LASTEXITCODE -ne 0) { throw 'npm ci backend fallo' }
  Pop-Location

  Write-Host '[build] frontend: dependencias + vite build'
  Push-Location (Join-Path $Root 'frontend')
  $viteBin = Join-Path (Get-Location) 'node_modules\vite\bin\vite.js'
  if ((Test-Path 'node_modules') -and (Test-Path $viteBin)) {
    Write-Host '[build] frontend: node_modules OK, omitiendo npm ci'
  } elseif (Test-Path 'package-lock.json') {
    npm ci
    if ($LASTEXITCODE -ne 0) { throw 'npm ci frontend fallo' }
  } else {
    npm install
    if ($LASTEXITCODE -ne 0) { throw 'npm install frontend fallo' }
  }
  npm run build
  if ($LASTEXITCODE -ne 0) { throw 'vite build fallo' }
  Pop-Location

  if (-not (Test-Path (Join-Path $DistFrontend 'index.html'))) {
    throw "No se genero dist/frontend/index.html"
  }

  Copy-Item -Path (Join-Path $Root 'web.config.production') -Destination (Join-Path $DistFrontend 'web.config') -Force
  Write-Host "[build] OK -> $DistFrontend"
} finally {
  Pop-Location
}
