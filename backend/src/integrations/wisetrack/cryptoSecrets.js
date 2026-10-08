import crypto from 'node:crypto'
import { env } from '../../config/env.js'

const ALGO = 'aes-256-gcm'

function deriveKey() {
  return crypto.createHash('sha256').update(String(env.jwtSecret || 'ucm-fleet')).digest()
}

/** Cifra secretos (password API) en reposo. */
export function encryptSecret(plain) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGO, deriveKey(), iv)
  const encrypted = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `v1.${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`
}

export function decryptSecret(payload) {
  const raw = String(payload || '')
  if (!raw.startsWith('v1.')) return raw
  const [, ivB64, tagB64, dataB64] = raw.split('.')
  const decipher = crypto.createDecipheriv(ALGO, deriveKey(), Buffer.from(ivB64, 'base64url'))
  decipher.setAuthTag(Buffer.from(tagB64, 'base64url'))
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64url')),
    decipher.final(),
  ])
  return decrypted.toString('utf8')
}

export function maskToken(token) {
  const value = String(token || '')
  if (value.length <= 12) return '********'
  return `${value.slice(0, 6)}…${value.slice(-4)}`
}

export function maskPassword() {
  return '********'
}
