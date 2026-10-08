# Modelo de base de datos (`ucm_fleet`)

Transcripción del PDF `ucm_modelo_completo_v3` + extensiones Wisetrack.

## Migraciones

| Archivo | Contenido |
|---------|-----------|
| `000_create_database.sql` | CREATE DATABASE |
| `001_auth.sql` | users / roles / migrations |
| `002_maestros.sql` | vehicles, persons (+ wisetrack_vehicle_id) |
| `003_kilometraje.sql` | gps_*, physical_readings, reconciliation, odometer_daily |
| `004_combustible.sql` | fuel_* |
| `005_operacional.sql` | facilities, placeholders, shifts, runs, run_legs |
| `006_wisetrack.sql` | ingestion_log, rejected_pings |
| `007_wisetrack_credentials.sql` | api_config (credenciales) + api_tokens |
| `011_gps_daily_km_odo_consistency.sql` | first/last odómetro + is_consistent en gps_daily_km |
| `012_vehicles_organization.sql` | catálogos org + FKs en vehicles |

## Organización vehículos (012)

Catálogos (Traumasoft → local):

- `divisions`, `districts`, `org_groups`, `cost_centers`, `stations`
- Cada uno: `external_id INT UNIQUE`, `name`, `synced_at`

Extensiones en `vehicles`:

- `traumasoft_vehicle_id INT NULL` (único filtrado)
- `division_id`, `district_id`, `group_id`, `cost_center_id`, `station_id INT NULL`

La API resuelve nombres con LEFT JOIN (`division`, `cost_center`, `station`, etc.). Ver [TRAUMASOFT_ORGANIZATION.md](TRAUMASOFT_ORGANIZATION.md).

## Notas

- `gps_minute_pings` y `gps_daily_km` tienen `id IDENTITY` para mantenedores y `UNIQUE (vehicle_id, ts|date)` para idempotencia de ingesta.
- `vehicles.wisetrack_vehicle_id` con índice único filtrado.
- Organización Traumasoft: sincronizar con `npm run traumasoft:sync-org` (requiere `TS_*` en `.env`).
