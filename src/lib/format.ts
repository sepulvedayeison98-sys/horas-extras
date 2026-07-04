/** Formateadores para COP y horas. */

const copFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

export function formatCOP(value: number): string {
  return copFormatter.format(Math.round(value))
}

/** 9.5 → "9 h 30 m"; 0 → "0 h" */
export function formatHours(hours: number): string {
  const totalMin = Math.round(hours * 60)
  const h = Math.trunc(totalMin / 60)
  const m = Math.abs(totalMin % 60)
  if (m === 0) return `${h} h`
  return `${h} h ${m} m`
}

/** 9.5 → "9,5" (número compacto para tarjetas KPI) */
export function formatHoursNum(hours: number): string {
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 }).format(hours)
}

export function formatDiffPct(current: number, previous: number): string | null {
  if (previous === 0) return null
  const pct = ((current - previous) / previous) * 100
  const sign = pct >= 0 ? '+' : ''
  return `${sign}${pct.toFixed(0)}%`
}
