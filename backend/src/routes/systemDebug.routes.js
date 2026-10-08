import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/apiError.js'
import { isPlatformOwner, requireAuth } from '../middlewares/auth.js'
import { env } from '../config/env.js'
import { resolveEntityDataSource, ENTITY_DATA_SOURCES } from '../lib/entityDataSources.js'

const router = Router()

router.use(requireAuth)

function requireOwnerAdmin(req) {
  if (!isPlatformOwner(req.user)) {
    throw new ApiError(403, 'Solo Owner o Administrador')
  }
}

function dbContext() {
  return {
    database: env.database.database,
    server: env.database.server,
    port: env.database.port,
  }
}

router.get('/db-info', asyncHandler(async (req, res) => {
  requireOwnerAdmin(req)
  res.json(dbContext())
}))

router.get('/data-sources', asyncHandler(async (req, res) => {
  requireOwnerAdmin(req)
  const key = String(req.query.key || '').trim()
  if (key) {
    const source = resolveEntityDataSource(key)
    if (!source) throw new ApiError(404, 'Fuente de datos no registrada para este mantenedor')
    return res.json({
      ...dbContext(),
      key: source.key,
      label: source.label,
      objects: source.objects || [],
      primaryTable: source.primaryTable || source.objects?.[0] || null,
      notes: source.notes || null,
      listSql: source.listSql || null,
      detailSql: source.detailSql || null,
    })
  }
  res.json({
    ...dbContext(),
    keys: Object.keys(ENTITY_DATA_SOURCES).sort(),
  })
}))

export default router
