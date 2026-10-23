'use client';

/**
 * Piezas compartidas por las secciones de Configuración: el esqueleto mientras
 * carga y el vacío con salida. Ninguna sección inventa el suyo.
 */

import { ArrowSquareOut, CaretRight } from '@phosphor-icons/react';
import type { Icon } from '@phosphor-icons/react';

import { Button } from '@/components/ui/button';

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
      {/* Glow up 22-10: el ícono suelto, sin caja (Cadence 2). */}
      <Icono className="h-8 w-8 text-fg-subtle" weight="light" aria-hidden="true" />
      <div className="space-y-1">
        <p className="text-base font-medium text-fg">{titulo}</p>
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
        {/* El ícono suelto, sin caja de color (Cadence 2). */}
        <Icono className="h-5 w-5 shrink-0 text-fg-muted" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-fg">{titulo}</p>
          <p className="text-sm text-fg-muted">{descripcion}</p>
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

const CLASE_FILA_QUE_ABRE =
  'flex h-auto w-full items-center justify-between gap-4 rounded-none px-4 py-4 text-left transition-colors hover:bg-surface-muted/60 sm:px-5';

function CuerpoDeLaFila({ icono: Icono, titulo, descripcion }: { icono: Icon; titulo: string; descripcion: string }) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      {/* El ícono suelto, como en `FilaDeAjuste` (antes, una caja gris de 36 px). */}
      <Icono className="h-5 w-5 shrink-0 text-fg-muted" aria-hidden="true" />
      <span className="min-w-0 text-left">
        <span className="block text-sm font-medium text-fg">{titulo}</span>
        <span className="block whitespace-normal text-sm font-normal text-fg-muted">{descripcion}</span>
      </span>
    </span>
  );
}

/**
 * Una fila de la tarjeta que ABRE algo (un modal, un cajón, otra pantalla): la
 * misma fila que `FilaDeAjuste`, con el «›» a la derecha. Seguridad y Tus datos
 * tenían cada una su copia (glow up r26).
 */
export function FilaQueAbre({
  icono,
  titulo,
  descripcion,
  onClick,
  testId,
}: {
  icono: Icon;
  titulo: string;
  descripcion: string;
  onClick: () => void;
  testId?: string;
}) {
  return (
    <Button variant="ghost" hideArrow onClick={onClick} data-testid={testId} className={CLASE_FILA_QUE_ABRE}>
      <CuerpoDeLaFila icono={icono} titulo={titulo} descripcion={descripcion} />
      <CaretRight className="h-4 w-4 shrink-0 text-fg-subtle" aria-hidden="true" />
    </Button>
  );
}

/** La misma fila, como enlace a otra pestaña (las políticas). */
export function FilaQueEnlaza({
  icono,
  titulo,
  descripcion,
  href,
  etiquetaNuevaPestana,
}: {
  icono: Icon;
  titulo: string;
  descripcion: string;
  href: string;
  /** Para el lector de pantalla: «se abre en otra pestaña». */
  etiquetaNuevaPestana: string;
}) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className={CLASE_FILA_QUE_ABRE}>
      <CuerpoDeLaFila icono={icono} titulo={titulo} descripcion={descripcion} />
      <ArrowSquareOut className="h-4 w-4 shrink-0 text-fg-subtle" aria-hidden="true" />
      <span className="sr-only">{etiquetaNuevaPestana}</span>
    </a>
  );
}
