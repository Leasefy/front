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
 *
 * La tabla es la del DS (`@/components/ui/table`): antes copiaba a mano el
 * tratamiento de los `<th>` (mono 11px en mayúsculas, fg-subtle) sobre una
 * `<table>` suelta, así que cada retoque del DS había que replicarlo acá.
 */

import Link from 'next/link'

import { useI18n } from '@/lib/i18n'
import { useDailyReport } from '@/lib/hooks/cobranza/use-daily-report'
import { toDebtorRef } from '@/lib/hooks/cobranza/compliance-entries'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const CASOS_HREF = '/panel/inmobiliaria/cobros/cobranza/deudores'
const TOP_N = 5

export function CobranzaDeudoresQuePesan() {
  const { formatCurrency } = useI18n()
  const { data, isLoading } = useDailyReport()

  const deudores = (data?.top_debtors ?? []).slice(0, TOP_N)
  if (isLoading || deudores.length === 0) return null

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-fg">Los que más pesan</h3>
        <Link
          href={CASOS_HREF}
          className="text-xs text-fg-muted hover:text-fg underline underline-offset-2"
        >
          Ver todos los casos
        </Link>
      </div>
      <Table>
        <TableHeader>
          {/* El encabezado no es una fila sobre la que se pueda actuar: sin hover. */}
          <TableRow className="hover:bg-transparent">
            <TableHead scope="col">Deudor</TableHead>
            <TableHead scope="col" numeric>
              Días de mora
            </TableHead>
            <TableHead scope="col" numeric>
              Saldo
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {deudores.map((d) => (
            <TableRow key={d.debtor_id}>
              {/*
                El nombre, y sólo si no viene, la referencia. Esta columna
                mostraba `A9820375` —los primeros ocho caracteres del UUID—
                bajo el encabezado «Deudor»: un código que no identifica a
                nadie y sobre el que no se puede actuar. El nombre lo trae el
                reporte desde que `top_debtors` hace el JOIN.
              */}
              {d.debtor_name ? (
                <TableCell>
                  <Link
                    href={`${CASOS_HREF}/${d.debtor_id}`}
                    className="hover:underline underline-offset-2"
                  >
                    {d.debtor_name}
                  </Link>
                </TableCell>
              ) : (
                <TableCell className="font-mono text-xs text-fg-muted">
                  {toDebtorRef(d.debtor_id_masked ?? d.debtor_id)}
                </TableCell>
              )}
              <TableCell numeric className="font-mono">
                {d.dpd}
              </TableCell>
              <TableCell numeric className="font-mono">
                {formatCurrency(d.balance_cop)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
