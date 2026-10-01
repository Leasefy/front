'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

import {
  CargaDeMarca,
  useTonoDeCargaHeredado,
  type TamanoDeCarga,
  type TonoDeCarga,
} from './carga-de-marca';

/**
 * Spinner — desde el 30-09 pinta el logo de Leasefy en carga (`CargaDeMarca`)
 * en lugar de un círculo que gira. Conserva la API de siempre (size, variant,
 * label) para no tocar los ~270 llamadores.
 *
 * size → alto del logo (ver ALTO_DE_CARGA): xs 14 · sm 18 · default/md 24 ·
 *   lg/xl/2xl 36. Nada más grande: Nico pidió que la carga no se vea grande.
 * variant → tono:
 *   default/info/success/warning/error → azul (en oscuro, blanco)
 *   muted   → negro (en oscuro, blanco): lo discreto
 *   white   → sobre-color: blanco siempre (fondos llenos)
 *   current → el tono que fije el contenedor (el Button lo provee según su
 *             variante: blanco sobre primario/destructivo, azul sobre outline);
 *             fuera de un botón, azul.
 */

type SpinnerSize = 'xs' | 'sm' | 'default' | 'md' | 'lg' | 'xl' | '2xl';
type SpinnerVariant =
  | 'default'
  | 'muted'
  | 'white'
  | 'current'
  | 'success'
  | 'warning'
  | 'error'
  | 'info';

const SIZE_MAP: Record<SpinnerSize, TamanoDeCarga> = {
  xs: 'xs',
  sm: 'sm',
  default: 'md',
  md: 'md',
  lg: 'lg',
  xl: 'lg',
  '2xl': 'lg',
};

const VARIANT_MAP: Record<Exclude<SpinnerVariant, 'current'>, TonoDeCarga> = {
  default: 'azul',
  info: 'azul',
  success: 'azul',
  warning: 'azul',
  error: 'azul',
  muted: 'negro',
  white: 'sobre-color',
};

/**
 * Clases que los llamadores le ponían al círculo viejo y que sobre el logo
 * harían daño: `animate-spin` lo haría girar, y `h-4`/`w-4`/`size-4` encogerían
 * la caja dejando el logo desbordado. El tamaño lo manda `size`.
 */
const CLASES_DEL_CIRCULO_VIEJO = /^(?:animate-spin|[hw]-[\d.]+|size-[\d.]+|[hw]-\[[^\]]+\])$/;

function sinClasesDelCirculoViejo(className?: string): string | undefined {
  if (!className) return className;
  return className
    .split(/\s+/)
    .filter((c) => c && !CLASES_DEL_CIRCULO_VIEJO.test(c))
    .join(' ');
}

export interface SpinnerProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: SpinnerSize | null;
  variant?: SpinnerVariant | null;
  label?: string;
}

const Spinner = React.forwardRef<HTMLSpanElement, SpinnerProps>(
  ({ className, size, variant, label = 'Cargando', ...props }, ref) => {
    const heredado = useTonoDeCargaHeredado();
    const resolvedSize = size ?? 'default';
    const resolvedVariant = variant ?? 'default';
    const tono: TonoDeCarga =
      resolvedVariant === 'current' ? (heredado ?? 'azul') : VARIANT_MAP[resolvedVariant];

    return (
      <CargaDeMarca
        ref={ref}
        tono={tono}
        tamano={SIZE_MAP[resolvedSize]}
        etiqueta={label}
        className={cn(sinClasesDelCirculoViejo(className))}
        {...props}
      />
    );
  }
);
Spinner.displayName = 'Spinner';

export { Spinner };
