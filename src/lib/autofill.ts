/**
 * Autocompletado de jornadas normales. Un día lunes-viernes sin festivo se
 * asume "cumplido" con el horario habitual del usuario; solo se rellena a
 * mano lo que se sale de eso (extras, sábado, domingo, festivo, o un día que
 * no se trabajó — el usuario lo edita/borra).
 *
 * Estrategia:
 *  - Primera vez (o cuando aún no hay ningún registro): rellena desde el
 *    INICIO DE LA QUINCENA ACTUAL hasta hoy, para que las horas ordinarias
 *    del período se vean de inmediato sin tener que registrar nada.
 *  - Aperturas siguientes: continúa desde la última vez que se abrió (ancla),
 *    con un tope máximo de días hacia atrás para evitar una avalancha de
 *    registros si el dispositivo estuvo mucho tiempo sin abrirse.
 *  - Nunca duplica un día que ya exista, y respeta los que el usuario haya
 *    editado o borrado (el ancla evita "revivir" días pasados).
 */
import type { Settings, WorkdayRecord } from './types'
import { addDays, dayOfWeek } from './dates'
import { isHoliday } from './festivos'
import { periodOfDate } from './quincena'
import { newId } from './storage'

const MAX_BACKFILL_DAYS = 45

export interface AutoFillResult {
  records: WorkdayRecord[]
  newAnchor: string | undefined
}

function isNormalWeekday(dateStr: string): boolean {
  const dow = dayOfWeek(dateStr)
  return dow >= 1 && dow <= 5 && !isHoliday(dateStr)
}

/**
 * Calcula qué registros "normales" faltan hasta hoy.
 * @param existingDates fechas (YYYY-MM-DD) que ya tienen registro
 */
export function computeAutoFill(
  existingDates: ReadonlySet<string>,
  settings: Settings,
  anchor: string | undefined,
  today: string,
): AutoFillResult {
  if (!settings.autoFillEnabled) return { records: [], newAnchor: anchor }

  // Sin ancla útil (primer uso) o app vacía → arrancar en el inicio de la
  // quincena actual. Si ya hay historial, continuar desde el ancla.
  const periodStart = periodOfDate(today).startDate
  const freshStart = !anchor || existingDates.size === 0
  let from = freshStart ? periodStart : addDays(anchor!, 1)

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

  // El ancla nunca retrocede.
  const newAnchor = anchor && anchor > today ? anchor : today
  return { records, newAnchor }
}
