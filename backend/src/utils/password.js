import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'

const DEFAULT_ITERATIONS = 310000
const KEY_LENGTH = 32
const DIGEST = 'sha256'

export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(String(password), salt, DEFAULT_ITERATIONS, KEY_LENGTH, DIGEST).toString('hex')
  return `pbkdf2$${DEFAULT_ITERATIONS}$${salt}$${hash}`
}

function verifyPbkdf2Password(password, storedHash) {
  const [, iterations, salt, hash] = storedHash.split('$')
  const attempted = crypto
    .pbkdf2Sync(String(password), salt, Number(iterations), Buffer.from(hash, 'hex').length, DIGEST)
    .toString('hex')

  const expected = Buffer.from(hash, 'hex')
  const actual = Buffer.from(attempted, 'hex')
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual)
}

export function verifyPassword(password, storedHash) {
  if (!storedHash) return false
  if (storedHash.startsWith('pbkdf2$')) {
    return verifyPbkdf2Password(password, storedHash)
  }
  if (storedHash.startsWith('$2a$') || storedHash.startsWith('$2b$') || storedHash.startsWith('$2y$')) {
    return bcrypt.compareSync(String(password), storedHash)
  }
  return false
}
