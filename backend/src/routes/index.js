import { Router } from 'express'
import authRoutes from './auth.routes.js'
import usersRoutes from './users.routes.js'
import wisetrackRoutes from './wisetrack.routes.js'
import systemDebugRoutes from './systemDebug.routes.js'
import dashboardRoutes from './dashboard.routes.js'
import { getHealth } from '../controllers/healthController.js'
import { registerFleetEntityRoutes } from '../fleet/registerEntityRoutes.js'

export async function registerRoutes(app) {
  const api = Router()

  api.get('/health', getHealth)
  api.use('/auth', authRoutes)
  api.use('/users', usersRoutes)
  api.use('/integrations/wisetrack', wisetrackRoutes)
  api.use('/system', systemDebugRoutes)
  api.use('/dashboard', dashboardRoutes)
  registerFleetEntityRoutes(api)

  app.use('/api', api)
}
