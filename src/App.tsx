/**
 * Shell de la aplicación: navegación inferior fija (óptima para móvil) y
 * enrutamiento por estado. El registro en edición se eleva aquí para poder
 * editar desde el calendario o el histórico y saltar a la pestaña de registro.
 */
import { lazy, Suspense, useCallback, useState } from 'react'
import {
  CalendarDays,
  Clock3,
  Download,
  LayoutDashboard,
  PlusCircle,
  Settings as SettingsIcon,
  Table2,
  Wallet,
} from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { DashboardView } from '@/components/DashboardView'
import { RegisterView } from '@/components/RegisterView'
import { QuincenaView } from '@/components/QuincenaView'
import { CalendarView } from '@/components/CalendarView'
import { HistoryView } from '@/components/HistoryView'
import { SettingsView } from '@/components/SettingsView'
import type { WorkdayRecord } from '@/lib/types'

// Vistas pesadas cargadas de forma diferida (Recharts / generadores de archivos)
const StatsView = lazy(() => import('@/components/StatsView').then((m) => ({ default: m.StatsView })))
const ExportView = lazy(() => import('@/components/ExportView').then((m) => ({ default: m.ExportView })))
import { cn } from '@/lib/utils'

type Tab = 'dashboard' | 'registro' | 'quincena' | 'calendario' | 'historico' | 'stats' | 'export' | 'config'

const PRIMARY_TABS: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
  { id: 'quincena', label: 'Quincena', icon: Wallet },
  { id: 'registro', label: 'Registrar', icon: PlusCircle },
  { id: 'calendario', label: 'Calendario', icon: CalendarDays },
  { id: 'historico', label: 'Histórico', icon: Table2 },
]

const SECONDARY_TABS: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'stats', label: 'Estadísticas', icon: Clock3 },
  { id: 'export', label: 'Exportar', icon: Download },
  { id: 'config', label: 'Configuración', icon: SettingsIcon },
]

const TAB_TITLES: Record<Tab, string> = {
  dashboard: 'Dashboard',
  registro: 'Registrar jornada',
  quincena: 'Control quincenal',
  calendario: 'Calendario',
  historico: 'Histórico',
  stats: 'Estadísticas',
  export: 'Exportar',
  config: 'Configuración',
}

export default function App() {
  const { settings } = useApp()
  const [tab, setTab] = useState<Tab>('dashboard')
  const [editing, setEditing] = useState<WorkdayRecord | null>(null)

  const startEdit = useCallback((r: WorkdayRecord) => {
    setEditing(r)
    setTab('registro')
    window.scrollTo({ top: 0 })
  }, [])

  const go = useCallback((t: Tab) => {
    if (t !== 'registro') setEditing(null)
    setTab(t)
    window.scrollTo({ top: 0 })
  }, [])

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 px-4 py-3 backdrop-blur-lg pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-tight">{TAB_TITLES[tab]}</h1>
            {settings.userName && tab === 'dashboard' && (
              <p className="text-xs text-muted-foreground">Hola, {settings.userName} 👋</p>
            )}
          </div>
          {/* Accesos secundarios */}
          <nav className="flex items-center gap-1">
            {SECONDARY_TABS.map((t) => {
              const Icon = t.icon
              return (
                <button
                  key={t.id}
                  onClick={() => go(t.id)}
                  aria-label={t.label}
                  className={cn(
                    'rounded-xl p-2 transition-colors',
                    tab === t.id ? 'bg-primary/12 text-primary' : 'text-muted-foreground hover:bg-muted',
                  )}
                >
                  <Icon className="h-5 w-5" />
                </button>
              )
            })}
          </nav>
        </div>
      </header>

      {/* Contenido */}
      <main className="flex-1 px-4 py-4 pb-28">
        {tab === 'dashboard' && <DashboardView />}
        {tab === 'registro' && <RegisterView editing={editing} onEdit={startEdit} onDoneEditing={() => setEditing(null)} />}
        {tab === 'quincena' && <QuincenaView />}
        {tab === 'calendario' && <CalendarView onEdit={startEdit} />}
        {tab === 'historico' && <HistoryView onEdit={startEdit} />}
        {tab === 'stats' && (
          <Suspense fallback={<p className="py-10 text-center text-sm text-muted-foreground">Cargando gráficos…</p>}>
            <StatsView />
          </Suspense>
        )}
        {tab === 'export' && (
          <Suspense fallback={<p className="py-10 text-center text-sm text-muted-foreground">Cargando…</p>}>
            <ExportView />
          </Suspense>
        )}
        {tab === 'config' && <SettingsView />}
      </main>

      {/* Navegación inferior */}
      <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-lg border-t border-border/70 bg-background/90 backdrop-blur-lg pb-[env(safe-area-inset-bottom)]">
        <div className="grid grid-cols-5">
          {PRIMARY_TABS.map((t) => {
            const Icon = t.icon
            const active = tab === t.id
            const isRegister = t.id === 'registro'
            return (
              <button
                key={t.id}
                onClick={() => go(t.id)}
                className="flex flex-col items-center gap-0.5 py-2.5 transition-colors"
              >
                <span
                  className={cn(
                    'flex items-center justify-center rounded-xl transition-all',
                    isRegister ? 'h-11 w-11 -mt-4 bg-primary text-primary-foreground shadow-lg' : 'h-6 w-6',
                    !isRegister && active ? 'text-primary' : !isRegister ? 'text-muted-foreground' : '',
                  )}
                >
                  <Icon className={isRegister ? 'h-6 w-6' : 'h-5 w-5'} />
                </span>
                <span className={cn('text-[10px] font-medium', active ? 'text-primary' : 'text-muted-foreground')}>
                  {t.label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
