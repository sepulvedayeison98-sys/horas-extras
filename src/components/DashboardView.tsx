/**
 * Módulo 3: Dashboard principal — Próximo Pago, KPIs, alertas y proyecciones.
 */
import { useMemo } from 'react'
import {
  AlertTriangle,
  BadgeDollarSign,
  CalendarDays,
  Clock,
  Flame,
  PartyPopper,
  Sun,
  Timer,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { NextPaymentCard } from './NextPaymentCard'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { currentPeriod, lastPeriods, prevPeriod, periodFromKey } from '@/lib/quincena'
import { recordsInMonth, recordsInYear, summarizePeriod, totalPaidInYear } from '@/lib/selectors'
import { aggregate } from '@/lib/calculations'
import { formatCOP, formatDiffPct, formatHoursNum } from '@/lib/format'
import { addDays, dayOfWeek, formatDateShort, fromDateStr, todayStr } from '@/lib/dates'
import { isHoliday } from '@/lib/festivos'
import type { ReactNode } from 'react'

function KpiCard({
  icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: ReactNode
  label: string
  value: string
  hint?: string
  accent?: string
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className={`mb-2 inline-flex rounded-xl p-2 ${accent ?? 'bg-primary/10 text-primary'}`}>{icon}</div>
        <p className="text-xl font-bold leading-tight">{value}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
        {hint && <p className="mt-1 text-[11px] font-medium text-muted-foreground/80">{hint}</p>}
      </CardContent>
    </Card>
  )
}

export function DashboardView() {
  const { records, payments, calcOf, settings } = useApp()
  const today = todayStr()
  const now = fromDateStr(today)
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const stats = useMemo(() => {
    const period = currentPeriod()
    const cur = summarizePeriod(records, payments, period, calcOf)
    const prev = summarizePeriod(records, payments, prevPeriod(period), calcOf)

    const monthAgg = aggregate(recordsInMonth(records, year, month), calcOf)
    const prevMonth = month === 1 ? 12 : month - 1
    const prevMonthYear = month === 1 ? year - 1 : year
    const prevMonthAgg = aggregate(recordsInMonth(records, prevMonthYear, prevMonth), calcOf)
    const yearAgg = aggregate(recordsInYear(records, year), calcOf)

    // Promedio mensual de extras: sobre los meses del año con registros
    const monthsWithData = new Set(recordsInYear(records, year).map((r) => r.date.slice(0, 7))).size
    const monthlyAvgExtra = monthsWithData > 0 ? yearAgg.extraTotalHours / monthsWithData : 0

    // Proyección: promedio de extras por día registrado × días hábiles restantes
    let remainingBusinessDays = 0
    for (let d = addDays(today, 1); d <= period.endDate; d = addDays(d, 1)) {
      const dow = dayOfWeek(d)
      if (dow >= 1 && dow <= 5 && !isHoliday(d)) remainingBusinessDays++
    }
    const perDayExtra = cur.agg.days > 0 ? cur.agg.extraTotalHours / cur.agg.days : 0
    const perDayPay = cur.agg.days > 0 ? cur.agg.estimatedExtraPay / cur.agg.days : 0
    const projectedExtra = cur.agg.extraTotalHours + perDayExtra * remainingBusinessDays
    const projectedPay = cur.agg.estimatedExtraPay + perDayPay * remainingBusinessDays

    // Comparativo contra las últimas 3 quincenas cerradas
    const last3 = lastPeriods(prevPeriod(period), 3).map((p) => summarizePeriod(records, payments, p, calcOf))
    const avgLast3Pay = last3.reduce((s, x) => s + x.agg.estimatedExtraPay, 0) / 3

    // Alertas
    const alerts: { icon: ReactNode; text: string; variant: 'warning' | 'danger' | 'default' }[] = []
    const unpaid = Object.keys(
      records.reduce<Record<string, true>>((acc, r) => {
        acc[periodOfKeyForDate(r.date)] = true
        return acc
      }, {}),
    )
      .filter((key) => key < period.key)
      .filter((key) => {
        const s = summarizePeriod(records, payments, periodFromKey(key), calcOf)
        return s.agg.extraTotalHours > 0 && !s.isPaid
      })
      .sort()

    if (unpaid.length > 0) {
      alerts.push({
        icon: <Wallet className="h-4 w-4" />,
        text: `Tienes ${unpaid.length} quincena${unpaid.length > 1 ? 's' : ''} con horas extra pendientes de pago`,
        variant: 'warning',
      })
    }

    for (const s of last3.slice(-2)) {
      if (s.isPaid && s.payment?.paidAmount != null && s.agg.estimatedExtraPay > 0) {
        const delta = s.payment.paidAmount - s.agg.estimatedExtraPay
        if (Math.abs(delta) > s.agg.estimatedExtraPay * 0.05) {
          alerts.push({
            icon: <AlertTriangle className="h-4 w-4" />,
            text: `Diferencia en ${s.period.label}: pagado ${formatCOP(s.payment.paidAmount)} vs. estimado ${formatCOP(s.agg.estimatedExtraPay)}`,
            variant: 'danger',
          })
        }
      }
    }

    const daysToPay = Math.round(
      (fromDateStr(period.payDate).getTime() - fromDateStr(today).getTime()) / 86400000,
    )
    if (daysToPay >= 0 && daysToPay <= 3) {
      alerts.push({
        icon: <CalendarDays className="h-4 w-4" />,
        text: `Se acerca la fecha de pago (${formatDateShort(period.payDate)}). Revisa tu liquidación quincenal.`,
        variant: 'default',
      })
    }

    return {
      cur,
      prev,
      monthAgg,
      prevMonthAgg,
      yearAgg,
      monthlyAvgExtra,
      projectedExtra,
      projectedPay,
      avgLast3Pay,
      alerts,
      remainingBusinessDays,
    }
  }, [records, payments, calcOf, today, year, month])

  const paidThisYear = useMemo(() => totalPaidInYear(payments, year), [payments, year])
  const monthDiff = formatDiffPct(stats.monthAgg.extraTotalHours, stats.prevMonthAgg.extraTotalHours)

  return (
    <div className="space-y-4">
      <NextPaymentCard />

      {stats.alerts.length > 0 && (
        <div className="space-y-2">
          {stats.alerts.map((a, i) => (
            <div
              key={i}
              className={`flex items-start gap-2.5 rounded-2xl border px-3.5 py-3 text-xs font-medium ${
                a.variant === 'danger'
                  ? 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400'
                  : a.variant === 'warning'
                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                    : 'border-primary/25 bg-primary/8 text-primary'
              }`}
            >
              <span className="mt-0.5 shrink-0">{a.icon}</span>
              <span>{a.text}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <KpiCard
          icon={<Timer className="h-4 w-4" />}
          label="Extras esta quincena"
          value={`${formatHoursNum(stats.cur.agg.extraTotalHours)} h`}
          hint={`${stats.cur.agg.days} día${stats.cur.agg.days === 1 ? '' : 's'} registrado${stats.cur.agg.days === 1 ? '' : 's'}`}
        />
        <KpiCard
          icon={<Flame className="h-4 w-4" />}
          label="Extras este mes"
          value={`${formatHoursNum(stats.monthAgg.extraTotalHours)} h`}
          hint={monthDiff ? `${monthDiff} vs. mes anterior` : undefined}
          accent="bg-orange-500/10 text-orange-500"
        />
        <KpiCard
          icon={<TrendingUp className="h-4 w-4" />}
          label={`Extras acumuladas ${year}`}
          value={`${formatHoursNum(stats.yearAgg.extraTotalHours)} h`}
          hint={`Promedio mensual: ${formatHoursNum(stats.monthlyAvgExtra)} h`}
          accent="bg-emerald-500/10 text-emerald-500"
        />
        <KpiCard
          icon={<Clock className="h-4 w-4" />}
          label="Horas trabajadas este mes"
          value={`${formatHoursNum(stats.monthAgg.workedHours)} h`}
          hint={`Jornada legal: ${settings.weeklyLegalHours} h/semana`}
        />
        <KpiCard
          icon={<Sun className="h-4 w-4" />}
          label={`Sábados trabajados ${year}`}
          value={String(stats.yearAgg.saturdaysWorked)}
          accent="bg-amber-500/10 text-amber-500"
        />
        <KpiCard
          icon={<PartyPopper className="h-4 w-4" />}
          label={`Dom. y festivos ${year}`}
          value={String(stats.yearAgg.sundaysWorked + stats.yearAgg.holidaysWorked)}
          hint={`${stats.yearAgg.sundaysWorked} domingos · ${stats.yearAgg.holidaysWorked} festivos`}
          accent="bg-rose-500/10 text-rose-500"
        />
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold">Proyección de la quincena</p>
            <Badge variant="default">{stats.remainingBusinessDays} días hábiles restantes</Badge>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-lg font-bold">{formatHoursNum(stats.projectedExtra)} h</p>
              <p className="text-xs text-muted-foreground">Extras proyectadas</p>
            </div>
            <div>
              <p className="text-lg font-bold">{formatCOP(stats.projectedPay)}</p>
              <p className="text-xs text-muted-foreground">Valor proyectado</p>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Promedio de las últimas 3 quincenas: {formatCOP(stats.avgLast3Pay)} ·{' '}
            {stats.projectedPay >= stats.avgLast3Pay ? 'vas por encima' : 'vas por debajo'} de tu ritmo habitual
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center justify-between p-4">
          <div>
            <p className="text-lg font-bold">{formatCOP(paidThisYear)}</p>
            <p className="text-xs text-muted-foreground">Total pagado en {year}</p>
          </div>
          <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-500">
            <BadgeDollarSign className="h-5 w-5" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/** Clave de período de una fecha sin construir el objeto completo */
function periodOfKeyForDate(date: string): string {
  const day = Number(date.slice(8, 10))
  return `${date.slice(0, 7)}-Q${day <= 15 ? 1 : 2}`
}
