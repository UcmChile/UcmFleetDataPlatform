import { useCallback } from 'react'
import { apiRequest } from '../services/api'

export function useFetchAllMaintainerRows({
  apiPath,
  query = '',
  total = 0,
  pageSize = 25,
  extraParams = {},
  mapRow,
}) {
  return useCallback(async () => {
    const search = new URLSearchParams({
      page: '1',
      pageSize: String(Math.max(total, pageSize, 1)),
    })
    if (query.trim()) search.set('q', query.trim())
    Object.entries(extraParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') search.set(key, String(value))
    })
    const payload = await apiRequest(`${apiPath}?${search.toString()}`)
    const data = payload.data || payload.items || []
    const normalize = mapRow || ((row) => ({ ...row, is_disabled: Boolean(row.is_disabled) }))
    return data.map(normalize)
  }, [apiPath, extraParams, mapRow, pageSize, query, total])
}
