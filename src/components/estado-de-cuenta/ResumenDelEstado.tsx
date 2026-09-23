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
 * número grande va en tinta — si todo grita, nada se oye. Los tres datos van
 * en una franja gris (`bg-surface-muted`) para que se lean como UN bloque —la
 * respuesta— y no como tres tarjetas sueltas.
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
import { claveDelLado, useTextoDelEstado } from './textos';
import { interesesDelEstado } from './intereses';

export function ResumenDelEstado({
  doc,
  hoy,
  className,
}: {
  doc: EstadoDeCuenta;
  hoy: string;
  className?: string;
}) {
  const texto = useTextoDelEstado();
  // Los rótulos dependen del lado: al propietario no se le dice «en mora».
  const rol = doc.cliente.tipo;
  const esPropietario = rol === 'PROPIETARIO';
  const t: typeof texto = (clave, params) => texto(claveDelLado(clave, rol), params);
  const r = React.useMemo(() => resumirElCliente(doc, hoy), [doc, hoy]);
  const intereses = interesesDelEstado(doc);

  return (
    <section
      data-testid="estado-resumen"
      className={cn('space-y-5', className)}
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

      {/* La primera celda es más ancha que las otras dos: es la del número
          grande, y «$ 189.000.000» a 36 px no entra en un tercio. Sin el
          `whitespace-nowrap` el «$» se quedaba solo en una línea — el error
          más visible que puede tener una cifra, según DESIGN.md §19. */}
      <div className="grid gap-5 rounded-lg bg-surface-muted p-5 sm:grid-cols-[1.4fr_1fr_1fr] sm:gap-0 sm:divide-x sm:divide-border sm:p-6">
        <div className="min-w-0 sm:pr-6">
          <p className="text-label uppercase tracking-wide text-fg-subtle">
            {t('estadoDeCuenta.restaPorPagar')}
          </p>
          <p
            data-testid="resta-por-pagar"
            className="mt-1.5 whitespace-nowrap font-mono text-[28px] font-medium leading-none tabular-nums text-fg sm:text-[32px] lg:text-[36px]"
          >
            {formatCurrency(r.restaPorPagar)}
          </p>
          <p className="mt-2.5 text-caption text-fg-muted">
            {t('estadoDeCuenta.cancelado')}{' '}
            <span className="font-mono tabular-nums">{formatCurrency(r.cancelado)}</span>
            {r.vencidoCop > 0 && (
              <>
                {' · '}
                {t('estadoDeCuenta.vencido')}{' '}
                <span
                  data-testid="vencido-del-cliente"
                  className={cn('font-mono tabular-nums', esPropietario ? 'text-warning' : 'text-danger')}
                >
                  {formatCurrency(r.vencidoCop)}
                </span>
              </>
            )}
          </p>
          {/* El número grande es CAPITAL. El interés de mora va debajo, aparte,
              con su propio total: sumarlo arriba lo volvería imposible de
              cruzar con la factura del mes. */}
          {intereses && intereses.pendiente > 0 && (
            <p data-testid="intereses-del-cliente" className="mt-1 text-caption text-fg-muted">
              <span className="text-danger">
                {t('estadoDeCuenta.masIntereses', {
                  monto: formatCurrency(intereses.pendiente),
                })}
              </span>
              {' · '}
              {t('estadoDeCuenta.conIntereses')}{' '}
              <span className="font-mono tabular-nums text-fg">
                {formatCurrency(intereses.restaPorPagarConIntereses)}
              </span>
            </p>
          )}
        </div>

        <div className="sm:px-6">
          <p className="text-label uppercase tracking-wide text-fg-subtle">
            {t('estadoDeCuenta.proximaCuota')}
          </p>
          {r.proxima ? (
            <>
              <p
                data-testid="proxima-cuota"
                className="mt-1.5 font-mono text-lg font-medium tabular-nums text-fg"
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
            <p className="mt-1.5 text-body-sm text-fg-muted">
              {t('estadoDeCuenta.sinProxima')}
            </p>
          )}
        </div>

        <div className="sm:pl-6">
          <p className="text-label uppercase tracking-wide text-fg-subtle">
            {t('estadoDeCuenta.estado')}
          </p>
          <p className="mt-1.5">
            <span
              data-testid="estado-del-cliente"
              className={cn(
                'inline-block rounded-full px-3 py-1 text-body-sm font-medium',
                r.enMora
                  ? /* Rojo es «debes»: al propietario se le avisa en ámbar. */
                    esPropietario
                    ? 'bg-warning-soft text-warning'
                    : 'bg-danger-soft text-danger'
                  : r.enPlazo
                    ? 'bg-warning-soft text-warning'
                    : 'bg-success-soft text-success',
              )}
            >
              {r.enMora
                ? t('estadoDeCuenta.enMoraDias', { dias: r.diasDeMora })
                : r.enPlazo
                  ? t('estadoDeCuenta.vencidoEnPlazo')
                  : t('estadoDeCuenta.alDia')}
            </span>
          </p>
          {r.enPlazo && (
            <p className="mt-2 text-caption text-fg-muted" data-testid="estado-en-plazo">
              {t('estadoDeCuenta.vencidoEnPlazoDetalle', { n: r.cuotasEnPlazo })}
            </p>
          )}
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
 * La barra de amortización de un contrato: «Pagadas 14 de 24 cuotas».
 *
 * Dos tramos, no uno. Verde: lo cancelado en nuestro sistema. Gris: lo que vino
 * del sistema anterior —ocurrió, pero no lo registramos nosotros—. Pintarlos
 * del mismo color diría que respondemos por un recaudo que no tenemos; sacar
 * el gris del total diría que el contrato tiene menos cuotas de las que tiene.
 * Cuando hay tramo gris, la leyenda dice qué es cada color: una barra de dos
 * tonos sin leyenda es un acertijo.
 */
export function BarraDeAmortizacion({
  amortizacion,
  className,
  testid,
  rol,
}: {
  amortizacion: AmortizacionDelContrato;
  className?: string;
  testid?: string;
  /** Del lado PROPIETARIO la barra dice «Giradas», no «Pagadas». */
  rol?: 'INQUILINO' | 'PROPIETARIO';
}) {
  const texto = useTextoDelEstado();
  const t: typeof texto = (clave, params) => texto(claveDelLado(clave, rol), params);
  const a = amortizacion;
  if (a.total === 0) return null;

  return (
    <div className={cn('space-y-2', className)} data-testid={testid}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="text-body-sm text-fg">
          {/* 🔴 `cubiertas`, no `pagadas`: una cuota que vino pagada del sistema
              anterior está pagada (Nico, 21-09). La distinción entre lo que
              recaudamos nosotros y lo migrado la siguen llevando la barra y su
              leyenda, que es donde no se puede perder. */}
          {t('estadoDeCuenta.pagadasDe', { pagadas: a.cubiertas, total: a.total })}
          {a.anteriores > 0 && (
            <span className="text-fg-subtle">
              {' '}
              · {t('estadoDeCuenta.delSistemaAnterior', { n: a.anteriores })}
            </span>
          )}
        </span>
        <span className="font-mono text-caption tabular-nums text-fg-muted">
          {t('estadoDeCuenta.deLoPactado', {
            pagado: formatCurrency(a.cubiertoCop),
            pactado: formatCurrency(a.pactadoCop),
          })}
        </span>
      </div>
      <div
        className="flex h-2 overflow-hidden rounded-full bg-surface-muted"
        role="img"
        aria-label={t('estadoDeCuenta.cuotasDe', {
          pagadas: a.cubiertas,
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
      {/*
        🔴 19-09-2026 · La leyenda lleva la PLATA de cada tramo, y ya no es
        decorativa.
        
        Antes decía sólo los nombres de los colores y estaba `aria-hidden`.
        Arriba se leía «$ 0 de $ 142.350.000» y abajo «Resta por pagar
        $ 98.550.000»: faltaban $ 43.800.000 que no estaban ni pagados ni
        pendientes —las cuotas del sistema anterior—, y ninguna cifra del
        documento los nombraba. Con los tres montos acá, los tres suman lo
        pactado y cualquiera lo puede cuadrar a ojo. Es un documento que se le
        manda al cliente: no puede tener plata sin explicar.
      */}
      {a.anteriores > 0 && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-caption text-fg-muted">
          <li className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-success" aria-hidden="true" />
            {t('estadoDeCuenta.leyendaPagadas')}
            <span className="font-mono tabular-nums">{formatCurrency(a.pagadoCop)}</span>
          </li>
          <li className="flex items-center gap-1.5" data-testid="leyenda-anteriores">
            <span className="inline-block h-2 w-2 rounded-full bg-border-strong" aria-hidden="true" />
            {t('estadoDeCuenta.leyendaAnteriores')}
            <span className="font-mono tabular-nums">{formatCurrency(a.anterioresCop)}</span>
          </li>
          <li className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full bg-surface-muted ring-1 ring-border"
              aria-hidden="true"
            />
            {t('estadoDeCuenta.leyendaPorPagar')}
            <span className="font-mono tabular-nums">
              {formatCurrency(a.pactadoCop - a.pagadoCop - a.anterioresCop)}
            </span>
          </li>
        </ul>
      )}
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
      rol={contrato.rol}
      className={className}
      testid={`amortizacion-${contrato.numero}`}
    />
  );
}

export type { ResumenDelCliente };
