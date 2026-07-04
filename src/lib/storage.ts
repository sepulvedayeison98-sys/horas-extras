/**
 * Persistencia local en LocalStorage con clave versionada.
 * Sin backend: todos los datos viven en el dispositivo.
 */
import { DEFAULT_SETTINGS, type AppData } from './types'

const STORAGE_KEY = 'horas-extras-dashboard-v1'

export function loadData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyData()
    const parsed = JSON.parse(raw) as Partial<AppData>
    return {
      records: Array.isArray(parsed.records) ? parsed.records : [],
      payments: parsed.payments && typeof parsed.payments === 'object' ? parsed.payments : {},
      // Merge con defaults: si se agregan campos nuevos en futuras versiones, no se pierden datos
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
    }
  } catch {
    return emptyData()
  }
}

export function saveData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function emptyData(): AppData {
  return { records: [], payments: {}, settings: { ...DEFAULT_SETTINGS } }
}

/** Respaldo completo como JSON descargable */
export function exportBackup(data: AppData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `horas-extras-respaldo-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}
