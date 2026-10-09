# Instala prerequisitos en Windows Server / Windows con IIS para UCM Fleet.
# Ejecutar PowerShell COMO ADMINISTRADOR en el servidor productivo.
#
#   PowerShell -ExecutionPolicy Bypass -File .\scripts\deploy\install-server-prerequisites.ps1
#
param(
  [switch]$SkipNode,
  [switch]$SkipPm2,
  [switch]$SkipIis,
  [switch]$SkipUrlRewrite,
  [switch]$SkipArr,
  [switch]$InstallPm2Startup
)

$ErrorActionPreference = 'Stop'

function Write-Info($msg) { Write-Host "[INFO] $msg" -ForegroundColor Cyan }
function Write-Ok($msg) { Write-Host "[OK]   $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Err($msg) { Write-Host "[ERR]  $msg" -ForegroundColor Red }

function Test-IsAdmin {
  $id = [Security.Principal.WindowsIdentity]::GetCurrent()
  $p = New-Object Security.Principal.WindowsPrincipal($id)
  return $p.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Refresh-PathEnv {
  $machine = [Environment]::GetEnvironmentVariable('Path', 'Machine')
  $user = [Environment]::GetEnvironmentVariable('Path', 'User')
  $env:Path = "$machine;$user"
}

function Ensure-Command($name) {
  return [bool](Get-Command $name -ErrorAction SilentlyContinue)
}

function Install-WithWinget($wingetId) {
  if (-not (Ensure-Command winget)) { return $false }
  Write-Info "winget install $wingetId"
  winget install --id $wingetId -e --accept-source-agreements --accept-package-agreements --silent
  return $LASTEXITCODE -eq 0
}

function Install-WithChoco($package) {
  if (-not (Ensure-Command choco)) { return $false }
  Write-Info "choco install $package"
  choco install $package -y --no-progress
  return $LASTEXITCODE -eq 0
}

function Install-NodeLts {
  if (Ensure-Command node) {
    Write-Ok "Node ya instalado: $(node -v)"
    return
  }

  Write-Info 'Instalando Node.js LTS...'
  $ok = $false
  if (Install-WithWinget 'OpenJS.NodeJS.LTS') { $ok = $true }
  if (-not $ok) { if (Install-WithChoco 'nodejs-lts') { $ok = $true } }

  Refresh-PathEnv
  if (-not (Ensure-Command node)) {
    throw @'
No se pudo instalar Node.js automaticamente.
Instale manualmente Node.js LTS desde https://nodejs.org/ (opcion LTS, marcar "Add to PATH")
y vuelva a ejecutar este script con -SkipIis -SkipUrlRewrite -SkipArr si IIS ya esta listo.
'@
  }
  Write-Ok "Node $(node -v) / npm $(npm -v)"
}

function Install-Pm2Global {
  if (-not (Ensure-Command npm)) { throw 'npm no disponible; instale Node primero.' }

  Refresh-PathEnv
  if (Ensure-Command pm2) {
    Write-Ok "PM2 ya instalado: $(pm2 -v)"
  } else {
    Write-Info 'npm install -g pm2'
    npm install -g pm2
    Refresh-PathEnv
    if (-not (Ensure-Command pm2)) { throw 'PM2 no quedo en PATH tras npm install -g pm2' }
    Write-Ok "PM2 $(pm2 -v)"
  }

  if ($InstallPm2Startup) {
    Write-Info 'Registrando PM2 para arranque automatico (pm2 startup)...'
    Write-Warn 'Revise la salida de pm2 startup y ejecute el comando que sugiera si aplica en Windows.'
    pm2 startup | Out-Host
  }
}

function Install-IisFeatures {
  $isServer = (Get-CimInstance Win32_OperatingSystem).ProductType -ne 1
  if ($isServer) {
    Write-Info 'Install-WindowsFeature Web-Server (IIS)...'
    $result = Install-WindowsFeature -Name Web-Server, Web-Mgmt-Console, Web-Static-Content, Web-Default-Doc, Web-Http-Logging, Web-Request-Monitor, Web-Stat-Compression, Web-Filtering, Web-ISAPI-Extensions, Web-ISAPI-Filter -IncludeManagementTools
    if ($result.Success -ne $true) { throw 'Install-WindowsFeature Web-Server fallo' }
  } else {
    Write-Info 'Enable-WindowsOptionalFeature IIS-... (Windows cliente)'
    Enable-WindowsOptionalFeature -Online -FeatureName IIS-WebServerRole, IIS-WebServer, IIS-CommonHttpFeatures, IIS-StaticContent, IIS-DefaultDocument, IIS-HttpLogging, IIS-RequestFiltering, IIS-ManagementConsole -All -NoRestart | Out-Null
  }
  Write-Ok 'Rol IIS instalado o ya presente'
}

function Install-UrlRewriteModule {
  $rewriteDll = Join-Path $env:ProgramFiles 'IIS\Microsoft Rewrite Module\rewrite.dll'
  if (Test-Path $rewriteDll) {
    Write-Ok 'URL Rewrite ya instalado'
    return
  }

  Write-Info 'Instalando IIS URL Rewrite Module 2...'
  $ok = Install-WithChoco 'urlrewrite'
  if (-not $ok) {
    throw @'
Instale URL Rewrite manualmente:
https://www.iis.net/downloads/microsoft/url-rewrite
(o en el servidor con Chocolatey: choco install urlrewrite -y)
'@
  }
  if (-not (Test-Path $rewriteDll)) {
    Write-Warn "Choco termino pero no se encontro $rewriteDll — reinicie IIS o el servidor y verifique."
  } else {
    Write-Ok 'URL Rewrite instalado'
  }
}

function Install-ArrModule {
  $arrDll = Join-Path $env:ProgramFiles 'IIS\Application Request Routing\requestrouter.dll'
  if (Test-Path $arrDll) {
    Write-Ok 'ARR ya instalado'
    return
  }

  Write-Info 'Instalando IIS Application Request Routing (ARR)...'
  $ok = Install-WithChoco 'iis-arr'
  if (-not $ok) {
    throw @'
Instale ARR manualmente:
https://www.iis.net/downloads/microsoft/application-request-routing
(o: choco install iis-arr -y)
'@
  }
  if (-not (Test-Path $arrDll)) {
    Write-Warn "Choco termino pero no se encontro $arrDll — reinicie IIS o el servidor y verifique."
  } else {
    Write-Ok 'ARR instalado'
  }
}

function Enable-ArrProxy {
  Import-Module WebAdministration -ErrorAction Stop
  Set-WebConfigurationProperty -PSPath 'MACHINE/WEBROOT/APPHOST' -Filter 'system.webServer/proxy' -Name enabled -Value true
  Write-Ok 'Proxy ARR habilitado (system.webServer/proxy enabled=true)'
}

function Show-Summary {
  Write-Host ''
  Write-Host '--- Resumen ---' -ForegroundColor White
  if (Ensure-Command node) { Write-Ok "node $(node -v)" } else { Write-Err 'node NO' }
  if (Ensure-Command npm) { Write-Ok "npm $(npm -v)" } else { Write-Err 'npm NO' }
  if (Ensure-Command pm2) { Write-Ok "pm2 $(pm2 -v)" } else { Write-Err 'pm2 NO' }
  $rewrite = Test-Path (Join-Path $env:ProgramFiles 'IIS\Microsoft Rewrite Module\rewrite.dll')
  $arr = Test-Path (Join-Path $env:ProgramFiles 'IIS\Application Request Routing\requestrouter.dll')
  if ($rewrite) { Write-Ok 'URL Rewrite' } else { Write-Err 'URL Rewrite NO' }
  if ($arr) { Write-Ok 'ARR' } else { Write-Err 'ARR NO' }
  Write-Host ''
  Write-Host 'Siguiente paso UCM Fleet:' -ForegroundColor Green
  Write-Host '  1) Extraer UCMFleet.zip en C:\inetpub\Apps\UCMFleet'
  Write-Host '  2) backend\.env + pm2.config.cjs'
  Write-Host '  3) .\INSTALAR_PRODUCCION_IIS.ps1'
  Write-Host '  4) Binding HTTPS flota.ucmchile.cl en IIS Manager'
}

if (-not (Test-IsAdmin)) {
  throw 'Ejecute este script como Administrador.'
}

Write-Info 'UCM Fleet — prerequisitos servidor (Node LTS, PM2, IIS, URL Rewrite, ARR)'

if (-not $SkipNode) { Install-NodeLts } else { Write-Warn 'Skip Node' }
if (-not $SkipPm2) { Install-Pm2Global } else { Write-Warn 'Skip PM2' }
if (-not $SkipIis) { Install-IisFeatures } else { Write-Warn 'Skip IIS' }
if (-not $SkipUrlRewrite) { Install-UrlRewriteModule } else { Write-Warn 'Skip URL Rewrite' }
if (-not $SkipArr) { Install-ArrModule } else { Write-Warn 'Skip ARR' }

if (-not $SkipArr -and -not $SkipIis) {
  try { Enable-ArrProxy } catch { Write-Warn "No se pudo habilitar proxy ARR: $($_.Exception.Message)" }
}

Show-Summary
