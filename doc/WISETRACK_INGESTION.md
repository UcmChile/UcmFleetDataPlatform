# Ingesta Wisetrack

Basado en `Requerimientos_API_Wisetrack_UCM.docx`. Destino BD: **`ucm_fleet`** (no `ucm_kilometraje`).

## Estado actual

| Capacidad | Estado |
|-----------|--------|
| Validación de pings (§6.1) | Implementada |
| `ingestBatch` idempotente → `gps_minute_pings` | Implementada |
| Dead-letter `wisetrack_rejected_pings` | Implementada |
| Log `wisetrack_ingestion_log` | Implementada |
| MERGE `gps_daily_km` | Implementada |
| Credenciales API + obtención de token | Implementada (UI admin) |
| Mantenedor historial tokens | Implementada (solo lectura) |
| Cliente HTTP con Bearer | Implementado (paths Postman WT-UCM) |
| Pull vehículos → `vehicles` | Implementado |
| Pull pings → `gps_minute_pings` | Implementado |

## Auth API Gateway (Postman WT-UCM)

- Base URL: `https://api-gateway.wisetrack.cl/prod` (o el `baseUrl` del environment Postman)
- Login: `POST {base_url}/ucm/v1/auth/getToken`
- Body: `{ "username", "password" }`
- Respuesta: `{ "token": "..." }` → se usa como `Authorization: Bearer {token}`
- Vehículos: `GET /ucm/get/v1/vehicles`
- Pings: `GET /ucm/v1/pings?from&to&page&page_size`
- Pings por vehículo: `GET /ucm/v1/vehicles/{vehicle_id}/pings?...`
- Password cifrado en BD (`wisetrack_api_config.password_enc`)
- Token guardado en `wisetrack_api_tokens` (UI enmascarado)

## Endpoints internos

- `GET/PUT /api/integrations/wisetrack/credentials` — leer/guardar credenciales
- `POST /api/integrations/wisetrack/credentials/obtain-token` — login remoto + guardar token
- `GET /api/integrations/wisetrack/tokens` — listado enmascarado
- `GET /api/integrations/wisetrack/remote/vehicles` — proxy Postman Get Vehicles
- `GET /api/integrations/wisetrack/remote/pings?from&to&page&page_size` — proxy Get Pings
- `GET /api/integrations/wisetrack/remote/vehicles/:id/pings?...` — proxy Get Vehicle Pings
- `POST /api/integrations/wisetrack/pull/vehicles` — sync a `dbo.vehicles`
- `POST /api/integrations/wisetrack/pull/pings` — pull + ingest a `gps_minute_pings`
- `POST /api/integrations/wisetrack/consolidate-daily` — `{ reading_date? }`
- `GET /api/integrations/wisetrack/status`

## Cron diario (01:00)

Extracción automática de pings del **día civil anterior** (`America/Santiago`):

1. Sincroniza vehículos Wisetrack → `dbo.vehicles`
2. Pull paginado del día (`00:00:00`–`23:59:59` Chile) → `gps_minute_pings`
3. Consolida `gps_daily_km` para esa fecha

Manual:

```bash
npm run wisetrack:daily-pings
# npm run wisetrack:daily-pings -- --date 2026-10-07
```

Tarea Windows (01:00 hora local del servidor):

```powershell
npm run wisetrack:install-daily-task
# Start-ScheduledTask -TaskName UCMFleet_WisetrackDailyPings
```

Log: `backend/logs/daily-wisetrack-pings.log`

Requisitos: `backend/.env` con BD y `WISETRACK_ENABLED=true`; token/credenciales activas en UI.

## Flujo operativo (con token en BD)

1. Token activo en Credenciales / Token (Bearer ya persistido).
2. Consola Wisetrack → **Sincronizar vehículos** (`GET /ucm/get/v1/vehicles`).
3. Definir `from` / `to` ISO → **Pull + ingest pings** (`GET /ucm/v1/pings` o por `vehicle_id`).
4. Revisar mantenedores: Vehicles, GPS minute pings, Bitácora, Pings rechazados.
5. **Consolidar** → `gps_daily_km`.

## Variables `.env`

```
WISETRACK_ENABLED=true
WISETRACK_BASE_URL=https://api-gateway.wisetrack.cl/prod
WISETRACK_AUTH_PATH=/ucm/v1/auth/getToken
```

## Error: `Unsupported state or unable to authenticate data`

Al hacer **Pull vehicles** o **Obtener token**, la API descifra `wisetrack_api_config.password_enc` con **AES-GCM** y clave derivada de **`JWT_SECRET`** (`backend/.env`).

Si migró datos desde desarrollo y en producción puso otro `JWT_SECRET`, el descifrado falla con ese mensaje.

**Solución A (rápida):** en `backend/.env` de producción use el mismo `JWT_SECRET` que en desarrollo (el que tenía cuando guardó las credenciales en UI), reinicie PM2, pruebe de nuevo.

**Solución B (recomendada):** deje un `JWT_SECRET` fuerte propio de producción, entre en **Integraciones → Credenciales Wisetrack**, vuelva a ingresar **usuario y password**, guarde y pulse **Obtener token**. Eso re-cifra la password con el `JWT_SECRET` actual.

```powershell
pm2 startOrReload pm2.config.cjs --only UCMFleet-Backend --update-env
```

Las credenciales `username`/`password` se administran en UI:
`/fleet/integraciones/wisetrack/credenciales`
