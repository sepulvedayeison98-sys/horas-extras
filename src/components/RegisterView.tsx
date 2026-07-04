/**
 * Módulo 1: Registro de jornadas — formulario simple con valores por defecto
 * desde Configuración y detección automática de sábado/domingo/festivo.
 */
import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Pencil, Sparkles, Trash2 } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { DAY_TYPE_LABELS, type DayType, type WorkdayRecord } from '@/lib/types'
import { analyzeWorkday, suggestDayType } from '@/lib/calculations'
import { dayOfWeek, formatDateShort, todayStr } from '@/lib/dates'
import { isHoliday } from '@/lib/festivos'
import { formatCOP, formatHours } from '@/lib/format'

interface Props {
  editing: WorkdayRecord | null
  onEdit: (r: WorkdayRecord) => void
  onDoneEditing: () => void
}

export function RegisterView({ editing, onEdit, onDoneEditing }: Props) {
  const { records, settings, calcOf, addRecord, updateRecord, deleteRecord } = useApp()

  const [date, setDate] = useState(todayStr())
  const [startTime, setStartTime] = useState(settings.defaultStart)
  const [endTime, setEndTime] = useState(settings.defaultEnd)
  const [lunch, setLunch] = useState(String(settings.defaultLunchMinutes))
  const [dayType, setDayType] = useState<DayType>('normal')
  const [notes, setNotes] = useState('')
  const [savedFlash, setSavedFlash] = useState(false)

  // Cargar registro en edición
  useEffect(() => {
    if (!editing) return
    setDate(editing.date)
    setStartTime(editing.startTime)
    setEndTime(editing.endTime)
    setLunch(String(editing.lunchMinutes))
    setDayType(editing.dayType)
    setNotes(editing.notes ?? '')
  }, [editing])

  // Sugerir tipo de jornada al cambiar la fecha (solo cuando no se edita)
  useEffect(() => {
    if (editing) return
    setDayType(suggestDayType(date, isHoliday(date), dayOfWeek(date)))
  }, [date, editing])

  const preview = useMemo(() => {
    const draft: WorkdayRecord = {
      id: 'preview',
      date,
      startTime,
      endTime,
      lunchMinutes: Number(lunch) || 0,
      dayType,
    }
    return analyzeWorkday(draft, settings)
  }, [date, startTime, endTime, lunch, dayType, settings])

  const existsForDate = records.some((r) => r.date === date && r.id !== editing?.id)

  function resetForm() {
    setDate(todayStr())
    setStartTime(settings.defaultStart)
    setEndTime(settings.defaultEnd)
    setLunch(String(settings.defaultLunchMinutes))
    setNotes('')
  }

  function handleSave() {
    const payload = {
      date,
      startTime,
      endTime,
      lunchMinutes: Number(lunch) || 0,
      dayType,
      notes: notes.trim() || undefined,
    }
    if (editing) {
      updateRecord({ ...payload, id: editing.id })
      onDoneEditing()
    } else {
      addRecord(payload)
    }
    resetForm()
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 2500)
  }

  const recent = useMemo(
    () => [...records].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8),
    [records],
  )

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{editing ? 'Editar jornada' : 'Registrar jornada'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="f-date">Fecha</Label>
            <Input id="f-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            {isHoliday(date) && (
              <p className="mt-1 text-[11px] font-medium text-rose-500">
                <Sparkles className="mr-1 inline h-3 w-3" />
                Este día es festivo en Colombia
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="f-start">Hora de ingreso</Label>
              <Input id="f-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="f-end">Hora de salida</Label>
              <Input id="f-end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="f-lunch">Almuerzo (minutos)</Label>
              <Input
                id="f-lunch"
                type="number"
                inputMode="numeric"
                min={0}
                step={15}
                value={lunch}
                onChange={(e) => setLunch(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="f-type">Tipo de jornada</Label>
              <Select id="f-type" value={dayType} onChange={(e) => setDayType(e.target.value as DayType)}>
                {(Object.keys(DAY_TYPE_LABELS) as DayType[]).map((t) => (
                  <option key={t} value={t}>
                    {DAY_TYPE_LABELS[t]}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="f-notes">Observaciones</Label>
            <Textarea
              id="f-notes"
              placeholder="Cierre de mes, inventario, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Vista previa del cálculo antes de guardar */}
          <div className="rounded-2xl bg-muted/60 p-3 text-xs">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span>
                Trabajadas: <b>{formatHours(preview.workedHours)}</b>
              </span>
              <span>
                Extras: <b>{formatHours(preview.extraTotalHours)}</b>
              </span>
              <span className="text-emerald-600 dark:text-emerald-400">
                Extra estimado: <b>{formatCOP(preview.estimatedExtraPay)}</b>
              </span>
            </div>
          </div>

          {existsForDate && (
            <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
              Ya existe un registro para esta fecha. Se guardará como registro adicional.
            </p>
          )}

          <div className="flex gap-2">
            <Button size="lg" className="flex-1" onClick={handleSave}>
              {editing ? 'Actualizar jornada' : 'Guardar jornada'}
            </Button>
            {editing && (
              <Button size="lg" variant="outline" onClick={() => { onDoneEditing(); resetForm() }}>
                Cancelar
              </Button>
            )}
          </div>
          {savedFlash && (
            <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" /> Jornada guardada correctamente
            </p>
          )}
        </CardContent>
      </Card>

      {recent.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Registros recientes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {recent.map((r) => {
              const c = calcOf(r)
              return (
                <div key={r.id} className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{formatDateShort(r.date)}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {r.startTime}–{r.endTime} · {formatHours(c.workedHours)}
                      {c.extraTotalHours > 0 && (
                        <span className="ml-1 font-semibold text-amber-600 dark:text-amber-400">
                          +{formatHours(c.extraTotalHours)} extra
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {r.dayType !== 'normal' && <Badge variant="muted">{DAY_TYPE_LABELS[r.dayType]}</Badge>}
                    <Button size="icon" variant="ghost" aria-label="Editar" onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); onEdit(r) }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Eliminar"
                      onClick={() => {
                        if (confirm(`¿Eliminar el registro del ${formatDateShort(r.date)}?`)) deleteRecord(r.id)
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
