import { DataTable } from './DataTable'
import { CrmFormPageSection } from './CrmFormPageSection'

const OBJECTION_COLUMNS = [
  { key: 'categoria', header: 'Categoria', label: 'Categoria', render: () => '—', exportValue: () => '' },
  { key: 'objecion', header: 'Objecion', label: 'Objecion', render: () => '—', exportValue: () => '' },
  { key: 'condicion', header: 'Condicion', label: 'Condicion', render: () => '—', exportValue: () => '' },
  { key: 'descripcion', header: 'Descripcion', label: 'Descripcion', render: () => '—', exportValue: () => '' },
]

export function ContractObjectionsSection({ variant = 'modal' }) {
  const content = (
    <>
      <p className="mb-2 text-xs text-muted-foreground">
        Vista de solo lectura. Las objeciones se gestionan en Dynamics CRM.
      </p>
      <div className="text-xs">
        <DataTable
          columns={OBJECTION_COLUMNS}
          rows={[]}
          empty="No se encontro ningun registro de Objecion Contrato Virtual."
          tableOnly
          wrapCells={false}
          size={variant === 'page' ? 'xs' : 'default'}
        />
      </div>
    </>
  )

  if (variant === 'page') {
    return (
      <CrmFormPageSection title="Objeciones de contrato virtuales" icon="case" compact>
        {content}
      </CrmFormPageSection>
    )
  }

  return (
    <CrmFormPageSection title="Objeciones de contrato virtuales" icon="case">
      {content}
    </CrmFormPageSection>
  )
}
