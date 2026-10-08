# Empaqueta release para copiar al servidor IIS (sin node_modules).
param(
  [string]$OutDir = '',
  [switch]$Zip
)

$ErrorActionPreference = 'Stop'

$Root = Resolve-Path (Join-Path $PSScriptRoot '..\..')
& (Join-Path $PSScriptRoot 'build.ps1')
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if (-not $OutDir) {
  $OutDir = Join-Path $Root 'release\UCMFleet'
}
$OutDir = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($OutDir)

Write-Host "[publish] Destino: $OutDir"
if (Test-Path $OutDir) {
  Remove-Item -Recurse -Force $OutDir
}
New-Item -ItemType Directory -Path $OutDir -Force | Out-Null

$ExcludeDirs = @('node_modules', '.git', 'release', 'frontend\node_modules', 'frontend\dist', 'backend\uploads')
$ExcludeFiles = @('backend\.env')

function Copy-Tree {
  param([string]$RelativePath)
  $Source = Join-Path $Root $RelativePath
  if (-not (Test-Path $Source)) { return }
  $Dest = Join-Path $OutDir $RelativePath
  $Parent = Split-Path $Dest -Parent
  if (-not (Test-Path $Parent)) { New-Item -ItemType Directory -Path $Parent -Force | Out-Null }
  Copy-Item -Path $Source -Destination $Dest -Recurse -Force
}

# Carpetas principales
@(
  'backend\src',
  'backend\database',
  'backend\package.json',
  'backend\package-lock.json',
  'backend\.env.production.example',
  'dist',
  'scripts\scheduled',
  'scripts\deploy',
  'config',
  'doc',
  'package.json',
  'web.config.production',
  'pm2.config.example.cjs',
  'INSTALAR_PRODUCCION_IIS.ps1',
  'README.md'
) | ForEach-Object { Copy-Tree $_ }

New-Item -ItemType Directory -Path (Join-Path $OutDir 'logs') -Force | Out-Null

$Readme = @"
UCM Fleet — paquete de release
Generado: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')

En el servidor Windows (IIS + PM2):
1. Copiar esta carpeta a C:\inetpub\Apps\UCMFleet
2. Copiar backend\.env.production.example -> backend\.env y completar secretos
3. Copy-Item pm2.config.example.cjs pm2.config.cjs
4. PowerShell Admin: .\INSTALAR_PRODUCCION_IIS.ps1
5. Cron Wisetrack: npm run wisetrack:install-daily-task (desde backend con .env)
"@
$Readme | Out-File -FilePath (Join-Path $OutDir 'RELEASE.txt') -Encoding utf8

Write-Host '[publish] OK'

if ($Zip) {
  $ZipPath = "$OutDir.zip"
  if (Test-Path $ZipPath) { Remove-Item -Force $ZipPath }
  Compress-Archive -Path $OutDir -DestinationPath $ZipPath -Force
  Write-Host "[publish] ZIP: $ZipPath"
}

Write-Host $OutDir
