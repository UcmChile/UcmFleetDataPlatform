import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import { requireAuth } from '../middlewares/auth.js'
import { ingestBatch, consolidateDailyKm, consolidateDailyKmRange } from '../integrations/wisetrack/ingestionService.js'
import { wisetrackClient } from '../integrations/wisetrack/client.js'
import * as credentials from '../integrations/wisetrack/credentialsService.js'
import {
  clearGpsIngestionData,
  pullAndIngestPings,
  pullAndSyncVehicles,
  reprocessPingsForDay,
} from '../integrations/wisetrack/pullService.js'

const router = Router()

router.get(
  '/credentials',
  requireAuth,
  asyncHandler(async (_req, res) => {
    const config = await credentials.getConfigPublic()
    const token = await credentials.getActiveTokenPublic()
    res.json({ data: { config, token } })
  }),
)

router.put(
  '/credentials',
  requireAuth,
  asyncHandler(async (req, res) => {
    const config = await credentials.upsertCredentials(req.body || {})
    res.json({ data: config })
  }),
)

router.post(
  '/credentials/obtain-token',
  requireAuth,
  asyncHandler(async (_req, res) => {
    const token = await credentials.obtainTokenFromApi()
    const config = await credentials.getConfigPublic()
    res.json({ data: { token, config } })
  }),
)

router.get(
  '/tokens',
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await credentials.listTokens({
      page: Number(req.query.page || 1),
      pageSize: Number(req.query.pageSize || 25),
    })
    res.json(result)
  }),
)

/** Proxies de lectura (usan Bearer guardado en BD). */
router.get(
  '/remote/vehicles',
  requireAuth,
  asyncHandler(async (_req, res) => {
    const data = await wisetrackClient.getVehicles()
    res.json({ data })
  }),
)

router.get(
  '/remote/pings',
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = await wisetrackClient.getPings(
      req.query.from,
      req.query.to,
      [],
      {
        page: Number(req.query.page || 1),
        pageSize: Number(req.query.page_size || req.query.pageSize || 1000),
      },
    )
    res.json({ data })
  }),
)

router.get(
  '/remote/vehicles/:vehicleId/pings',
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = await wisetrackClient.getVehiclePings(
      req.params.vehicleId,
      req.query.from,
      req.query.to,
      {
        page: Number(req.query.page || 1),
        pageSize: Number(req.query.page_size || req.query.pageSize || 1000),
      },
    )
    res.json({ data })
  }),
)

/** Sync / ingest hacia BD local. */
router.post(
  '/pull/vehicles',
  requireAuth,
  asyncHandler(async (_req, res) => {
    const result = await pullAndSyncVehicles()
    res.json({ data: result })
  }),
)

router.post(
  '/pull/pings',
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await pullAndIngestPings(req.body || {})
    res.json({ data: result })
  }),
)

router.post(
  '/pull/pings/day',
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await reprocessPingsForDay(req.body || {})
    res.json({ data: result })
  }),
)

router.post(
  '/clear-gps-data',
  requireAuth,
  asyncHandler(async (_req, res) => {
    const result = await clearGpsIngestionData()
    res.json({ data: result })
  }),
)

router.post(
  '/ingest',
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await ingestBatch(req.body || {})
    res.json({ data: result })
  }),
)

router.post(
  '/consolidate-daily',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (req.body?.from && req.body?.to) {
      const result = await consolidateDailyKmRange(req.body.from, req.body.to)
      res.json({ data: result })
      return
    }
    const result = await consolidateDailyKm(req.body?.reading_date)
    res.json({ data: result })
  }),
)

/** Compat: pull pings + ingest (misma lógica que /pull/pings). */
router.post(
  '/pull',
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await pullAndIngestPings(req.body || {})
    res.json({ data: result })
  }),
)

router.get(
  '/status',
  requireAuth,
  asyncHandler(async (_req, res) => {
    const config = await credentials.getConfigPublic()
    const token = await credentials.getActiveTokenPublic()
    res.json({
      data: {
        base_url: config.base_url,
        auth_path: config.auth_path,
        credentials_configured: config.configured,
        username: config.username || null,
        last_auth_status: config.last_auth_status,
        last_auth_at: config.last_auth_at,
        token,
        endpoints: {
          vehicles: 'GET /ucm/get/v1/vehicles',
          pings: 'GET /ucm/v1/pings?from&to&page&page_size',
          vehicle_pings: 'GET /ucm/v1/vehicles/{vehicle_id}/pings?from&to&page&page_size',
        },
        mode: config.configured
          ? (token.has_token && !token.is_expired ? 'authenticated' : 'credentials-ready')
          : 'manual-ingest-only',
      },
    })
  }),
)

export default router
