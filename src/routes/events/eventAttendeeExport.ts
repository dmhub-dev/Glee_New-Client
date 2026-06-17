import type { AdminEventTicket } from '@glee/api'

export type AttendeeExportFormat = 'pdf' | 'excel'

export interface AttendeeExportRow {
  name: string
  email: string
  phone: string
  tickets: string
  ticketTier: string
  tableBooking: string
  paymentMethod: string
  paymentStatus: string
  amountPaid: string
  purchasedAt: string
}

const EXPORT_COLUMNS: Array<{ label: string; key: keyof AttendeeExportRow; chars: number; width: number }> = [
  { label: 'Full name', key: 'name', chars: 18, width: 76 },
  { label: 'Email', key: 'email', chars: 25, width: 112 },
  { label: 'Phone', key: 'phone', chars: 16, width: 66 },
  { label: 'Tickets', key: 'tickets', chars: 7, width: 34 },
  { label: 'Ticket tier', key: 'ticketTier', chars: 14, width: 72 },
  { label: 'Table booking', key: 'tableBooking', chars: 26, width: 132 },
  { label: 'Payment', key: 'paymentMethod', chars: 12, width: 54 },
  { label: 'Paid status', key: 'paymentStatus', chars: 18, width: 86 },
  { label: 'Amount paid', key: 'amountPaid', chars: 13, width: 58 },
  { label: 'Purchased', key: 'purchasedAt', chars: 12, width: 54 },
]

const GLEE_EXCEL_LOGO_SRC = '/glee-logo-final.svg'
const GLEE_PDF_LOGO_SRC = '/glee-logo-final.svg'

type PdfDocument = {
  addSvgAsImage: (...args: unknown[]) => unknown
  addPage: () => unknown
  internal: { pageSize: { getWidth: () => number; getHeight: () => number } }
  line: (...args: unknown[]) => unknown
  rect: (...args: unknown[]) => unknown
  save: (filename: string) => unknown
  setDrawColor: (...args: unknown[]) => unknown
  setFont: (...args: unknown[]) => unknown
  setFontSize: (...args: unknown[]) => unknown
  setTextColor: (...args: unknown[]) => unknown
  text: (...args: unknown[]) => unknown
}

export function formatExportMoney(value: string | number | null | undefined, currency = 'KES') {
  return `${currency} ${Math.max(0, Number(value ?? 0)).toLocaleString()}`
}

export function attendeeName(ticket: AdminEventTicket) {
  return ticket.user?.name || ticket.guestName || 'Guest attendee'
}

export function attendeeEmail(ticket: AdminEventTicket) {
  return ticket.user?.email || ticket.guestEmail || '-'
}

export function attendeePhone(ticket: AdminEventTicket) {
  return ticket.user?.phone || ticket.guestPhone || '-'
}

export function attendeePaymentMethod(ticket: AdminEventTicket) {
  return ticket.payment?.paymentMethod || 'UNKNOWN'
}

export function attendeeIsFullyPaid(ticket: AdminEventTicket) {
  return Boolean(ticket.payment?.isPaid) && Number(ticket.outstandingAmount ?? 0) <= 0
}

export function attendeePaymentStatusLabel(ticket: AdminEventTicket, currency = 'KES') {
  if (attendeeIsFullyPaid(ticket)) return 'Fully paid'
  return `Outstanding ${formatExportMoney(ticket.outstandingAmount, currency)}`
}

export function attendeeAmountPaidLabel(ticket: AdminEventTicket, currency = 'KES') {
  return formatExportMoney(ticket.amountPaid ?? ticket.payment?.totalPrice ?? ticket.totalPrice, currency)
}

export function attendeePurchasedDateLabel(ticket: AdminEventTicket) {
  const date = new Date(ticket.createdAt)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function attendeeTableBookingLabel(ticket: AdminEventTicket, currency = 'KES') {
  const tableBooking = ticket.tableBooking ?? ticket.reservation
  if (!tableBooking) return '-'

  const parts = [
    tableBooking.tableCategory,
    `${tableBooking.guestCount} guest${tableBooking.guestCount === 1 ? '' : 's'}`,
    tableBooking.status,
    `deposit ${formatExportMoney(tableBooking.depositAmount, currency)}`,
    `min spend ${formatExportMoney(tableBooking.minimumSpend, currency)}`,
  ]

  return parts.filter(Boolean).join(', ')
}

export function buildAttendeeExportRows(tickets: AdminEventTicket[]): AttendeeExportRow[] {
  return tickets.map(ticket => ({
    name: attendeeName(ticket),
    email: attendeeEmail(ticket),
    phone: attendeePhone(ticket),
    tickets: String(ticket.quantity),
    ticketTier: ticket.ticketCategory?.name ?? 'General',
    tableBooking: attendeeTableBookingLabel(ticket),
    paymentMethod: attendeePaymentMethod(ticket),
    paymentStatus: attendeePaymentStatusLabel(ticket),
    amountPaid: attendeeAmountPaidLabel(ticket),
    purchasedAt: attendeePurchasedDateLabel(ticket),
  }))
}

export function attendeeExportFilename(eventTitle: string | undefined, extension: 'pdf' | 'xls') {
  const base = (eventTitle || 'event')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `${base || 'event'}-attendees.${extension}`
}

export function buildAttendeeExcelHtml(
  eventTitle: string,
  rows: AttendeeExportRow[],
  exportedAt = new Date(),
  logoSrc = GLEE_EXCEL_LOGO_SRC,
) {
  const generatedAt = exportedAt.toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })
  const headerCells = EXPORT_COLUMNS.map(column => `<th>${escapeHtml(column.label)}</th>`).join('')
  const rowCells = rows.map(row => (
    `<tr>${EXPORT_COLUMNS.map(column => `<td>${escapeHtml(row[column.key])}</td>`).join('')}</tr>`
  )).join('')

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { color: #db2777; font-family: Arial, sans-serif; }
    .brand { border-collapse: collapse; margin-bottom: 18px; width: 100%; }
    .brand td { border: 0 !important; padding: 0 !important; vertical-align: middle; }
    .brand-logo { width: 132px; }
    .eyebrow { color: #ff2d8f; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; }
    h1 { color: #db2777; font-size: 22px; margin: 4px 0 6px; }
    p { color: #ec4899; margin: 0; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #f9a8d4; padding: 6px; text-align: left; mso-number-format: "\\@"; }
    th { background: #ffe8f4; color: #db2777; font-weight: 700; }
  </style>
</head>
<body>
  <table class="brand">
    <tr>
      <td class="brand-logo"><img src="${escapeAttribute(logoSrc)}" alt="Glee" width="118" /></td>
      <td>
        <div class="eyebrow">Glee Event attendee report</div>
        <h1>${escapeHtml(eventTitle)} attendees</h1>
        <p>Generated ${escapeHtml(generatedAt)}. ${rows.length.toLocaleString()} attendee record${rows.length === 1 ? '' : 's'}.</p>
      </td>
    </tr>
  </table>
  <table>
    <thead><tr>${headerCells}</tr></thead>
    <tbody>${rowCells}</tbody>
  </table>
</body>
</html>`
}

export async function downloadAttendeeExcel(eventTitle: string, rows: AttendeeExportRow[]) {
  const logoSrc = await loadGleeLogoDataUrl(GLEE_EXCEL_LOGO_SRC).catch(() => GLEE_EXCEL_LOGO_SRC)
  const html = buildAttendeeExcelHtml(eventTitle, rows, new Date(), logoSrc)
  const blob = new Blob(['\uFEFF', html], { type: 'application/vnd.ms-excel;charset=utf-8' })
  downloadBlob(blob, attendeeExportFilename(eventTitle, 'xls'))
}

export async function downloadAttendeePdf(eventTitle: string, rows: AttendeeExportRow[]) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  const logoSvg = await loadGleeLogoSvgText(GLEE_PDF_LOGO_SRC).catch(() => null)
  renderAttendeePdf(doc as unknown as PdfDocument, eventTitle, rows, logoSvg)
  doc.save(attendeeExportFilename(eventTitle, 'pdf'))
}

export async function loadGleeLogoDataUrl(src = GLEE_PDF_LOGO_SRC) {
  const response = await fetch(src)
  if (!response.ok) throw new Error('Unable to load Glee logo')
  const contentType = response.headers.get('content-type') ?? ''

  if (contentType.includes('svg') || src.toLowerCase().endsWith('.svg')) {
    const svg = await response.text()
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  }

  const blob = await response.blob()
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => resolve(String(reader.result)))
    reader.addEventListener('error', () => reject(reader.error ?? new Error('Unable to read Glee logo')))
    reader.readAsDataURL(blob)
  })
}

export async function loadGleeLogoSvgText(src = GLEE_PDF_LOGO_SRC) {
  const response = await fetch(src)
  if (!response.ok) throw new Error('Unable to load Glee logo')
  return response.text()
}

function renderAttendeePdf(
  doc: PdfDocument,
  eventTitle: string,
  rows: AttendeeExportRow[],
  logoSvg: string | null,
) {
  const margin = 32
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const tableTop = 136
  const headerHeight = 24
  const rowHeight = 25
  const rowsPerPage = Math.max(1, Math.floor((pageHeight - tableTop - 52) / rowHeight))
  const pages = rows.length ? chunkRows(rows, rowsPerPage) : [[]]
  const exportedAt = new Date().toLocaleString('en-KE', { dateStyle: 'medium', timeStyle: 'short' })
  const tableWidth = EXPORT_COLUMNS.reduce((sum, column) => sum + column.width, 0)

  pages.forEach((pageRows, pageIndex) => {
    if (pageIndex > 0) doc.addPage()
    drawPdfHeader(doc, { eventTitle, exportedAt, logoSvg, pageWidth, margin, rowsCount: rows.length })
    drawPdfTableHeader(doc, margin, tableTop, headerHeight)

    pageRows.forEach((row, rowIndex) => {
      const y = tableTop + headerHeight + rowIndex * rowHeight
      drawPdfRow(doc, row, margin, y, rowHeight)
    })

    doc.setDrawColor(210, 210, 210)
    doc.line(margin, tableTop, margin + tableWidth, tableTop)
    doc.line(margin, tableTop, margin, tableTop + headerHeight + pageRows.length * rowHeight)
    doc.line(margin + tableWidth, tableTop, margin + tableWidth, tableTop + headerHeight + pageRows.length * rowHeight)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(90, 90, 90)
    doc.text(`Page ${pageIndex + 1} of ${pages.length}`, pageWidth - margin, pageHeight - 22, { align: 'right' })
    doc.text('Glee attendee export', margin, pageHeight - 22)
  })
}

function drawPdfHeader(
  doc: PdfDocument,
  options: { eventTitle: string; exportedAt: string; logoSvg: string | null; pageWidth: number; margin: number; rowsCount: number },
) {
  if (options.logoSvg) {
    doc.addSvgAsImage(options.logoSvg, options.margin, 28, 56, 82)
  } else {
    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(20)
    doc.text('Glee', options.margin, 52)
  }

  doc.setTextColor(0, 0, 0)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('EVENT ATTENDEE REPORT', options.margin + 112, 38)

  doc.setTextColor(0, 0, 0)
  doc.setFontSize(18)
  doc.text(clipPdfCell(`${options.eventTitle} attendees`, 68), options.margin + 112, 62)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(90, 90, 90)
  doc.text(`Generated ${options.exportedAt}`, options.margin + 112, 82)
  doc.text(`${options.rowsCount.toLocaleString()} attendee record${options.rowsCount === 1 ? '' : 's'}`, options.pageWidth - options.margin, 82, { align: 'right' })

  doc.setDrawColor(210, 210, 210)
  doc.line(options.margin, 104, options.pageWidth - options.margin, 104)
}

function drawPdfTableHeader(doc: PdfDocument, startX: number, startY: number, height: number) {
  let x = startX
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(0, 0, 0)
  doc.setDrawColor(210, 210, 210)

  EXPORT_COLUMNS.forEach(column => {
    doc.rect(x, startY, column.width, height)
    doc.text(column.label, x + 5, startY + 15)
    x += column.width
  })
}

function drawPdfRow(doc: PdfDocument, row: AttendeeExportRow, startX: number, startY: number, height: number) {
  let x = startX
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(0, 0, 0)
  doc.setDrawColor(210, 210, 210)

  EXPORT_COLUMNS.forEach(column => {
    doc.rect(x, startY, column.width, height)
    doc.text(clipPdfCell(row[column.key], column.chars), x + 5, startY + 15)
    x += column.width
  })
}

function chunkRows<T>(rows: T[], size: number) {
  const chunks: T[][] = []
  for (let index = 0; index < rows.length; index += size) {
    chunks.push(rows.slice(index, index + size))
  }
  return chunks
}

function clipPdfCell(value: string | number | null | undefined, maxChars: number) {
  const text = String(value ?? '-').replace(/\s+/g, ' ').trim()
  if (text.length <= maxChars) return text
  return `${text.slice(0, Math.max(0, maxChars - 1))}.`
}

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeAttribute(value: string | number | null | undefined) {
  return escapeHtml(value)
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}
