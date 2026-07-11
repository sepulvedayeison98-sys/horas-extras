/**
 * Estado global de la app: registros, pagos y configuración.
 * Se persiste automáticamente en LocalStorage en cada cambio.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { AppData, PaymentRecord, Settings, WorkdayRecord } from '@/lib/types'
import { loadData, newId, saveData } from '@/lib/storage'
import { analyzeWorkday, EMPTY_CALC, type DayCalc } from '@/lib/calculations'
import { computeAutoFill } from '@/lib/autofill'
import { todayStr } from '@/lib/dates'

interface AppContextValue {
  records: WorkdayRecord[]
  payments: Record<string, PaymentRecord>
  settings: Settings
  /** Cálculo memoizado por registro */
  calcOf: (r: WorkdayRecord) => DayCalc
  addRecord: (r: Omit<WorkdayRecord, 'id'>) => void
  updateRecord: (r: WorkdayRecord) => void
  deleteRecord: (id: string) => void
  updateSettings: (patch: Partial<Settings>) => void
  setPayment: (p: PaymentRecord) => void
  clearPayment: (periodKey: string) => void
  data: AppData
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => loadData())

  // Persistencia automática
  useEffect(() => {
    saveData(data)
  }, [data])

  // Modo oscuro: clase en <html>
  useEffect(() => {
    document.documentElement.classList.toggle('dark', data.settings.darkMode)
  }, [data.settings.darkMode])

  // Autocompletado de jornadas normales (lunes-viernes sin festivo): se
  // ejecuta una sola vez por apertura de la app.
  const autoFillRan = useRef(false)
  useEffect(() => {
    if (autoFillRan.current) return
    autoFillRan.current = true
    setData((d) => {
      const existingDates = new Set(d.records.map((r) => r.date))
      const { records, newAnchor } = computeAutoFill(existingDates, d.settings, d.autoFillAnchor, todayStr())
      if (records.length === 0 && newAnchor === d.autoFillAnchor) return d
      return { ...d, records: [...d.records, ...records], autoFillAnchor: newAnchor }
    })
  }, [])

  // Caché de cálculos: se invalida cuando cambia la configuración
  const calcCache = useRef(new Map<string, DayCalc>())
  const settingsRef = useRef(data.settings)
  if (settingsRef.current !== data.settings) {
    settingsRef.current = data.settings
    calcCache.current.clear()
  }

  const calcOf = useCallback(
    (r: WorkdayRecord): DayCalc => {
      if (!r) return EMPTY_CALC
      const key = `${r.id}|${r.date}|${r.startTime}|${r.endTime}|${r.lunchMinutes}|${r.dayType}`
      const cached = calcCache.current.get(key)
      if (cached) return cached
      const result = analyzeWorkday(r, settingsRef.current)
      calcCache.current.set(key, result)
      return result
    },
    [data.settings],
  )

  const addRecord = useCallback((r: Omit<WorkdayRecord, 'id'>) => {
    setData((d) => ({ ...d, records: [...d.records, { ...r, id: newId() }] }))
  }, [])

  const updateRecord = useCallback((r: WorkdayRecord) => {
    setData((d) => ({ ...d, records: d.records.map((x) => (x.id === r.id ? r : x)) }))
  }, [])

  const deleteRecord = useCallback((id: string) => {
    setData((d) => ({ ...d, records: d.records.filter((x) => x.id !== id) }))
  }, [])

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setData((d) => ({ ...d, settings: { ...d.settings, ...patch } }))
  }, [])

  const setPayment = useCallback((p: PaymentRecord) => {
    setData((d) => ({ ...d, payments: { ...d.payments, [p.periodKey]: p } }))
  }, [])

  const clearPayment = useCallback((periodKey: string) => {
    setData((d) => {
      const payments = { ...d.payments }
      delete payments[periodKey]
      return { ...d, payments }
    })
  }, [])

  const value = useMemo<AppContextValue>(
    () => ({
      records: data.records,
      payments: data.payments,
      settings: data.settings,
      calcOf,
      addRecord,
      updateRecord,
      deleteRecord,
      updateSettings,
      setPayment,
      clearPayment,
      data,
    }),
    [data, calcOf, addRecord, updateRecord, deleteRecord, updateSettings, setPayment, clearPayment],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp debe usarse dentro de <AppProvider>')
  return ctx
}
