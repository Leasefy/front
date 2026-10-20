'use client';

/**
 * «Ver detalles» — lo secundario, plegado en la misma pantalla. GLOW UP (Nico,
 * 20-10-2026): «usa patrones de diseño para esconder información irrelevante en
 * la misma pantalla presentada de otra manera». Una explicación larga, una
 * opción avanzada, el desglose de una cifra: están, pero no empujan hacia abajo
 * lo que la persona vino a hacer.
 *
 * Abre y cierra con `Collapse` (altura + fundido, tokens de Cadence).
 */

import { useId, useState, type ReactNode } from 'react';
import { CaretDown } from '@phosphor-icons/react';
import { Collapse } from '@leasefy/cadence';
import { cn } from '@/lib/utils';
import { useTr } from '@/lib/i18n/use-tr';

export interface MasDetallesProps {
  /** Lo que dice el botón cerrado. Por defecto «Ver detalles». */
  etiqueta?: ReactNode;
  /** Lo que dice abierto. Por defecto «Ocultar detalles». */
  etiquetaAbierto?: ReactNode;
  children: ReactNode;
  /** Abierto al montar. */
  abiertoAlInicio?: boolean;
  className?: string;
  /** Clases del contenido (van ADENTRO del colapsable). */
  classNameDelContenido?: string;
  'data-testid'?: string;
}

export function MasDetalles({
  etiqueta,
  etiquetaAbierto,
  children,
  abiertoAlInicio = false,
  className,
  classNameDelContenido,
  'data-testid': testId,
}: MasDetallesProps) {
  const tr = useTr();
  const [abierto, setAbierto] = useState(abiertoAlInicio);
  const id = useId();
  return (
    <div className={className} data-testid={testId}>
      <button
        type="button"
        className="inline-flex items-center gap-1.5 rounded-full text-body-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-expanded={abierto}
        aria-controls={id}
        onClick={() => setAbierto((v) => !v)}
      >
        {abierto ? (etiquetaAbierto ?? tr('Ocultar detalles')) : (etiqueta ?? tr('Ver detalles'))}
        <CaretDown
          className={cn('h-3.5 w-3.5 transition-transform duration-base ease-emphasis', abierto && 'rotate-180')}
          aria-hidden="true"
        />
      </button>
      <Collapse open={abierto} id={id} className={cn('pt-3', classNameDelContenido)}>
        {children}
      </Collapse>
    </div>
  );
}
