/**
 * Festivos de Colombia calculados automáticamente (Ley 51 de 1983 — "Ley Emiliani").
 * - Festivos fijos que no se trasladan.
 * - Festivos que se trasladan al lunes siguiente si no caen en lunes.
 * - Festivos que dependen de la Pascua (Semana Santa y derivados).
 */
import { fromDateStr, pad2, toDateStr } from './dates'

/** Domingo de Pascua (algoritmo de Meeus/Butcher, calendario gregoriano) */
function easterSunday(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31) // 3=marzo, 4=abril
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(year, month - 1, day, 12)
}

function addDaysDate(d: Date, days: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + days)
  return r
}

/** Traslada al lunes siguiente si no cae lunes (Ley Emiliani) */
function nextMonday(d: Date): Date {
  const day = d.getDay()
  if (day === 1) return d
  return addDaysDate(d, (8 - day) % 7)
}

const cache = new Map<number, Set<string>>()

/** Conjunto de festivos "YYYY-MM-DD" para un año dado */
export function holidaysOfYear(year: number): Set<string> {
  const cached = cache.get(year)
  if (cached) return cached

  const set = new Set<string>()
  const fixed = (m: number, d: number) => set.add(`${year}-${pad2(m)}-${pad2(d)}`)
  const emiliani = (m: number, d: number) => set.add(toDateStr(nextMonday(new Date(year, m - 1, d, 12))))

  // Fijos (no se trasladan)
  fixed(1, 1) // Año Nuevo
  fixed(5, 1) // Día del Trabajo
  fixed(7, 20) // Independencia
  fixed(8, 7) // Batalla de Boyacá
  fixed(12, 8) // Inmaculada Concepción
  fixed(12, 25) // Navidad

  // Trasladables al lunes
  emiliani(1, 6) // Reyes Magos
  emiliani(3, 19) // San José
  emiliani(6, 29) // San Pedro y San Pablo
  emiliani(8, 15) // Asunción
  emiliani(10, 12) // Día de la Raza
  emiliani(11, 1) // Todos los Santos
  emiliani(11, 11) // Independencia de Cartagena

  // Basados en Pascua
  const easter = easterSunday(year)
  set.add(toDateStr(addDaysDate(easter, -3))) // Jueves Santo
  set.add(toDateStr(addDaysDate(easter, -2))) // Viernes Santo
  set.add(toDateStr(nextMonday(addDaysDate(easter, 39)))) // Ascensión
  set.add(toDateStr(nextMonday(addDaysDate(easter, 60)))) // Corpus Christi
  set.add(toDateStr(nextMonday(addDaysDate(easter, 68)))) // Sagrado Corazón

  cache.set(year, set)
  return set
}

export function isHoliday(dateStr: string): boolean {
  const year = fromDateStr(dateStr).getFullYear()
  return holidaysOfYear(year).has(dateStr)
}
