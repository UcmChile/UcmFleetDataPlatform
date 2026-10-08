import { query } from '../database/db.js'
import { asyncHandler } from '../utils/asyncHandler.js'

export const getHealth = asyncHandler(async (_req, res) => {
  try {
    await query('SELECT 1 AS ok')
    res.json({
      ok: true,
      service: 'ucm-fleet-api',
      database: 'connected',
    })
  } catch (error) {
    res.status(503).json({
      ok: false,
      service: 'ucm-fleet-api',
      database: 'disconnected',
      error: error.message,
    })
  }
})
