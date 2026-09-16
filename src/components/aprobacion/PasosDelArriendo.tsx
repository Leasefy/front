'use client';

/**
 * Los tres pasos para arrendar desde el marketplace, con el `Stepper` de la casa
 * (@leasefy/cadence, el mismo del onboarding y los asistentes).
 * 1 · Te alcanza · 2 · Validamos tus datos · 3 · Tu respuesta (Nico, 14-09).
 */

import { Stepper } from '@leasefy/cadence';

const PASOS = [
  { id: 'alcanza', label: 'Te alcanza', description: 'Tu ingreso frente al canon' },
  { id: 'datos', label: 'Validamos tus datos', description: 'Consultamos a las aseguradoras' },
  { id: 'respuesta', label: 'Tu respuesta', description: 'Si te lo arrendamos y cómo seguir' },
];

export function PasosDelArriendo({
  actual,
  listo = false,
  orientation = 'horizontal',
  conDescripcion = false,
  className,
}: {
  /** Paso en curso, 1 a 3. */
  actual: 1 | 2 | 3;
  /** El paso en curso ya se cumplió (p. ej. «te alcanza» recién verificado). */
  listo?: boolean;
  orientation?: 'horizontal' | 'vertical';
  conDescripcion?: boolean;
  className?: string;
}) {
  const indice = listo ? actual : actual - 1;
  const steps = PASOS.map((p, i) => ({
    id: p.id,
    label: p.label,
    ...(conDescripcion ? { description: p.description } : {}),
    sublabel: i < indice ? 'Completo' : i === indice ? 'En curso' : 'Pendiente',
  }));
  const activo = Math.min(indice, PASOS.length - 1);
  const stepper = (
    <Stepper steps={steps} activeIndex={activo} orientation={orientation} aria-label="Pasos para arrendar" />
  );
  if (orientation === 'vertical') {
    return (
      <div data-testid="pasos-del-arriendo" className={className}>
        {stepper}
      </div>
    );
  }
  // En celular los tres rótulos no caben en fila y la franja se salía de la
  // pantalla (medido a 400 px el 14-09): ahí va el paso en curso y una barra.
  return (
    <div data-testid="pasos-del-arriendo" className={className}>
      <div className="hidden sm:block">{stepper}</div>
      <div className="flex flex-col gap-2 sm:hidden">
        <p className="flex items-baseline justify-between gap-3 text-caption">
          <span className="font-medium text-fg">{PASOS[activo].label}</span>
          <span className="shrink-0 font-mono tabular-nums text-fg-muted">
            Paso {activo + 1} de {PASOS.length}
          </span>
        </p>
        <div className="grid grid-cols-3 gap-1.5" aria-hidden="true">
          {PASOS.map((p, i) => (
            <span
              key={p.id}
              className={`h-1.5 rounded-full ${i < indice ? 'bg-primary' : i === indice ? 'bg-primary/40' : 'bg-border'}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
