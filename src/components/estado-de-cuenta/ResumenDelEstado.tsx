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
import { comoSeLlamaElRol, documentoDelCliente, fechaLegible } from './filas';
import {
  amortizacionDe,
  resumirElCliente,
  type AmortizacionDelContrato,
  type ResumenDelCliente,
} from './resumen';
import { claveDelLado, useTextoDelEstado } from './textos';
import { interesesDelEstado } from './intereses';
import { rotuloDePorGirar, rotuloDeProximosGiros } from '@/lib/propietarios/por-girar';
import { sumarMeses } from '@/lib/recaudo/meses';
import { CifraHeroe } from '@/components/pantalla/CifraHeroe';

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
  /*
   * 🔴 «Por girar» → UNA sola cifra: hasta el mes en curso, neta de sus
   * deducciones, y los próximos giros aparte (Nico, 04-10-2026). La manda el
   * back con la misma regla del chat y de las pantallas de la inmobiliaria.
   * Con un filtro puesto, el documento habla de lo filtrado: ahí sigue la
   * cuenta de las filas, como antes.
   */
  const porGirar = esPropietario && !doc.filtro ? doc.porGirar : undefined;

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
            documentoDelCliente(doc.cliente),
            comoSeLlamaElRol(doc.cliente.tipo),
            doc.contratos.length === 1
              ? '1 contrato'
              : `${doc.contratos.length} contratos`,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>

      {/*
        Revisora r27 (portales y panel): LA RESPUESTA con la pieza de la casa (`CifraHeroe`), como Pagos, en vez de la
        caja de tres celdas armada a mano. El número grande sigue siendo el que el CEO dijo de memoria (lo que resta
        por pagar; al propietario, lo que falta por girar). La barra reparte lo que YA estaba en el resumen —lo
        cancelado, lo vencido y lo que falta por vencer—, sin cuentas nuevas. El estado (al día / en plazo / en mora)
        va junto a la cifra; la próxima cuota, los giros y los intereses, al pie.
      */}
      <CifraHeroe
        className="rounded-lg bg-surface-muted p-5 sm:p-6"
        rotulo={porGirar ? rotuloDePorGirar(porGirar.hastaMes) : t('estadoDeCuenta.restaPorPagar')}
        cifra={
          <span data-testid="resta-por-pagar" className="whitespace-nowrap">
            {formatCurrency(porGirar ? porGirar.porGirarCop : r.restaPorPagar)}
          </span>
        }
        contexto={
          <span
            data-testid="estado-del-cliente"
            className={cn(
              'inline-block rounded-full px-3 py-0.5 text-body-sm font-medium',
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
                ? // 🔴 CR-31: sin plazo fijado es «Vencida», no «en plazo».
                  r.sinPlazoFijado
                  ? t('estadoDeCuenta.vencidaSinPlazo')
                  : t('estadoDeCuenta.vencidoEnPlazo')
                : t('estadoDeCuenta.alDia')}
          </span>
        }
        tramos={
          porGirar
            ? undefined
            : [
                {
                  clave: 'cancelado',
                  etiqueta: t('estadoDeCuenta.cancelado'),
                  monto: r.cancelado,
                  tono: 'exito',
                  cifra: formatCurrency(r.cancelado),
                },
                {
                  clave: 'vencido',
                  etiqueta: t('estadoDeCuenta.vencido'),
                  monto: r.vencidoCop,
                  tono: esPropietario ? 'aviso' : r.enMora ? 'critico' : 'aviso',
                  cifra: (
                    <span
                      data-testid="vencido-del-cliente"
                      className={cn(esPropietario ? 'text-warning' : r.enMora ? 'text-danger' : 'text-warning')}
                    >
                      {formatCurrency(r.vencidoCop)}
                    </span>
                  ),
                },
                {
                  clave: 'por-vencer',
                  etiqueta: t('estadoDeCuenta.porVencer'),
                  monto: Math.max(0, r.restaPorPagar - r.vencidoCop),
                  tono: 'neutro',
                  cifra: formatCurrency(Math.max(0, r.restaPorPagar - r.vencidoCop)),
                },
              ]
        }
        pie={
          <span className="block space-y-1">
            {porGirar && (
              <span className="block" data-testid="proximos-giros-del-propietario">
                {rotuloDeProximosGiros(sumarMeses(porGirar.hastaMes, 1), porGirar.proximosGirosHastaMes)}
                :{' '}
                <span className="font-mono tabular-nums">{formatCurrency(porGirar.proximosGirosCop)}</span>
                {porGirar.deduccionesCop > 0 && (
                  <>
                    {' · ya descontados '}
                    <span className="font-mono tabular-nums">{formatCurrency(porGirar.deduccionesCop)}</span>
                    {' de deducciones'}
                  </>
                )}
              </span>
            )}
            {porGirar && (
              <span className="block">
                {t('estadoDeCuenta.cancelado')}{' '}
                <span className="font-mono tabular-nums">{formatCurrency(r.cancelado)}</span>
                {r.vencidoCop > 0 && (
                  <>
                    {' · '}
                    {t('estadoDeCuenta.vencido')}{' '}
                    <span data-testid="vencido-del-cliente" className="font-mono tabular-nums text-warning">
                      {formatCurrency(r.vencidoCop)}
                    </span>
                  </>
                )}
              </span>
            )}
            <span className="block">
              {t('estadoDeCuenta.proximaCuota')}:{' '}
              {r.proxima ? (
                <>
                  <span data-testid="proxima-cuota" className="font-mono tabular-nums text-fg">
                    {fechaLegible(r.proxima.fecha)}
                  </span>
                  {' · '}
                  <span className="font-mono tabular-nums">{formatCurrency(r.proxima.valor)}</span>
                </>
              ) : (
                /* Sin cuota futura no se inventa una: o el contrato terminó, o todo lo que queda ya venció. */
                t('estadoDeCuenta.sinProxima')
              )}
            </span>
            {r.enPlazo && (
              <span className="block" data-testid="estado-en-plazo">
                {r.sinPlazoFijado
                  ? r.cuotasEnPlazo === 1
                    ? t('estadoDeCuenta.unaVencidaSinPlazoDetalle')
                    : t('estadoDeCuenta.vencidaSinPlazoDetalle', { n: r.cuotasEnPlazo })
                  : r.cuotasEnPlazo === 1
                    ? t('estadoDeCuenta.unaVencidaEnPlazoDetalle')
                    : t('estadoDeCuenta.vencidoEnPlazoDetalle', { n: r.cuotasEnPlazo })}
              </span>
            )}
            {r.enMora && (
              <span className="block">
                {r.cuotasVencidas === 1
                  ? t('estadoDeCuenta.unaCuotaVencida')
                  : t('estadoDeCuenta.cuotasVencidas', { n: r.cuotasVencidas })}
              </span>
            )}
            {/* El número grande es CAPITAL. El interés de mora va aparte, con su propio total: sumarlo arriba lo
                volvería imposible de cruzar con la factura del mes. */}
            {intereses && intereses.pendiente > 0 && (
              <span data-testid="intereses-del-cliente" className="block">
                <span className="text-danger">
                  {t('estadoDeCuenta.masIntereses', { monto: formatCurrency(intereses.pendiente) })}
                </span>
                {' · '}
                {t('estadoDeCuenta.conIntereses')}{' '}
                <span className="font-mono tabular-nums text-fg">
                  {formatCurrency(intereses.restaPorPagarConIntereses)}
                </span>
              </span>
            )}
          </span>
        }
      />
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
              {/* PG-08: sin comprobante no se cuentan como pagadas: se dice. */}
              {a.anterioresSinComprobante > 0 && (
                <span data-testid="anteriores-sin-comprobante">
                  {', '}
                  {t('estadoDeCuenta.sinComprobantesDe', { n: a.anterioresSinComprobante })}
                </span>
              )}
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
        documento los nombraba. Con los tres montos aquí, los tres suman lo
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
