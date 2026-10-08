param(
  [string]$AppPath = 'C:\inetpub\Apps\UCMFleet',
  [string]$SiteName = 'UCMFleet',
  [string]$AppPoolName = 'UCMFleet-AppPool',
  [int]$SitePort = 5185,
  [int]$BackendPort = 4010,
  [string]$PublicSiteUrl = 'https://flota.ucmchile.cl',
  [string]$PublicHostHeader = 'flota.ucmchile.cl'
)

$ErrorActionPreference = 'Stop'

function Write-Info($msg) { Write-Host "[INFO] $msg" -ForegroundColor Cyan }
function Write-Ok($msg) { Write-Host "[OK]   $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "[WARN] $msg" -ForegroundColor Yellow }

$AppPath = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($AppPath)
if (-not (Test-Path $AppPath)) {
  throw "No existe la ruta destino: $AppPath"
}

Set-Location $AppPath

Write-Info '1) Verificando backend/.env'
$EnvFile = Join-Path $AppPath 'backend\.env'
if (-not (Test-Path $EnvFile)) {
  throw 'Falta backend\.env. Copie backend\.env.production.example y complete valores de produccion.'
}
Write-Ok 'backend\.env encontrado'

Write-Info '2) pm2.config.cjs'
$Pm2Config = Join-Path $AppPath 'pm2.config.cjs'
if (-not (Test-Path $Pm2Config)) {
  if (-not (Test-Path (Join-Path $AppPath 'pm2.config.example.cjs'))) {
    throw 'Falta pm2.config.cjs y pm2.config.example.cjs'
  }
  Copy-Item (Join-Path $AppPath 'pm2.config.example.cjs') $Pm2Config -Force
  Write-Warn 'pm2.config.cjs creado desde ejemplo — revise UCM_FLEET_APP_ROOT si aplica'
}
Write-Ok 'pm2.config.cjs listo'

Write-Info '3) Instalando dependencias backend (npm ci)'
Push-Location (Join-Path $AppPath 'backend')
if (Test-Path 'package-lock.json') { npm ci --omit=dev } else { npm install --omit=dev }
if ($LASTEXITCODE -ne 0) { throw 'npm ci backend fallo' }
Pop-Location
Write-Ok 'Dependencias backend instaladas'

Write-Info '4) Verificando dist/frontend'
$FrontendDist = Join-Path $AppPath 'dist\frontend'
if (-not (Test-Path (Join-Path $FrontendDist 'index.html'))) {
  throw "Falta dist\frontend\index.html. Ejecute scripts\deploy\build.ps1 antes de instalar."
}

if (-not (Test-Path (Join-Path $FrontendDist 'web.config'))) {
  Copy-Item (Join-Path $AppPath 'web.config.production') (Join-Path $FrontendDist 'web.config') -Force
  Write-Warn 'web.config copiado a dist\frontend'
}
Write-Ok 'Frontend estatico listo'

Write-Info '5) Carpeta logs'
New-Item -ItemType Directory -Path (Join-Path $AppPath 'logs') -Force | Out-Null
Write-Ok 'logs/'

Write-Info '6) PM2 global (si falta)'
if (-not (Get-Command pm2 -ErrorAction SilentlyContinue)) {
  npm install -g pm2
}
Write-Ok 'PM2 disponible'

Write-Info "7) Backend PM2 (puerto $BackendPort)"
$env:UCM_FLEET_APP_ROOT = $AppPath
pm2 startOrReload $Pm2Config --only UCMFleet-Backend --update-env
if ($LASTEXITCODE -ne 0) { throw 'pm2 startOrReload fallo' }
pm2 save
Write-Ok 'Backend en PM2'

Write-Info '8) IIS sitio -> dist\frontend'
Import-Module WebAdministration

if (-not (Test-Path "IIS:\AppPools\$AppPoolName")) {
  New-WebAppPool -Name $AppPoolName | Out-Null
}
Set-ItemProperty "IIS:\AppPools\$AppPoolName" -Name managedRuntimeVersion -Value ''
Set-ItemProperty "IIS:\AppPools\$AppPoolName" -Name processModel.identityType -Value ApplicationPoolIdentity

if (Test-Path "IIS:\Sites\$SiteName") {
  Set-ItemProperty "IIS:\Sites\$SiteName" -Name applicationPool -Value $AppPoolName
  Set-ItemProperty "IIS:\Sites\$SiteName" -Name physicalPath -Value $FrontendDist
  $binding = Get-WebBinding -Name $SiteName -Protocol 'http' -Port $SitePort -ErrorAction SilentlyContinue
  if (-not $binding) {
    New-WebBinding -Name $SiteName -Protocol http -Port $SitePort -IPAddress '*' -HostHeader '' | Out-Null
  }
} else {
  New-Website -Name $SiteName -Port $SitePort -PhysicalPath $FrontendDist -ApplicationPool $AppPoolName | Out-Null
}
Write-Ok "Sitio $SiteName"

Write-Info '9) ARR proxy (rewrite -> localhost)'
Set-WebConfigurationProperty -PSPath 'MACHINE/WEBROOT/APPHOST' -Filter 'system.webServer/proxy' -Name enabled -Value true
Write-Ok 'Proxy ARR habilitado'

Write-Info '10) Permisos IIS_IUSRS'
icacls $AppPath /grant 'IIS_IUSRS:(OI)(CI)RX' /T | Out-Null
icacls (Join-Path $AppPath 'logs') /grant 'IIS_IUSRS:(OI)(CI)M' /T | Out-Null
Write-Ok 'Permisos'

Write-Info '11) Reinicio app pool + prueba health'
Restart-WebAppPool -Name $AppPoolName
Restart-WebItem "IIS:\Sites\$SiteName"
Start-Sleep -Seconds 2

try {
  $health = Invoke-RestMethod -Uri "http://localhost:$BackendPort/api/health" -TimeoutSec 15
  if ($health.ok) { Write-Ok "API directa :$BackendPort/api/health OK" }
} catch {
  Write-Warn "API directa no respondio: $($_.Exception.Message)"
}

try {
  $viaIis = Invoke-RestMethod -Uri "http://localhost:$SitePort/api/health" -TimeoutSec 15
  if ($viaIis.ok) { Write-Ok "API via IIS :$SitePort/api/health OK" }
} catch {
  Write-Warn "API via IIS no respondio: $($_.Exception.Message)"
}

pm2 status

Write-Ok 'Instalacion productiva terminada'
Write-Host ''
Write-Host "URL publica:  $PublicSiteUrl" -ForegroundColor Green
Write-Host "IIS local:    http://localhost:$SitePort/" -ForegroundColor Green
Write-Host "API local:    http://localhost:$SitePort/api/health" -ForegroundColor Green
Write-Host ''
Write-Warn "IIS: binding HTTPS host header $PublicHostHeader -> dist\frontend (certificado en el servidor)."
Write-Warn "backend\.env: CORS_ORIGIN=$PublicSiteUrl"
Write-Warn "UCMSSO: SSO_TRUSTED_REDIRECT_ORIGINS += $PublicSiteUrl"
Write-Warn 'UCMSSO Applications: URL satelite = ' + $PublicSiteUrl + ' ; connection_string -> UCMFlota en 10.1.4.5'
