'use client';

/**
 * El resumen que va arriba del estado de cuenta, y la barra de amortización de
 * cada contrato.
 *
 * CEO (vía Nico, 2026-09-13): «algo de lo importante y la magia está en qué tan
 * BONITO se exponga esta información». La apuesta de jerarquía es una sola: el
 * número que el CEO dijo de memoria —«66.500.940 es lo que resta por pagar
 * JYC»— se lee desde el otro lado del escritorio, y todo lo demás baja la voz.
 * Nui lo tiene en 9 pt, en una cajita azul, abajo a la derecha de cada
 * contrato, sin total general.
 *
 * El color se gasta UNA vez: en el estado (al día verde / en mora rojo). El
 * número grande va en tinta — si todo grita, nada se oye.
 */

import * as React from 'react';

import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import type { EstadoDeCuenta } from '@/lib/types/estado-de-cuenta';
import { comoSeLlamaElRol, fechaLegible } from './filas';
import {
  amortizacionDe,
  resumirElCliente,
  type AmortizacionDelContrato,
  type ResumenDelCliente,
} from './resumen';
import { useTextoDelEstado } from './textos';

export function ResumenDelEstado({
  doc,
  hoy,
  className,
}: {
  doc: EstadoDeCuenta;
  hoy: string;
  className?: string;
}) {
  const t = useTextoDelEstado();
  const r = React.useMemo(() => resumirElCliente(doc, hoy), [doc, hoy]);

  return (
    <section
      data-testid="estado-resumen"
      className={cn(
        'rounded-lg border border-border bg-surface p-6 shadow-sm sm:p-8',
        className,
      )}
      aria-label={t('estadoDeCuenta.titulo')}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 className="text-h2 text-fg">{doc.cliente.nombre}</h2>
        <p className="font-mono text-caption tabular-nums text-fg-muted">
          {[
            doc.cliente.documento ? `NIT/CC ${doc.cliente.documento}` : null,
            comoSeLlamaElRol(doc.cliente.tipo),
            doc.contratos.length === 1
              ? '1 contrato'
              : `${doc.contratos.length} contratos`,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-border">
        <div className="sm:pr-6">
          <p className="text-label uppercase tracking-wide text-fg-subtle">
            {t('estadoDeCuenta.restaPorPagar')}
          </p>
          <p
            data-testid="resta-por-pagar"
            className="mt-1 font-mono text-[32px] font-medium leading-none tabular-nums text-fg sm:text-[40px]"
          >
            {formatCurrency(r.restaPorPagar)}
          </p>
          <p className="mt-2 text-caption text-fg-muted">
            {t('estadoDeCuenta.cancelado')}{' '}
            <span className="font-mono tabular-nums">{formatCurrency(r.cancelado)}</span>
          </p>
        </div>

        <div className="sm:px-6">
          <p className="text-label uppercase tracking-wide text-fg-subtle">
            {t('estadoDeCuenta.proximaCuota')}
          </p>
          {r.proxima ? (
            <>
              <p
                data-testid="proxima-cuota"
                className="mt-1 font-mono text-lg font-medium tabular-nums text-fg"
              >
                {fechaLegible(r.proxima.fecha)}
              </p>
              <p className="mt-1 font-mono text-body-sm tabular-nums text-fg-muted">
                {formatCurrency(r.proxima.valor)}
              </p>
            </>
          ) : (
            /* Sin cuota futura no se inventa una: o el contrato terminó, o todo
               lo que queda ya venció y eso lo dice la celda de al lado. */
            <p className="mt-1 text-body-sm text-fg-muted">
              {t('estadoDeCuenta.sinProxima')}
            </p>
          )}
        </div>

        <div className="sm:pl-6">
          <p className="text-label uppercase tracking-wide text-fg-subtle">
            {t('estadoDeCuenta.estado')}
          </p>
          <p className="mt-1">
            <span
              data-testid="estado-del-cliente"
              className={cn(
                'inline-block rounded-full px-3 py-1 text-body-sm',
                r.enMora
                  ? 'bg-danger-soft text-danger'
                  : 'bg-success-soft text-success',
              )}
            >
              {r.enMora
                ? t('estadoDeCuenta.enMoraDias', { dias: r.diasDeMora })
                : t('estadoDeCuenta.alDia')}
            </span>
          </p>
          {r.enMora && (
            <p className="mt-2 text-caption text-fg-muted">
              {r.cuotasVencidas === 1
                ? t('estadoDeCuenta.unaCuotaVencida')
                : t('estadoDeCuenta.cuotasVencidas', { n: r.cuotasVencidas })}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

/**
 * La barra de amortización de un contrato: «14 de 24 cuotas».
 *
 * Dos tramos, no uno. Verde: lo cancelado en nuestro sistema. Gris: lo que vino
 * del sistema anterior —ocurrió, pero no lo registramos nosotros—. Pintarlos
 * del mismo color diría que respondemos por un recaudo que no tenemos; sacar
 * el gris del total diría que el contrato tiene menos cuotas de las que tiene.
 */
export function BarraDeAmortizacion({
  amortizacion,
  className,
  testid,
}: {
  amortizacion: AmortizacionDelContrato;
  className?: string;
  testid?: string;
}) {
  const t = useTextoDelEstado();
  const a = amortizacion;
  if (a.total === 0) return null;

  return (
    <div className={cn('space-y-1.5', className)} data-testid={testid}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-mono text-caption tabular-nums text-fg-muted">
          {t('estadoDeCuenta.cuotasDe', { pagadas: a.pagadas, total: a.total })}
          {a.anteriores > 0 && (
            <span className="text-fg-subtle">
              {' '}
              · {t('estadoDeCuenta.delSistemaAnterior', { n: a.anteriores })}
            </span>
          )}
        </span>
        <span className="font-mono text-caption tabular-nums text-fg-muted">
          {formatCurrency(a.pagadoCop)} / {formatCurrency(a.pactadoCop)}
        </span>
      </div>
      <div
        className="flex h-1.5 overflow-hidden rounded-full bg-surface-muted"
        role="img"
        aria-label={t('estadoDeCuenta.cuotasDe', {
          pagadas: a.pagadas,
          total: a.total,
        })}
      >
        <div
          className="h-full bg-success"
          style={{ width: `${a.porcentaje}%` }}
          data-testid={testid ? `${testid}-pagado` : undefined}
        />
        {a.porcentajeAnterior > 0 && (
          <div
            className="h-full bg-border-strong"
            style={{ width: `${a.porcentajeAnterior}%` }}
          />
        )}
      </div>
    </div>
  );
}

/** La barra del contrato, armada desde el contrato. Atajo para no repetir. */
export function AmortizacionDelContrato({
  contrato,
  className,
}: {
  contrato: Parameters<typeof amortizacionDe>[0];
  className?: string;
}) {
  const a = React.useMemo(() => amortizacionDe(contrato), [contrato]);
  return (
    <BarraDeAmortizacion
      amortizacion={a}
      className={className}
      testid={`amortizacion-${contrato.numero}`}
    />
  );
}

export type { ResumenDelCliente };
