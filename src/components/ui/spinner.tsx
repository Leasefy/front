'use client';

import * as React from 'react';
import { Spinner as DSSpinner } from '@leasefy/cadence';

import { cn } from '@/lib/utils';

/**
 * ADAPTER fino sobre el Spinner de @leasefy/cadence que preserva la API local:
 * - size: xs/sm/default/md/lg/xl/2xl → sm/md/lg del DS + override exacto del
 *   tamaño del anillo ([&>span]:size-N) por fidelidad con la escala legacy.
 * - variant: default (azul primary), muted (gris), white, current,
 *   success/warning/error/info. El Spinner del DS es un ANILLO (un <span> con
 *   borde en currentColor dentro de un <span role="status"> que trae
 *   `text-primary`), así que el color va en el envoltorio como `text-*` y
 *   tailwind-merge reemplaza el `text-primary` del DS. Antes apuntaba a un
 *   <svg> que el DS ya no pinta: ningún variant ni tamaño se aplicaba, y un
 *   `variant="current"` dentro de un botón primario salía azul sobre azul.
 * - Los spinners secundarios sin call sites (DotsSpinner, PulseSpinner,
 *   BarSpinner, FullPageSpinner, InlineSpinner) se eliminan.
 * - Es la carga de todo uso en línea o chico (botones, filas, al lado de un
 *   texto, tarjetas, secciones). El logo de Leasefy en carga (`CargaDeMarca`)
 *   queda sólo para pantalla completa y transiciones (Nico, 01-10).
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

type DSSpinnerProps = React.ComponentProps<typeof DSSpinner>;

const SIZE_MAP: Record<SpinnerSize, NonNullable<DSSpinnerProps['size']>> = {
  xs: 'sm',
  sm: 'sm',
  default: 'md',
  md: 'md',
  lg: 'lg',
  xl: 'lg',
  '2xl': 'lg',
};

// Tamaños exactos de la escala legacy (el DS sólo trae size-4/5/7).
const SIZE_FIDELITY: Partial<Record<SpinnerSize, string>> = {
  xs: '[&>span]:size-3',
  md: '[&>span]:size-6',
  lg: '[&>span]:size-8',
  xl: '[&>span]:size-10',
  '2xl': '[&>span]:size-12',
};

const VARIANT_CLASSES: Record<SpinnerVariant, string> = {
  default: 'text-primary',
  muted: 'text-fg-muted',
  white: 'text-white',
  current: 'text-current',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-danger',
  info: 'text-primary',
};

export interface SpinnerProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: SpinnerSize | null;
  variant?: SpinnerVariant | null;
  label?: string;
}

const Spinner = React.forwardRef<HTMLSpanElement, SpinnerProps>(
  ({ className, size, variant, label = 'Loading', ...props }, ref) => {
    const resolvedSize = size ?? 'default';
    const resolvedVariant = variant ?? 'default';

    return (
      <DSSpinner
        ref={ref}
        size={SIZE_MAP[resolvedSize]}
        label={label}
        className={cn(
          VARIANT_CLASSES[resolvedVariant],
          SIZE_FIDELITY[resolvedSize],
          className
        )}
        {...props}
      />
    );
  }
);
Spinner.displayName = 'Spinner';

export { Spinner };
