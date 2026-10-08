import { Link } from 'react-router-dom'
import {
  CalendarClock,
  Calculator,
  Copy,
  FilePlus2,
  ListOrdered,
  MoreHorizontal,
  Plus,
  RefreshCw,
  UserPlus,
  XCircle,
} from 'lucide-react'
import { HeaderLabel } from './HeaderLabel'
import { Icon } from './Icon'
import { EntityDataSourceHint } from './EntityDataSourceHint'
import { formatDate, formatDateTime } from '../../utils/formatters'
import { CONTRACT_BASE_PATH, DYNAMICS_OWNER_TYPE_SYSTEM_USER } from '../../lib/crmContractMaintainer'
import { crmRoutes } from '../../lib/routes'

function ActionButton({ label, icon: ActionIcon, onClick, disabled = false, tone = 'default' }) {
  const toneClass = tone === 'danger'
    ? 'text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/30'
    : 'text-foreground/80 hover:bg-accent'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-transparent px-2 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 sm:px-2.5 ${toneClass}`}
    >
      <ActionIcon className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} />
      <span className="whitespace-nowrap">{label}</span>
    </button>
  )
}

/** Dynamics OwnerIdType: 8 = usuario, 9 = equipo. */

function MetaItem({ label, value, link }) {
  return (
    <div className="min-w-[8rem] flex-1 border-border/60 px-2 py-1 first:pl-0 last:pr-0 sm:border-l sm:first:border-l-0">
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      {link ? (
        <button
          type="button"
          onClick={link.onClick}
          className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          <Icon name="users" className="h-3 w-3" />
          {value || '—'}
        </button>
      ) : (
        <p className="mt-0.5 text-xs font-semibold text-foreground">{value || '—'}</p>
      )}
    </div>
  )
}

export function CrmContractPageHeader({
  mode,
  contract,
  canCreate,
  canEdit,
  onNew,
  onCopy,
  onCancelContract,
  onRenewContract,
  onOwnerReference,
  onBack,
}) {
  const isCreate = mode === 'create'
  const title = isCreate ? 'Nuevo contrato UCM' : (contract?.name || 'Contrato UCM')
  const statusLabel = contract?.status_label || '—'
  const ownerIsSystemUser = Number(contract?.owner_id_type) === DYNAMICS_OWNER_TYPE_SYSTEM_USER
  const subtitleParts = [
    contract?.folio_number ? `Folio ${contract.folio_number}` : null,
    contract?.contract_number || null,
  ].filter(Boolean)

  const actions = [
    { id: 'new', label: 'Nuevo', icon: Plus, onClick: onNew, show: canCreate },
    { id: 'copy', label: 'Copiar contrato', icon: Copy, onClick: onCopy, show: !isCreate && canEdit, disabled: true },
    { id: 'cancel', label: 'Cancelar contrato', icon: XCircle, onClick: onCancelContract, show: !isCreate, tone: 'danger' },
    { id: 'renew', label: 'Renovar contrato', icon: RefreshCw, onClick: onRenewContract, show: !isCreate },
    { id: 'calendar', label: 'Establecer calendario', icon: CalendarClock, show: !isCreate, disabled: true },
    { id: 'recalc', label: 'Recalcular', icon: Calculator, show: !isCreate, disabled: true },
    { id: 'queue', label: 'Agregar a la cola', icon: ListOrdered, show: !isCreate, disabled: true },
    { id: 'assign', label: 'Asignar', icon: UserPlus, show: !isCreate, disabled: true },
    { id: 'new-doc', label: 'Nuevo documento', icon: FilePlus2, show: !isCreate, disabled: true },
  ].filter((action) => action.show)

  return (
    <div className="space-y-3 text-xs">
      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/80 shadow-sm">
        <div className="-mx-1 overflow-x-auto px-1 pb-1 pt-2">
          <div className="flex min-w-max items-center gap-0.5 px-2 sm:px-3">
            {actions.map((action) => (
              <ActionButton
                key={action.id}
                label={action.label}
                icon={action.icon}
                onClick={action.onClick}
                disabled={action.disabled}
                tone={action.tone}
              />
            ))}
            <button
              type="button"
              disabled
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-muted-foreground opacity-50"
              aria-label="Mas acciones"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="border-t border-border/60 px-3 py-3 sm:px-5 sm:py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                <Link to={CONTRACT_BASE_PATH} className="hover:text-primary">Contrato</Link>
                {' · '}
                {isCreate ? 'Nuevo' : statusLabel}
              </p>
              <h1 className="mt-1 text-lg font-bold tracking-tight text-foreground sm:text-xl">
                <HeaderLabel label={title} icon="file" size="lg" truncate={false} />
              </h1>
              {!isCreate && subtitleParts.length > 0 && (
                <p className="mt-0.5 font-mono text-xs text-muted-foreground">{subtitleParts.join(' · ')}</p>
              )}
              <EntityDataSourceHint dataSourceKey="contratos-ucm" />
            </div>

            {!isCreate && contract && (
              <div className="flex min-w-0 flex-col gap-1 rounded-xl border border-border/60 bg-background/70 p-2.5 sm:flex-row sm:flex-wrap lg:max-w-[48rem]">
                <MetaItem label="Fecha de creacion" value={formatDateTime(contract.created_on)} />
                <MetaItem label="Fecha de facturacion" value={formatDate(contract.billing_date)} />
                <MetaItem label="Razon para el estado" value={contract.status_label} />
                <MetaItem
                  label="Propietario"
                  value={contract.owner_name}
                  link={contract.owner_id && ownerIsSystemUser ? { onClick: onOwnerReference } : null}
                />
              </div>
            )}
          </div>

          <div className="mt-3">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-2.5 text-xs font-semibold transition hover:bg-accent"
            >
              Volver al listado
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function getContractSatellitePath(slug) {
  return crmRoutes.mantenedoresCatalogo(slug)
}
