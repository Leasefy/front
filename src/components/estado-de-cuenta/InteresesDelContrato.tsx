'use client';

/**
 * Los intereses de mora de un contrato, APARTE del capital.
 *
 * ── Qué se protege ──────────────────────────────────────────────────────────
 * 1. **Capital e interés no se mezclan.** Arriendos y Otros conceptos siguen
 *    siendo lo pactado; esto va en su propia sección, con su propia tabla. Un
 *    interés sumado dentro del canon sería imposible de cruzar con la factura.
 * 2. **Un cero no se lee «no hay mora».** Cuando hay cuotas en mora que no
 *    llevan interés, se dice cuántas y por qué. Si la razón es que la
 *    inmobiliaria no tiene reglas de mora, en el panel se ofrece ir a
 *    configurarlas.
 * 3. **Eso es del panel, no del cliente.** El documento también lo abren el
 *    inquilino en su portal y quien recibe el enlace: ahí el motivo interno no
 *    se muestra. Lo decide `reglasDeMoraHref`, que sólo el panel pasa.
 * 4. **Una cuota pagada en mora se dice.** Su capital está saldado —en
 *    Arriendos sale «Cancelada»— y aun así debe el interés de esos días: sin
 *    la marca, la fila parecería un error.
 */

import Link from 'next/link';

import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { fechaLegible } from './filas';
import type { FilaDeInteres, InteresesDelContrato } from '@/lib/types/estado-de-cuenta';
import { useTextoDelEstado } from './textos';

export interface InteresesDelContratoProps {
  intereses: InteresesDelContrato;
  numero: string;
  /**
   * A dónde se configuran las reglas de mora. Sólo el panel lo pasa: sin él,
   * el motivo de «sin intereses» —que habla de la configuración de la
   * inmobiliaria— no se le muestra al cliente.
   */
  reglasDeMoraHref?: string;
}

export function InteresesDelContratoSeccion({
  intereses,
  numero,
  reglasDeMoraHref,
}: InteresesDelContratoProps) {
  const t = useTextoDelEstado();
  const sinInteres = reglasDeMoraHref ? intereses.sinInteres : null;
  if (intereses.filas.length === 0 && !sinInteres) return null;

  const dias = (n: number) =>
    n === 1 ? t('estadoDeCuenta.unDia') : t('estadoDeCuenta.nDias', { n });
  const cuotas = (n: number) =>
    n === 1 ? t('estadoDeCuenta.unaCuota') : t('estadoDeCuenta.nCuotas', { n });

  return (
    <div data-testid={`intereses-${numero}`} className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h4 className="text-label uppercase tracking-wide text-fg-subtle">
          {t('estadoDeCuenta.intereses')}
        </h4>
        {intereses.filas.length > 0 && (
          <span className="font-mono text-caption tabular-nums text-fg-subtle">
            {intereses.filas.length === 1
              ? t('estadoDeCuenta.unaFila')
              : t('estadoDeCuenta.nFilas', { n: intereses.filas.length })}
          </span>
        )}
      </div>

      {intereses.filas.length > 0 && (
        <>
          <p className="text-caption text-fg-muted">
            {t('estadoDeCuenta.interesesExplicacion')}
          </p>

          <div
            data-tabla
            className="hidden overflow-x-auto rounded-md border border-border-faint md:block"
          >
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="min-w-[220px]">
                    {t('estadoDeCuenta.colConcepto')}
                  </TableHead>
                  <TableHead className="whitespace-nowrap">
                    {t('estadoDeCuenta.colVence')}
                  </TableHead>
                  <TableHead className="whitespace-nowrap text-right">
                    {t('estadoDeCuenta.colDiasDeMora')}
                  </TableHead>
                  <TableHead className="whitespace-nowrap text-right">
                    {t('estadoDeCuenta.colLiquidado')}
                  </TableHead>
                  <TableHead className="whitespace-nowrap text-right">
                    {t('estadoDeCuenta.colAbonado')}
                  </TableHead>
                  <TableHead className="whitespace-nowrap text-right">
                    {t('estadoDeCuenta.colFalta')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {intereses.filas.map((fila) => (
                  <TableRow key={fila.cuotaId} data-testid="interes-fila">
                    <TableCell className="max-w-[360px] align-top">
                      <Concepto fila={fila} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap align-top font-mono text-caption tabular-nums">
                      {fechaLegible(fila.fechaVencimiento)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right align-top font-mono text-caption tabular-nums text-fg-muted">
                      {dias(fila.diasDeMora)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right align-top font-mono tabular-nums">
                      {formatCurrency(fila.liquidado)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right align-top font-mono text-caption tabular-nums text-fg-muted">
                      {formatCurrency(fila.abonado)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        'whitespace-nowrap text-right align-top font-mono font-medium tabular-nums',
                        fila.pendiente > 0 ? 'text-fg' : 'text-fg-subtle',
                      )}
                    >
                      {formatCurrency(fila.pendiente)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ul data-tarjetas className="space-y-2 md:hidden">
            {intereses.filas.map((fila) => (
              <li
                key={fila.cuotaId}
                className="rounded-md border border-border-faint bg-surface p-3"
              >
                <Concepto fila={fila} />
                <div className="mt-2 flex items-baseline justify-between gap-3">
                  <span className="text-label uppercase tracking-wide text-fg-subtle">
                    {t('estadoDeCuenta.colFalta')}
                  </span>
                  <span className="font-mono text-base font-medium tabular-nums text-fg">
                    {formatCurrency(fila.pendiente)}
                  </span>
                </div>
                <p className="mt-1 font-mono text-caption tabular-nums text-fg-muted">
                  {dias(fila.diasDeMora)} · {t('estadoDeCuenta.colLiquidado')}{' '}
                  {formatCurrency(fila.liquidado)}
                  {fila.abonado > 0 &&
                    ` · ${t('estadoDeCuenta.colAbonado')} ${formatCurrency(fila.abonado)}`}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}

      {sinInteres && (
        <div
          data-testid={`sin-intereses-${numero}`}
          className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-md bg-warning-soft px-3 py-2 text-caption text-warning"
        >
          <span>
            {sinInteres.sinReglas
              ? t('estadoDeCuenta.sinReglasDeMora', {
                  cuotas: cuotas(sinInteres.cuotas),
                })
              : t('estadoDeCuenta.sinInteresPorOtroMotivo', {
                  cuotas: cuotas(sinInteres.cuotas),
                  motivo: sinInteres.motivo,
                })}
          </span>
          {sinInteres.sinReglas && reglasDeMoraHref && (
            <Link
              href={reglasDeMoraHref}
              className="font-medium underline underline-offset-4 print:hidden"
              data-testid="configurar-reglas-de-mora"
            >
              {t('estadoDeCuenta.configurarReglas')}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

function Concepto({ fila }: { fila: FilaDeInteres }) {
  const t = useTextoDelEstado();
  return (
    <>
      <p className="text-body-sm text-fg">{fila.concepto}</p>
      {fila.pagadaEnMora && (
        <p className="mt-0.5 text-caption text-fg-muted">
          {t('estadoDeCuenta.pagadaEnMora')}
        </p>
      )}
    </>
  );
}
