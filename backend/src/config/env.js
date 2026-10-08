import path from 'node:path'
import { fileURLToPath } from 'node:url'
import 'dotenv/config'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const backendRoot = path.resolve(__dirname, '../..')

const toBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback
  return ['true', '1', 'yes', 'y'].includes(String(value).toLowerCase())
}

const localhostOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i

export function isProductionEnvironment() {
  return process.env.NODE_ENV === 'production' || process.env.APP_ENV === 'production'
}

export function resolveCorsConfig() {
  if (toBoolean(process.env.CORS_ALLOW_LOCALHOST, !isProductionEnvironment())) {
    return {
      origin(origin, callback) {
        if (!origin || localhostOriginPattern.test(origin)) {
          callback(null, true)
          return
        }
        callback(new Error(`Origen no permitido por CORS: ${origin}`))
      },
      credentials: true,
    }
  }

  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5180'
  return {
    origin: corsOrigin === '*' ? true : corsOrigin.split(',').map((item) => item.trim()),
    credentials: true,
  }
}

export const env = {
  port: Number(process.env.PORT || 4010),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5180',
  jwtSecret: process.env.JWT_SECRET || 'ucm-fleet-dev-secret-change-me',
  /** Firma de `#sso_token` del portal UCM SSO. Distinto del JWT local de sesión Fleet. */
  ssoJwtSecret: process.env.SSO_JWT_SECRET || '',
  jwtExpiresInSeconds: Number(process.env.JWT_EXPIRES_IN_SECONDS || 8 * 60 * 60),
  uploadsDir: path.resolve(backendRoot, process.env.UPLOADS_DIR || 'uploads'),
  wisetrack: {
    enabled: toBoolean(process.env.WISETRACK_ENABLED, true),
    baseUrl: process.env.WISETRACK_BASE_URL || 'https://api-gateway.wisetrack.cl/prod',
    authPath: process.env.WISETRACK_AUTH_PATH || '/ucm/v1/auth/getToken',
    clientId: process.env.WISETRACK_CLIENT_ID || '',
    clientSecret: process.env.WISETRACK_CLIENT_SECRET || '',
    apiKey: process.env.WISETRACK_API_KEY || '',
  },
  database: {
    user: process.env.DB_USER || 'app_user',
    password: process.env.DB_PASSWORD || '123456',
    server: process.env.DB_SERVER || 'localhost',
    port: Number(process.env.DB_PORT || 1433),
    database: process.env.DB_NAME || 'ucm_fleet',
    pool: {
      max: Number(process.env.DB_POOL_MAX || 10),
      min: Number(process.env.DB_POOL_MIN || 0),
      idleTimeoutMillis: Number(process.env.DB_POOL_IDLE_MS || 30000),
    },
    // Con gps_minute_pings en millones, 60s es insuficiente para algunos listados.
    requestTimeout: Number(process.env.DB_REQUEST_TIMEOUT_MS || 180000),
    options: {
      encrypt: toBoolean(process.env.DB_ENCRYPT, false),
      trustServerCertificate: toBoolean(process.env.DB_TRUST_SERVER_CERTIFICATE, true),
      enableArithAbort: true,
    },
  },
}
