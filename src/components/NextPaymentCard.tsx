/**
 * Bloque "Próximo Pago" — la tarjeta hero del Dashboard.
 * Muestra fecha de pago, horas extra acumuladas, valor estimado y
 * diferencia frente a la quincena anterior.
 */
import { CalendarClock, TrendingDown, TrendingUp } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { currentPeriod, prevPeriod } from '@/lib/quincena'
import { summarizePeriod } from '@/lib/selectors'
import { formatCOP, formatHours } from '@/lib/format'
import { formatDateLong, fromDateStr, todayStr } from '@/lib/dates'

export function NextPaymentCard() {
  const { records, payments, calcOf } = useApp()
  const period = currentPeriod()
  const cur = summarizePeriod(records, payments, period, calcOf)
  const prev = summarizePeriod(records, payments, prevPeriod(period), calcOf)

  const diff = cur.agg.estimatedExtraPay - prev.agg.estimatedExtraPay
  const daysLeft = Math.max(
    0,
    Math.round((fromDateStr(period.payDate).getTime() - fromDateStr(todayStr()).getTime()) / 86400000),
  )

  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-600 p-5 text-white shadow-lg">
      <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-16 -left-8 h-40 w-40 rounded-full bg-white/5" />

      <div className="flex items-center gap-2 text-indigo-100">
        <CalendarClock className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-wider">Próximo pago</span>
      </div>

      <p className="mt-1 text-sm capitalize text-indigo-100">
        {formatDateLong(period.payDate)}
        <span className="ml-2 rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold">
          {daysLeft === 0 ? '¡Hoy!' : `en ${daysLeft} día${daysLeft === 1 ? '' : 's'}`}
        </span>
      </p>

      <p className="mt-4 text-4xl font-bold tracking-tight">{formatCOP(cur.agg.estimatedExtraPay)}</p>
      <p className="mt-1 text-sm text-indigo-100">
        {formatHours(cur.agg.extraTotalHours)} extra acumuladas esta quincena
      </p>

      <div className="mt-4 flex items-center gap-2 text-xs">
        {diff >= 0 ? (
          <TrendingUp className="h-4 w-4 text-emerald-300" />
        ) : (
          <TrendingDown className="h-4 w-4 text-rose-300" />
        )}
        <span className={diff >= 0 ? 'text-emerald-200' : 'text-rose-200'}>
          {diff >= 0 ? '+' : '−'}
          {formatCOP(Math.abs(diff)).replace('$', '$ ')}
        </span>
        <span className="text-indigo-200">vs. quincena anterior</span>
      </div>
    </section>
  )
}
