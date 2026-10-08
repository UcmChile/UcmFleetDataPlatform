export function isTwoFactorEnabled(value) {
  return value === true || value === 1 || value === '1'
}

export function twoFactorLabel(value) {
  return isTwoFactorEnabled(value) ? 'Activo' : 'Inactivo'
}
