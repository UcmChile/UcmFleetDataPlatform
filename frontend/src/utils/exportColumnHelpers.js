export function resolveActiveLabel(value) {
  return value === false || value === 0 || String(value).toLowerCase() === 'false' ? 'Inactivo' : 'Activo'
}

export function formatBitLabel(value) {
  return value === true || value === 1 || String(value).toLowerCase() === 'true' || String(value).toLowerCase() === 'si' || String(value).toLowerCase() === 'sí'
    ? 'Si'
    : 'No'
}
