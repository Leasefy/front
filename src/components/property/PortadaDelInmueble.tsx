'use client';

import Image from 'next/image';
import { House } from '@phosphor-icons/react';

import { cn } from '@/lib/utils';

/**
 * La primera foto que se puede pintar, o `null` si no hay ninguna.
 *
 * `trim()` y no `length > 0`, igual que `PropertyCard` del marketplace: la base
 * trae entradas de puros espacios, y `next/image` no las trata como vacías.
 */
export function primeraFoto(property: {
  images?: readonly (string | null | undefined)[] | null;
  thumbnailUrl?: string | null;
}): string | null {
  const usable = (src: unknown): src is string => typeof src === 'string' && src.trim().length > 0;
  return (property.images ?? []).find(usable) ?? (usable(property.thumbnailUrl) ? property.thumbnailUrl : null);
}

interface PortadaDelInmuebleProps {
  property: Parameters<typeof primeraFoto>[0];
  alt: string;
  sizes?: string;
  priority?: boolean;
  /** Clases de la <Image> (zoom al pasar el mouse, etc.). */
  className?: string;
  /** Miniatura: sólo el ícono, sin el texto «Sin fotos». */
  compacta?: boolean;
}

/**
 * Portada de un inmueble para las tarjetas del panel del inquilino. Va dentro
 * de un contenedor `relative` con alto propio: la imagen es `fill`.
 *
 * 🔴 Sin foto no hay <Image>: los inmuebles migrados llegan con `images: []`, y
 * `src=""` pintaba el ícono de imagen rota con el título encima (Nico,
 * 2026-09-15). Se dice «Sin fotos», que es la verdad, como en el marketplace.
 */
export function PortadaDelInmueble({
  property,
  alt,
  sizes = '(max-width: 640px) 100vw, 50vw',
  priority,
  className,
  compacta = false,
}: PortadaDelInmuebleProps) {
  const src = primeraFoto(property);

  if (!src) {
    return (
      <div
        data-testid="inmueble-sin-fotos"
        className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-surface-muted text-fg-subtle"
      >
        <House size={compacta ? 18 : 28} aria-hidden />
        {compacta ? <span className="sr-only">Sin fotos</span> : <span className="text-xs font-medium">Sin fotos</span>}
      </div>
    );
  }

  return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className={cn('object-cover', className)} />;
}
