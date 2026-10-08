/**
 * Activar/desactivar registros de mantenedores CRM.
 * La desactivación exige motivo, enviado al backend para auditoría.
 */
export async function toggleMaintainerStatus({
  notify,
  apiRequest,
  apiPath,
  row,
  entityLabel = 'registro',
  onSuccess,
}) {
  const restoring = Boolean(row.is_disabled)

  if (restoring) {
    const accepted = await notify.confirm({
      title: `Reactivar ${entityLabel}`,
      message: `¿Reactivar "${row.name}"?`,
      confirmLabel: 'Reactivar',
      tone: 'danger',
    })
    if (!accepted) return false

    const updated = await apiRequest(`${apiPath}/${row.id}?restore=1`, { method: 'DELETE' })
    notify.success(`${capitalize(entityLabel)} reactivado`)
    onSuccess?.(updated)
    return true
  }

  const reason = await notify.confirmWithReason({
    title: `Desactivar ${entityLabel}`,
    message: `Indica el motivo para desactivar "${row.name}". Quedará registrado en auditoría.`,
    confirmLabel: 'Desactivar',
    tone: 'danger',
    reasonLabel: 'Motivo de desactivación',
    reasonPlaceholder: 'Ej.: duplicado, obsoleto, error de carga…',
  })
  if (!reason) return false

  const updated = await apiRequest(`${apiPath}/${row.id}`, {
    method: 'DELETE',
    body: JSON.stringify({ disabled_reason: reason }),
  })
  notify.success(`${capitalize(entityLabel)} desactivado`)
  onSuccess?.(updated)
  return true
}

function capitalize(value) {
  if (!value) return value
  return value.charAt(0).toUpperCase() + value.slice(1)
}
