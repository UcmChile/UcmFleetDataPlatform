export function cleanRut(value) {
  return String(value || '')
    .replace(/[^0-9kK]/g, '')
    .toUpperCase()
}

export function normalizeRut(value) {
  const cleaned = cleanRut(value)
  if (cleaned.length <= 1) return cleaned
  return `${cleaned.slice(0, -1)}-${cleaned.slice(-1)}`
}

export function formatRut(value) {
  const cleaned = cleanRut(value).slice(0, 9)
  if (!cleaned) return ''

  if (cleaned.length === 1) return cleaned

  const body = cleaned.slice(0, -1)
  const verifier = cleaned.slice(-1)
  const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${formattedBody}-${verifier}`
}

export function isValidRut(value) {
  const normalized = normalizeRut(value)
  if (!/^\d{7,8}-[\dK]$/.test(normalized)) return false

  const [body, verifier] = normalized.split('-')
  let factor = 2
  let sum = 0

  for (let index = body.length - 1; index >= 0; index -= 1) {
    sum += Number(body[index]) * factor
    factor = factor === 7 ? 2 : factor + 1
  }

  const expected = 11 - (sum % 11)
  const digit = expected === 11 ? '0' : expected === 10 ? 'K' : String(expected)
  return digit === verifier
}

export function getRutStatus(value, { required = false } = {}) {
  const cleaned = cleanRut(value)
  if (!cleaned) return required ? 'empty' : 'optional'
  if (cleaned.length < 8) return 'incomplete'
  return isValidRut(value) ? 'valid' : 'invalid'
}
