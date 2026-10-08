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

## Verificación

- `http://localhost:4010/api/health` (PM2)
- `http://localhost:5185/api/health` (IIS + rewrite)
- Navegador: `https://flota.ucmchile.cl/login`
- UCMSSO: `SSO_TRUSTED_REDIRECT_ORIGINS` debe incluir `https://flota.ucmchile.cl`
- UCMSSO → Applications (slug `ucm-fleet` o equivalente): URL base `https://flota.ucmchile.cl`

## Logs

- PM2: `logs/out.log`, `logs/error.log`
- Wisetrack cron: `backend/logs/daily-wisetrack-pings.log`
