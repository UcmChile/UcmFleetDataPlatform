import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import { requireAuth } from '../middlewares/auth.js'
import * as authService from '../modules/auth/auth.service.js'

const router = Router()

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const username = req.body?.username || req.body?.email || req.body?.login
    const password = req.body?.password
    const result = await authService.login({ username, password })
    res.json(result)
  }),
)

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await authService.getMe(req.user.id_usuario)
    res.json({
      user,
      is_owner: Boolean(user.is_owner),
      permissionMode: 'legacy',
      permissions: ['*'],
    })
  }),
)

router.post(
  '/sso',
  asyncHandler(async (req, res) => {
    const ssoToken = req.body?.ssoToken || req.body?.sso_token || req.body?.token
    const result = await authService.exchangeSsoToken({ ssoToken })
    res.json(result)
  }),
)

router.get(
  '/capabilities',
  asyncHandler(async (_req, res) => {
    res.json({ version: 2, loginByUsername: true, twoFactor: false, ssoExchange: true })
  }),
)

router.patch(
  '/profile',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await authService.getMe(req.user.id_usuario)
    res.json({ user })
  }),
)

router.post(
  '/logout',
  requireAuth,
  asyncHandler(async (_req, res) => {
    res.json({ ok: true })
  }),
)

export default router
