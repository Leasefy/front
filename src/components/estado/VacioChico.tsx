'use client';

/**
 * El vacío CHICO: el de una tarjeta, un bloque o una lista corta dentro de una pantalla (no el de la sección entera,
 * que es `EmptyState` / `SinDatos`). Nico (23-10-2026): «todo empty state debe tener sí o sí una ilustración 3D
 * asociada» — aquí va a 64 px, a la izquierda del texto, para no comerse la tarjeta.
 */

import { Ilustracion, type NombreIlustracion } from '@leasefy/cadence';
import type * as React from 'react';
import { cn } from '@/lib/utils';
import { ilustracionDelVacio } from '@/lib/vacios/ilustracion-del-vacio';

export interface VacioChicoProps {
  /** Lo que se dice: «Todavía no hay notas.» */
  titulo: React.ReactNode;
  /** Una línea más (qué va a aparecer o qué hacer). */
  detalle?: React.ReactNode;
  /** La ilustración; si no, sale de lo que dice el título (`ilustracionDelVacio`). Con filtros, `lupa`. */
  ilustracion?: NombreIlustracion;
  /** Para deducir la ilustración cuando el título no es texto plano. */
  queFalta?: string;
  className?: string;
  'data-testid'?: string;
  as?: 'div' | 'li';
}

export function VacioChico({
  titulo,
  detalle,
  ilustracion,
  queFalta,
  className,
  'data-testid': testId,
  as: Como = 'div',
}: VacioChicoProps) {
  const nombre =
    ilustracion ?? ilustracionDelVacio(queFalta, typeof titulo === 'string' ? titulo : undefined, typeof detalle === 'string' ? detalle : undefined);
  return (
    <Como className={cn('flex items-center gap-3 py-2 text-left', className)} role="status" data-testid={testId}>
      <Ilustracion nombre={nombre} tamano={64} />
      <div className="min-w-0">
        <p className="text-sm text-fg">{titulo}</p>
        {detalle ? <p className="mt-0.5 text-caption text-fg-muted">{detalle}</p> : null}
      </div>
    </Como>
  );
}
