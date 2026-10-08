# Arquitectura

```
Browser (5180) → Vite proxy /api → Express (4010) → SQL Server (ucm_fleet)
```

## Módulos backend

| Ruta | Descripción |
|------|-------------|
| `/api/auth` | Login JWT |
| `/api/{entity}` | CRUD mantenedores Fleet |
| `/api/integrations/wisetrack` | Ingesta manual, consolidación, pull Wisetrack |

Script CLI (no HTTP): `npm run traumasoft:sync-org` — catálogos org + FKs vehículo desde Traumasoft.

## Mantenedores

Factory `createEntityMaintainer` sobre tablas `BIGINT IDENTITY`. Soporta `joins` opcionales (LEFT JOIN) para campos calculados/enriquecidos en lectura — usado en `vehicles` para División, Centro de costo y Estación.

UI genérica `CrmMaintainerPage` + menú por dominio (Maestros / Kilometraje / Combustible / Operacional / Integraciones).

## Auth

Tabla `fleet_users` + roles. Token JWT HS256 en `Authorization: Bearer`. Session frontend: `ucm.fleet.token` / `ucm.fleet.user`.
