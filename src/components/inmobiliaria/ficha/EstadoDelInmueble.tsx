'use client';

import { cn } from '@/lib/utils';

/**
 * El estado del inmueble con su color (Juan, 27-10-2026: «cuando está disponible colocarle en verdecito… manejar
 * más estados en colores dentro del inmueble»). Un solo lugar para el rótulo y el tono de cada estado.
 */
const ESTADOS: Record<string, { rotulo: string; tono: string; punto: string }> = {
  available: { rotulo: 'Disponible', tono: 'bg-success-soft text-success', punto: 'bg-success' },
  draft: { rotulo: 'Borrador', tono: 'bg-surface-muted text-fg-muted', punto: 'bg-fg-subtle' },
  pending: { rotulo: 'Sin publicar', tono: 'bg-surface-muted text-fg-muted', punto: 'bg-fg-subtle' },
  reserved: { rotulo: 'Reservado', tono: 'bg-warning-soft text-fg', punto: 'bg-warning' },
  rented: { rotulo: 'Arrendado', tono: 'bg-primary-soft text-primary', punto: 'bg-primary' },
  sold: { rotulo: 'Vendido', tono: 'bg-primary-soft text-primary', punto: 'bg-primary' },
};

export function rotuloDelEstado(estado: string | null | undefined): string {
  return ESTADOS[(estado ?? '').toLowerCase()]?.rotulo ?? 'Sin estado';
}

export function EstadoDelInmueble({ estado, className }: { estado: string | null | undefined; className?: string }) {
  const e = ESTADOS[(estado ?? '').toLowerCase()] ?? ESTADOS.pending!;
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-caption font-medium', e.tono, className)}
      data-testid="estado-del-inmueble"
      data-estado={(estado ?? '').toLowerCase()}
    >
      <span className={cn('size-1.5 rounded-full', e.punto)} aria-hidden="true" />
      {e.rotulo}
    </span>
  );
}
