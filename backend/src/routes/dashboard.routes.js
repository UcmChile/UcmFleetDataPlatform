import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import { requireAuth } from '../middlewares/auth.js'
import { getDailyVehicleReport, getMonthlyPingCoverage, getIngestionHealth } from '../services/dashboardService.js'

const router = Router()

router.get(
  '/monthly-pings',
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = await getMonthlyPingCoverage({
      year: req.query.year ? Number(req.query.year) : undefined,
      month: req.query.month ? Number(req.query.month) : undefined,
    })
    res.json({ data })
  }),
)

router.get(
  '/daily-vehicles',
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = await getDailyVehicleReport(req.query.date)
    res.json({ data })
  }),
)

/** Salud de ingesta — umbrales §8 especificación Wisetrack. */
router.get(
  '/ingestion-health',
  requireAuth,
  asyncHandler(async (_req, res) => {
    const data = await getIngestionHealth()
    res.json({ data })
  }),
)

export default router
