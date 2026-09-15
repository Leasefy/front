'use client';

/**
 * Los tres pasos para arrendar un inmueble desde el marketplace (Nico, 14-09):
 * 1 · Te alcanza (el ingreso contra el canon, en la ficha)
 * 2 · Validamos tus datos (el estudio con las aseguradoras)
 * 3 · Tu respuesta (te lo podemos arrendar o no, y qué sigue)
 */

import { Check } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

const PASOS = [
  { titulo: 'Te alcanza', detalle: 'Tu ingreso y el canon' },
  { titulo: 'Validamos tus datos', detalle: 'Consultamos a las aseguradoras' },
  { titulo: 'Tu respuesta', detalle: 'Y cómo seguir' },
] as const;

export function PasosDelArriendo({ actual, className }: { actual: 1 | 2 | 3; className?: string }) {
  return (
    <ol aria-label="Pasos para arrendar" data-testid="pasos-del-arriendo" className={cn('grid grid-cols-3 gap-2', className)}>
      {PASOS.map((paso, i) => {
        const numero = i + 1;
        const hecho = numero < actual;
        const esActual = numero === actual;
        return (
          <li key={paso.titulo} aria-current={esActual ? 'step' : undefined} className="flex flex-col gap-2">
            <span
              aria-hidden="true"
              className={cn('h-1 rounded-full', hecho || esActual ? 'bg-primary' : 'bg-border')}
            />
            <div className="flex items-start gap-2">
              <span
                className={cn(
                  'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-caption font-semibold',
                  hecho && 'bg-primary text-primary-foreground',
                  esActual && 'bg-primary-soft text-primary ring-2 ring-primary',
                  !hecho && !esActual && 'bg-surface-muted text-fg-muted',
                )}
              >
                {hecho ? <Check weight="bold" className="h-3.5 w-3.5" /> : numero}
              </span>
              <div className="min-w-0">
                <p className={cn('text-sm font-medium leading-tight', esActual ? 'text-fg' : 'text-fg-muted')}>
                  <span className="sr-only">Paso {numero} de 3: </span>
                  {paso.titulo}
                </p>
                <p className="hidden text-caption text-fg-muted sm:block">{paso.detalle}</p>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
