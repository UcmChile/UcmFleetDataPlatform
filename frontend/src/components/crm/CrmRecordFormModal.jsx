import { CrmFormModal, CrmFormModalFooter } from './CrmFormModal'
import { CrmFieldGrid, SectionedEditFields } from './crmFormFields'
import { SubmitProgressBanner } from './SubmitProgressBanner'

export function CrmRecordFormModal({
  open,
  mode = 'create',
  eyebrow,
  title,
  titleIcon,
  fields = [],
  form,
  setForm,
  row,
  lookups,
  sections,
  sectionsLayout,
  extra,
  onClose,
  onSubmit,
  submitLabel,
  submitDisabled = false,
  submitting = false,
  submitProgressMessage = '',
  size,
  hint,
  gridClassName,
  columnDivider = false,
}) {
  const sectioned = Array.isArray(sections) && sections.length > 0
  const resolvedSize = size || (sectioned ? 'xl' : 'md')
  const resolvedEyebrow = eyebrow || (mode === 'edit' ? 'Editar' : 'Crear')
  const resolvedSubmitLabel = submitting
    ? (submitProgressMessage ? 'Enviando notificacion...' : 'Guardando...')
    : (submitLabel || (mode === 'edit' ? 'Guardar cambios' : 'Crear registro'))
  const locked = submitting || submitDisabled

  function handleClose() {
    if (submitting) return
    onClose()
  }

  return (
    <CrmFormModal
      open={open}
      onClose={handleClose}
      onSubmit={onSubmit}
      eyebrow={resolvedEyebrow}
      title={title}
      titleIcon={titleIcon}
      size={resolvedSize}
      hint={hint}
      headerActions={(
        <CrmFormModalFooter
          placement="header"
          onClose={handleClose}
          submitLabel={resolvedSubmitLabel}
          submitDisabled={locked}
        />
      )}
    >
      <SubmitProgressBanner message={submitting ? submitProgressMessage : ''} />      {sectioned ? (
        <SectionedEditFields
          fields={fields}
          sections={sections}
          layout={sectionsLayout}
          form={form}
          row={row}
          setForm={setForm}
          lookups={lookups}
          formMode={mode}
        />
      ) : (
        <CrmFieldGrid
          fields={fields}
          form={form}
          setForm={setForm}
          row={row}
          lookups={lookups}
          formMode={mode}
          className={gridClassName || 'grid gap-4 md:grid-cols-2'}
          columnDivider={columnDivider}
        />
      )}
      {extra}
    </CrmFormModal>
  )
}
