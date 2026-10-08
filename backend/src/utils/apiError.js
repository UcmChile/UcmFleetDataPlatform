export class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.details = details
  }
}

export function assertBusinessRule(condition, message, details = null) {
  if (!condition) {
    throw new ApiError(422, message, details)
  }
}
