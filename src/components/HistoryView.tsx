/**
 * Módulo 6: Histórico — tabla de registros con filtros por mes, año y
 * quincena, buscador y estado de pago.
 */
import { useMemo, useState } from 'react'
import { Pencil, Search, Trash2 } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { DAY_TYPE_LABELS, type WorkdayRecord } from '@/lib/types'
import { formatCOP, formatHours } from '@/lib/format'
import { formatDateShort, pad2 } from '@/lib/dates'
import { periodOfDate } from '@/lib/quincena'

interface Props {
  onEdit: (r: WorkdayRecord) => void
}

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

export function HistoryView({ onEdit }: Props) {
  const { records, payments, calcOf, deleteRecord } = useApp()
  const [year, setYear] = useState('all')
  const [month, setMonth] = useState('all')
  const [half, setHalf] = useState('all')
  const [query, setQuery] = useState('')

  const years = useMemo(
    () => [...new Set(records.map((r) => r.date.slice(0, 4)))].sort().reverse(),
    [records],
  )

  const filtered = useMemo(() => {
    return [...records]
      .filter((r) => {
        if (year !== 'all' && !r.date.startsWith(year)) return false
        if (month !== 'all' && r.date.slice(5, 7) !== month) return false
        if (half !== 'all') {
          const day = Number(r.date.slice(8, 10))
          if (half === '1' && day > 15) return false
          if (half === '2' && day <= 15) return false
        }
        if (query.trim()) {
          const q = query.trim().toLowerCase()
          const hay = `${r.date} ${r.notes ?? ''} ${DAY_TYPE_LABELS[r.dayType]}`.toLowerCase()
          if (!hay.includes(q)) return false
        }
        return true
      })
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [records, year, month, half, query])

  const totals = useMemo(() => {
    let worked = 0
    let extra = 0
    let pay = 0
    for (const r of filtered) {
      const c = calcOf(r)
      worked += c.workedHours
      extra += c.extraTotalHours
      pay += c.estimatedExtraPay
    }
    return { worked, extra, pay }
  }, [filtered, calcOf])

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar por fecha u observación…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Select value={year} onChange={(e) => setYear(e.target.value)} aria-label="Año">
          <option value="all">Año: todos</option>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </Select>
        <Select value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Mes">
          <option value="all">Mes: todos</option>
          {MONTHS.map((m, i) => (
            <option key={m} value={pad2(i + 1)}>{m}</option>
          ))}
        </Select>
        <Select value={half} onChange={(e) => setHalf(e.target.value)} aria-label="Quincena">
          <option value="all">Quincena</option>
          <option value="1">1–15</option>
          <option value="2">16–fin</option>
        </Select>
      </div>

      <Card>
        <CardContent className="flex justify-between p-3 text-xs">
          <span>{filtered.length} registro{filtered.length === 1 ? '' : 's'}</span>
          <span>Trabajadas: <b>{formatHours(totals.worked)}</b></span>
          <span>Extras: <b className="text-amber-600 dark:text-amber-400">{formatHours(totals.extra)}</b></span>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">No hay registros con estos filtros.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => {
            const c = calcOf(r)
            const paid = payments[periodOfDate(r.date).key]?.status === 'pagada'
            return (
              <Card key={r.id}>
                <CardContent className="flex items-center justify-between gap-2 p-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{formatDateShort(r.date)}</p>
                      {r.auto && <Badge variant="default">Auto</Badge>}
                      {r.dayType !== 'normal' && <Badge variant="danger">{DAY_TYPE_LABELS[r.dayType]}</Badge>}
                      <Badge variant={paid ? 'success' : 'warning'}>{paid ? 'Pagada' : 'Pendiente'}</Badge>
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {r.startTime}–{r.endTime} · {formatHours(c.workedHours)} trabajadas
                      {c.extraTotalHours > 0 && ` · ${formatHours(c.extraTotalHours)} extra (${formatCOP(c.estimatedExtraPay)})`}
                    </p>
                    {r.notes && <p className="mt-0.5 truncate text-[11px] italic text-muted-foreground/80">{r.notes}</p>}
                  </div>
                  <div className="flex shrink-0 items-center">
                    <Button size="icon" variant="ghost" aria-label="Editar" onClick={() => onEdit(r)}>
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
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
