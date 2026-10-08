import { env } from '../../config/env.js'
import { ApiError } from '../../utils/apiError.js'
import { getActiveConfig, getBearerToken, obtainTokenFromApi } from './credentialsService.js'

/**
 * Cliente HTTP Wisetrack (colección Postman WT-UCM).
 * Auth: POST {baseUrl}/ucm/v1/auth/getToken  body { username, password } → { token }
 */
export class WisetrackClient {
  constructor(options = {}) {
    this.envBaseUrl = options.baseUrl || env.wisetrack.baseUrl
    this.enabled = options.enabled ?? env.wisetrack.enabled
  }

  async resolveBaseUrl() {
    const config = await getActiveConfig()
    return (config?.base_url || this.envBaseUrl || 'https://api-gateway.wisetrack.cl/prod').replace(/\/+$/, '')
  }

  async ensureAuthHeader({ forceRefresh = false } = {}) {
    let bearer = forceRefresh ? null : await getBearerToken()
    if (!bearer) {
      await obtainTokenFromApi()
      bearer = await getBearerToken()
    }
    if (!bearer?.token) {
      throw new ApiError(401, 'No hay token Wisetrack activo. Configure credenciales y obtenga un token.')
    }
    return {
      Authorization: `Bearer ${bearer.token}`,
      Accept: 'application/json',
    }
  }

  async request(path, { method = 'GET', query = {}, body, forceRefresh = false } = {}) {
    const baseUrl = await this.resolveBaseUrl()
    const url = new URL(`${baseUrl}${path.startsWith('/') ? path : `/${path}`}`)
    Object.entries(query || {}).forEach(([key, value]) => {
      if (value != null && value !== '') url.searchParams.set(key, String(value))
    })

    const headers = await this.ensureAuthHeader({ forceRefresh })
    if (body != null) headers['Content-Type'] = 'application/json'

    let response = await fetch(url, {
      method,
      headers,
      body: body != null ? JSON.stringify(body) : undefined,
    })

    if (response.status === 401 && !forceRefresh) {
      await obtainTokenFromApi()
      return this.request(path, { method, query, body, forceRefresh: true })
    }

    const text = await response.text()
    let data = null
    try {
      data = text ? JSON.parse(text) : null
    } catch {
      data = { raw: text }
    }

    if (!response.ok) {
      throw new ApiError(
        response.status >= 500 ? 502 : response.status,
        data?.message || data?.error || `Wisetrack ${method} ${path} falló (${response.status})`,
        data,
      )
    }
    return data
  }

  /** GET /ucm/get/v1/vehicles */
  async getVehicles() {
    return this.request('/ucm/get/v1/vehicles')
  }

  /** GET /ucm/v1/pings?from&to&page&page_size */
  async getPings(from, to, _vehicleIds = [], { page = 1, pageSize = 1000 } = {}) {
    return this.request('/ucm/v1/pings', {
      query: {
        from,
        to,
        page,
        page_size: pageSize,
      },
    })
  }

  /** GET /ucm/v1/vehicles/{vehicle_id}/pings?from&to&page&page_size */
  async getVehiclePings(vehicleId, from, to, { page = 1, pageSize = 1000 } = {}) {
    return this.request(`/ucm/v1/vehicles/${encodeURIComponent(vehicleId)}/pings`, {
      query: {
        from,
        to,
        page,
        page_size: pageSize,
      },
    })
  }
}

export const wisetrackClient = new WisetrackClient()
