/**
 * Exportación a PDF y Excel. Las librerías (jspdf / xlsx) se cargan con
 * import() dinámico para no penalizar la carga inicial de la PWA.
 */
import type { DayCalc } from './calculations'
import type { PaymentRecord, Settings, WorkdayRecord } from './types'
import { DAY_TYPE_LABELS } from './types'
import { formatCOP } from './format'
import { formatDateShort } from './dates'

export interface ExportBundle {
  /** Título del alcance: "Quincena actual", "Mes actual", "Año 2026" */
  scopeLabel: string
  records: WorkdayRecord[]
  calcOf: (r: WorkdayRecord) => DayCalc
  payments: PaymentRecord[]
  settings: Settings
}

interface Totals {
  worked: number
  ordinary: number
  extraDay: number
  extraNight: number
  sundayHoliday: number
  pay: number
}

function totalsOf(bundle: ExportBundle): Totals {
  const t: Totals = { worked: 0, ordinary: 0, extraDay: 0, extraNight: 0, sundayHoliday: 0, pay: 0 }
  for (const r of bundle.records) {
    const c = bundle.calcOf(r)
    t.worked += c.workedHours
    t.ordinary += c.ordinaryHours
    t.extraDay += c.extraDayHours
    t.extraNight += c.extraNightHours
    t.sundayHoliday += c.sundayHolidayHours
    t.pay += c.estimatedExtraPay
  }
  return t
}

function recordRows(bundle: ExportBundle): (string | number)[][] {
  return [...bundle.records]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((r) => {
      const c = bundle.calcOf(r)
      return [
        r.date,
        DAY_TYPE_LABELS[r.dayType],
        r.startTime,
        r.endTime,
        r.lunchMinutes,
        c.workedHours,
        c.ordinaryHours,
        c.extraDayHours,
        c.extraNightHours,
        c.sundayHolidayHours,
        c.estimatedExtraPay,
        r.notes ?? '',
      ]
    })
}

const RECORD_HEADERS = [
  'Fecha',
  'Tipo',
  'Ingreso',
  'Salida',
  'Almuerzo (min)',
  'Horas trabajadas',
  'Ordinarias',
  'Extra diurna',
  'Extra nocturna',
  'Dominical/Festiva',
  'Pago extra estimado',
  'Observaciones',
]

export async function exportExcel(bundle: ExportBundle): Promise<void> {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()
  const t = totalsOf(bundle)

  const rows = recordRows(bundle)
  rows.push([])
  rows.push(['TOTALES', '', '', '', '', t.worked, t.ordinary, t.extraDay, t.extraNight, t.sundayHoliday, t.pay, ''])
  const wsRecords = XLSX.utils.aoa_to_sheet([RECORD_HEADERS, ...rows])
  wsRecords['!cols'] = RECORD_HEADERS.map((h) => ({ wch: Math.max(12, h.length + 2) }))
  XLSX.utils.book_append_sheet(wb, wsRecords, 'Registros')

  const wsSummary = XLSX.utils.aoa_to_sheet([
    ['Resumen', bundle.scopeLabel],
    [],
    ['Horas trabajadas', t.worked],
    ['Horas ordinarias', t.ordinary],
    ['Horas extra diurnas', t.extraDay],
    ['Horas extra nocturnas', t.extraNight],
    ['Horas dominicales/festivas', t.sundayHoliday],
    ['Valor extra estimado (COP)', t.pay],
    [],
    ['Valor hora ordinaria (COP)', bundle.settings.hourlyRate],
    ['Jornada legal semanal (h)', bundle.settings.weeklyLegalHours],
  ])
  wsSummary['!cols'] = [{ wch: 30 }, { wch: 22 }]
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen')

  if (bundle.payments.length > 0) {
    const wsPay = XLSX.utils.aoa_to_sheet([
      ['Quincena', 'Estado', 'Fecha de pago', 'Valor pagado (COP)', 'Observaciones'],
      ...bundle.payments.map((p) => [p.periodKey, p.status, p.paidDate ?? '', p.paidAmount ?? '', p.notes ?? '']),
    ])
    wsPay['!cols'] = [{ wch: 14 }, { wch: 10 }, { wch: 14 }, { wch: 18 }, { wch: 30 }]
    XLSX.utils.book_append_sheet(wb, wsPay, 'Pagos')
  }

  XLSX.writeFile(wb, `horas-extras-${slug(bundle.scopeLabel)}.xlsx`)
}

export async function exportPDF(bundle: ExportBundle): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')
  const doc = new jsPDF({ orientation: 'landscape' })
  const t = totalsOf(bundle)

  doc.setFontSize(16)
  doc.text('Control de Horas Extras', 14, 16)
  doc.setFontSize(11)
  doc.setTextColor(100)
  const who = bundle.settings.userName ? ` — ${bundle.settings.userName}` : ''
  doc.text(`${bundle.scopeLabel}${who}`, 14, 23)
  doc.setTextColor(0)

  autoTable(doc, {
    startY: 28,
    head: [RECORD_HEADERS.slice(0, 11)],
    body: recordRows(bundle).map((r) => {
      const row = r.slice(0, 11)
      row[10] = formatCOP(Number(row[10]) || 0)
      row[0] = formatDateShort(String(row[0]))
      return row
    }),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [79, 70, 229] },
  })

  const y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
  autoTable(doc, {
    startY: y,
    head: [['Totales', 'Horas trabajadas', 'Ordinarias', 'Extra diurna', 'Extra nocturna', 'Dom/Fest', 'Valor extra estimado']],
    body: [[
      bundle.scopeLabel,
      t.worked.toFixed(1),
      t.ordinary.toFixed(1),
      t.extraDay.toFixed(1),
      t.extraNight.toFixed(1),
      t.sundayHoliday.toFixed(1),
      formatCOP(t.pay),
    ]],
    styles: { fontSize: 9, fontStyle: 'bold' },
    headStyles: { fillColor: [16, 185, 129] },
  })

  if (bundle.payments.length > 0) {
    const y2 = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8
    autoTable(doc, {
      startY: y2,
      head: [['Quincena', 'Estado', 'Fecha de pago', 'Valor pagado', 'Observaciones']],
      body: bundle.payments.map((p) => [
        p.periodKey,
        p.status,
        p.paidDate ?? '',
        p.paidAmount != null ? formatCOP(p.paidAmount) : '',
        p.notes ?? '',
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [79, 70, 229] },
    })
  }

  doc.save(`horas-extras-${slug(bundle.scopeLabel)}.pdf`)
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}
