/**
 * Períodos de nómina quincenales:
 *  - Q1: del 1 al 15 (pago el 15).
 *  - Q2: del 16 al último día del mes (pago el último día).
 * Clave de período: "YYYY-MM-Q1" | "YYYY-MM-Q2".
 */
import { fromDateStr, lastDayOfMonth, monthLabel, pad2, todayStr } from './dates'

export interface Period {
  key: string
  year: number
  month: number // 1-12
  half: 1 | 2
  startDate: string
  endDate: string
  /** Fecha estimada de pago (15 o fin de mes) */
  payDate: string
  label: string
}

export function periodFromParts(year: number, month: number, half: 1 | 2): Period {
  const last = lastDayOfMonth(year, month)
  const startDate = `${year}-${pad2(month)}-${half === 1 ? '01' : '16'}`
  const endDate = `${year}-${pad2(month)}-${half === 1 ? '15' : pad2(last)}`
  return {
    key: `${year}-${pad2(month)}-Q${half}`,
    year,
    month,
    half,
    startDate,
    endDate,
    payDate: endDate,
    label: `${half === 1 ? '1–15' : `16–${last}`} ${monthLabel(year, month)}`,
  }
}

export function periodOfDate(dateStr: string): Period {
  const d = fromDateStr(dateStr)
  return periodFromParts(d.getFullYear(), d.getMonth() + 1, d.getDate() <= 15 ? 1 : 2)
}

export function currentPeriod(): Period {
  return periodOfDate(todayStr())
}

export function periodFromKey(key: string): Period {
  const [y, m, q] = key.split('-')
  return periodFromParts(Number(y), Number(m), q === 'Q1' ? 1 : 2)
}

export function prevPeriod(p: Period): Period {
  if (p.half === 2) return periodFromParts(p.year, p.month, 1)
  const m = p.month === 1 ? 12 : p.month - 1
  const y = p.month === 1 ? p.year - 1 : p.year
  return periodFromParts(y, m, 2)
}

export function nextPeriod(p: Period): Period {
  if (p.half === 1) return periodFromParts(p.year, p.month, 2)
  const m = p.month === 12 ? 1 : p.month + 1
  const y = p.month === 12 ? p.year + 1 : p.year
  return periodFromParts(y, m, 1)
}

export function isDateInPeriod(dateStr: string, p: Period): boolean {
  return dateStr >= p.startDate && dateStr <= p.endDate
}

/** Lista de los últimos N períodos terminando en `p` (incluido), del más antiguo al más reciente */
export function lastPeriods(p: Period, n: number): Period[] {
  const out: Period[] = [p]
  let cur = p
  for (let i = 1; i < n; i++) {
    cur = prevPeriod(cur)
    out.unshift(cur)
  }
  return out
}
