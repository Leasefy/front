'use client';

/**
 * Los pasos de publicar gratis, arriba del registro corto y del publicador (Nico, 28-10-2026: «esos 3 pasos debería
 * de tener steps así bien bonitos como los steps del paso a paso del onboarding viejo»).
 *
 * El MISMO dibujo de `OnboardingStepList` (el número o el ✓ que llega con su resorte, la marca azul que se desliza de
 * un paso al siguiente, la línea que se pinta al pasar), pero EN FILA: el publicador es ancho y una columna a la
 * izquierda lo apretaba. En teléfono quedan los círculos y el nombre del paso actual debajo.
 */

import { useId, useState } from 'react';
import { Check } from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import { MotionIndicator, motionScale, motionSpring } from '@leasefy/cadence';

import { cn } from '@/lib/utils';

export type MomentoDePublicar = 'datos' | 'inmueble' | 'listo';

const PASOS = [
  { clave: 'cuenta', nombre: 'Tu cuenta', detalle: 'Correo y contraseña' },
  { clave: 'datos', nombre: 'Tus datos', detalle: 'Nombre y WhatsApp' },
  { clave: 'inmueble', nombre: 'Tu inmueble', detalle: 'Fotos, precio y dirección' },
] as const;

/** Qué paso va: la cuenta ya existe (estamos adentro); «listo» deja los tres hechos. */
function indiceActual(momento: MomentoDePublicar): number {
  if (momento === 'listo') return PASOS.length;
  return PASOS.findIndex((p) => p.clave === momento);
}

export function PasosDePublicar({ momento, className }: { momento: MomentoDePublicar; className?: string }) {
  const id = useId();
  const actual = indiceActual(momento);
  // Lo que ya venía hecho al abrir se ve quieto: sólo «llega» el ✓ que se gana mirando.
  const [hechosAlMontar] = useState(() => new Set(PASOS.filter((_, i) => i < actual).map((p) => p.clave)));
  const pasoActual = PASOS[actual];

  return (
    <nav aria-label="Pasos para publicar" className={cn('mx-auto w-full max-w-[720px]', className)} data-testid="pasos-de-publicar" data-momento={momento}>
      <ol className="flex items-center">
        {PASOS.map((paso, i) => {
          const hecho = i < actual;
          const esEste = i === actual;
          const ultimo = i === PASOS.length - 1;
          return (
            <li key={paso.clave} className={cn('flex items-center', ultimo ? 'shrink-0' : 'min-w-0 flex-1')}>
              <span className="flex shrink-0 items-center gap-2.5">
                <span
                  data-testid={`paso-de-publicar-${paso.clave}`}
                  data-estado={hecho ? 'hecho' : esEste ? 'actual' : 'pendiente'}
                  aria-current={esEste ? 'step' : undefined}
                  className={cn(
                    'relative isolate z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-mono text-caption tabular-nums transition-colors duration-base ease-standard',
                    hecho && 'bg-primary-soft text-primary',
                    esEste && 'text-primary-fg',
                    !hecho && !esEste && 'border border-border bg-surface text-fg-subtle',
                  )}
                >
                  {esEste ? <MotionIndicator layoutId={`${id}-paso-actual`} className="inset-0 -z-10 rounded-full bg-primary ring-4 ring-primary/15" /> : null}
                  {hecho ? (
                    <motion.span
                      initial={hechosAlMontar.has(paso.clave) ? false : { scale: motionScale.pop, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={motionSpring.bouncy}
                      className="flex"
                    >
                      <Check className="h-3.5 w-3.5" weight="bold" aria-hidden />
                    </motion.span>
                  ) : (
                    i + 1
                  )}
                </span>
                <span className="sr-only sm:not-sr-only sm:block sm:min-w-0">
                  <span className={cn('block whitespace-nowrap text-body-sm font-medium leading-tight', esEste ? 'text-fg' : hecho ? 'text-fg-muted' : 'text-fg-subtle')}>
                    {paso.nombre}
                  </span>
                  <span className="mt-0.5 hidden whitespace-nowrap text-caption text-fg-subtle md:block">{paso.detalle}</span>
                </span>
              </span>
              {!ultimo ? (
                <span
                  aria-hidden
                  className={cn('mx-3 h-px min-w-6 flex-1 transition-colors duration-slow ease-standard sm:mx-4', hecho ? 'bg-primary/40' : 'bg-border')}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
      {/* En teléfono, el nombre del paso actual debajo de los círculos. */}
      <p className="mt-3 text-center text-caption text-fg-muted sm:hidden" aria-hidden="true">
        {pasoActual ? `Paso ${actual + 1} de ${PASOS.length} · ${pasoActual.nombre}` : '¡Publicado!'}
      </p>
    </nav>
  );
}
