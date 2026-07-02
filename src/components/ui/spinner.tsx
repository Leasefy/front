'use client';

import * as React from 'react';
import { Spinner as DSSpinner } from '@leasefy/cadence';

import { cn } from '@/lib/utils';

/**
 * ADAPTER fino sobre el Spinner de @leasefy/cadence que preserva la API local:
 * - size: xs/sm/default/md/lg/xl/2xl → sm/md/lg del DS + override exacto de
 *   tamaño del icono ([&_svg]:size-N) por fidelidad con la escala legacy.
 * - variant: default (azul primary legacy), muted (= gris del DS), white,
 *   current, success/warning/error/info (colores legacy preservados).
 *   El icono del DS trae text-fg-muted propio, por eso el override de color
 *   va como [&_svg]:text-* (gana en especificidad).
 * - Los spinners secundarios sin call sites (DotsSpinner, PulseSpinner,
 *   BarSpinner, FullPageSpinner, InlineSpinner) se eliminan.
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

// Tamaños exactos de la escala legacy (DS solo trae size-4/5/7).
const SIZE_FIDELITY: Partial<Record<SpinnerSize, string>> = {
  xs: '[&_svg]:size-3',
  md: '[&_svg]:size-6',
  lg: '[&_svg]:size-8',
  xl: '[&_svg]:size-10',
  '2xl': '[&_svg]:size-12',
};

const VARIANT_CLASSES: Record<SpinnerVariant, string> = {
  default: '[&_svg]:text-primary',
  muted: '', // el Spinner del DS ya es gris (text-fg-muted)
  white: '[&_svg]:text-white',
  current: '[&_svg]:text-current',
  success: '[&_svg]:text-[#2C7A53]',
  warning: '[&_svg]:text-[#B7791F]',
  error: '[&_svg]:text-[#C4503B]',
  info: '[&_svg]:text-[#1A40FF]',
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
