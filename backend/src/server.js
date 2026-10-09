import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { env, resolveCorsConfig, isProductionEnvironment } from './config/env.js'
import { registerRoutes } from './routes/index.js'
import { errorHandler, notFound } from './middlewares/errorHandler.js'
import { ensureSeedAdmin } from './modules/auth/auth.service.js'

const app = express()

if (isProductionEnvironment()) {
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }))
}

app.use(cors(resolveCorsConfig()))
app.use(express.json({ limit: '5mb' }))
app.use(express.urlencoded({ extended: true }))
app.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  res.set('Pragma', 'no-cache')
  res.set('Expires', '0')
  next()
})

await registerRoutes(app)

app.use(notFound)
app.use(errorHandler)

if (isProductionEnvironment()) {
  const dbHost = env.database.server
  const dbName = env.database.database
  if (dbHost === 'localhost' || dbHost === '127.0.0.1') {
    console.error(
      'Produccion: DB_SERVER apunta a localhost. Cree o corrija backend/.env (ej. DB_SERVER=10.1.4.5, DB_NAME=UCMFlota).',
    )
  } else {
    console.log(`BD objetivo: ${dbHost}:${env.database.port}/${dbName}`)
  }
}

try {
  await ensureSeedAdmin()
} catch (error) {
  console.warn('Seed admin omitido (¿migraciones pendientes?):', error.message)
}

app.listen(env.port, () => {
  console.log(`UCM Fleet API escuchando en http://localhost:${env.port}`)
})
