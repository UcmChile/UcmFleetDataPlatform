import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/apiError.js'
import { hasAnyRole, isPlatformOwner, requireAuth } from '../middlewares/auth.js'
import * as usersService from '../modules/users/users.service.js'

const router = Router()

router.use(requireAuth)
router.use((req, _res, next) => {
  const fullAccess = isPlatformOwner(req.user) || hasAnyRole(req.user, ['Administrador', 'Usuario'])
  if (!fullAccess) {
    next(new ApiError(403, 'Permisos insuficientes'))
    return
  }
  next()
})

router.get(
  '/',
  asyncHandler(async (_req, res) => {
    const users = await usersService.listUsers()
    res.json({ data: users, profiles: ['Administrador', 'Usuario'] })
  }),
)

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const user = await usersService.createUser(req.body || {})
    res.status(201).json({ data: user })
  }),
)

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const user = await usersService.updateUser(req.params.id, req.body || {})
    res.json({ data: user })
  }),
)

router.post(
  '/:id/password',
  asyncHandler(async (req, res) => {
    const result = await usersService.resetUserPassword(req.params.id, req.body?.password)
    res.json(result)
  }),
)

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const result = await usersService.deleteUser(req.params.id, req.user.id_usuario)
    res.json(result)
  }),
)

export default router
