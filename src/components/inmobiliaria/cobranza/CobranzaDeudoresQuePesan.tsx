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
import { useMemo } from 'react'
import { Presence } from '@leasefy/cadence'

import { useI18n } from '@/lib/i18n'
import { useDailyReport } from '@/lib/hooks/cobranza/use-daily-report'
import { toDebtorRef } from '@/lib/hooks/cobranza/compliance-entries'
import {
  Table,
  TableBodyAnimado,
  TableCell,
  TableHeader,
  TableRow,
  TableRowAnimada,
} from '@/components/ui/table'
import { useTr } from '@/lib/i18n/use-tr'
import { useOrdenDeLaTabla } from '@/lib/hooks/use-orden-de-la-tabla'
import { EncabezadoOrdenable } from '@/components/ui/encabezado-ordenable'

const CASOS_HREF = '/panel/inmobiliaria/pagos/cobranza/deudores'
const TOP_N = 5

export function CobranzaDeudoresQuePesan() {
  const tr = useTr();
  const { formatCurrency } = useI18n()
  const { data, isLoading } = useDailyReport()

  // Los cinco que más deben (así los manda el reporte); el orden de la tabla sólo reacomoda esos cinco.
  const losQueMasPesan = useMemo(() => (data?.top_debtors ?? []).slice(0, TOP_N), [data])
  // Nico 28-10: «que todas las tablas tengan lo de ordenamiento general y por columnas».
  const { ordenadas: deudores, orden, ordenarPor } = useOrdenDeLaTabla(
    losQueMasPesan,
    {
      deudor: (d) => d.debtor_name ?? toDebtorRef(d.debtor_id_masked ?? d.debtor_id),
      mora: (d) => d.dpd,
      saldo: (d) => d.balance_cop,
    },
    { primero: { mora: 'desc', saldo: 'desc' } },
  )

  // El reporte llega después del resto del panorama: la tarjeta entra con su
  // animación (`Presence`) en vez de aparecer de golpe al lado del embudo.
  // Sin datos sigue sin montarse (Presence no pinta nada).
  return (
    <Presence
      show={!isLoading && deudores.length > 0}
      className="rounded-lg border border-border bg-card overflow-hidden"
    >
      <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-fg">{tr("Los que más pesan")}</h3>
        <Link
          href={CASOS_HREF}
          className="text-caption text-fg-muted hover:text-fg underline underline-offset-2"
        >
          {tr("Ver todos los casos")}
        </Link>
      </div>
      <Table>
        <TableHeader>
          {/* El encabezado no es una fila sobre la que se pueda actuar: sin hover. */}
          <TableRow className="hover:bg-transparent">
            <EncabezadoOrdenable campo="deudor" orden={orden} onOrdenar={ordenarPor}>{tr("Deudor")}</EncabezadoOrdenable>
            <EncabezadoOrdenable campo="mora" orden={orden} onOrdenar={ordenarPor} className="text-right" alineacion="derecha">
              {tr("Días de mora")}
            </EncabezadoOrdenable>
            <EncabezadoOrdenable campo="saldo" orden={orden} onOrdenar={ordenarPor} className="text-right" alineacion="derecha">
              {tr("Saldo")}
            </EncabezadoOrdenable>
          </TableRow>
        </TableHeader>
        <TableBodyAnimado>
          {deudores.map((d) => (
            <TableRowAnimada key={d.debtor_id}>
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
                <TableCell className="font-mono text-caption text-fg-muted">
                  {toDebtorRef(d.debtor_id_masked ?? d.debtor_id)}
                </TableCell>
              )}
              <TableCell numeric className="font-mono">
                {d.dpd}
              </TableCell>
              <TableCell numeric className="font-mono">
                {formatCurrency(d.balance_cop)}
              </TableCell>
            </TableRowAnimada>
          ))}
        </TableBodyAnimado>
      </Table>
    </Presence>
  )
}
