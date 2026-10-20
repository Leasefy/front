'use client';

/**
 * Los pasos de una tarea, en orden — GLOW UP (Nico, 20-10-2026).
 *
 * Nico, con Recaudo bancario a la vista: «todo eso así en scroll nadie entiende
 * qué es lo que debe de hacer […] qué requiere hacer primero el usuario y
 * segundo etc.. hasta que complete el job to be done». Una tarea de varios
 * pasos (configurar → subir → revisar → aprobar) se pintaba como bloques
 * apilados del mismo peso, todos abiertos a la vez.
 *
 * Aquí la tarea es un riel vertical numerado:
 *   · el paso ACTUAL va abierto, con su contenido (el formulario, el botón);
 *   · los HECHOS quedan con su visto y una línea que dice qué se hizo; se
 *     pueden volver a abrir («Cambiar») sin perder el orden;
 *   · los que VIENEN se ven (se sabe hacia dónde va esto) pero cerrados, con
 *     la razón por la que todavía no se pueden hacer.
 *
 * El cambio de paso se anima con `Collapse` (altura + fundido, tokens de
 * Cadence); con movimiento reducido, sin desplazamiento.
 */

import { useEffect, useState, type ReactNode } from 'react';
import { CaretDown, Check, Lock } from '@phosphor-icons/react';
import { Collapse } from '@leasefy/cadence';
import { cn } from '@/lib/utils';
import { useTr } from '@/lib/i18n/use-tr';

export type EstadoDelPaso = 'hecho' | 'actual' | 'pendiente';

export interface PasoDeLaTarea {
  id: string;
  titulo: ReactNode;
  /** Qué se hace en este paso, en una línea. */
  descripcion?: ReactNode;
  estado: EstadoDelPaso;
  /** Con el paso hecho: lo que quedó («Bancolombia · convenio 90210»). */
  resumen?: ReactNode;
  /** Lo que se ve con el paso abierto. */
  contenido?: ReactNode;
  /** Con el paso pendiente: por qué todavía no («Primero sube el archivo»). */
  bloqueadoPorque?: ReactNode;
  /** Algo a la derecha de la cabecera (una insignia, un conteo). */
  extra?: ReactNode;
}

export interface PasosDeLaTareaProps {
  pasos: PasoDeLaTarea[];
  /** Título de la tarea, sobre el riel («Cómo entra la plata del banco»). */
  titulo?: ReactNode;
  className?: string;
  'data-testid'?: string;
}

export function PasosDeLaTarea({ pasos, titulo, className, 'data-testid': testId }: PasosDeLaTareaProps) {
  const tr = useTr();
  const actual = pasos.find((p) => p.estado === 'actual')?.id ?? null;
  /** Los pasos hechos que la persona abrió para revisarlos o cambiarlos. */
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set());

  // Cuando la tarea avanza, lo que se había abierto a mano se cierra: la
  // atención va al paso nuevo.
  useEffect(() => {
    setAbiertos(new Set());
  }, [actual]);

  const hechos = pasos.filter((p) => p.estado === 'hecho').length;

  return (
    <section
      className={cn('rounded-lg border border-border bg-surface shadow-sm', className)}
      data-testid={testId}
    >
      {titulo ? (
        <header className="flex items-center justify-between gap-3 border-b border-border-faint px-5 py-4">
          <h2 className="text-body font-semibold text-fg">{titulo}</h2>
          <span className="font-mono text-caption text-fg-muted">
            {tr('{n} de {total}', { n: hechos, total: pasos.length })}
          </span>
        </header>
      ) : null}
      <ol className="relative">
        {pasos.map((p, i) => {
          const abierto = p.estado === 'actual' || (p.estado === 'hecho' && abiertos.has(p.id));
          const ultimo = i === pasos.length - 1;
          const sePuedeAbrir = p.estado === 'hecho' && p.contenido != null;
          const cabecera = (
            <>
              <Nodo estado={p.estado} numero={i + 1} />
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    'block text-body-sm font-semibold',
                    p.estado === 'pendiente' ? 'text-fg-muted' : 'text-fg',
                  )}
                >
                  {p.titulo}
                </span>
                {p.estado === 'hecho' && p.resumen && !abierto ? (
                  <span className="mt-0.5 block truncate text-caption text-fg-muted">{p.resumen}</span>
                ) : p.descripcion && p.estado !== 'hecho' ? (
                  <span className="mt-0.5 block text-caption text-fg-muted">{p.descripcion}</span>
                ) : null}
                {p.estado === 'pendiente' && p.bloqueadoPorque ? (
                  <span className="mt-1 flex items-center gap-1.5 text-caption text-fg-subtle">
                    <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                    {p.bloqueadoPorque}
                  </span>
                ) : null}
              </span>
              {p.extra ? <span className="shrink-0">{p.extra}</span> : null}
              {sePuedeAbrir ? (
                <span className="flex shrink-0 items-center gap-1 text-caption text-fg-muted">
                  {abierto ? tr('Cerrar') : tr('Cambiar')}
                  <CaretDown
                    className={cn('h-3.5 w-3.5 transition-transform duration-base ease-emphasis', abierto && 'rotate-180')}
                    aria-hidden="true"
                  />
                </span>
              ) : null}
            </>
          );
          return (
            <li
              key={p.id}
              className={cn('relative', !ultimo && 'border-b border-border-faint')}
              data-testid={testId ? `${testId}-${p.id}` : undefined}
              data-estado={p.estado}
              aria-current={p.estado === 'actual' ? 'step' : undefined}
            >
              {sePuedeAbrir ? (
                <button
                  type="button"
                  className="flex w-full items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                  aria-expanded={abierto}
                  onClick={() =>
                    setAbiertos((prev) => {
                      const sig = new Set(prev);
                      if (sig.has(p.id)) sig.delete(p.id);
                      else sig.add(p.id);
                      return sig;
                    })
                  }
                >
                  {cabecera}
                </button>
              ) : (
                <div className="flex items-start gap-3 px-5 py-4">{cabecera}</div>
              )}
              <Collapse open={abierto && p.contenido != null} className="px-5 pb-5 sm:pl-14">
                {p.contenido}
              </Collapse>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function Nodo({ estado, numero }: { estado: EstadoDelPaso; numero: number }) {
  const tr = useTr();
  const base = 'flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-mono text-[12px] font-medium';
  if (estado === 'hecho') {
    return (
      <span className={cn(base, 'bg-success-soft text-success')} aria-label={tr('Paso {n}, hecho', { n: numero })}>
        <Check className="h-4 w-4" weight="bold" aria-hidden="true" />
      </span>
    );
  }
  if (estado === 'actual') {
    return (
      <span
        className={cn(base, 'bg-primary text-primary-fg ring-4 ring-primary-soft')}
        aria-label={tr('Paso {n}, el que sigue', { n: numero })}
      >
        {numero}
      </span>
    );
  }
  return (
    <span className={cn(base, 'border border-border-strong text-fg-muted')} aria-label={tr('Paso {n}, después', { n: numero })}>
      {numero}
    </span>
  );
}
