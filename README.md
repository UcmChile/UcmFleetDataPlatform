# UCM Fleet Data Platform

Administración de flota UCM sobre SQL Server (`ucm_fleet`), con mantenedores CRUD y esqueleto de ingesta Wisetrack.

Ver documentación en [`doc/README.md`](doc/README.md).

```powershell
npm --prefix backend install
npm --prefix frontend install
npm run db:create
npm run db:migrate
npm run dev
```

- Web: http://localhost:5180/login  
- API: http://localhost:4010/api/health  
- Seed: `admin` / `123456`
