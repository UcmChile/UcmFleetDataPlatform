import ExcelJS from 'exceljs'
import exportLogoUrl from '../assets/brand/ucm-logo2.png'

const EXCEL_DATA_START_ROW = 1

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function resolveScalar(value) {
  if (Array.isArray(value)) return value.find((item) => item !== null && item !== undefined && item !== '') ?? value[0] ?? ''
  if (value === null || value === undefined) return ''
  return value
}

function sanitizeExcelCellValue(value) {
  const resolved = resolveScalar(value)
  if (typeof resolved === 'number' || typeof resolved === 'boolean') return resolved
  const text = String(resolved)
  if (/^[=+\-@]/.test(text)) return `'${text}`
  return text
}

function cellValue(column, row) {
  if (column.exportValue) return sanitizeExcelCellValue(column.exportValue(row))
  if (column.render) {
    const rendered = column.render(row)
    if (typeof rendered === 'string' || typeof rendered === 'number') return sanitizeExcelCellValue(rendered)
  }
  return sanitizeExcelCellValue(row[column.key] ?? '')
}

function sanitizeSheetName(name) {
  const cleaned = String(name || 'Hoja')
    .replace(/[\\/?*[\]:]/g, ' ')
    .trim()
    .slice(0, 31)
  return cleaned || 'Hoja'
}

function uniqueSheetNames(sheets) {
  const used = new Set()
  return sheets.map((sheet) => {
    const base = sanitizeSheetName(sheet.name)
    let candidate = base
    let index = 2
    while (used.has(candidate)) {
      const suffix = ` (${index})`
      candidate = `${base.slice(0, Math.max(1, 31 - suffix.length))}${suffix}`
      index += 1
    }
    used.add(candidate)
    return candidate
  })
}

function tableHtml({ columns, rows }) {
  const headers = columns.map((column) => `<th>${escapeHtml(column.header)}</th>`).join('')
  const body = rows
    .map((row) => `<tr>${columns.map((column) => `<td>${escapeHtml(cellValue(column, row))}</td>`).join('')}</tr>`)
    .join('')

  return `
    <table>
      <thead><tr>${headers}</tr></thead>
      <tbody>${body}</tbody>
    </table>
  `
}

const PDF_BRAND_TITLE = 'Sistema de Gestión Comercial'

const PDF_EXPORT_STYLES = `
  body { font-family: Arial, sans-serif; color: #111827; margin: 24px; }
  .export-brand-header {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 18px;
  }
  .export-logo {
    flex: 0 0 auto;
    width: 9.5rem;
    height: 2.75rem;
    object-fit: contain;
    object-position: left center;
  }
  .export-doc-title {
    margin: 0;
    font-size: 20px;
    font-weight: 700;
    line-height: 1.2;
  }
  .export-sheet-title {
    margin: 0 0 10px;
    font-size: 16px;
    font-weight: 700;
  }
  .sheet-section { margin-bottom: 28px; page-break-inside: avoid; }
  table { border-collapse: collapse; width: 100%; font-size: 11px; }
  th, td { border: 1px solid #d1d5db; padding: 6px 8px; text-align: left; }
  th { background: #f3f4f6; text-transform: uppercase; }
`

function writeExcelSheetData(worksheet, sheet, startRow) {
  const headerRow = worksheet.getRow(startRow)
  sheet.columns.forEach((column, index) => {
    const cell = headerRow.getCell(index + 1)
    cell.value = column.header
    cell.font = { bold: true }
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF3F4F6' },
    }
  })

  sheet.rows.forEach((row, rowIndex) => {
    const dataRow = worksheet.getRow(startRow + 1 + rowIndex)
    sheet.columns.forEach((column, colIndex) => {
      dataRow.getCell(colIndex + 1).value = cellValue(column, row)
    })
  })
}

function downloadExcelBuffer(buffer, filename) {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.xlsx`
  link.click()
  URL.revokeObjectURL(url)
}

export function exportExcel({ title, columns, rows, filename }) {
  exportExcelSheets({
    filename,
    sheets: [{ name: title || 'Datos', columns, rows }],
  })
}

export function exportExcelSheets({ filename, sheets = [] }) {
  void buildAndDownloadExcelSheets({ filename, sheets })
}

async function buildAndDownloadExcelSheets({ filename, sheets = [] }) {
  if (!sheets.length) return

  const workbook = new ExcelJS.Workbook()
  const names = uniqueSheetNames(sheets)

  sheets.forEach((sheet, index) => {
    const worksheet = workbook.addWorksheet(names[index])
    writeExcelSheetData(worksheet, sheet, EXCEL_DATA_START_ROW)
  })

  const buffer = await workbook.xlsx.writeBuffer()
  downloadExcelBuffer(buffer, filename)
}

export function exportPdf({ title, columns, rows }) {
  exportPdfSheets({
    title,
    sheets: [{ name: title || 'Datos', columns, rows }],
  })
}

export function exportPdfSheets({ title, sheets = [] }) {
  const printWindow = window.open('', '_blank', 'width=1100,height=800')
  if (!printWindow) return

  const reportTitle = title || sheets[0]?.name || 'Exportacion'

  const sections = sheets
    .map((sheet) => {
      const sheetLabel = sheet.name || reportTitle
      const sheetTitle = `<h2 class="export-sheet-title">${escapeHtml(sheetLabel)}</h2>`

      return `
        <section class="sheet-section">
          ${sheetTitle}
          ${tableHtml({ columns: sheet.columns, rows: sheet.rows })}
        </section>
      `
    })
    .join('')

  printWindow.document.write(`
    <html>
      <head>
        <title>${escapeHtml(PDF_BRAND_TITLE)} - ${escapeHtml(reportTitle)}</title>
        <style>${PDF_EXPORT_STYLES}</style>
      </head>
      <body>
        <header class="export-brand-header">
          <img src="${exportLogoUrl}" alt="UCM" class="export-logo" />
          <h1 class="export-doc-title">${escapeHtml(PDF_BRAND_TITLE)}</h1>
        </header>
        ${sections}
      </body>
    </html>
  `)
  printWindow.document.close()
  printWindow.focus()
  printWindow.print()
}
