/**
 * Módulo 5: Calendario mensual interactivo.
 * Colores: verde = normal, amarillo = extras, naranja = >2h extra, rojo = >4h extra.
 * Tocar un día abre el detalle completo.
 */
import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Pencil } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { DAY_TYPE_LABELS, type WorkdayRecord } from '@/lib/types'
import { formatCOP, formatHours } from '@/lib/format'
import { formatDateLong, lastDayOfMonth, monthLabel, pad2, todayStr } from '@/lib/dates'
import { isHoliday } from '@/lib/festivos'

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

interface Props {
  onEdit: (r: WorkdayRecord) => void
}

export function CalendarView({ onEdit }: Props) {
  const { records, calcOf } = useApp()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [selected, setSelected] = useState<string | null>(null)

  const byDate = useMemo(() => {
    const map = new Map<string, WorkdayRecord[]>()
    for (const r of records) {
      const list = map.get(r.date) ?? []
      list.push(r)
      map.set(r.date, list)
    }
    return map
  }, [records])

  function move(delta: number) {
    let m = month + delta
    let y = year
    if (m < 1) { m = 12; y-- }
    if (m > 12) { m = 1; y++ }
    setMonth(m)
    setYear(y)
  }

  const days = lastDayOfMonth(year, month)
  const firstDow = new Date(year, month - 1, 1).getDay() // 0=domingo
  const leadingBlanks = (firstDow + 6) % 7 // semana inicia en lunes
  const today = todayStr()

  function colorFor(dateStr: string): string {
    const recs = byDate.get(dateStr)
    if (!recs || recs.length === 0) return ''
    const extra = recs.reduce((s, r) => s + calcOf(r).extraTotalHours, 0)
    if (extra > 4) return 'bg-red-500 text-white'
    if (extra > 2) return 'bg-orange-500 text-white'
    if (extra > 0) return 'bg-amber-400 text-amber-950'
    return 'bg-emerald-500 text-white'
  }

  const selectedRecords = selected ? (byDate.get(selected) ?? []) : []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button size="icon" variant="outline" aria-label="Mes anterior" onClick={() => move(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <p className="text-sm font-semibold capitalize">{monthLabel(year, month)}</p>
        <Button size="icon" variant="outline" aria-label="Mes siguiente" onClick={() => move(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <Card>
        <CardContent className="p-3">
          <div className="grid grid-cols-7 gap-1.5 text-center">
            {WEEKDAYS.map((d) => (
              <span key={d} className="py-1 text-[11px] font-semibold text-muted-foreground">
                {d}
              </span>
            ))}
            {Array.from({ length: leadingBlanks }).map((_, i) => (
              <span key={`b${i}`} />
            ))}
            {Array.from({ length: days }).map((_, i) => {
              const day = i + 1
              const dateStr = `${year}-${pad2(month)}-${pad2(day)}`
              const color = colorFor(dateStr)
              const holiday = isHoliday(dateStr)
              const isToday = dateStr === today
              return (
                <button
                  key={day}
                  onClick={() => setSelected(dateStr)}
                  className={`relative flex aspect-square items-center justify-center rounded-xl text-sm font-medium transition-transform active:scale-95 ${
                    color || 'text-foreground hover:bg-muted'
                  } ${isToday && !color ? 'ring-2 ring-primary' : ''} ${isToday && color ? 'ring-2 ring-foreground/40' : ''}`}
                >
                  {day}
                  {holiday && <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-rose-500" />}
                </button>
              )
            })}
          </div>

          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Normal</span>
            <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-amber-400" /> Con extras</span>
            <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-orange-500" /> &gt;2 h extra</span>
            <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-red-500" /> &gt;4 h extra</span>
            <span className="flex items-center gap-1.5"><i className="h-1.5 w-1.5 rounded-full bg-rose-500" /> Festivo</span>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? formatDateLong(selected) : ''}
      >
        {selectedRecords.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Sin registro para este día.
            {selected && isHoliday(selected) && ' Es festivo en Colombia.'}
          </p>
        ) : (
          <div className="space-y-3">
            {selectedRecords.map((r) => {
              const c = calcOf(r)
              return (
                <div key={r.id} className="rounded-2xl border border-border p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <Badge variant={r.dayType === 'normal' ? 'muted' : 'danger'}>{DAY_TYPE_LABELS[r.dayType]}</Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelected(null)
                        onEdit(r)
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </Button>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p className="flex justify-between"><span className="text-muted-foreground">Horario</span><b>{r.startTime} – {r.endTime}</b></p>
                    <p className="flex justify-between"><span className="text-muted-foreground">Almuerzo</span><b>{r.lunchMinutes} min</b></p>
                    <p className="flex justify-between"><span className="text-muted-foreground">Trabajadas</span><b>{formatHours(c.workedHours)}</b></p>
                    <p className="flex justify-between"><span className="text-muted-foreground">Ordinarias</span><b>{formatHours(c.ordinaryHours)}</b></p>
                    <p className="flex justify-between"><span className="text-muted-foreground">Extra diurna</span><b>{formatHours(c.extraDayHours)}</b></p>
                    <p className="flex justify-between"><span className="text-muted-foreground">Extra nocturna</span><b>{formatHours(c.extraNightHours)}</b></p>
                    <p className="flex justify-between"><span className="text-muted-foreground">Dominical/Festiva</span><b>{formatHours(c.sundayHolidayHours)}</b></p>
                    <p className="flex justify-between border-t border-border/60 pt-1.5"><span className="text-muted-foreground">Extra estimado</span><b className="text-emerald-600 dark:text-emerald-400">{formatCOP(c.estimatedExtraPay)}</b></p>
                  </div>
                  {r.notes && <p className="mt-2 rounded-lg bg-muted px-2.5 py-1.5 text-xs text-muted-foreground">{r.notes}</p>}
                </div>
              )
            })}
          </div>
        )}
      </Dialog>
    </div>
  )
}
