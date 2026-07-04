/**
 * Módulo 10: Exportaciones — genera PDF y Excel de la quincena actual,
 * el mes actual o el año completo. Las librerías se cargan de forma diferida.
 */
import { useMemo, useState } from 'react'
import { FileSpreadsheet, FileText, Loader2 } from 'lucide-react'
import { useApp } from '@/context/AppContext'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { currentPeriod } from '@/lib/quincena'
import { recordsInMonth, recordsInPeriod, recordsInYear } from '@/lib/selectors'
import { exportExcel, exportPDF, type ExportBundle } from '@/lib/export'
import { monthLabel } from '@/lib/dates'
import type { PaymentRecord } from '@/lib/types'

type Scope = 'quincena' | 'mes' | 'anio'

export function ExportView() {
  const { records, payments, calcOf, settings } = useApp()
  const [busy, setBusy] = useState<string | null>(null)

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const period = currentPeriod()

  const scopes = useMemo(
    () => ({
      quincena: { label: `Quincena actual (${period.label})`, records: recordsInPeriod(records, period) },
      mes: { label: `Mes actual (${monthLabel(year, month)})`, records: recordsInMonth(records, year, month) },
      anio: { label: `Año completo (${year})`, records: recordsInYear(records, year) },
    }),
    [records, period, year, month],
  )

  function bundleFor(scope: Scope): ExportBundle {
    const relevantPayments: PaymentRecord[] = Object.values(payments).filter((p) => {
      if (scope === 'anio') return p.periodKey.startsWith(`${year}-`)
      if (scope === 'mes') return p.periodKey.startsWith(`${year}-${String(month).padStart(2, '0')}`)
      return p.periodKey === period.key
    })
    return {
      scopeLabel: scopes[scope].label,
      records: scopes[scope].records,
      calcOf,
      payments: relevantPayments,
      settings,
    }
  }

  async function run(scope: Scope, kind: 'pdf' | 'excel') {
    const key = `${scope}-${kind}`
    setBusy(key)
    try {
      const bundle = bundleFor(scope)
      if (bundle.records.length === 0) {
        alert('No hay registros en este período.')
        return
      }
      if (kind === 'pdf') await exportPDF(bundle)
      else await exportExcel(bundle)
    } catch (err) {
      console.error(err)
      alert('Ocurrió un error al generar el archivo.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-4">
      <p className="px-1 text-xs text-muted-foreground">
        Genera reportes con registros diarios, totales, horas extras y valores estimados/pagados.
      </p>
      {(Object.keys(scopes) as Scope[]).map((scope) => (
        <Card key={scope}>
          <CardHeader>
            <CardTitle>{scopes[scope].label}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-xs text-muted-foreground">
              {scopes[scope].records.length} registro{scopes[scope].records.length === 1 ? '' : 's'}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" disabled={busy !== null} onClick={() => run(scope, 'pdf')}>
                {busy === `${scope}-pdf` ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                PDF
              </Button>
              <Button variant="outline" className="flex-1" disabled={busy !== null} onClick={() => run(scope, 'excel')}>
                {busy === `${scope}-excel` ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                Excel
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
