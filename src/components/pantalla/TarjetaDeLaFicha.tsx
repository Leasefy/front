'use client';

/**
 * La tarjeta de una sección de ficha (inmueble, contrato, propietario,
 * inquilino): superficie elevada sin borde duro, el título liviano con su ícono
 * suelto (sin cajita gris) y aire de lectura adentro (glow up visual, 21-10-2026).
 *
 * Adentro no van otras tarjetas ni cajas grises: se separa con una línea fina
 * (`border-t border-border-faint`) y rótulos en mono.
 */
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** La superficie sola, para un renglón que no lleva título (un interruptor, un aviso de la ficha). */
export const SUPERFICIE_DE_LA_FICHA =
  'overflow-hidden rounded-[24px] border border-border-faint bg-surface shadow-[0_1px_2px_rgba(20,19,15,0.04),0_10px_28px_-18px_rgba(20,19,15,0.16)] dark:border-border-strong dark:bg-bg';

export interface TarjetaDeLaFichaProps {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  className?: string;
  /** Algo a la derecha del título (un enlace, un conteo). */
  acciones?: ReactNode;
  'data-testid'?: string;
}

export function TarjetaDeLaFicha({ title, icon, children, className, acciones, 'data-testid': testId }: TarjetaDeLaFichaProps) {
  return (
    <section
      className={cn(
        SUPERFICIE_DE_LA_FICHA,
        className,
      )}
      data-testid={testId}
    >
      <div className="flex items-center gap-2.5 px-6 pb-1 pt-5 text-fg-subtle">
        <span className="flex h-5 w-5 items-center justify-center [&>svg]:h-[18px] [&>svg]:w-[18px]" aria-hidden="true">
          {icon}
        </span>
        <h3 className="min-w-0 flex-1 text-[17px] font-[460] tracking-[-0.01em] text-fg">{title}</h3>
        {acciones ? <div className="shrink-0">{acciones}</div> : null}
      </div>
      <div className="px-6 pb-6 pt-4">{children}</div>
    </section>
  );
}
