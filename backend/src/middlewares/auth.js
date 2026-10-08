import { asyncHandler } from '../utils/asyncHandler.js'
import { ApiError } from '../utils/apiError.js'
import { verifyToken } from '../utils/jwt.js'

export function normalizeUserRoles(user) {
  const raw = user?.roles
  if (Array.isArray(raw)) return raw.map((role) => String(role || '').trim()).filter(Boolean)
  if (typeof raw === 'string' && raw.trim()) {
    return raw.split(',').map((role) => role.trim()).filter(Boolean)
  }
  return []
}

export function hasAnyRole(user, roles) {
  const userRoles = normalizeUserRoles(user)
  return roles.some((role) => userRoles.includes(role))
}

export function isPlatformOwner(user) {
  if (user?.is_owner) return true
  return hasAnyRole(user, ['Administrador'])
}

export const requireAuth = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || ''
  const [, token] = header.match(/^Bearer\s+(.+)$/i) || []
  if (!token) {
    throw new ApiError(401, 'Autenticacion requerida')
  }
  req.user = verifyToken(token)
  next()
})

export const requireAnyRole = (...roles) => (req, _res, next) => {
  if (isPlatformOwner(req.user) || hasAnyRole(req.user, roles)) {
    next()
    return
  }
  next(new ApiError(403, 'Permisos insuficientes'))
}
