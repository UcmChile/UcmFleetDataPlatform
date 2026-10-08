/** Snapshot de mantenedores para badges CRUD en sidebar (dev). */
export function buildMaintainersSnapshot(menu) {
  const counts = { total: 0, withApi: 0 }
  function walk(nodes = []) {
    for (const node of nodes) {
      if (node.children?.length) walk(node.children)
      else if (node.to) {
        counts.total += 1
        if (node.apiPath || node.to.includes('/catalogo/')) counts.withApi += 1
      }
    }
  }
  for (const section of menu?.sections || []) walk(section.items)
  return counts
}
