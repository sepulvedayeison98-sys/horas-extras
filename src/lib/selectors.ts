/** Selectores: filtran y resumen registros por período/mes/año. */
import type { DayCalc } from './calculations'
import { aggregate, type AggregateCalc } from './calculations'
import type { PaymentRecord, WorkdayRecord } from './types'
import { isDateInPeriod, type Period } from './quincena'

export function recordsInPeriod(records: WorkdayRecord[], p: Period): WorkdayRecord[] {
  return records.filter((r) => isDateInPeriod(r.date, p))
}

export function recordsInMonth(records: WorkdayRecord[], year: number, month: number): WorkdayRecord[] {
  const prefix = `${year}-${String(month).padStart(2, '0')}`
  return records.filter((r) => r.date.startsWith(prefix))
}

export function recordsInYear(records: WorkdayRecord[], year: number): WorkdayRecord[] {
  return records.filter((r) => r.date.startsWith(`${year}-`))
}

export interface PeriodSummary {
  period: Period
  agg: AggregateCalc
  payment: PaymentRecord | undefined
  isPaid: boolean
}

export function summarizePeriod(
  records: WorkdayRecord[],
  payments: Record<string, PaymentRecord>,
  period: Period,
  calcOf: (r: WorkdayRecord) => DayCalc,
): PeriodSummary {
  const agg = aggregate(recordsInPeriod(records, period), calcOf)
  const payment = payments[period.key]
  return { period, agg, payment, isPaid: payment?.status === 'pagada' }
}

/** Total realmente pagado en el año (histórico de pagos marcados como pagados) */
export function totalPaidInYear(payments: Record<string, PaymentRecord>, year: number): number {
  return Object.values(payments)
    .filter((p) => p.status === 'pagada' && p.periodKey.startsWith(`${year}-`))
    .reduce((sum, p) => sum + (p.paidAmount ?? 0), 0)
}
