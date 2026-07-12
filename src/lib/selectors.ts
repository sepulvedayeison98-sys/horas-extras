/** Selectores: filtran y resumen registros por período/mes/año. */
import type { DayCalc } from './calculations'
import { aggregate, type AggregateCalc } from './calculations'
import type { PaymentRecord, Settings, WorkdayRecord } from './types'
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
  /** Salario base + auxilio de transporte prorrateados para esta quincena (0 si no se configuraron) */
  basePay: number
  /** basePay + agg.estimatedExtraPay: lo que deberían pagarte en total esta quincena */
  totalPay: number
}

/**
 * Salario base + auxilio de transporte, prorrateados a la mitad (una quincena).
 * En Colombia el salario es un monto FIJO mensual, no horas × valor/hora —
 * por eso esto no depende de las horas trabajadas, solo de la configuración.
 * Da 0 si el usuario no ha configurado su salario (no se inventa un valor).
 */
export function periodBasePay(settings: Settings): number {
  return Math.round((settings.monthlySalary || 0) / 2) + Math.round((settings.transportAllowance || 0) / 2)
}

export function summarizePeriod(
  records: WorkdayRecord[],
  payments: Record<string, PaymentRecord>,
  period: Period,
  calcOf: (r: WorkdayRecord) => DayCalc,
  settings: Settings,
): PeriodSummary {
  const agg = aggregate(recordsInPeriod(records, period), calcOf)
  const payment = payments[period.key]
  const basePay = periodBasePay(settings)
  return {
    period,
    agg,
    payment,
    isPaid: payment?.status === 'pagada',
    basePay,
    totalPay: basePay + agg.estimatedExtraPay,
  }
}

/** Total realmente pagado en el año (histórico de pagos marcados como pagados) */
export function totalPaidInYear(payments: Record<string, PaymentRecord>, year: number): number {
  return Object.values(payments)
    .filter((p) => p.status === 'pagada' && p.periodKey.startsWith(`${year}-`))
    .reduce((sum, p) => sum + (p.paidAmount ?? 0), 0)
}
