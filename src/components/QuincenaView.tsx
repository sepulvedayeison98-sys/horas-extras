/**
 * Módulo 4: Control quincenal — Liquidación Quincenal, marcar pagos
 * e histórico permanente de pagos.
 */
import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, CircleCheck, CircleDollarSign, Undo2 } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { Card, CardContent, CardHeader, CardDescription, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { Input, Textarea } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { currentPeriod, nextPeriod, prevPeriod, periodFromKey, type Period } from '@/lib/quincena'
import { recordsInPeriod, summarizePeriod } from '@/lib/selectors'
import { weeklyExcess } from '@/lib/calculations'
import { formatCOP, formatHours } from '@/lib/format'
import { formatDateShort, todayStr } from '@/lib/dates'

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={strong ? 'text-base font-bold' : 'text-sm font-semibold'}>{value}</span>
    </div>
  )
}

export function QuincenaView() {
  const { records, payments, calcOf, settings, setPayment, clearPayment } = useApp()
  const [period, setPeriod] = useState<Period>(() => currentPeriod())
  const [payOpen, setPayOpen] = useState(false)
  const [payDate, setPayDate] = useState(todayStr())
  const [payAmount, setPayAmount] = useState('')
  const [payNotes, setPayNotes] = useState('')

  const summary = useMemo(
    () => summarizePeriod(records, payments, period, calcOf, settings),
    [records, payments, period, calcOf, settings],
  )
  const prev = useMemo(
    () => summarizePeriod(records, payments, prevPeriod(period), calcOf, settings),
    [records, payments, period, calcOf, settings],
  )
  const excess = useMemo(
    () => weeklyExcess(recordsInPeriod(records, period), settings, calcOf),
    [records, period, settings, calcOf],
  )

  const isCurrent = period.key === currentPeriod().key
  const diffPay = summary.totalPay - prev.totalPay

  const paymentHistory = useMemo(
    () =>
      Object.values(payments)
        .filter((p) => p.status === 'pagada')
        .sort((a, b) => b.periodKey.localeCompare(a.periodKey)),
    [payments],
  )

  function openPayDialog() {
    setPayDate(todayStr())
    setPayAmount(String(summary.totalPay))
    setPayNotes('')
    setPayOpen(true)
  }

  function confirmPayment() {
    setPayment({
      periodKey: period.key,
      status: 'pagada',
      paidDate: payDate,
      paidAmount: Number(payAmount) || 0,
      notes: payNotes.trim() || undefined,
    })
    setPayOpen(false)
  }

  return (
    <div className="space-y-4">
      {/* Navegación entre quincenas */}
      <div className="flex items-center justify-between">
        <Button size="icon" variant="outline" aria-label="Quincena anterior" onClick={() => setPeriod(prevPeriod(period))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-center">
          <p className="text-sm font-semibold capitalize">{period.label}</p>
          <p className="text-[11px] text-muted-foreground">
            {isCurrent ? 'Quincena actual' : `Pago: ${formatDateShort(period.payDate)}`}
          </p>
        </div>
        <Button size="icon" variant="outline" aria-label="Quincena siguiente" onClick={() => setPeriod(nextPeriod(period))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Liquidación Quincenal */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Liquidación Quincenal</CardTitle>
            <CardDescription>
              {formatDateShort(period.startDate)} — {formatDateShort(period.endDate)}
            </CardDescription>
          </div>
          {summary.isPaid ? (
            <Badge variant="success">
              <CircleCheck className="h-3 w-3" /> Pagada
            </Badge>
          ) : (
            <Badge variant="warning">Pendiente</Badge>
          )}
        </CardHeader>
        <CardContent className="divide-y divide-border/60">
          <Row label="Horas ordinarias" value={formatHours(summary.agg.ordinaryHours)} />
          <Row label="Horas extra diurnas" value={formatHours(summary.agg.extraDayHours)} />
          <Row label="Horas extra nocturnas" value={formatHours(summary.agg.extraNightHours)} />
          <Row label="Horas dominicales/festivas" value={formatHours(summary.agg.sundayHolidayHours)} />
          <Row label="Sábados trabajados" value={String(summary.agg.saturdaysWorked)} />
          <Row label="Domingos trabajados" value={String(summary.agg.sundaysWorked)} />
          <Row label="Festivos trabajados" value={String(summary.agg.holidaysWorked)} />
          {summary.basePay > 0 && (
            <>
              <Row label="Salario base (quincena)" value={formatCOP(summary.basePay)} />
              <Row label="Valor extras/recargos" value={formatCOP(summary.agg.estimatedExtraPay)} />
            </>
          )}
          <Row label="Valor estimado a pagar" value={formatCOP(summary.totalPay)} strong />
          {summary.basePay === 0 && (
            <p className="pt-1 text-[11px] text-muted-foreground">
              Solo incluye extras/recargos. Configura tu salario mensual para ver el total.
            </p>
          )}
          {summary.isPaid && summary.payment?.paidAmount != null && (
            <Row label={`Pagado el ${summary.payment.paidDate ? formatDateShort(summary.payment.paidDate) : '—'}`} value={formatCOP(summary.payment.paidAmount)} strong />
          )}
        </CardContent>
      </Card>

      {/* Comparativo y estado de horas */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-lg font-bold">{formatHours(summary.isPaid ? 0 : summary.agg.extraTotalHours)}</p>
            <p className="text-xs text-muted-foreground">Horas pendientes de pago</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-lg font-bold">{formatHours(summary.isPaid ? summary.agg.extraTotalHours : 0)}</p>
            <p className="text-xs text-muted-foreground">Horas ya pagadas</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4 text-sm">
          <p className="font-semibold">Frente a la quincena anterior</p>
          <p className={`mt-1 text-lg font-bold ${diffPay >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            {diffPay >= 0 ? '+' : '−'}{formatCOP(Math.abs(diffPay))}
          </p>
          <p className="text-xs text-muted-foreground">
            Anterior ({prev.period.label}): {formatCOP(prev.totalPay)} · {formatHours(prev.agg.extraTotalHours)} extra
          </p>
        </CardContent>
      </Card>

      {/* Exceso sobre jornada legal semanal */}
      {excess.some((w) => w.excess > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Exceso sobre jornada legal ({settings.weeklyLegalHours} h/sem)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {excess.map((w) => (
              <div key={w.week} className="flex justify-between text-sm">
                <span className="text-muted-foreground">Semana {w.week.split('-W')[1]}</span>
                <span>
                  {formatHours(w.worked)}{' '}
                  {w.excess > 0 && (
                    <b className="text-amber-600 dark:text-amber-400">(+{formatHours(w.excess)})</b>
                  )}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Acciones de pago */}
      {summary.isPaid ? (
        <Button variant="outline" size="lg" className="w-full" onClick={() => clearPayment(period.key)}>
          <Undo2 className="h-4 w-4" /> Marcar como pendiente
        </Button>
      ) : (
        <Button size="lg" className="w-full" onClick={openPayDialog}>
          <CircleDollarSign className="h-5 w-5" /> Marcar quincena como pagada
        </Button>
      )}

      {/* Histórico de pagos */}
      {paymentHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Historial de pagos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {paymentHistory.map((p) => {
              const per = periodFromKey(p.periodKey)
              return (
                <div key={p.periodKey} className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium capitalize">{per.label}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Pagado {p.paidDate ? formatDateShort(p.paidDate) : '—'}
                      {p.notes ? ` · ${p.notes}` : ''}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {p.paidAmount != null ? formatCOP(p.paidAmount) : '—'}
                  </p>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Diálogo de pago */}
      <Dialog open={payOpen} onClose={() => setPayOpen(false)} title="Registrar pago de quincena">
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground capitalize">{period.label}</p>
          <div>
            <Label htmlFor="p-date">Fecha de pago</Label>
            <Input id="p-date" type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="p-amount">Valor pagado (COP)</Label>
            <Input
              id="p-amount"
              type="number"
              inputMode="numeric"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Estimado por la app: {formatCOP(summary.totalPay)}
            </p>
          </div>
          <div>
            <Label htmlFor="p-notes">Observaciones</Label>
            <Textarea id="p-notes" value={payNotes} onChange={(e) => setPayNotes(e.target.value)} />
          </div>
          <Button size="lg" className="w-full" onClick={confirmPayment}>
            Confirmar pago
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
