'use client';

/**
 * Piezas compartidas por las secciones de Configuración: el esqueleto mientras
 * carga y el vacío con salida. Ninguna sección inventa el suyo.
 */

import type { Icon } from '@phosphor-icons/react';

export function EsqueletoDeSeccion({ filas = 4 }: { filas?: number }) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: filas }).map((_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-lg border border-border bg-surface-muted" />
      ))}
    </div>
  );
}

/**
 * Un vacío que dice qué pasó y qué hacer. Por eso `ayuda` es obligatoria: un
 * vacío que sólo dice «no hay nada» no le sirve a nadie.
 */
export function VacioDeSeccion({
  icono: Icono,
  titulo,
  ayuda,
}: {
  icono: Icon;
  titulo: string;
  ayuda: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-surface px-6 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-muted">
        <Icono className="h-5 w-5 text-fg-muted" weight="duotone" />
      </div>
      <div className="space-y-1">
        <p className="text-base font-semibold text-fg">{titulo}</p>
        <p className="mx-auto max-w-sm text-sm text-fg-muted">{ayuda}</p>
      </div>
    </div>
  );
}

/** La tarjeta que envuelve una lista de perillas (notificaciones, preferencias…). */
export function TarjetaDeAjustes({ children }: { children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="divide-y divide-border">{children}</div>
    </section>
  );
}

/** Una fila de la tarjeta: título, explicación y el control a la derecha. */
export function FilaDeAjuste({
  icono: Icono,
  titulo,
  descripcion,
  children,
}: {
  icono: Icon;
  titulo: string;
  descripcion: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-muted">
          <Icono className="h-[18px] w-[18px] text-fg-muted" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-fg">{titulo}</p>
          <p className="text-sm text-fg-muted">{descripcion}</p>
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
