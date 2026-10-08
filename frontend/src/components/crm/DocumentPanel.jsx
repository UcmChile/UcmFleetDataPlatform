import { useEffect, useState } from 'react'
import { deleteData, downloadDocument, isApiError, loadData, uploadDocument, userHasRole } from '../../services/api'
import { formatDateTime } from '../../utils/formatters'
import { ActionIconButton } from './ActionIconButton'
import { HeaderLabel } from './HeaderLabel'
import { Icon } from './Icon'
import { useNotifications } from './Notifications'

const ACCEPTED_FILES = '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt'

export function DocumentPanel({
  entidadTipo,
  entidadId,
  title = 'Documentos',
  onChanged,
  refreshKey = 0,
  pendingFiles = [],
  onPendingFilesChange,
  readOnly = false,
}) {
  const notify = useNotifications()
  const canDelete = userHasRole('Administrador')
  const pendingMode = Boolean(onPendingFilesChange) && !entidadId
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadSource, setLoadSource] = useState('api')
  const [uploading, setUploading] = useState(false)
  const [downloadingId, setDownloadingId] = useState(null)
  const [removingId, setRemovingId] = useState(null)

  useEffect(() => {
    let ignore = false
    if (!entidadTipo || !entidadId) {
      setDocuments([])
      setLoadSource('api')
      return () => {
        ignore = true
      }
    }

    setLoading(true)
    fetchDocuments(entidadTipo, entidadId)
      .then((result) => {
        if (!ignore) {
          setDocuments(result.data || [])
          setLoadSource(result.source)
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [entidadId, entidadTipo, refreshKey])

  async function refreshDocuments({ warnOnFallback = false } = {}) {
    if (!entidadTipo || !entidadId) {
      setDocuments([])
      setLoadSource('api')
      return
    }

    setLoading(true)
    try {
      const result = await fetchDocuments(entidadTipo, entidadId)
      setDocuments(result.data || [])
      setLoadSource(result.source)
      if (warnOnFallback && result.source !== 'api') {
        notify.warning('Documentos no disponibles', 'No se pudo refrescar la lista de adjuntos desde la API.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleFiles(files) {
    const selectedFiles = Array.from(files || [])
    if (!selectedFiles.length || uploading) return

    if (pendingMode) {
      onPendingFilesChange([...pendingFiles, ...selectedFiles])
      notify.success(
        'Archivo en cola',
        selectedFiles.length === 1
          ? `Se subira al guardar ${resolvePendingEntityLabel(entidadTipo)}.`
          : `${selectedFiles.length} archivos se subiran al guardar ${resolvePendingEntityLabel(entidadTipo)}.`,
      )
      return
    }

    if (!entidadTipo || !entidadId) return

    setUploading(true)
    try {
      for (const file of selectedFiles) {
        await uploadDocument({ entidadTipo, entidadId, file })
      }
      await refreshDocuments()
      await onChanged?.()
      notify.success('Documento cargado', `${selectedFiles.length} archivo(s) quedaron asociados a ${title.toLowerCase()}.`)
    } catch (error) {
      notify.error('No se pudo cargar el documento', isApiError(error) ? error.message : 'Revisa el archivo e intenta nuevamente.')
    } finally {
      setUploading(false)
    }
  }

  function removePendingFile(index) {
    onPendingFilesChange?.(pendingFiles.filter((_, currentIndex) => currentIndex !== index))
  }

  function downloadPendingFile(file) {
    if (!file) return
    const url = URL.createObjectURL(file)
    const link = document.createElement('a')
    link.href = url
    link.download = file.name || 'archivo'
    link.click()
    URL.revokeObjectURL(url)
    notify.info('Descarga iniciada', file.name || 'archivo')
  }

  async function handleDownload(item) {
    const id = item.id_documento
    if (!id || downloadingId) return

    setDownloadingId(id)
    try {
      await downloadDocument(id, item.nombre_original)
      notify.info('Descarga iniciada', item.nombre_original)
    } catch (error) {
      notify.error('No se pudo descargar', isApiError(error) ? error.message : 'Intenta nuevamente en unos segundos.')
    } finally {
      setDownloadingId(null)
    }
  }

  async function handleDelete(item) {
    if (!canDelete) {
      notify.error('Accion no autorizada', 'Solo el Administrador puede eliminar archivos adjuntos del sistema.')
      return
    }

    const accepted = await notify.confirm({
      title: 'Eliminar archivo adjunto',
      message: `Se eliminara fisicamente "${item.nombre_original}" del sistema. Esta accion no se puede deshacer.`,
      confirmLabel: 'Eliminar archivo',
    })
    if (!accepted) return

    setRemovingId(item.id_documento)
    try {
      await deleteData(`/documentos/${item.id_documento}`, { fisico: true })
      setDocuments((current) => current.filter((document) => document.id_documento !== item.id_documento))
      await onChanged?.()
      notify.success('Archivo eliminado', `${item.nombre_original} fue eliminado correctamente.`)
    } catch (error) {
      notify.error('No se pudo eliminar', isApiError(error) ? error.message : 'Intenta nuevamente en unos segundos.')
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <section className="mt-3 min-w-0 max-w-full overflow-hidden border-t border-border pt-3">
      <div className="mb-2.5 flex min-w-0 flex-wrap items-center gap-3">
        <p className="min-w-0 text-sm font-semibold text-foreground">
          <HeaderLabel label={title} icon="file" />
        </p>
        {!readOnly && (
        <label className={`inline-flex h-9 shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3.5 text-sm font-medium text-sky-700 shadow-sm shadow-sky-500/10 transition hover:-translate-y-0.5 hover:bg-sky-100 dark:border-sky-900/60 dark:bg-sky-950/35 dark:text-sky-300 ${uploading ? 'pointer-events-none opacity-60' : ''}`}>
          <Icon name="plus" className="h-4 w-4" />
          {uploading ? 'Cargando' : 'Adjuntar'}
          <input
            type="file"
            multiple
            accept={ACCEPTED_FILES}
            className="sr-only"
            disabled={uploading}
            onChange={(event) => {
              handleFiles(event.target.files)
              event.target.value = ''
            }}
          />
        </label>
        )}
      </div>

      {pendingMode && (
        <p className="mb-2 text-xs text-muted-foreground">
          Los archivos seleccionados se asociaran a {resolvePendingEntityLabel(entidadTipo)} al guardar.
        </p>
      )}

      <div className="min-w-0 space-y-1.5">
        {pendingFiles.map((file, index) => (
          <article key={`pending-${file.name}-${file.size}-${file.lastModified}-${index}`} className="min-w-0 rounded-2xl border border-dashed border-amber-300/80 bg-amber-50/50 p-2.5 text-sm shadow-sm dark:border-amber-900/50 dark:bg-amber-950/20">
            <div className="flex min-w-0 items-start justify-between gap-2.5">
              <div className="flex min-w-0 items-start gap-2">
                <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700 ring-1 ring-amber-500/20 dark:text-amber-300">
                  <Icon name="file" className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{file.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatFileSize(file.size)} · Pendiente de guardar
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <ActionIconButton
                  icon="download"
                  label={`Descargar ${file.name}`}
                  tone="sky"
                  onClick={() => downloadPendingFile(file)}
                />
                <ActionIconButton
                  icon="delete"
                  label={`Quitar ${file.name}`}
                  tone="rose"
                  onClick={() => removePendingFile(index)}
                />
              </div>
            </div>
          </article>
        ))}

        {documents.map((item) => (
          <article key={item.id_documento || `${item.nombre_original}-${item.cargado_at}`} className="min-w-0 rounded-2xl border border-border bg-background/60 p-2.5 text-sm shadow-sm">
            <div className="flex min-w-0 items-start justify-between gap-2.5">
              <div className="flex min-w-0 items-start gap-2">
                <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-700 ring-1 ring-indigo-500/20 dark:text-indigo-300">
                  <Icon name="file" className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{item.nombre_original}</p>
                  <p className="mt-0.5 break-words text-xs text-muted-foreground">
                    {formatFileSize(item.size_bytes)}
                    {item.cargado_at ? ` - ${formatDateTime(item.cargado_at)}` : ''}
                    {item.cargado_por_nombre ? ` - ${item.cargado_por_nombre}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <ActionIconButton
                  icon="download"
                  label={`Descargar ${item.nombre_original}`}
                  tone="sky"
                  disabled={downloadingId === item.id_documento}
                  onClick={() => handleDownload(item)}
                />
                {canDelete && (
                  <ActionIconButton
                    icon="delete"
                    label={`Eliminar ${item.nombre_original}`}
                    tone="rose"
                    disabled={removingId === item.id_documento}
                    onClick={() => handleDelete(item)}
                  />
                )}
              </div>
            </div>
          </article>
        ))}

        {!documents.length && !pendingFiles.length && (
          <p className="rounded-2xl border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
            {loading
              ? 'Cargando documentos...'
              : loadSource !== 'api'
                ? 'No se pudieron cargar los archivos adjuntos desde la API.'
                : pendingMode
                  ? 'Sin archivos en cola. Usa Adjuntar para agregar documentos.'
                  : 'Sin documentos adjuntos.'}
          </p>
        )}
      </div>
    </section>
  )
}

function resolvePendingEntityLabel(entidadTipo) {
  if (entidadTipo === 'oportunidad') return 'la oportunidad'
  if (entidadTipo === 'contrato') return 'el contrato'
  if (entidadTipo === 'caso') return 'el caso'
  return 'el registro'
}

function fetchDocuments(entidadTipo, entidadId) {
  return loadData(`/documentos?entidad_tipo=${encodeURIComponent(entidadTipo)}&entidad_id=${encodeURIComponent(entidadId)}`, [])
}

function formatFileSize(size) {
  const value = Number(size || 0)
  if (!value) return '0 KB'
  if (value < 1024 * 1024) return `${Math.ceil(value / 1024)} KB`
  return `${(value / 1024 / 1024).toFixed(1)} MB`
}
