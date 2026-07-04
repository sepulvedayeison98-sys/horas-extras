/**
 * Módulos 8 y 9: Configuración editable (jornada legal, valores, recargos)
 * y resumen financiero. Incluye respaldo/restauración de datos.
 */
import { useRef, useState } from 'react'
import { Download, Moon, Save, Sun, Trash2, Upload } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { AppData, Settings } from '@/lib/types'
import { exportBackup, saveData } from '@/lib/storage'
import { normalDayMinutes } from '@/lib/calculations'

export function SettingsView() {
  const { settings, updateSettings, data } = useApp()
  const [form, setForm] = useState<Settings>(settings)
  const [flash, setFlash] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function set<K extends keyof Settings>(key: K, value: Settings[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function num(key: keyof Settings, value: string) {
    set(key, (Number(value) || 0) as Settings[typeof key])
  }

  // Jornada habitual (umbral de extras) derivada del horario en edición
  const normalHoursLabel = (normalDayMinutes(form) / 60).toLocaleString('es-CO', { maximumFractionDigits: 2 })

  function handleSave() {
    updateSettings(form)
    setFlash(true)
    setTimeout(() => setFlash(false), 2500)
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const imported = JSON.parse(String(reader.result)) as AppData
        if (!Array.isArray(imported.records)) throw new Error('formato inválido')
        saveData(imported)
        alert('Datos restaurados. La app se recargará.')
        location.reload()
      } catch {
        alert('El archivo no es un respaldo válido.')
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="space-y-4">
      {/* Apariencia */}
      <Card>
        <CardHeader>
          <CardTitle>Apariencia</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              variant={form.darkMode ? 'default' : 'outline'}
              className="flex-1"
              onClick={() => { set('darkMode', true); updateSettings({ darkMode: true }) }}
            >
              <Moon className="h-4 w-4" /> Oscuro
            </Button>
            <Button
              variant={!form.darkMode ? 'default' : 'outline'}
              className="flex-1"
              onClick={() => { set('darkMode', false); updateSettings({ darkMode: false }) }}
            >
              <Sun className="h-4 w-4" /> Claro
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Perfil y jornada */}
      <Card>
        <CardHeader>
          <CardTitle>Perfil y jornada</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="s-name">Nombre</Label>
            <Input id="s-name" value={form.userName} onChange={(e) => set('userName', e.target.value)} placeholder="Tu nombre" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="s-weekly">Jornada legal semanal (h)</Label>
              <Input id="s-weekly" type="number" inputMode="decimal" value={form.weeklyLegalHours} onChange={(e) => num('weeklyLegalHours', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="s-days">Días laborales/semana</Label>
              <Input id="s-days" type="number" inputMode="numeric" value={form.workDaysPerWeek} onChange={(e) => num('workDaysPerWeek', e.target.value)} />
            </div>
          </div>
          <p className="rounded-lg bg-muted px-3 py-2 text-[11px] text-muted-foreground">
            Tu jornada habitual (ingreso→salida − almuerzo) es <b>{normalHoursLabel} h</b>: dentro de ella un día
            normal NO genera extras; solo cuenta extra lo que trabajes de más. La <b>jornada legal semanal</b> se
            usa aparte para avisar cuándo tu semana supera el límite legal (Ley 2101/2021 la baja a 42 h desde
            jul-2026; ajústala aquí cada 15 de julio).
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="s-start">Ingreso habitual</Label>
              <Input id="s-start" type="time" value={form.defaultStart} onChange={(e) => set('defaultStart', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="s-end">Salida habitual</Label>
              <Input id="s-end" type="time" value={form.defaultEnd} onChange={(e) => set('defaultEnd', e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="s-lunch">Almuerzo por defecto (min)</Label>
            <Input id="s-lunch" type="number" inputMode="numeric" value={form.defaultLunchMinutes} onChange={(e) => num('defaultLunchMinutes', e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Valores y recargos */}
      <Card>
        <CardHeader>
          <CardTitle>Valores y recargos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="s-rate">Valor hora ordinaria (COP)</Label>
            <Input id="s-rate" type="number" inputMode="numeric" value={form.hourlyRate} onChange={(e) => num('hourlyRate', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="s-otd">Recargo extra diurna (%)</Label>
              <Input id="s-otd" type="number" inputMode="decimal" value={form.overtimeDayPct} onChange={(e) => num('overtimeDayPct', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="s-otn">Recargo extra nocturna (%)</Label>
              <Input id="s-otn" type="number" inputMode="decimal" value={form.overtimeNightPct} onChange={(e) => num('overtimeNightPct', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="s-night">Recargo nocturno (%)</Label>
              <Input id="s-night" type="number" inputMode="decimal" value={form.nightSurchargePct} onChange={(e) => num('nightSurchargePct', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="s-sun">Recargo dom./festivo (%)</Label>
              <Input id="s-sun" type="number" inputMode="decimal" value={form.sundayHolidayPct} onChange={(e) => num('sundayHolidayPct', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="s-nstart">Inicio nocturno</Label>
              <Input id="s-nstart" type="time" value={form.nightStart} onChange={(e) => set('nightStart', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="s-nend">Fin nocturno</Label>
              <Input id="s-nend" type="time" value={form.nightEnd} onChange={(e) => set('nightEnd', e.target.value)} />
            </div>
          </div>
          <p className="rounded-lg bg-muted px-3 py-2 text-[11px] text-muted-foreground">
            Valores de referencia en Colombia (jul-2026): extra diurna +25%, extra nocturna +75%, recargo
            nocturno +35%, dominical/festivo +90% (Ley 2466/2025: sube a 100% en jul-2027). Inicio nocturno
            a las 19:00. Ajusta según tu caso.
          </p>
        </CardContent>
      </Card>

      <Button size="lg" className="w-full" onClick={handleSave}>
        <Save className="h-5 w-5" /> Guardar configuración
      </Button>
      {flash && <p className="text-center text-xs font-medium text-emerald-600 dark:text-emerald-400">Configuración guardada</p>}

      {/* Respaldo de datos */}
      <Card>
        <CardHeader>
          <CardTitle>Datos y respaldo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Tus datos viven solo en este dispositivo. Haz respaldos periódicos para no perderlos.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => exportBackup(data)}>
              <Download className="h-4 w-4" /> Exportar respaldo
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4" /> Restaurar
            </Button>
            <input ref={fileRef} type="file" accept="application/json" hidden onChange={handleImport} />
          </div>
          <Button
            variant="destructive"
            className="w-full"
            onClick={() => {
              if (confirm('¿Borrar TODOS los datos? Esta acción no se puede deshacer.')) {
                localStorage.clear()
                location.reload()
              }
            }}
          >
            <Trash2 className="h-4 w-4" /> Borrar todos los datos
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
