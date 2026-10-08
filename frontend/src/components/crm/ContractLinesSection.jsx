import { useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { DataTable } from './DataTable'
import { CrmFormModalSection } from './CrmFormModal'
import { CrmFormPageSection } from './CrmFormPageSection'
import { apiRequest } from '../../services/api'
import { CONTRACT_API } from '../../lib/crmContractMaintainer'
import { formatContractAmount } from '../../utils/formatters'

function buildLineColumns(currencySymbol, currencyName) {
  return [
    {
      key: 'title',
      header: 'Titulo',
      label: 'Titulo',
      render: (row) => row.title || '—',
      exportValue: (row) => row.title || '',
    },
    {
      key: 'net',
      header: 'Neto',
      label: 'Neto',
      render: (row) => formatContractAmount(row.net, { symbol: currencySymbol, currencyName }),
      exportValue: (row) => formatContractAmount(row.net, { symbol: currencySymbol, currencyName }),
    },
    {
      key: 'status_label',
      header: 'Razon para el estado',
      label: 'Razon para el estado',
      render: (row) => row.status_label || '—',
      exportValue: (row) => row.status_label || '',
    },
    {
      key: 'remaining_coverage',
      header: 'Cobertura restante',
      label: 'Cobertura restante',
      render: (row) => row.remaining_coverage ?? '—',
      exportValue: (row) => row.remaining_coverage ?? '',
    },
    {
      key: 'used_coverage',
      header: 'Cobertura utilizada',
      label: 'Cobertura utilizada',
      render: (row) => row.used_coverage ?? '—',
      exportValue: (row) => row.used_coverage ?? '',
    },
  ]
}

export function ContractLinesSection({
  contractId,
  currencySymbol,
  currencyName,
  variant = 'modal',
}) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!contractId) {
      setRows([])
      return
    }
    let cancelled = false
    setLoading(true)
    void (async () => {
      try {
        const data = await apiRequest(`${CONTRACT_API}/${contractId}/lineas`)
        if (!cancelled) setRows(Array.isArray(data?.data) ? data.data : [])
      } catch {
        if (!cancelled) setRows([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [contractId])

  const columns = useMemo(
    () => buildLineColumns(currencySymbol, currencyName),
    [currencyName, currencySymbol],
  )

  const table = loading ? (
    <div className="flex items-center gap-2 py-4 text-xs text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      Cargando lineas...
    </div>
  ) : (
    <div className="text-xs">
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.contract_detail_id}
        storageKey="crm.contratos-ucm.lineas"
        empty="No se encontraron lineas para este contrato."
        tableOnly
        wrapCells={false}
        size="xs"
      />
    </div>
  )

  const content = (
    <>
      <p className="mb-2 text-xs text-muted-foreground">
        Solo lectura. Las lineas se gestionan en Dynamics CRM.
      </p>
      {table}
    </>
  )

  if (variant === 'page') {
    return (
      <CrmFormPageSection title="Lineas de contrato" icon="file" compact>
        {content}
      </CrmFormPageSection>
    )
  }

  return (
    <CrmFormModalSection title="Lineas de contrato" icon="file">
      {content}
    </CrmFormModalSection>
  )
}
