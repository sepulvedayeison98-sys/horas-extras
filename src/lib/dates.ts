/**
 * Utilidades de fecha. Todas las fechas se manejan como strings locales
 * "YYYY-MM-DD" para evitar errores de zona horaria con Date/UTC.
 */

export function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export function todayStr(): string {
  return toDateStr(new Date())
}

/** Crea un Date local a mediodía (evita saltos por DST/zonas) */
export function fromDateStr(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d, 12, 0, 0)
}

export function addDays(s: string, days: number): string {
  const d = fromDateStr(s)
  d.setDate(d.getDate() + days)
  return toDateStr(d)
}

/** 0=domingo ... 6=sábado */
export function dayOfWeek(s: string): number {
  return fromDateStr(s).getDay()
}

export function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate() // month es 1-12
}

export function formatDateLong(s: string): string {
  return fromDateStr(s).toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function formatDateShort(s: string): string {
  return fromDateStr(s).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function monthLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
}

/** Clave de semana ISO "2026-W27" para calcular exceso semanal */
export function isoWeekKey(dateStr: string): string {
  const d = fromDateStr(dateStr)
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${date.getUTCFullYear()}-W${pad2(week)}`
}

/** "HH:mm" → minutos desde las 00:00 */
export function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

export function minutesToTime(mins: number): string {
  const m = ((mins % 1440) + 1440) % 1440
  return `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`
}
