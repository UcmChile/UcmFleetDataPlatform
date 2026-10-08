/** Aplana el menú jerárquico CRM para búsqueda en sidebar. */
export function flattenCrmMenuForSearch(menu, filterItems, treeOptions = {}) {
  const leaves = []

  function walk(items, trail) {
    for (const item of items || []) {
      if (item.ownerOnly && !treeOptions.isOwner) continue
      if (item.children?.length) {
        walk(item.children, [...trail, item.title])
        continue
      }
      if (!item.href) continue
      if (item.ownerOnly && !treeOptions.isOwner) continue
      const allowed = filterItems([{ to: item.href, label: item.title, match: item.title }])
      if (!allowed.length) continue
      const breadcrumb = [...trail, item.title].filter(Boolean)
      leaves.push({
        id: item.id || item.href,
        title: item.title,
        href: item.href,
        breadcrumb,
        searchText: breadcrumb.join(' ').toLowerCase(),
      })
    }
  }

  for (const section of menu?.sections || []) {
    walk(section.items, section.title ? [section.title] : [])
  }

  return leaves
}

/** Aplana secciones planas del menú Pipeline. */
export function flattenPipelineMenuForSearch(sections = []) {
  return sections.flatMap((section) => (
    (section.items || []).map((item) => ({
      id: item.to,
      title: item.label,
      href: item.to,
      breadcrumb: section.title ? [section.title, item.label] : [item.label],
      searchText: `${section.title || ''} ${item.label}`.trim().toLowerCase(),
    }))
  ))
}

export function filterMenuSearchResults(items, query) {
  const term = String(query || '').trim().toLowerCase()
  if (!term) return []
  return items.filter((item) => item.searchText.includes(term))
}
