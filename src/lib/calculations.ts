/**
 * LÓGICA CENTRAL DE CÁLCULO — todo el cálculo de horas y valores vive aquí.
 *
 * Enfoque: aproximación confiable para control PERSONAL (no liquidación
 * jurídica de nómina). Reglas documentadas:
 *
 * 1. Horas trabajadas = (salida - ingreso) - almuerzo. Si salida < ingreso,
 *    se asume que el turno cruza medianoche.
 * 2. Umbral de hora extra diaria = la JORNADA HABITUAL del usuario, derivada de
 *    su horario por defecto (ingreso, salida y almuerzo en Configuración).
 *    Ej.: 08:00–18:00 con 60 min de almuerzo = 9 h. Un día normal dentro de esa
 *    jornada NO genera extras. (La jornada legal semanal 44/42 h se usa solo
 *    para la métrica aparte de "exceso legal semanal" — ver weeklyExcess).
 * 3. Día "normal": los primeros minutos hasta la jornada habitual son
 *    ordinarios; el resto son extras. Las extras se clasifican en diurnas o
 *    nocturnas según la hora del reloj (franja nocturna configurable).
 * 4. Sábado: se trata todo como horas extra (diurnas/nocturnas), porque la
 *    jornada habitual del usuario es lunes a viernes.
 * 5. Domingo y festivo: todas las horas van a la categoría dominical/festiva
 *    con su recargo configurable.
 * 6. El almuerzo se descuenta como bloque: inicia a las 12:30 si el turno la
 *    contiene; si no, en la mitad del turno (aproximación razonable).
 * 7. Valor estimado = SOLO el pago adicional por extras y recargos (las horas
 *    ordinarias se asumen cubiertas por el salario base).
 */
import type { DayType, Settings, WorkdayRecord } from './types'
import { isoWeekKey, timeToMinutes } from './dates'

export interface DayCalc {
  /** Horas efectivamente trabajadas (sin almuerzo) */
  workedHours: number
  /** Horas ordinarias (solo días normales) */
  ordinaryHours: number
  /** De las ordinarias, cuántas caen en franja nocturna (recargo nocturno) */
  ordinaryNightHours: number
  extraDayHours: number
  extraNightHours: number
  /** Horas trabajadas en domingo o festivo */
  sundayHolidayHours: number
  /** Total de horas "extra" en sentido amplio (extras + dominicales/festivas) */
  extraTotalHours: number
  /** Pago adicional estimado (COP) por extras y recargos */
  estimatedExtraPay: number
}

export const EMPTY_CALC: DayCalc = {
  workedHours: 0,
  ordinaryHours: 0,
  ordinaryNightHours: 0,
  extraDayHours: 0,
  extraNightHours: 0,
  sundayHolidayHours: 0,
  extraTotalHours: 0,
  estimatedExtraPay: 0,
}

/**
 * Jornada HABITUAL en minutos = umbral a partir del cual una hora cuenta como
 * extra en un día normal. Se deriva del horario por defecto del usuario
 * (ingreso/salida/almuerzo). Ej.: 08:00–18:00 − 60 min = 540 min (9 h).
 * Si el horario no es válido, cae en jornadaLegalSemanal / díasLaborales.
 */
export function normalDayMinutes(s: Settings): number {
  const start = timeToMinutes(s.defaultStart)
  let end = timeToMinutes(s.defaultEnd)
  if (end <= start) end += 1440 // jornada que cruza medianoche
  const journey = end - start - Math.max(0, s.defaultLunchMinutes || 0)
  if (journey > 0) return journey
  const days = Math.max(1, s.workDaysPerWeek)
  return Math.round((s.weeklyLegalHours / days) * 60)
}

function isNightMinute(clockMinute: number, nightStartMin: number, nightEndMin: number): boolean {
  if (nightStartMin === nightEndMin) return false
  if (nightStartMin > nightEndMin) {
    // Franja cruza medianoche, ej. 19:00 → 06:00
    return clockMinute >= nightStartMin || clockMinute < nightEndMin
  }
  return clockMinute >= nightStartMin && clockMinute < nightEndMin
}

const round2 = (n: number) => Math.round(n * 100) / 100

/** Calcula la descomposición de horas y el pago estimado de UNA jornada. */
export function analyzeWorkday(record: WorkdayRecord, settings: Settings): DayCalc {
  const start = timeToMinutes(record.startTime)
  let end = timeToMinutes(record.endTime)
  if (end <= start) end += 1440 // cruza medianoche

  const lunch = Math.max(0, record.lunchMinutes || 0)
  const span = end - start
  const workedMin = Math.max(0, span - Math.min(lunch, span))
  if (workedMin === 0) return EMPTY_CALC

  // Bloque de almuerzo: 12:30 si el turno lo contiene, si no en la mitad
  const preferredLunch = 12 * 60 + 30
  let lunchStart: number
  if (lunch > 0 && start <= preferredLunch && preferredLunch + lunch <= end) {
    lunchStart = preferredLunch
  } else {
    lunchStart = start + Math.floor((span - lunch) / 2)
  }
  const lunchEnd = lunchStart + lunch

  const nightStartMin = timeToMinutes(settings.nightStart)
  const nightEndMin = timeToMinutes(settings.nightEnd)
  const stdMin = record.dayType === 'normal' ? normalDayMinutes(settings) : 0

  let ordinary = 0
  let ordinaryNight = 0
  let extraDay = 0
  let extraNight = 0
  let sundayHoliday = 0
  let counted = 0

  for (let m = start; m < end; m++) {
    if (lunch > 0 && m >= lunchStart && m < lunchEnd) continue
    const night = isNightMinute(m % 1440, nightStartMin, nightEndMin)

    if (record.dayType === 'domingo' || record.dayType === 'festivo') {
      sundayHoliday++
    } else if (counted < stdMin) {
      ordinary++
      if (night) ordinaryNight++
    } else {
      if (night) extraNight++
      else extraDay++
    }
    counted++
  }

  const rate = settings.hourlyRate
  const pay =
    (extraDay / 60) * rate * (1 + settings.overtimeDayPct / 100) +
    (extraNight / 60) * rate * (1 + settings.overtimeNightPct / 100) +
    (sundayHoliday / 60) * rate * (1 + settings.sundayHolidayPct / 100) +
    (ordinaryNight / 60) * rate * (settings.nightSurchargePct / 100)

  return {
    workedHours: round2(workedMin / 60),
    ordinaryHours: round2(ordinary / 60),
    ordinaryNightHours: round2(ordinaryNight / 60),
    extraDayHours: round2(extraDay / 60),
    extraNightHours: round2(extraNight / 60),
    sundayHolidayHours: round2(sundayHoliday / 60),
    extraTotalHours: round2((extraDay + extraNight + sundayHoliday) / 60),
    estimatedExtraPay: Math.round(pay),
  }
}

export interface AggregateCalc {
  days: number
  workedHours: number
  ordinaryHours: number
  ordinaryNightHours: number
  extraDayHours: number
  extraNightHours: number
  sundayHolidayHours: number
  extraTotalHours: number
  estimatedExtraPay: number
  saturdaysWorked: number
  sundaysWorked: number
  holidaysWorked: number
}

/** Suma los cálculos de un conjunto de jornadas. */
export function aggregate(
  records: WorkdayRecord[],
  calcOf: (r: WorkdayRecord) => DayCalc,
): AggregateCalc {
  const acc: AggregateCalc = {
    days: 0,
    workedHours: 0,
    ordinaryHours: 0,
    ordinaryNightHours: 0,
    extraDayHours: 0,
    extraNightHours: 0,
    sundayHolidayHours: 0,
    extraTotalHours: 0,
    estimatedExtraPay: 0,
    saturdaysWorked: 0,
    sundaysWorked: 0,
    holidaysWorked: 0,
  }
  for (const r of records) {
    const c = calcOf(r)
    acc.days++
    acc.workedHours += c.workedHours
    acc.ordinaryHours += c.ordinaryHours
    acc.ordinaryNightHours += c.ordinaryNightHours
    acc.extraDayHours += c.extraDayHours
    acc.extraNightHours += c.extraNightHours
    acc.sundayHolidayHours += c.sundayHolidayHours
    acc.extraTotalHours += c.extraTotalHours
    acc.estimatedExtraPay += c.estimatedExtraPay
    if (r.dayType === 'sabado') acc.saturdaysWorked++
    if (r.dayType === 'domingo') acc.sundaysWorked++
    if (r.dayType === 'festivo') acc.holidaysWorked++
  }
  acc.workedHours = round2(acc.workedHours)
  acc.ordinaryHours = round2(acc.ordinaryHours)
  acc.ordinaryNightHours = round2(acc.ordinaryNightHours)
  acc.extraDayHours = round2(acc.extraDayHours)
  acc.extraNightHours = round2(acc.extraNightHours)
  acc.sundayHolidayHours = round2(acc.sundayHolidayHours)
  acc.extraTotalHours = round2(acc.extraTotalHours)
  return acc
}

/**
 * Exceso sobre la jornada legal semanal: agrupa por semana ISO y calcula
 * cuánto superan las horas trabajadas a la jornada legal configurada.
 */
export function weeklyExcess(
  records: WorkdayRecord[],
  settings: Settings,
  calcOf: (r: WorkdayRecord) => DayCalc,
): { week: string; worked: number; excess: number }[] {
  const byWeek = new Map<string, number>()
  for (const r of records) {
    const key = isoWeekKey(r.date)
    byWeek.set(key, (byWeek.get(key) || 0) + calcOf(r).workedHours)
  }
  return [...byWeek.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([week, worked]) => ({
      week,
      worked: round2(worked),
      excess: round2(Math.max(0, worked - settings.weeklyLegalHours)),
    }))
}

/** Tipo de jornada sugerido para una fecha (el usuario puede cambiarlo). */
export function suggestDayType(dateStr: string, holiday: boolean, dow: number): DayType {
  if (holiday) return 'festivo'
  if (dow === 0) return 'domingo'
  if (dow === 6) return 'sabado'
  return 'normal'
}
