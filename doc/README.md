# UCM Fleet Data Platform

Plataforma de administración de flota UCM (maestros, kilometraje, combustible, operacional) con preparación de ingesta GPS Wisetrack.

## Stack

- Frontend: React 19 + Vite 6 + Tailwind 4 (shell inspirado en UCM-CRM)
- Backend: Express + mssql
- BD: SQL Server `ucm_fleet`

## Puertos (dev)

| Servicio | Puerto |
|----------|--------|
| API      | 4010   |
| Web      | 5180   |

## Arranque

```powershell
cd C:\ReposNodejs\UCMFleetDataPlatform
copy backend\.env.example backend\.env
# Ajustar DB_* si es necesario (mismas credenciales que UCM-CRM)

npm --prefix backend install
npm --prefix frontend install
npm run db:create
npm run db:migrate
npm run dev
```

Login seed: `admin` / `123456`

URL: http://localhost:5180/login

## Documentación

- [ARQUITECTURA.md](ARQUITECTURA.md)
- [MODELO_BD.md](MODELO_BD.md)
- [WISETRACK_INGESTION.md](WISETRACK_INGESTION.md)
- [TRAUMASOFT_ORGANIZATION.md](TRAUMASOFT_ORGANIZATION.md) — División / Centro de costo / Estación en vehículos

## Scripts útiles

```powershell
npm --prefix backend run db:migrate
npm --prefix backend run traumasoft:sync-org   # requiere TS_* en backend/.env
```
