'use client'

/**
 * CobranzaDeudoresQuePesan — los cinco casos con más saldo en mora.
 *
 * Estaba dentro de «Qué mirar hoy», entre siniestros que bloquean plata y
 * alertas de umbral. No encajaba: saber quién debe más NO es algo que haya que
 * atender hoy — es cómo está compuesta la cartera. Ahora vive bajo «Tu
 * cartera», al lado de las etapas y el embudo, que es la pregunta que contesta.
 *
 * Sin datos no se monta: una tabla con encabezados y cero filas se lee como
 * «no hay deudores», que no es lo mismo que «el reporte todavía no corrió».
 */

import Link from 'next/link'

import { useI18n } from '@/lib/i18n'
import { useDailyReport } from '@/lib/hooks/cobranza/use-daily-report'
import { toDebtorRef } from '@/lib/hooks/cobranza/compliance-entries'

const CASOS_HREF = '/panel/inmobiliaria/ai/cobranza/deudores'
const TOP_N = 5

export function CobranzaDeudoresQuePesan() {
  const { formatCurrency } = useI18n()
  const { data, isLoading } = useDailyReport()

  const deudores = (data?.top_debtors ?? []).slice(0, TOP_N)
  if (isLoading || deudores.length === 0) return null

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-fg">Los que más pesan</h3>
        <Link
          href={CASOS_HREF}
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
                {/*
                  El nombre, y sólo si no viene, la referencia. Esta columna
                  mostraba `A9820375` —los primeros ocho caracteres del UUID—
                  bajo el encabezado «Deudor»: un código que no identifica a
                  nadie y sobre el que no se puede actuar. El nombre lo trae el
                  reporte desde que `top_debtors` hace el JOIN.
                */}
                {d.debtor_name ? (
                  <td className="px-4 py-2 text-fg">
                    <Link
                      href={`${CASOS_HREF}/${d.debtor_id}`}
                      className="hover:underline underline-offset-2"
                    >
                      {d.debtor_name}
                    </Link>
                  </td>
                ) : (
                  <td className="px-4 py-2 font-mono text-xs text-fg-muted">
                    {toDebtorRef(d.debtor_id_masked ?? d.debtor_id)}
                  </td>
                )}
                <td className="px-4 py-2 text-right font-mono tabular-nums text-fg">{d.dpd}</td>
                <td className="px-4 py-2 text-right font-mono tabular-nums text-fg">
                  {formatCurrency(d.balance_cop)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
