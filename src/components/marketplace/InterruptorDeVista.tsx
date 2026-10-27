'use client';

import { useId } from 'react';
import Link from 'next/link';
import { ChatCircleDots, SquaresFour } from '@phosphor-icons/react';
import { MotionIndicator } from '@leasefy/cadence';
import { cn } from '@/lib/utils';
import { BotonPublicar } from './PublicarDesdeElMarketplace';

/**
 * «Conversación · Galería» (Nico, 09-10-2026: «¿cómo cambio de una y de
 * otra?»): fijo arriba en las dos vistas del marketplace, con la MISMA
 * búsqueda. Son enlaces (cada vista tiene su dirección): se pueden abrir en
 * otra pestaña y compartir.
 */
export function InterruptorDeVista({
  vista,
  hrefConversacion,
  hrefGaleria,
}: {
  vista: 'conversacion' | 'galeria';
  hrefConversacion: string;
  hrefGaleria: string;
}) {
  const id = useId();
  const opciones = [
    { clave: 'conversacion' as const, nombre: 'Conversación', href: hrefConversacion, icono: ChatCircleDots },
    { clave: 'galeria' as const, nombre: 'Galería', href: hrefGaleria, icono: SquaresFour },
  ];
  return (
    <div
      // Ronda 30 (diseño nuevo): filete fino abajo; el segmento en arena con esquina de 14 px y el elegido en
      // papel con su filete (sin sombra); el ícono del elegido en voltaje.
      className="sticky top-[68px] z-30 border-b border-border-faint bg-background"
      data-testid="interruptor-de-vista"
      data-tapa-arriba
    >
      <nav aria-label="Cómo ver los resultados" className="relative mx-auto flex max-w-[1440px] items-center justify-center gap-2 px-4 py-2.5">
        <div className="inline-flex rounded-[14px] bg-surface-muted p-1">
          {opciones.map(({ clave, nombre, href, icono: Icono }) => {
            const activa = vista === clave;
            return (
              <Link
                key={clave}
                href={href}
                scroll={false}
                aria-current={activa ? 'page' : undefined}
                className={cn(
                  'relative isolate inline-flex h-9 items-center gap-[7px] rounded-[11px] px-4 text-[14px] transition-colors duration-fast active:scale-[0.97]',
                  activa ? 'font-medium text-fg' : 'text-fg-muted hover:text-fg',
                )}
              >
                {activa && (
                  <MotionIndicator
                    layoutId={`${id}-vista`}
                    className="inset-0 -z-10 rounded-[11px] border border-border-faint bg-surface"
                  />
                )}
                <Icono className={cn('h-4 w-4', activa && 'text-primary')} aria-hidden />
                {nombre}
              </Link>
            );
          })}
        </div>
        {/* «Publicar inmueble» siempre a la vista, en las tres vistas y en el celular. */}
        <BotonPublicar compacto className="shrink-0 md:absolute md:right-6 md:top-1/2 md:-translate-y-1/2" />
      </nav>
    </div>
  );
}
