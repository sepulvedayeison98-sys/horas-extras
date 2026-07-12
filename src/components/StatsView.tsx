/**
 * Módulo 7: Estadísticas — gráficos ligeros con Recharts, optimizados para móvil.
 */
import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useApp } from '@/context/AppContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { aggregate } from '@/lib/calculations'
import { recordsInMonth, summarizePeriod } from '@/lib/selectors'
import { lastPeriods, currentPeriod } from '@/lib/quincena'
import { formatCOP, formatHoursNum } from '@/lib/format'

const MONTH_ABBR = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const AXIS = 'var(--muted-foreground)'

export function StatsView() {
  const { records, payments, calcOf, settings } = useApp()
  const year = new Date().getFullYear()

  const monthly = useMemo(() => {
    return MONTH_ABBR.map((label, i) => {
      const agg = aggregate(recordsInMonth(records, year, i + 1), calcOf)
      return {
        mes: label,
        extras: Number(agg.extraTotalHours.toFixed(1)),
        trabajadas: Number(agg.workedHours.toFixed(1)),
        valor: agg.estimatedExtraPay,
      }
    })
  }, [records, year, calcOf])

  const hasData = monthly.some((m) => m.trabajadas > 0)

  // Tendencia de pagos: últimas 6 quincenas (estimado vs pagado)
  const payTrend = useMemo(() => {
    const periods = lastPeriods(currentPeriod(), 6)
    return periods.map((p) => {
      const s = summarizePeriod(records, payments, p, calcOf, settings)
      return {
        quincena: `${p.month}/${p.half === 1 ? 'Q1' : 'Q2'}`,
        estimado: s.totalPay,
        pagado: s.payment?.paidAmount ?? 0,
      }
    })
  }, [records, payments, calcOf, settings])

  if (!hasData) {
    return (
      <Card>
        <CardContent className="py-14 text-center text-sm text-muted-foreground">
          Aún no hay datos suficientes para graficar.
          <br />
          Registra algunas jornadas para ver tus estadísticas.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Horas extra por mes · {year}</CardTitle>
        </CardHeader>
        <CardContent className="px-1">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthly} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} width={34} />
              <Tooltip content={<HoursTooltip suffix="h extra" />} cursor={{ fill: 'var(--muted)' }} />
              <Bar dataKey="extras" radius={[6, 6, 0, 0]}>
                {monthly.map((m, i) => (
                  <Cell key={i} fill={m.extras > 4 ? '#f97316' : 'var(--primary)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Horas trabajadas por mes</CardTitle>
        </CardHeader>
        <CardContent className="px-1">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={monthly} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="gWorked" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} width={34} />
              <Tooltip content={<HoursTooltip suffix="h trabajadas" />} cursor={{ stroke: 'var(--border)' }} />
              <Area type="monotone" dataKey="trabajadas" stroke="var(--primary)" strokeWidth={2} fill="url(#gWorked)" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Evolución anual · valor extra estimado</CardTitle>
        </CardHeader>
        <CardContent className="px-1">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={monthly} margin={{ top: 4, right: 8, left: -4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 10, fill: AXIS }}
                axisLine={false}
                tickLine={false}
                width={52}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<MoneyTooltip />} cursor={{ stroke: 'var(--border)' }} />
              <Line type="monotone" dataKey="valor" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tendencia de pagos · estimado vs. pagado</CardTitle>
        </CardHeader>
        <CardContent className="px-1">
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={payTrend} margin={{ top: 4, right: 8, left: -4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="quincena" tick={{ fontSize: 10, fill: AXIS }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 10, fill: AXIS }}
                axisLine={false}
                tickLine={false}
                width={52}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<MoneyTooltip />} cursor={{ fill: 'var(--muted)' }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="estimado" name="Estimado" fill="var(--primary)" radius={[5, 5, 0, 0]} />
              <Bar dataKey="pagado" name="Pagado" fill="#10b981" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}

interface TipProps {
  active?: boolean
  payload?: { value: number; name?: string; dataKey?: string; color?: string }[]
  label?: string
}

function HoursTooltip({ active, payload, label, suffix }: TipProps & { suffix: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold">{label}</p>
      <p>{formatHoursNum(payload[0].value)} {suffix}</p>
    </div>
  )
}

function MoneyTooltip({ active, payload, label }: TipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-semibold">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name ? `${p.name}: ` : ''}{formatCOP(p.value)}
        </p>
      ))}
    </div>
  )
}
