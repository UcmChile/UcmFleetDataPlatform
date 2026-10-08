import { useCallback, useMemo, useState } from 'react'
import { resolveMaintainerSortKey } from '../lib/maintainerListQuery'

export function useMaintainerServerSort({
  defaultSortBy = 'name',
  defaultSortDir = 'asc',
  columnMap = {},
} = {}) {
  const [sortBy, setSortBy] = useState(defaultSortBy)
  const [sortDir, setSortDir] = useState(defaultSortDir)

  const sortParams = useMemo(() => ({ sortBy, sortDir }), [sortBy, sortDir])

  const handleSortChange = useCallback((config) => {
    const apiKey = resolveMaintainerSortKey(config.key, columnMap)
    if (!apiKey) return
    setSortBy(apiKey)
    setSortDir(config.direction)
  }, [columnMap])

  const setSort = useCallback((nextSortBy, nextSortDir = defaultSortDir) => {
    if (!nextSortBy) return
    setSortBy(nextSortBy)
    setSortDir(nextSortDir)
  }, [defaultSortDir])

  const resetSort = useCallback(() => {
    setSortBy(defaultSortBy)
    setSortDir(defaultSortDir)
  }, [defaultSortBy, defaultSortDir])

  return {
    sortBy,
    sortDir,
    sortParams,
    handleSortChange,
    setSort,
    resetSort,
  }
}
