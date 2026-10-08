export function ExportFileIcon({ type, className = 'h-5 w-5' }) {
  const isExcel = type === 'excel'
  const accent = isExcel ? '#059669' : '#dc2626'
  const soft = isExcel ? '#d1fae5' : '#fee2e2'
  const label = isExcel ? 'XLS' : 'PDF'

  return (
    <svg className={className} viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <path d="M7 3.5h9.4L22 9.1V23a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 6 23V5A1.5 1.5 0 0 1 7.5 3.5Z" fill="white" stroke={accent} strokeWidth="1.4" />
      <path d="M16.2 3.8V8a1.4 1.4 0 0 0 1.4 1.4h4.1" fill={soft} stroke={accent} strokeWidth="1.2" />
      <rect x="4" y="13" width="20" height="8" rx="2" fill={accent} />
      <text x="14" y="18.7" textAnchor="middle" fontSize="5.2" fontWeight="800" fill="white" fontFamily="Poppins, Arial, sans-serif">
        {label}
      </text>
    </svg>
  )
}
