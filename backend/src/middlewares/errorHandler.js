import { ApiError } from '../utils/apiError.js'

export function notFound(req, _res, next) {
  next(new ApiError(404, `Ruta no encontrada: ${req.method} ${req.originalUrl}`))
}

function isUniqueViolation(error) {
  return error?.number === 2627 || error?.number === 2601 || /UNIQUE KEY|duplicate key|UQ_/i.test(error?.message || '')
}

export function errorHandler(error, _req, res, _next) {
  const isForeignKeyError = error?.number === 547 || /FOREIGN KEY|REFERENCE constraint|conflicted with the/i.test(error?.message || '')
  const uniqueViolation = isUniqueViolation(error)
  const rawMessage = error.message || 'Error interno del servidor'
  const statusCode = error.statusCode || (isForeignKeyError ? 409 : uniqueViolation ? 422 : 500)
  const message = isForeignKeyError
    ? 'No se pudo guardar porque un dato relacionado no es valido o existen referencias.'
    : uniqueViolation
      ? 'Ya existe un registro con el mismo valor unico.'
      : rawMessage

  if (statusCode >= 500) {
    console.error(error)
  }

  res.status(statusCode).json({
    error: {
      message,
      details: error.details || null,
    },
  })
}
