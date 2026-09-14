'use client';

/**
 * El estado de cuenta, resumido, donde se necesita: la ficha del contrato, la
 * del inquilino y la del propietario.
 *
 * CEO (vía Nico, 2026-09-13): el estado de cuenta tiene que estar «presente
 * donde se necesita». Nadie va a abrir otra pantalla para saber si el inquilino
 * que tiene delante está al día: o lo ve en la ficha, o no lo ve.
 *
 * Tres datos y una salida: cuánto resta por pagar, cuándo es lo próximo, si
 * está en mora, y el enlace al documento completo. Nada más — una ficha con
 * media tabla de amortización adentro deja de ser una ficha.
 *
 * ── De dónde salen los números ──────────────────────────────────────────────
 * Del endpoint BARATO (`/estado-de-cuenta/resumen/:tipo/:id`), que suma cuotas
 * sin armar filas. Dos excepciones, las dos explícitas:
 *   · La ficha del CONTRATO (`soloContrato`) necesita los números de UN
 *     contrato y el resumen barato no se recorta: ahí se pide el documento
 *     entero y se filtra.
 *   · Si el resumen barato no responde —todavía no está desplegado—, se cae al
 *     documento entero. Es más caro, pero la ficha muestra el dato en vez de
 *     un hueco.
 */

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight } from '@phosphor-icons/react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/format';
import {
  estadoDeCuentaApi,
  rutaDelEstadoDeCuenta,
} from '@/lib/api/estado-de-cuenta.service';
import type { EstadoDeCuenta } from '@/lib/types/estado-de-cuenta';
import { fechaLegible, hoyLocal, sumarTotales } from './filas';
import { resumirElCliente } from './resumen';
import { useTextoDelEstado } from './textos';

/** Lo que pinta la tarjeta, venga del resumen barato o del documento entero. */
export interface NumerosDeLaFicha {
  restaPorPagar: number;
  proxima: { fecha: string; monto: number } | null;
  enMora: boolean;
  diasDeMora: number;
  /** `false` cuando el cliente no tiene nada que mostrar acá. */
  hayAlgo: boolean;
}

/** El documento entero, recortado a un contrato si hace falta, en tres números. */
export function numerosDelDocumento(
  doc: EstadoDeCuenta,
  hoy: string,
  soloContrato?: string | null,
): NumerosDeLaFicha {
  const contratos = soloContrato
    ? doc.contratos.filter((c) => c.numero === soloContrato)
    : doc.contratos;
  const recortado: EstadoDeCuenta = {
    ...doc,
    contratos,
    totales: soloContrato ? sumarTotales(contratos.map((c) => c.totales)) : doc.totales,
  };
  const r = resumirElCliente(recortado, hoy);
  return {
    restaPorPagar: r.restaPorPagar,
    proxima: r.proxima ? { fecha: r.proxima.fecha, monto: r.proxima.valor } : null,
    enMora: r.enMora,
    diasDeMora: r.diasDeMora,
    hayAlgo: contratos.length > 0,
  };
}

export interface ResumenEnLaFichaProps {
  tipo: 'inquilino' | 'propietario';
  /** `tenantRef` o `propietarioId`, según `tipo`. */
  id: string;
  /**
   * El número de UN contrato. Con esto puesto —la ficha del contrato— el
   * resumen habla sólo de ese contrato, no de todo lo que la persona debe.
   */
  soloContrato?: string | null;
  /** A dónde vuelve el botón. Viaja como `?volver=`. */
  volverA?: string;
  className?: string;
}

export function ResumenEnLaFicha({
  tipo,
  id,
  soloContrato,
  volverA,
  className,
}: ResumenEnLaFichaProps) {
  const t = useTextoDelEstado();
  const hoy = hoyLocal();
  const [numeros, setNumeros] = React.useState<NumerosDeLaFicha | null>(null);
  const [cargando, setCargando] = React.useState(true);

  React.useEffect(() => {
    let vivo = true;
    setCargando(true);
    setNumeros(null);

    const documentoEntero = () =>
      (tipo === 'inquilino'
        ? estadoDeCuentaApi.inquilino(id)
        : estadoDeCuentaApi.propietario(id)
      ).then((d) => numerosDelDocumento(d, hoy, soloContrato));

    const pedir = soloContrato
      ? documentoEntero()
      : estadoDeCuentaApi
          .resumen(tipo, id)
          .then<NumerosDeLaFicha>((r) => ({
            restaPorPagar: r.restaPorPagar,
            proxima: r.proximaCuota,
            enMora: r.enMora !== null,
            diasDeMora: r.enMora?.dias ?? 0,
            hayAlgo: r.contratos > 0,
          }))
          .catch(documentoEntero);

    void pedir
      .then((n) => {
        if (vivo) setNumeros(n);
      })
      .catch(() => {
        /* Sin datos no se pinta nada: ver abajo. */
      })
      .finally(() => {
        if (vivo) setCargando(false);
      });

    return () => {
      vivo = false;
    };
  }, [tipo, id, soloContrato, hoy]);

  if (cargando) {
    return (
      <section
        className={cn('rounded-lg border border-border bg-surface p-5', className)}
        data-testid="resumen-en-la-ficha-cargando"
      >
        <Skeleton className="h-3 w-32" />
        <Skeleton className="mt-3 h-8 w-48" />
      </section>
    );
  }

  /*
   * Si las dos llamadas fallaron, o el cliente no tiene nada en este contrato,
   * no se pinta NADA. Una tarjeta que dice «$0» sobre datos que no llegaron se
   * lee «está al día», que es el error más caro que puede cometer esta pantalla.
   */
  if (!numeros || !numeros.hayAlgo) return null;

  const enlace = `${rutaDelEstadoDeCuenta(tipo, id)}${
    volverA ? `?volver=${encodeURIComponent(volverA)}` : ''
  }`;

  return (
    <section
      data-testid="resumen-en-la-ficha"
      className={cn(
        'rounded-lg border border-border bg-surface p-5 shadow-sm',
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-wrap items-start gap-x-8 gap-y-4">
          <div>
            <p className="text-label uppercase tracking-wide text-fg-subtle">
              {t('estadoDeCuenta.restaPorPagar')}
            </p>
            <p
              data-testid="ficha-resta-por-pagar"
              className="mt-1 font-mono text-2xl font-medium tabular-nums text-fg"
            >
              {formatCurrency(numeros.restaPorPagar)}
            </p>
          </div>

          <div>
            <p className="text-label uppercase tracking-wide text-fg-subtle">
              {t('estadoDeCuenta.proximaCuota')}
            </p>
            {numeros.proxima ? (
              <p className="mt-1 font-mono text-body tabular-nums text-fg">
                {fechaLegible(numeros.proxima.fecha)}
                <span className="text-fg-muted">
                  {' · '}
                  {formatCurrency(numeros.proxima.monto)}
                </span>
              </p>
            ) : (
              <p className="mt-1 text-body-sm text-fg-muted">
                {t('estadoDeCuenta.sinProxima')}
              </p>
            )}
          </div>

          <div>
            <p className="text-label uppercase tracking-wide text-fg-subtle">
              {t('estadoDeCuenta.estado')}
            </p>
            <p className="mt-1">
              <span
                data-testid="ficha-estado"
                className={cn(
                  'inline-block rounded-full px-2.5 py-0.5 text-body-sm',
                  numeros.enMora
                    ? 'bg-danger-soft text-danger'
                    : 'bg-success-soft text-success',
                )}
              >
                {numeros.enMora
                  ? t('estadoDeCuenta.enMoraDias', { dias: numeros.diasDeMora })
                  : t('estadoDeCuenta.alDia')}
              </span>
            </p>
          </div>
        </div>

        <Button asChild variant="secondary" hideArrow className="shrink-0">
          <Link href={enlace} data-testid="ver-estado-de-cuenta">
            {t('estadoDeCuenta.verEstadoDeCuenta')}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
