'use client';

/**
 * Las piezas que comparten la tarjeta «Este movimiento son N recibos»
 * (`MuchosAUno`) y el cajón para corregirla (`CorregirLosRecibos`).
 *
 * Todo con los tokens de movimiento de Cadence vía `movimiento-de-muchos-a-uno`;
 * sólo `transform` y `opacity`, y con movimiento reducido nada se mueve.
 */

import { motion } from 'framer-motion';
import { AnimatedNumber } from '@leasefy/cadence';
import { Check, Info, Warning } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type {
  NivelDeConfianza,
  ReciboDeLaPropuesta,
} from '@/lib/api/conciliacion-bancaria.types';
import { diaLegible, plata } from './formato';
import { MENSAJE_SIN_TABLA, medioLegible, textoDeLaConfianza, textoDeLoMedido, type Rechazo } from './muchos-a-uno';
import type { MovimientoDeMuchosAUno } from './movimiento-de-muchos-a-uno';

/**
 * Una cifra en pesos que CUENTA hasta su valor (y de un valor al siguiente
 * cuando cambia). Con movimiento reducido se pinta ya.
 *
 * El conteo es decorativo (`aria-hidden`): el lector de pantalla y las pruebas
 * leen el valor exacto, que está en `data-valor` y en el texto oculto.
 */
export function CifraQueCuenta({
  valor,
  cuenta,
  desdeCero = false,
  className,
  testId,
}: {
  valor: number;
  cuenta: boolean;
  /** Al montarse cuenta desde $0 (la suma de la tarjeta); si no, sólo los cambios. */
  desdeCero?: boolean;
  className?: string;
  testId?: string;
}) {
  return (
    <span className={cn('tabular-nums', className)} data-valor={valor} data-testid={testId}>
      {cuenta ? (
        <>
          <AnimatedNumber value={valor} from={desdeCero ? 0 : undefined} format={plata} aria-hidden="true" />
          <span className="sr-only">{plata(valor)}</span>
        </>
      ) : (
        plata(valor)
      )}
    </span>
  );
}

const VARIANTE_DEL_NIVEL: Record<NivelDeConfianza, 'success' | 'warning' | 'secondary'> = {
  alta: 'success',
  media: 'warning',
  baja: 'secondary',
};

const RELLENO_DEL_NIVEL: Record<NivelDeConfianza, string> = {
  alta: 'bg-success',
  media: 'bg-warning',
  baja: 'bg-fg-subtle',
};

/**
 * «Confianza media · de cada 10 así, 5 son la correcta».
 *
 * 🔴 Nico (C1-MEDIR Q1, 03-10-2026): «sólo alta, media o baja; si hay número,
 * el medido». El nivel siempre; el número sólo si el back lo midió
 * (`deCadaDiez`, del banco de casos), y la barra crece hasta ESE número. Sin
 * medida no hay barra: una barra es un número.
 */
export function ConfianzaDeLaPropuesta({
  nivel,
  deCadaDiez,
  movimiento: mov,
}: {
  nivel: NivelDeConfianza;
  deCadaDiez?: number | null;
  movimiento: MovimientoDeMuchosAUno;
}) {
  const medido = textoDeLoMedido(deCadaDiez);
  return (
    <span className="inline-flex flex-wrap items-center gap-2" data-testid="confianza" data-nivel={nivel}>
      <Badge variant={VARIANTE_DEL_NIVEL[nivel] ?? 'secondary'}>{textoDeLaConfianza(nivel)}</Badge>
      {medido && typeof deCadaDiez === 'number' && (
        <>
          <span className="relative h-1 w-12 overflow-hidden rounded-full bg-border" aria-hidden="true">
            <motion.span
              className={cn('absolute inset-0 origin-left rounded-full', RELLENO_DEL_NIVEL[nivel] ?? 'bg-fg-subtle')}
              {...mov.barra(deCadaDiez / 10)}
            />
          </span>
          <span className="text-caption text-fg-muted" data-testid="confianza-medida">
            {medido}
          </span>
        </>
      )}
    </span>
  );
}

/**
 * Un recibo de la combinación en dos renglones: número, valor e inquilino;
 * debajo inmueble, fecha, medio y quién pagó (la aseguradora, la empresa).
 */
export function ReciboEnLinea({ recibo: r, className }: { recibo: ReciboDeLaPropuesta; className?: string }) {
  const medio = medioLegible(r.medio);
  const detalle = [r.propertyTitle, diaLegible(r.fecha), medio].filter(Boolean).join(' · ');
  return (
    <span className={cn('flex min-w-0 flex-col', className)} data-testid={`recibo-${r.id}`}>
      <span className="flex flex-wrap items-baseline gap-x-2 text-body-sm">
        <span className="font-medium text-fg">N.º {String(r.numero)}</span>
        <span className="tabular-nums text-fg">{plata(r.valorCop)}</span>
        <span className="min-w-0 truncate text-fg">{r.tenantName ?? 'Sin inquilino'}</span>
      </span>
      <span className="text-caption text-fg-muted">
        {detalle}
        {r.pagador?.nombre && (
          <>
            {detalle ? ' · ' : ''}
            Pagó {r.pagador.nombre}
            {r.pagador.nit ? ` (NIT ${r.pagador.nit})` : ''}
          </>
        )}
      </span>
    </span>
  );
}

/** El visto de «calza» que salta cuando la suma llega al valor del banco. */
export function Calza({ movimiento: mov, children }: { movimiento: MovimientoDeMuchosAUno; children: React.ReactNode }) {
  return (
    <motion.span
      className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-caption font-medium text-success"
      data-testid="calza"
      {...mov.calza}
    >
      <Check weight="bold" className="h-3.5 w-3.5" aria-hidden="true" />
      {children}
    </motion.span>
  );
}

/** Falta la tabla de vínculos (la migración): se ve la propuesta, no se aplica. */
export function AvisoSinTabla({ movimiento: mov }: { movimiento: MovimientoDeMuchosAUno }) {
  return (
    <motion.p
      role="status"
      className="flex items-start gap-1.5 rounded-md border border-border bg-surface-muted px-2.5 py-2 text-caption text-fg-muted"
      data-testid="aviso-sin-tabla"
      {...mov.aviso}
    >
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {MENSAJE_SIN_TABLA}
    </motion.p>
  );
}

/** Lo que dijo el servidor, en palabras; la suma que no calza, con sus tres cifras. */
export function AvisoDelRechazo({
  rechazo,
  movimiento: mov,
}: {
  rechazo: Rechazo;
  movimiento: MovimientoDeMuchosAUno;
}) {
  return (
    <motion.div
      role="alert"
      className="space-y-1.5 rounded-md border border-danger/40 bg-danger-soft px-2.5 py-2 text-caption text-fg"
      data-testid="rechazo"
      data-tipo={rechazo.tipo}
      {...mov.aviso}
    >
      <p className="flex items-start gap-1.5">
        <Warning className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger" aria-hidden="true" />
        {rechazo.mensaje}
      </p>
      {rechazo.cifras && (
        <dl className="grid grid-cols-3 gap-2 tabular-nums" data-testid="cifras-del-rechazo">
          <div>
            <dt className="text-fg-muted">Suma de los recibos</dt>
            <dd className="font-medium">{plata(rechazo.cifras.sumaCop)}</dd>
          </div>
          <div>
            <dt className="text-fg-muted">Valor del banco</dt>
            <dd className="font-medium">{plata(rechazo.cifras.valorCop)}</dd>
          </div>
          <div>
            {/* suma − valor: negativo = el banco trae de más. */}
            <dt className="text-fg-muted">
              {rechazo.cifras.diferenciaCop < 0 ? 'Sobra en el banco' : 'Los recibos pasan por'}
            </dt>
            <dd className="font-medium">{plata(Math.abs(rechazo.cifras.diferenciaCop))}</dd>
          </div>
        </dl>
      )}
      {rechazo.recibos && rechazo.recibos.length > 0 && (
        <p className="text-fg-muted" data-testid="recibos-del-rechazo">
          {rechazo.recibos.length === 1 ? 'Recibo' : 'Recibos'}:{' '}
          {rechazo.recibos.map((r) => `N.º ${r.numero}`).join(', ')}
        </p>
      )}
    </motion.div>
  );
}
