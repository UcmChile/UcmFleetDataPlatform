import { useMemo } from 'react'
import { useMenuPermissions } from '../hooks/useMenuPermissions'
import { flattenWorkspaceMenuItems, WORKSPACE_IDS } from '../lib/workspaces'

function countAccessibleItems(filterItems, items = []) {
  return filterItems(items).length
}

export function useWorkspaceAccess() {
  const { filterItems, hasFullAccess, ready, isSystemAdmin } = useMenuPermissions()

  return useMemo(() => {
    const pipelineItems = flattenWorkspaceMenuItems(WORKSPACE_IDS.PIPELINE)
    const crmItems = flattenWorkspaceMenuItems(WORKSPACE_IDS.CRM)

    const pipelineCount = countAccessibleItems(filterItems, pipelineItems)
    const crmCount = countAccessibleItems(filterItems, crmItems)

    const full = isSystemAdmin || hasFullAccess

    return {
      ready,
      pipeline: full || pipelineCount > 0,
      crm: full || crmCount > 0,
      ucmcrm: full || crmCount > 0,
      pipelineCount: full ? pipelineItems.length : pipelineCount,
      crmCount: full ? crmItems.length : crmCount,
      ucmcrmCount: full ? crmItems.length : crmCount,
      hasMultiple: full ? true : pipelineCount > 0 && crmCount > 0,
    }
  }, [filterItems, hasFullAccess, isSystemAdmin, ready])
}
