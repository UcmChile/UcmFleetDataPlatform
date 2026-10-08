import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { DataTable } from './DataTable'
import { CrmFormModalSection } from './CrmFormModal'
import { apiRequest } from '../../services/api'
import { CONTACT_API } from '../../lib/crmContactMaintainer'
import { CONTRACT_BASE_PATH } from '../../lib/crmContractMaintainer'
import { formatUf } from '../../utils/formatters'

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

const BENEFICIARY_BASE_COLUMNS = [
  {
    key: 'contract_name',
    header: 'Nombre del contrato',
    label: 'Nombre del contrato',
    render: (row) => row.contract_name || '—',
    exportValue: (row) => row.contract_name || '',
  },
  {
    key: 'contract_id',
    header: 'Id. de contrato',
    label: 'Id. de contrato',
    render: (row) => (
      <span className="font-mono text-xs text-muted-foreground">{row.contract_id || '—'}</span>
    ),
    exportValue: (row) => row.contract_id || '',
  },
  {
    key: 'product_name',
    header: 'Producto',
    label: 'Producto',
    render: (row) => row.product_name || '—',
    exportValue: (row) => row.product_name || '',
  },
  {
    key: 'net',
    header: 'Neto',
    label: 'Neto',
    render: (row) => formatUf(row.net),
    exportValue: (row) => formatUf(row.net),
  },
  {
    key: 'status_label',
    header: 'Estado',
    label: 'Estado',
    render: (row) => row.status_label || '—',
    exportValue: (row) => row.status_label || '',
  },
]

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

function ContractsGrid({ title, columns, rows, storageKey, empty }) {
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      <div className="overflow-hidden rounded-xl border border-border/80 bg-background">
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(row, index) => row.contract_detail_id || row.contract_id || `row-${index}`}
          columnStorageKey={storageKey}
          empty={empty}
          wrapCells
        />
      </div>
    </div>
  )
}

export function ContactContractsSection({ contactId }) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [beneficiary, setBeneficiary] = useState([])
  const [payer, setPayer] = useState([])

  useEffect(() => {
    if (!contactId) {
      setBeneficiary([])
      setPayer([])
      return undefined
    }

    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const data = await apiRequest(`${CONTACT_API}/${contactId}/contratos`)
        if (cancelled) return
        setBeneficiary(Array.isArray(data?.beneficiary) ? data.beneficiary : [])
        setPayer(Array.isArray(data?.payer) ? data.payer : [])
      } catch {
        if (!cancelled) {
          setBeneficiary([])
          setPayer([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [contactId])

  const openColumn = useMemo(() => buildOpenContractColumn(navigate), [navigate])
  const beneficiaryColumns = useMemo(
    () => [...BENEFICIARY_BASE_COLUMNS, openColumn],
    [openColumn],
  )
  const payerColumns = useMemo(
    () => [...PAYER_BASE_COLUMNS, openColumn],
    [openColumn],
  )

  if (!contactId) {
    return (
      <CrmFormModalSection title="Informacion Contratos" icon="file">
        <p className="text-sm text-muted-foreground">
          Guarde el contacto para visualizar los contratos asociados.
        </p>
      </CrmFormModalSection>
    )
  }

  return (
    <CrmFormModalSection title="Informacion Contratos" icon="file">
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-8">
          <ContractsGrid
            title="Contratos activos donde es Beneficiario:"
            columns={beneficiaryColumns}
            rows={beneficiary}
            storageKey="crm.contactos.contratos-beneficiario"
            empty="No se encontraron contratos activos como beneficiario."
          />
          <ContractsGrid
            title="Contratos en donde es Pagador:"
            columns={payerColumns}
            rows={payer}
            storageKey="crm.contactos.contratos-pagador"
            empty="No se encontraron contratos activos como pagador."
          />
        </div>
      )}
    </CrmFormModalSection>
  )
}
