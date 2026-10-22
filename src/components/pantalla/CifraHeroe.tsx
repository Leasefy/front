'use client';

/**
 * La cifra que decide la pantalla, grande y sola, con su barra partida en tramos
 * (revisión de diseño de Dinero, 22-10-2026: «UNA cifra héroe "Faltan $ X de $ Y"
 * + barra»; antes era una frase con cuatro cifras del mismo peso y cinco pestañas
 * con plata debajo).
 *
 * Se lee en este orden:
 *   1. el rótulo en mono («FALTA POR COBRAR»);
 *   2. la cifra, en DM Mono grande, y a su lado el contexto que la vuelve un hecho
 *      («de los $ 7.500.000 que se deben en octubre de 2026»);
 *   3. la barra: cada tramo es una parte del total, en el orden en que la plata
 *      lo recorre (entró · por vencer · vencido · cartera);
 *   4. la leyenda de los tramos, cada uno con su monto en mono.
 *
 * Quien la usa decide qué es cada cifra (un botón que filtra, un enlace o texto):
 * la pieza sólo da la jerarquía. Los tramos en cero no se pintan en la barra,
 * pero sí en la leyenda cuando son parte de la cuenta (`siempre`).
 */

import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { motionDuration, motionEase } from '@leasefy/cadence';

import { cn } from '@/lib/utils';

export type TonoDelTramo = 'exito' | 'neutro' | 'aviso' | 'critico';

export interface TramoDeLaCifra {
  clave: string;
  etiqueta: ReactNode;
  monto: number;
  tono: TonoDelTramo;
  /** La cifra ya armada (un botón, un número que cuenta). Sin ella no se dibuja nada a la derecha. */
  cifra?: ReactNode;
  /** Un renglón chico debajo de la cifra («+ $ 120.000 de intereses»). */
  extra?: ReactNode;
  /** Se muestra en la leyenda aunque esté en cero. */
  siempre?: boolean;
  'data-testid'?: string;
}

interface CifraHeroeProps {
  rotulo: ReactNode;
  cifra: ReactNode;
  contexto?: ReactNode;
  tramos?: readonly TramoDeLaCifra[];
  /** Contra qué se mide la barra; por defecto, la suma de los tramos. */
  total?: number;
  pie?: ReactNode;
  /** `mediana`: cuando hay otra cifra más importante en la pantalla (p. ej. lo que se aprueba). */
  tamano?: 'grande' | 'mediana';
  className?: string;
  'data-testid'?: string;
}

const COLOR_DEL_TRAMO: Record<TonoDelTramo, string> = {
  exito: 'bg-success-500',
  neutro: 'bg-sand-300 dark:bg-neutral-600',
  aviso: 'bg-warning-500',
  critico: 'bg-error-500',
};

export function CifraHeroe({
  rotulo,
  cifra,
  contexto,
  tramos = [],
  total,
  pie,
  tamano = 'grande',
  className,
  'data-testid': testId,
}: CifraHeroeProps) {
  const suma = tramos.reduce((s, t) => s + Math.max(0, t.monto), 0);
  const base = total && total > 0 ? total : suma;
  const conMonto = tramos.filter((t) => t.monto > 0);
  const enLeyenda = tramos.filter((t) => t.siempre || t.monto > 0);

  return (
    <div className={cn('space-y-4', className)} data-testid={testId}>
      <div className="space-y-1.5">
        <p className="font-mono text-caption uppercase tracking-[0.12em] text-fg-subtle">{rotulo}</p>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span
            className={cn(
              'font-mono font-medium leading-none tracking-[-0.02em] tabular-nums text-fg',
              tamano === 'grande' ? 'text-[32px] sm:text-[40px]' : 'text-[22px] sm:text-[24px]',
            )}
          >
            {cifra}
          </span>
          {contexto ? <span className="text-[15px] leading-snug text-fg-muted">{contexto}</span> : null}
        </div>
      </div>

      {base > 0 && conMonto.length > 0 ? (
        <div
          className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full bg-surface-muted"
          role="img"
          aria-label="Cómo se reparte la cifra"
          data-testid={testId ? `${testId}-barra` : undefined}
        >
          {conMonto.map((t) => (
            <motion.div
              key={t.clave}
              className={cn('h-full origin-left first:rounded-l-full last:rounded-r-full', COLOR_DEL_TRAMO[t.tono])}
              style={{ width: `${(Math.max(0, t.monto) / base) * 100}%` }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: motionDuration.reveal, ease: motionEase.enter }}
            />
          ))}
        </div>
      ) : null}

      {enLeyenda.length > 0 ? (
        <ul className="grid grid-cols-2 gap-x-6 gap-y-3 sm:flex sm:flex-wrap sm:gap-x-8">
          {enLeyenda.map((t) => (
            <li key={t.clave} className="min-w-0 space-y-0.5" data-testid={t['data-testid']}>
              <p className="flex items-center gap-1.5 text-caption text-fg-muted">
                <span className={cn('h-2 w-2 shrink-0 rounded-full', COLOR_DEL_TRAMO[t.tono])} />
                {t.etiqueta}
              </p>
              {t.cifra ? <div className="font-mono text-body-sm tabular-nums text-fg">{t.cifra}</div> : null}
              {t.extra}
            </li>
          ))}
        </ul>
      ) : null}

      {pie ? <div className="text-caption text-fg-muted">{pie}</div> : null}
    </div>
  );
}
