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

Las credenciales `username`/`password` se administran en UI:
`/fleet/integraciones/wisetrack/credenciales`
