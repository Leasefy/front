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
 * Desde el 02-10-2026 es una capa en español sobre las piezas del Sheet
 * flotante de Cadence (`SheetHeader` / `SheetBody` / `SheetFooter`): mismo
 * dibujo que cualquier otro cajón del producto.
 *
 * Para un formulario, el `<form>` va ADENTRO con `className="contents"`:
 * así `CajonCuerpo` y `CajonPie` siguen siendo hijos directos de la columna
 * y el botón del pie puede ser `type="submit"`.
 */

import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  type SheetContentProps,
} from '@/components/ui/sheet';

type Tamano = NonNullable<SheetContentProps['size']>;

/** El `ancho` viejo (`sm:max-w-*`) traducido a los tamaños de Cadence. */
const TAMANO_POR_ANCHO: Record<string, Tamano> = {
  'sm:max-w-sm': 'sm',
  'sm:max-w-md': 'sm',
  'sm:max-w-lg': 'md',
  'sm:max-w-xl': 'md',
  'sm:max-w-2xl': 'lg',
  'sm:max-w-3xl': 'lg',
  'sm:max-w-4xl': 'xl',
  'sm:max-w-5xl': 'xl',
};

export function Cajon({
  abierto,
  onOpenChange,
  ancho,
  tamano,
  children,
  className,
  ...resto
}: {
  abierto: boolean;
  onOpenChange: (abierto: boolean) => void;
  /** Tamaño de Cadence: sm 400 · md 560 (default) · lg 680 · xl 880. */
  tamano?: Tamano;
  /**
   * Compatibilidad: el ancho máximo viejo (`sm:max-w-xl`, `sm:max-w-2xl`,
   * `sm:max-w-4xl`). Se traduce a `tamano`; uno desconocido se aplica tal cual.
   */
  ancho?: string;
  children: React.ReactNode;
  className?: string;
} & Record<`data-${string}`, string | undefined>) {
  const traducido = ancho ? TAMANO_POR_ANCHO[ancho] : undefined;
  return (
    <Sheet open={abierto} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        size={tamano ?? traducido ?? 'md'}
        // El cajón arma su propio layout con las tres piezas de abajo, aunque
        // vengan de un subcomponente que el reparto no alcanza a ver.
        layout="manual"
        className={cn(ancho && !traducido ? ancho : undefined, className)}
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
    <SheetHeader title={titulo} description={descripcion ?? undefined}>
      {children}
    </SheetHeader>
  );
}
CajonCabecera.bandaDeModal = 'cabecera' as const;

export function CajonCuerpo({ children, className }: { children: React.ReactNode; className?: string }) {
  return <SheetBody className={className}>{children}</SheetBody>;
}
CajonCuerpo.bandaDeModal = 'cuerpo' as const;

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
    <SheetFooter start={izquierda} note={ayuda}>
      {children}
    </SheetFooter>
  );
}
CajonPie.bandaDeModal = 'pie' as const;
