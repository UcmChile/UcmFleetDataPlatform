# Deploy IIS 10 + PM2 (producción)

Patrón igual a SENN / UCM Vehículos: **IIS sirve el frontend** (`dist/frontend`) y **PM2 ejecuta el backend** Node (`backend/src/server.js` en puerto **4010**).

## Rutas sugeridas en el servidor

| Elemento | Valor |
|----------|--------|
| Carpeta app | `C:\inetpub\Apps\UCMFleet` |
| Sitio IIS | `UCMFleet` |
| App pool | `UCMFleet-AppPool` |
| Puerto IIS (HTTP) | `5185` (ajustable) |
| Backend PM2 | `4010` |
| BD | `10.1.4.5` / `UCMFlota` |
| URL pública | **`https://flota.ucmchile.cl`** |

## Desde desarrollo (build + paquete)

```powershell
cd C:\ReposNodejs\UCMFleetDataPlatform
npm run build:production
npm run publish:release
# Opcional ZIP: npm run publish:release -- -Zip
```

Salida: `release\UCMFleet\` (copiar al servidor) o `release\UCMFleet.zip`.

## Prerrequisitos en el servidor (sin git)

PowerShell **como administrador** (una sola vez por máquina). Incluye Node.js LTS, npm, PM2 global, rol IIS, **URL Rewrite** y **ARR** (proxy).

```powershell
# Desde la carpeta extraida UCMFleet (o el repo en dev)
PowerShell -ExecutionPolicy Bypass -File .\scripts\deploy\install-server-prerequisites.ps1
```

Requisitos del script:

| Componente | Cómo lo instala |
|------------|------------------|
| Node.js LTS + npm | `winget` (`OpenJS.NodeJS.LTS`) o `choco install nodejs-lts` |
| PM2 | `npm install -g pm2` |
| IIS | `Install-WindowsFeature Web-Server` (Server) |
| URL Rewrite | `choco install urlrewrite` (si Chocolatey está instalado) |
| ARR | `choco install iis-arr` |
| Proxy ARR | `Set-WebConfigurationProperty ... proxy enabled=true` |

Si **no** hay `winget` ni **Chocolatey**, instale manualmente:

- Node LTS: https://nodejs.org/
- URL Rewrite: https://www.iis.net/downloads/microsoft/url-rewrite
- ARR: https://www.iis.net/downloads/microsoft/application-request-routing

Luego vuelva a ejecutar el script con `-SkipNode` (o solo la parte que falte).

Opcional — PM2 al arranque del servidor:

```powershell
.\scripts\deploy\install-server-prerequisites.ps1 -InstallPm2Startup
pm2 save
```

En muchos servidores UCM, IIS + Rewrite + ARR **ya están** por otras apps (SENN, SSO, etc.). En ese caso:

```powershell
.\scripts\deploy\install-server-prerequisites.ps1 -SkipIis -SkipUrlRewrite -SkipArr
```

## En el servidor Windows

1. Copiar `release\UCMFleet` → `C:\inetpub\Apps\UCMFleet`
2. `Copy-Item backend\.env.production.example backend\.env` y completar (BD, JWT, SSO). Dejar `CORS_ORIGIN=https://flota.ucmchile.cl` y `CORS_ALLOW_LOCALHOST=false`.
3. `Copy-Item pm2.config.example.cjs pm2.config.cjs`
4. PowerShell **como administrador**:

```powershell
cd C:\inetpub\Apps\UCMFleet
.\INSTALAR_PRODUCCION_IIS.ps1
```

5. Cron Wisetrack (01:00, día anterior Chile):

```powershell
cd C:\inetpub\Apps\UCMFleet
npm run wisetrack:install-daily-task
```

## Actualizar versión

En el servidor, reemplace archivos (o descomprima nuevo release), luego:

```powershell
cd C:\inetpub\Apps\UCMFleet
powershell -ExecutionPolicy Bypass -File scripts\deploy\build.ps1   # si trae fuentes frontend
# o solo copiar dist/frontend nuevo
Push-Location backend; npm ci --omit=dev; Pop-Location
pm2 startOrReload pm2.config.cjs --only UCMFleet-Backend --update-env
Restart-WebAppPool -Name UCMFleet-AppPool
```

## Error: `Failed to connect to localhost:1433`

Significa que el backend **no está leyendo** `DB_SERVER=10.1.4.5` y cae al default `localhost`.

1. El archivo debe existir en **`C:\inetpub\Apps\UCMFleet\backend\.env`** (no en la raíz del sitio ni solo `.env.example`).
2. Contenido mínimo de BD:

```env
DB_SERVER=10.1.4.5
DB_PORT=1433
DB_NAME=UCMFlota
DB_USER=ucmflota
DB_PASSWORD=<clave real>
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=true
```

3. Recargar PM2 (PM2 no relee `.env` solo con restart si el proceso ya estaba en memoria):

```powershell
cd C:\inetpub\Apps\UCMFleet
pm2 startOrReload pm2.config.cjs --only UCMFleet-Backend --update-env
pm2 logs UCMFleet-Backend --lines 30
```

En el log debe aparecer `BD objetivo: 10.1.4.5:1433/UCMFlota`.

4. Red desde el **servidor IIS** (no desde tu PC):

```powershell
Test-NetConnection -ComputerName 10.1.4.5 -Port 1433
```

Si `TcpTestSucceeded : False`, abrir firewall/SQL en `10.1.4.5` para la IP del servidor web.

## Verificación

- `http://localhost:4010/api/health` (PM2)
- `http://localhost:5185/api/health` (IIS + rewrite)
- Navegador: `https://flota.ucmchile.cl/login`
- UCMSSO: `SSO_TRUSTED_REDIRECT_ORIGINS` debe incluir `https://flota.ucmchile.cl`
- UCMSSO → Applications (slug `ucm-fleet` o equivalente): URL base `https://flota.ucmchile.cl`

## Logs

- PM2: `logs/out.log`, `logs/error.log`
- Wisetrack cron: `backend/logs/daily-wisetrack-pings.log`
