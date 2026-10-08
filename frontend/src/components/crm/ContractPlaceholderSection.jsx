import { CrmFormPageSection } from './CrmFormPageSection'
import { DataTable } from './DataTable'

const PLACEHOLDER_COLUMNS = [
  { key: 'col1', header: 'Concepto', label: 'Concepto', render: () => '—', exportValue: () => '' },
  { key: 'col2', header: 'Detalle', label: 'Detalle', render: () => '—', exportValue: () => '' },
]

export function ContractPlaceholderSection({ title, icon = 'file', message, variant = 'empty' }) {
  return (
    <CrmFormPageSection title={title} icon={icon}>
      {variant === 'notes' ? (
        <textarea
          readOnly
          rows={4}
          className="w-full resize-none rounded-lg border border-border/50 bg-muted/20 px-2.5 py-2 text-xs text-muted-foreground"
          placeholder="Sin notas registradas."
          defaultValue=""
        />
      ) : (
        <>
          {message && (
            <p className="mb-2 text-xs text-muted-foreground">{message}</p>
          )}
          <div className="text-xs">
            <DataTable
              columns={PLACEHOLDER_COLUMNS}
              rows={[]}
              empty="Sin registros para mostrar."
              tableOnly
              wrapCells={false}
            />
          </div>
        </>
      )}
    </CrmFormPageSection>
  )
}

export function ContractCustomerAccountSection({ customerName }) {
  return (
    <CrmFormPageSection title="Cuenta corriente del cliente" icon="coins">
      {customerName && (
        <p className="mb-2 text-xs font-semibold text-foreground">{customerName}</p>
      )}
      <p className="mb-2 text-xs text-muted-foreground">
        Vista de solo lectura. La cuenta corriente se consulta en Dynamics CRM.
      </p>
      <div className="text-xs">
        <DataTable
          columns={[
            { key: 'fecha', header: 'Fecha', label: 'Fecha', render: () => '—', exportValue: () => '' },
            { key: 'concepto', header: 'Concepto', label: 'Concepto', render: () => '—', exportValue: () => '' },
            { key: 'cargo', header: 'Cargo', label: 'Cargo', render: () => '—', exportValue: () => '' },
            { key: 'abono', header: 'Abono', label: 'Abono', render: () => '—', exportValue: () => '' },
            { key: 'saldo', header: 'Saldo', label: 'Saldo', render: () => '—', exportValue: () => '' },
          ]}
          rows={[]}
          empty="Sin movimientos de cuenta corriente."
          tableOnly
          wrapCells={false}
        />
      </div>
    </CrmFormPageSection>
  )
}
