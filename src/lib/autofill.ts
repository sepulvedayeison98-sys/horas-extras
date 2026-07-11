/**
 * Autocompletado de jornadas normales. Un día lunes-viernes sin festivo se
 * asume "cumplido" con el horario habitual del usuario; solo se rellena a
 * mano lo que se sale de eso (extras, sábado, domingo, festivo, o un día que
 * no se trabajó — el usuario lo edita/borra).
 *
 * No hace retroactividad ilimitada: la primera vez que se usa la app solo
 * completa el día de hoy (nunca inventa historial previo a instalarla), y en
 * usos posteriores rellena desde la última vez que se abrió, con un tope
 * máximo de días hacia atrás para evitar una avalancha de registros si el
 * dispositivo estuvo mucho tiempo sin abrirse.
 */
import type { Settings, WorkdayRecord } from './types'
import { addDays, dayOfWeek } from './dates'
import { isHoliday } from './festivos'
import { newId } from './storage'

const MAX_BACKFILL_DAYS = 45

export interface AutoFillResult {
  records: WorkdayRecord[]
  newAnchor: string
}

function isNormalWeekday(dateStr: string): boolean {
  const dow = dayOfWeek(dateStr)
  return dow >= 1 && dow <= 5 && !isHoliday(dateStr)
}

/**
 * Calcula qué registros "normales" faltan entre el ancla guardada y hoy.
 * @param existingDates fechas (YYYY-MM-DD) que ya tienen registro
 */
export function computeAutoFill(
  existingDates: ReadonlySet<string>,
  settings: Settings,
  anchor: string | undefined,
  today: string,
): AutoFillResult {
  if (!settings.autoFillEnabled) return { records: [], newAnchor: today }
  if (anchor && anchor >= today) return { records: [], newAnchor: anchor }

  let from = anchor ? addDays(anchor, 1) : today
  const cap = addDays(today, -MAX_BACKFILL_DAYS)
  if (from < cap) from = cap

  const records: WorkdayRecord[] = []
  for (let d = from; d <= today; d = addDays(d, 1)) {
    if (isNormalWeekday(d) && !existingDates.has(d)) {
      records.push({
        id: newId(),
        date: d,
        startTime: settings.defaultStart,
        endTime: settings.defaultEnd,
        lunchMinutes: settings.defaultLunchMinutes,
        dayType: 'normal',
        auto: true,
      })
    }
  }
  return { records, newAnchor: today }
}
