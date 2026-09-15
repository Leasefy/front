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
  return (
    <div data-testid="pasos-del-arriendo" className={className}>
      <Stepper steps={steps} activeIndex={Math.min(indice, PASOS.length - 1)} orientation={orientation} aria-label="Pasos para arrendar" />
    </div>
  );
}
