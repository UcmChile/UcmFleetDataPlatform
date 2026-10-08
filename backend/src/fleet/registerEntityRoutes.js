import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import { requireAuth } from '../middlewares/auth.js'
import { createEntityMaintainer } from './createEntityMaintainer.js'
import { FLEET_ENTITIES } from './entities.js'

function paging(req) {
  return {
    page: Number(req.query.page || 1),
    pageSize: Number(req.query.pageSize || 25),
    q: String(req.query.q || ''),
    sortBy: req.query.sortBy ? String(req.query.sortBy) : undefined,
    sortDir: req.query.sortDir ? String(req.query.sortDir) : undefined,
    status: req.query.status ? String(req.query.status) : undefined,
    dateFrom: req.query.dateFrom || req.query.date_from
      ? String(req.query.dateFrom || req.query.date_from)
      : undefined,
    dateTo: req.query.dateTo || req.query.date_to
      ? String(req.query.dateTo || req.query.date_to)
      : undefined,
    vehicle: req.query.vehicle ? String(req.query.vehicle) : undefined,
  }
}

export function registerFleetEntityRoutes(api) {
  for (const def of FLEET_ENTITIES) {
    const db = createEntityMaintainer(def)
    const router = Router()
    const base = `/${def.routeSlug}`

    router.get(
      '/',
      requireAuth,
      asyncHandler(async (req, res) => {
        const result = await db.getAll(paging(req))
        res.json(result)
      }),
    )

    router.get(
      '/options',
      requireAuth,
      asyncHandler(async (req, res) => {
        const items = await db.getOptions({
          limit: Number(req.query.limit || 50),
          q: String(req.query.q || ''),
        })
        res.json({ data: items })
      }),
    )

    router.get(
      '/:id',
      requireAuth,
      asyncHandler(async (req, res) => {
        const row = await db.getById(req.params.id)
        res.json({ data: row })
      }),
    )

    if (!def.readOnly) {
      router.post(
        '/',
        requireAuth,
        asyncHandler(async (req, res) => {
          const row = await db.create(req.body || {})
          res.status(201).json({ data: row })
        }),
      )

      router.put(
        '/:id',
        requireAuth,
        asyncHandler(async (req, res) => {
          const row = await db.update(req.params.id, req.body || {})
          res.json({ data: row })
        }),
      )

      if (def.softDisable) {
        router.patch(
          '/:id/disable',
          requireAuth,
          asyncHandler(async (req, res) => {
            const disabled = req.body?.is_disabled !== false && req.body?.disabled !== false
            const row = await db.setDisabled(req.params.id, disabled)
            res.json({ data: row })
          }),
        )
      }
    }

    api.use(base, router)
  }
}
