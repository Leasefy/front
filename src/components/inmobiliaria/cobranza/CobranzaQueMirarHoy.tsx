'use client'

/**
 * CobranzaQueMirarHoy — lo que pide una reacción hoy, venga de donde venga.
 *
 * Junta en un solo bloque las cosas que estaban repartidas en pantallas
 * distintas y que uno necesita ver al abrir el panel:
 *
 *   · Siniestros esperando aprobación. Van PRIMERO porque son los únicos que
 *     bloquean plata: la base no deja radicar sin firma humana
 *     (`insurance_claims_filed_requires_approval_check`: status <> 'filed' OR
 *     approved_by_human_user_id IS NOT NULL). Mientras nadie apruebe, la
 *     reclamación no se presenta ante la aseguradora.
 *   · Las alertas de umbral del reporte diario («Índice de morosidad en 62.22%
 *     — por encima del umbral 12%»).
 *   · Los deudores que más pesan. Responde «¿por dónde empiezo?».
 *
 * Los siniestros YA se contaban antes en el banner, pero sumados con
 * escalaciones y cartas dentro de un único «por aprobar». Un número agregado no
 * avisa: no se puede saber que dos de esos siete son reclamaciones de seguro
 * envejeciendo. Por eso tienen su propia línea, con cuántos son y desde cuándo.
 *
 * NO suben del reporte: el histórico de 30 días, el CSV, la suscripción ni los
 * umbrales — archivo y configuración, ver la nota en `agentWorkspaceNav.ts`.
 * Los tres KPI tampoco: «llamadas fuera de horario» ya vive en Cumplimiento, y
 * morosidad/recuperación en «Cómo va el agente».
 *
 * Sin nada que mostrar, no se monta — misma regla que los otros bloques.
 */

import Link from 'next/link'
import { Warning, CaretRight, Siren } from '@phosphor-icons/react'

import { useI18n } from '@/lib/i18n'
import { Button } from '@/components/ui'
import { useDailyReport } from '@/lib/hooks/cobranza/use-daily-report'
import { useInsuranceClaims } from '@/lib/hooks/cobranza/use-insurance-claims'
import { toDebtorRef } from '@/lib/hooks/cobranza/compliance-entries'

const REPORTE_HREF = '/panel/inmobiliaria/ai/cobranza/reporte'
const DEUDORES_HREF = '/panel/inmobiliaria/ai/cobranza/deudores'
const SINIESTROS_HREF = '/panel/inmobiliaria/ai/cobranza/siniestros'

/** Cuántos deudores mostrar en el resumen. El detalle está en Casos. */
const TOP_N = 5

/** Días enteros transcurridos desde una fecha ISO. */
function diasDesde(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime()
  return Math.max(0, Math.floor(ms / 86_400_000))
}

export function CobranzaQueMirarHoy() {
  const { formatCurrency } = useI18n()
  const { data, isLoading } = useDailyReport()
  const siniestros = useInsuranceClaims({ status: 'pending_human_review' })

  const alertas = data?.alerts ?? []
  const deudores = (data?.top_debtors ?? []).slice(0, TOP_N)
  const porRadicar = siniestros.data?.claims ?? []

  // Antigüedad del más viejo: es lo que convierte «hay 2 pendientes» en «hay 2
  // pendientes hace 5 días», que es la parte que mueve a actuar.
  const diasDelMasViejo = porRadicar.reduce(
    (max, c) => Math.max(max, diasDesde(c.createdAt)),
    0,
  )
  const aseguradoras = Array.from(new Set(porRadicar.map((c) => c.aseguradora)))

  const nadaQueMostrar =
    alertas.length === 0 && deudores.length === 0 && porRadicar.length === 0
  if (isLoading || nadaQueMostrar) return null

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

      {/* Siniestros esperando firma — primero, porque bloquean plata. */}
      {porRadicar.length > 0 && (
        <div
          role="alert"
          className="rounded-xl border border-warning/30 bg-warning-soft p-3 flex items-start gap-3 text-sm text-warning"
        >
          <Siren className="w-4 h-4 shrink-0 mt-0.5" weight="fill" aria-hidden="true" />
          <div className="flex-1 min-w-0 space-y-1">
            <p>
              <strong className="font-semibold">
                {porRadicar.length === 1
                  ? '1 siniestro espera tu aprobación'
                  : `${porRadicar.length} siniestros esperan tu aprobación`}
              </strong>
              {diasDelMasViejo > 0 && (
                <>
                  {' — el más antiguo lleva '}
                  <span className="font-mono tabular-nums">{diasDelMasViejo}</span>
                  {diasDelMasViejo === 1 ? ' día' : ' días'}
                </>
              )}
              .
            </p>
            <p className="text-xs opacity-90">
              Hasta que los apruebes no se radican ante{' '}
              {aseguradoras.length > 0 ? aseguradoras.join(' y ') : 'la aseguradora'}.
            </p>
          </div>
          <Button asChild variant="secondary" size="sm" hideArrow className="shrink-0">
            <Link href={SINIESTROS_HREF}>Revisar</Link>
          </Button>
        </div>
      )}

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
