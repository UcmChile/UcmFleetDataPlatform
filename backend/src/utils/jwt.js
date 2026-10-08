import crypto from 'node:crypto'
import { env } from '../config/env.js'
import { ApiError } from './apiError.js'

const base64urlJson = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')

function safeEqual(a, b) {
  const first = Buffer.from(a)
  const second = Buffer.from(b)
  if (first.length !== second.length) return false
  return crypto.timingSafeEqual(first, second)
}

export function signToken(payload) {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'HS256', typ: 'JWT' }
  const body = {
    ...payload,
    jti: crypto.randomUUID(),
    iat: now,
    exp: now + env.jwtExpiresInSeconds,
  }
  const unsigned = `${base64urlJson(header)}.${base64urlJson(body)}`
  const signature = crypto
    .createHmac('sha256', env.jwtSecret)
    .update(unsigned)
    .digest('base64url')
  return `${unsigned}.${signature}`
}

function verifyTokenWithSecret(token, secret) {
  const [encodedHeader, encodedBody, signature] = String(token || '').split('.')
  if (!encodedHeader || !encodedBody || !signature) {
    throw new ApiError(401, 'Token invalido')
  }

  const unsigned = `${encodedHeader}.${encodedBody}`
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(unsigned)
    .digest('base64url')

  if (!safeEqual(signature, expectedSignature)) {
    throw new ApiError(401, 'Token invalido')
  }

  const payload = JSON.parse(Buffer.from(encodedBody, 'base64url').toString('utf8'))
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
    throw new ApiError(401, 'Sesion expirada')
  }
  return payload
}

export function verifyToken(token) {
  return verifyTokenWithSecret(token, env.jwtSecret)
}

/** Acepta el JWT del portal SSO y, si coincide, el JWT local ya configurado. */
export function verifySsoPortalToken(token) {
  const secrets = [...new Set([env.ssoJwtSecret, env.jwtSecret].filter(Boolean))]
  let lastError = new ApiError(401, 'Token SSO invalido o expirado')
  for (const secret of secrets) {
    try {
      return verifyTokenWithSecret(token, secret)
    } catch (error) {
      lastError = error
    }
  }
  throw lastError
}
