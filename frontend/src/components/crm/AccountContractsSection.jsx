import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { DataTable } from './DataTable'
import { CrmFormModalSection } from './CrmFormModal'
import { apiRequest } from '../../services/api'
import { CUENTA_EMPRESA_API } from '../../lib/crmCuentaEmpresaMaintainer'
import { CONTRACT_BASE_PATH } from '../../lib/crmContractMaintainer'
import { formatDateTime, formatUf } from '../../utils/formatters'

function GridLinkCell({ value }) {
  if (!value) return '—'
  return <span className="font-medium text-primary">{value}</span>
}

function buildOpenContractColumn(navigate) {
  return {
    key: 'open_contract',
    header: 'Acciones',
    label: 'Acciones',
    canHide: false,
    render: (row) => (
      row.contract_id ? (
        <button
          type="button"
          className="text-xs font-semibold text-primary hover:underline"
          onClick={() => navigate(`${CONTRACT_BASE_PATH}/${row.contract_id}`)}
        >
          Abrir contrato
        </button>
      ) : '—'
    ),
    exportValue: () => '',
  }
}

const PAYER_BASE_COLUMNS = [
  {
    key: 'contract_number',
    header: 'Id. de contrato',
    label: 'Id. de contrato',
    render: (row) => (
      <span className="font-mono text-xs text-muted-foreground">{row.contract_number || '—'}</span>
    ),
    exportValue: (row) => row.contract_number || '',
  },
  {
    key: 'folio_number',
    header: 'Numero folio',
    label: 'Numero folio',
    render: (row) => <GridLinkCell value={row.folio_number} />,
    exportValue: (row) => row.folio_number || '',
  },
  {
    key: 'status_label',
    header: 'Estado',
    label: 'Estado',
    render: (row) => row.status_label || '—',
    exportValue: (row) => row.status_label || '',
  },
  {
    key: 'created_on',
    header: 'Fecha de creacion',
    label: 'Fecha de creacion',
    defaultVisible: false,
    render: (row) => formatDateTime(row.created_on),
    exportValue: (row) => formatDateTime(row.created_on),
  },
  {
    key: 'billing_date',
    header: 'Fecha Facturacion',
    label: 'Fecha Facturacion',
    defaultVisible: false,
    render: (row) => formatDateTime(row.billing_date),
    exportValue: (row) => formatDateTime(row.billing_date),
  },
  {
    key: 'customer_name',
    header: 'Cliente',
    label: 'Cliente',
    render: (row) => row.customer_name || '—',
    exportValue: (row) => row.customer_name || '',
  },
  {
    key: 'total_price',
    header: 'Precio total',
    label: 'Precio total',
    render: (row) => formatUf(row.total_price),
    exportValue: (row) => formatUf(row.total_price),
  },
  {
    key: 'business_unit_name',
    header: 'Unidad de negocio',
    label: 'Unidad de negocio',
    render: (row) => row.business_unit_name || '—',
    exportValue: (row) => row.business_unit_name || '',
  },
  {
    key: 'seller_name',
    header: 'Vendedor',
    label: 'Vendedor',
    render: (row) => <GridLinkCell value={row.seller_name} />,
    exportValue: (row) => row.seller_name || '',
  },
]

export function AccountContractsSection({ accountId }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [payer, setPayer] = useState([])

  useEffect(() => {
    if (!accountId) {
      setPayer([])
      return undefined
    }

    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const data = await apiRequest(`${CUENTA_EMPRESA_API}/${accountId}/contratos`)
        if (cancelled) return
        setPayer(Array.isArray(data?.payer) ? data.payer : [])
      } catch {
        if (!cancelled) setPayer([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [accountId])

  const openColumn = useMemo(() => buildOpenContractColumn(navigate), [navigate])
  const payerColumns = useMemo(
    () => [...PAYER_BASE_COLUMNS, openColumn],
    [openColumn],
  )

  if (!accountId) {
    return (
      <CrmFormModalSection title="Contratos donde es Pagador" icon="file">
        <p className="text-sm text-muted-foreground">
          Guarde la cuenta para visualizar los contratos asociados.
        </p>
      </CrmFormModalSection>
    )
  }

  return (
    <CrmFormModalSection title="Contratos donde es Pagador" icon="file">
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border/80 bg-background">
          <DataTable
            columns={payerColumns}
            rows={payer}
            rowKey={(row) => row.contract_id}
            columnStorageKey="crm.cuentas-empresas.contratos-pagador"
            empty="No se encontraron contratos como pagador."
            wrapCells
          />
        </div>
      )}
    </CrmFormModalSection>
  )
}
