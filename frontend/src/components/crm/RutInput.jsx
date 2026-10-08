import { inputClass } from './FormField'
import { formatRut, getRutStatus } from '../../utils/rut'

const STATUS_TEXT = {
  empty: 'RUT obligatorio',
  incomplete: 'RUT incompleto',
  valid: 'RUT valido',
  invalid: 'RUT invalido',
}

export function RutInput({ value, onChange, required = false, duplicateMessage = null, className = '', ...props }) {
  const status = getRutStatus(value, { required })
  const isDuplicate = Boolean(duplicateMessage) && status === 'valid'
  const showStatus = status !== 'optional' || isDuplicate
  const isValid = status === 'valid' && !isDuplicate
  const isInvalid = ['empty', 'incomplete', 'invalid'].includes(status) || isDuplicate
  const statusText = isDuplicate ? duplicateMessage : STATUS_TEXT[status]

  return (
    <div>
      <input
        className={`${inputClass} ${isValid ? 'border-green-300 focus:border-green-500 focus:ring-green-100' : ''} ${
          isInvalid ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : ''
        } ${className}`}
        value={formatRut(value)}
        onChange={(event) => onChange(formatRut(event.target.value))}
        inputMode="text"
        maxLength={12}
        placeholder="12.345.678-9"
        required={required}
        {...props}
      />
      {showStatus && (
        <p className={`mt-1 text-xs font-semibold ${isValid ? 'text-green-700' : 'text-red-700'}`}>
          {statusText}
        </p>
      )}
    </div>
  )
}
