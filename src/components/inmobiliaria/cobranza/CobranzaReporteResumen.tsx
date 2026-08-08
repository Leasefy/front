'use client'

/**
 * CobranzaReporteResumen — lo del reporte diario que hay que ver sin buscarlo.
 *
 * Del reporte suben DOS cosas al Resumen:
 *
 *   · Las alertas de umbral. Son lo único de esa pantalla que pide una reacción
 *     hoy («Índice de morosidad en 62.22% — por encima del umbral 12%»), y
 *     estaban escondidas detrás de una pestaña.
 *   · Los deudores que más pesan. Responde «¿por dónde empiezo?», que es la
 *     pregunta con la que uno abre el panel.
 *
 * NO suben: el histórico de 30 días, el CSV, la suscripción y los umbrales.
 * Eso es archivo y configuración, y sigue viviendo en Reporte diario.
 *
 * Los tres KPI del reporte tampoco: «llamadas fuera de horario» ya vive en
 * Cumplimiento, y morosidad/recuperación ya están arriba en «Cómo va el agente».
 * Repetirlos acá sería la duplicación que estamos deshaciendo.
 *
 * Sin alertas y sin deudores, no se monta — misma regla que los otros bloques.
 */

import Link from 'next/link'
import { Warning, CaretRight } from '@phosphor-icons/react'

import { useI18n } from '@/lib/i18n'
import { Button } from '@/components/ui'
import { useDailyReport } from '@/lib/hooks/cobranza/use-daily-report'
import { toDebtorRef } from '@/lib/hooks/cobranza/compliance-entries'

const REPORTE_HREF = '/panel/inmobiliaria/ai/cobranza/reporte'
const DEUDORES_HREF = '/panel/inmobiliaria/ai/cobranza/deudores'

/** Cuántos deudores mostrar en el resumen. El detalle está en Casos. */
const TOP_N = 5

export function CobranzaReporteResumen() {
  const { formatCurrency } = useI18n()
  const { data, isLoading } = useDailyReport()

  const alertas = data?.alerts ?? []
  const deudores = (data?.top_debtors ?? []).slice(0, TOP_N)

  if (isLoading || (alertas.length === 0 && deudores.length === 0)) return null

  return (
    <section aria-label="Qué mirar hoy" className="space-y-3">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <h2 className="text-base font-semibold text-fg">Qué mirar hoy</h2>
        <Button asChild variant="secondary" size="sm" hideArrow>
          <Link href={REPORTE_HREF}>
            Ver reporte completo
            <CaretRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>

      {/* Alertas de umbral — `message_es` viene redactado del agente. */}
      {alertas.length > 0 && (
        <div className="space-y-2">
          {alertas.map((a, idx) => (
            <div
              key={`${a.code}-${idx}`}
              role="alert"
              className={[
                'rounded-xl border p-3 flex items-start gap-3 text-sm',
                a.level === 'CRITICAL'
                  ? 'border-danger/30 bg-danger-soft text-danger'
                  : 'border-warning/30 bg-warning-soft text-warning',
              ].join(' ')}
            >
              <Warning className="w-4 h-4 shrink-0 mt-0.5" weight="fill" aria-hidden="true" />
              <p>{a.message_es}</p>
            </div>
          ))}
        </div>
      )}

      {/* Deudores que más pesan */}
      {deudores.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-fg">Los que más pesan</h3>
            <Link
              href={DEUDORES_HREF}
              className="text-xs text-fg-muted hover:text-fg underline underline-offset-2"
            >
              Ver todos los casos
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-fg-muted border-b border-border">
                  <th scope="col" className="px-4 py-2 font-medium">Deudor</th>
                  <th scope="col" className="px-4 py-2 font-medium text-right">Días de mora</th>
                  <th scope="col" className="px-4 py-2 font-medium text-right">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {deudores.map((d) => (
                  <tr key={d.debtor_id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2 font-mono text-xs text-fg">
                      {toDebtorRef(d.debtor_id_masked ?? d.debtor_id)}
                    </td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-fg">
                      {d.dpd}
                    </td>
                    <td className="px-4 py-2 text-right font-mono tabular-nums text-fg">
                      {formatCurrency(d.balance_cop)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  )
}
