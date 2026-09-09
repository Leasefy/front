'use client';

/**
 * El cajón de la casa: cabecera fija, cuerpo que hace scroll, pie fijo.
 *
 * Antes cada formulario armaba el suyo y todos hacían scroll completos: el
 * título se iba, los botones quedaban al final de un cuerpo largo y cada uno
 * tenía un padding distinto. Es la anatomía del cajón del inquilino y del de
 * renovación (Nico, 2026-09-08: «revisa que sí sea la forma en que tenemos
 * nuestros drawers… ni los títulos ni la interacción del scroll»).
 *
 * Para un formulario, el `<form>` va ADENTRO con `className="contents"`:
 * así `CajonCuerpo` y `CajonPie` siguen siendo hijos directos de la columna
 * y el botón del pie puede ser `type="submit"`.
 */

import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';

export function Cajon({
  abierto,
  onOpenChange,
  ancho = 'sm:max-w-xl',
  children,
  className,
  ...resto
}: {
  abierto: boolean;
  onOpenChange: (abierto: boolean) => void;
  /** Ancho máximo en escritorio (`sm:max-w-xl`, `sm:max-w-2xl`, `sm:max-w-4xl`). */
  ancho?: string;
  children: React.ReactNode;
  className?: string;
} & Record<`data-${string}`, string | undefined>) {
  return (
    <Sheet open={abierto} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn('flex w-full flex-col gap-0 !p-0', ancho, className)}
        aria-describedby={undefined}
        {...resto}
      >
        {children}
      </SheetContent>
    </Sheet>
  );
}

export function CajonCabecera({
  titulo,
  descripcion,
  children,
}: {
  titulo: React.ReactNode;
  descripcion?: React.ReactNode;
  /** Chips o datos debajo del título (vencimientos, contacto…). */
  children?: React.ReactNode;
}) {
  return (
    <div className="flex-none border-b border-border px-6 py-5 pr-14">
      <SheetTitle className="text-lg font-semibold text-fg">{titulo}</SheetTitle>
      {descripcion ? (
        <SheetDescription className="mt-0.5 text-sm text-fg-muted">{descripcion}</SheetDescription>
      ) : null}
      {children}
    </div>
  );
}

export function CajonCuerpo({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn('min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5', className)}
      data-lenis-prevent
    >
      {children}
    </div>
  );
}

/** Acciones a la derecha; lo que va a la izquierda (volver, borrar) se pasa en `izquierda`. */
export function CajonPie({
  children,
  izquierda,
  ayuda,
}: {
  children: React.ReactNode;
  izquierda?: React.ReactNode;
  /** Una línea encima de los botones: qué falta, qué va a pasar. */
  ayuda?: React.ReactNode;
}) {
  return (
    <div className="flex-none border-t border-border px-6 py-4">
      {ayuda ? <div className="mb-3 text-xs text-fg-muted">{ayuda}</div> : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">{izquierda}</div>
        <div className="flex items-center gap-2">{children}</div>
      </div>
    </div>
  );
}
