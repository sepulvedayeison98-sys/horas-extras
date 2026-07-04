/** Tipos centrales de la aplicación. */

export type DayType = 'normal' | 'sabado' | 'domingo' | 'festivo'

export interface WorkdayRecord {
  id: string
  /** Fecha local en formato YYYY-MM-DD */
  date: string
  /** Hora de ingreso HH:mm */
  startTime: string
  /** Hora de salida HH:mm (si es menor que ingreso, se asume que cruza medianoche) */
  endTime: string
  /** Minutos de almuerzo/descanso no remunerado */
  lunchMinutes: number
  dayType: DayType
  notes?: string
}

export type PaymentStatus = 'pendiente' | 'pagada'

export interface PaymentRecord {
  /** Clave del período, ej. "2026-07-Q1" */
  periodKey: string
  status: PaymentStatus
  /** Fecha real de pago YYYY-MM-DD */
  paidDate?: string
  /** Valor realmente pagado (COP) */
  paidAmount?: number
  notes?: string
}

export interface Settings {
  userName: string
  /**
   * Jornada legal semanal en horas. NO está fija en código porque en Colombia
   * se reduce gradualmente (Ley 2101 de 2021): cada 15 de julio puede cambiar.
   * Editable desde Configuración.
   */
  weeklyLegalHours: number
  /** Días laborales por semana usados para derivar la jornada diaria estándar */
  workDaysPerWeek: number
  defaultStart: string
  defaultEnd: string
  defaultLunchMinutes: number
  /** Valor hora ordinaria (COP) */
  hourlyRate: number
  /** Recargo hora extra diurna, % (ej. 25) */
  overtimeDayPct: number
  /** Recargo hora extra nocturna, % (ej. 75) */
  overtimeNightPct: number
  /** Recargo nocturno sobre hora ordinaria, % (ej. 35) */
  nightSurchargePct: number
  /** Recargo dominical/festivo, % (ej. 90). Ley 2466/2025 lo sube por fases:
   * 75% (hasta jun-2025) → 80% (jul-2025) → 90% (jul-2026) → 100% (jul-2027) */
  sundayHolidayPct: number
  /** Inicio de jornada nocturna HH:mm (editable: la reforma laboral la cambió a 19:00) */
  nightStart: string
  /** Fin de jornada nocturna HH:mm */
  nightEnd: string
  darkMode: boolean
}

export interface AppData {
  records: WorkdayRecord[]
  /** Pagos indexados por periodKey */
  payments: Record<string, PaymentRecord>
  settings: Settings
}

export const DEFAULT_SETTINGS: Settings = {
  userName: '',
  // Julio 2026: 44 h hasta el 14 de julio; 42 h desde el 15 de julio de 2026 (Ley 2101/2021).
  weeklyLegalHours: 44,
  workDaysPerWeek: 5,
  defaultStart: '08:00',
  defaultEnd: '18:00',
  defaultLunchMinutes: 60,
  hourlyRate: 12000,
  overtimeDayPct: 25,
  overtimeNightPct: 75,
  nightSurchargePct: 35,
  // Vigente desde el 1 de julio de 2026 (Ley 2466/2025). Editable en Configuración.
  sundayHolidayPct: 90,
  nightStart: '19:00',
  nightEnd: '06:00',
  darkMode: true,
}

export const DAY_TYPE_LABELS: Record<DayType, string> = {
  normal: 'Laboral normal',
  sabado: 'Sábado',
  domingo: 'Domingo',
  festivo: 'Festivo',
}
