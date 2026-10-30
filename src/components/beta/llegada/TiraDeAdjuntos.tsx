'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { motionDuration, motionEase } from '@leasefy/cadence';
import {
  ArrowClockwise,
  File,
  FilePdf,
  FileText,
  FileXls,
  Image as IconoDeFoto,
  WarningCircle,
  X,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useTr } from '@/lib/i18n/use-tr';
import { pesoLegible, type FamiliaDelAdjunto } from '@/lib/chat/adjuntos';
import type { AdjuntoEnElCompositor } from '@/lib/chat/use-adjuntos-del-compositor';

/**
 * Los archivos que van con el mensaje, dentro de la caja del chat, arriba del
 * texto (29-10-2026, «el chat lo resuelve todo»). Cada uno dice qué es (la
 * miniatura de la foto o el ícono del tipo), cuánto pesa o cuánto lleva
 * subido, y se quita con su aspa antes de mandar. Uno que no subió dice por
 * qué y se reintenta ahí mismo.
 *
 * Fichas en arena SIN borde (una sola capa: la caja ya tiene el suyo).
 */

export function IconoDelAdjunto({ familia, className }: { familia: FamiliaDelAdjunto; className?: string }) {
  const props = { size: 20, 'aria-hidden': true as const, className };
  switch (familia) {
    case 'imagen':
      return <IconoDeFoto {...props} />;
    case 'pdf':
      return <FilePdf {...props} />;
    case 'planilla':
      return <FileXls {...props} />;
    case 'xml':
    case 'texto':
      return <FileText {...props} />;
    default:
      return <File {...props} />;
  }
}

export function TiraDeAdjuntos({
  adjuntos,
  onQuitar,
  onReintentar,
  className,
}: {
  adjuntos: readonly AdjuntoEnElCompositor[];
  onQuitar: (clave: string) => void;
  onReintentar: (clave: string) => void;
  className?: string;
}) {
  const tr = useTr();
  const reducido = useReducedMotion() ?? false;
  if (adjuntos.length === 0) return null;
  return (
    <ul
      data-testid="tira-de-adjuntos"
      aria-label={tr('Archivos adjuntos')}
      className={cn('flex flex-wrap gap-2', className)}
    >
      <AnimatePresence initial={false}>
        {adjuntos.map((a) => {
          const porciento = Math.round(a.avance * 100);
          return (
            <motion.li
              key={a.clave}
              layout={!reducido}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: motionDuration.fast, ease: motionEase.exit } }}
              transition={{ duration: motionDuration.base, ease: motionEase.enter }}
              data-testid="adjunto-en-la-caja"
              data-estado={a.estado}
              className="relative flex min-w-0 max-w-[260px] items-center gap-2.5 overflow-hidden rounded-md bg-surface-muted py-1.5 pl-1.5 pr-1"
            >
              {a.miniatura ? (
                // Una foto local (blob:): next/image no aplica.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.miniatura} alt="" className="size-9 shrink-0 rounded-sm object-cover" />
              ) : (
                <span aria-hidden className="flex size-9 shrink-0 items-center justify-center text-fg-muted">
                  <IconoDelAdjunto familia={a.familia} />
                </span>
              )}
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block truncate text-[13px] text-fg" title={a.nombre}>
                  {a.nombre}
                </span>
                {a.estado === 'error' ? (
                  <span role="alert" className="mt-0.5 flex items-center gap-1 text-[13px] text-danger">
                    <WarningCircle size={13} aria-hidden className="shrink-0" />
                    <span className="truncate" title={a.error ?? undefined}>
                      {tr('No subió')}
                    </span>
                  </span>
                ) : (
                  <span className="mt-0.5 block font-mono text-[11px] tabular-nums text-fg-subtle">
                    {a.estado === 'subiendo'
                      ? tr('Subiendo · {n} %', { n: porciento })
                      : pesoLegible(a.tamano)}
                  </span>
                )}
              </span>
              {a.estado === 'error' ? (
                <button
                  type="button"
                  onClick={() => onReintentar(a.clave)}
                  aria-label={tr('Reintentar «{nombre}»', { nombre: a.nombre })}
                  title={a.error ?? undefined}
                  className="relative flex size-8 shrink-0 items-center justify-center rounded-full text-fg-muted transition-colors duration-fast hover:bg-surface hover:text-fg [@media(pointer:coarse)]:size-11"
                >
                  <ArrowClockwise size={14} aria-hidden />
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => onQuitar(a.clave)}
                aria-label={tr('Quitar «{nombre}»', { nombre: a.nombre })}
                data-testid="quitar-adjunto"
                className="relative flex size-8 shrink-0 items-center justify-center rounded-full text-fg-muted transition-colors duration-fast hover:bg-surface hover:text-fg [@media(pointer:coarse)]:size-11"
              >
                <X size={13} aria-hidden />
              </button>
              {a.estado === 'subiendo' ? (
                <span
                  role="progressbar"
                  aria-label={tr('Subiendo «{nombre}»', { nombre: a.nombre })}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={porciento}
                  className="absolute inset-x-0 bottom-0 h-0.5 bg-border-faint"
                >
                  <span
                    className="block h-full origin-left bg-primary transition-transform duration-base ease-enter"
                    style={{ transform: `scaleX(${Math.max(0.04, a.avance)})` }}
                  />
                </span>
              ) : null}
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ul>
  );
}
