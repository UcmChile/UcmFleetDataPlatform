# Organización de vehículos (Traumasoft)

Complementa `dbo.vehicles` con **División · Centro de costo · Estación** (y distrito/grupo), resolviendo el nombre desde tablas maestras locales con el mismo criterio que la query Traumasoft:

```sql
-- Origen Traumasoft (MySQL)
LEFT JOIN sched_divisions  ON veh.division_id = sched_divisions.id
LEFT JOIN sched_districts  ON veh.district_id = sched_districts.id
LEFT JOIN sched_groups     ON veh.group_id = sched_groups.id
LEFT JOIN cost_centers     ON veh.cost_center_id = cost_centers.id
LEFT JOIN sched_stations   ON veh.station_id = sched_stations.id
```

En `ucm_fleet` los IDs externos se guardan en `vehicles.*_id` y el detalle se obtiene por JOIN a catálogos sincronizados.

## Tablas

| Tabla local | Origen Traumasoft | Uso |
|-------------|-------------------|-----|
| `divisions` | `sched_divisions` | Nombre de división |
| `districts` | `sched_districts` | Nombre de distrito |
| `org_groups` | `sched_groups` | Nombre de grupo |
| `cost_centers` | `cost_centers` | Nombre de centro de costo |
| `stations` | `sched_stations` | Nombre de estación |

Columnas en `vehicles`:

- `traumasoft_vehicle_id` — ID en `sched_vehicles`
- `division_id`, `district_id`, `group_id`, `cost_center_id`, `station_id` — IDs Traumasoft (FK lógica vía `external_id` en catálogos)

Migración: `database/012_vehicles_organization.sql`

## Sincronización

Variables en `backend/.env` (mismas que ProyectoVehiculosTS):

```env
TS_HOST=remotereporting.traumasoft.com
TS_PORT=6033
TS_USER=ucm_ro
TS_DB=traumasoft_ucm
TS_PASSWORD=...
```

```powershell
cd backend
npm run traumasoft:sync-org
```

El script:

1. Hace MERGE de catálogos (`sched_divisions`, `cost_centers`, etc.) → tablas locales.
2. Actualiza `vehicles` desde `sched_vehicles`, emparejando por `traumasoft_vehicle_id` o **patente normalizada**.

## API REST

Los mantenedores Fleet exponen CRUD genérico en `/api/{entity}`. Para vehículos:

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/vehicles` | Listado paginado con organización resuelta |
| `GET` | `/api/vehicles/:id` | Detalle con organización resuelta |
| `GET` | `/api/vehicles/options` | Opciones para selects |

Query params habituales: `page`, `pageSize`, `q`, `sortBy`, `sortDir`.

Orden por defecto: `vehicle_number` ASC.

### Campos de organización en la respuesta

Además de los campos base del vehículo, la API incluye (LEFT JOIN):

| Campo JSON | Descripción |
|------------|-------------|
| `division` | Nombre división |
| `district` | Nombre distrito |
| `group_name` | Nombre grupo |
| `cost_center` | Nombre centro de costo |
| `station` | Nombre estación |
| `division_id` … `station_id` | IDs Traumasoft (solo lectura) |
| `traumasoft_vehicle_id` | ID en sched_vehicles |

Ejemplo (`GET /api/vehicles?page=1&pageSize=2`):

```json
{
  "data": [
    {
      "id": "133",
      "vehicle_number": "WT-101",
      "plate": "XG-7061",
      "division": "Operaciones",
      "cost_center": "CC Ambulancias",
      "station": "Base Norte",
      "district": null,
      "group_name": null,
      "division_id": 12,
      "cost_center_id": 45,
      "station_id": 8,
      "traumasoft_vehicle_id": 101
    }
  ],
  "total": 124,
  "page": 1,
  "pageSize": 2
}
```

Búsqueda (`q`): también filtra por nombre de división, centro de costo, estación, distrito y grupo.

Los IDs de organización son **solo lectura** en la API; se actualizan vía `npm run traumasoft:sync-org`, no por PUT del mantenedor.
