'use client';

import Image from 'next/image';

import { cn } from '@/lib/utils';
import { PortadaSinFotos } from './PortadaSinFotos';

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
  /** Con `id` y `type`, la portada sin fotos tiene su dibujo y su color. */
  property: Parameters<typeof primeraFoto>[0] & { id?: string | null; type?: string | null };
  alt: string;
  sizes?: string;
  priority?: boolean;
  /** Clases de la <Image> (zoom al pasar el mouse, etc.). */
  className?: string;
  /** Miniatura: sólo el ícono, sin el texto «Sin fotos». */
  compacta?: boolean;
  /** Quien la usa pinta el precio abajo, encima: sin fotos, el dibujo le deja ese espacio. */
  conPrecioEncima?: boolean;
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
  conPrecioEncima = false,
}: PortadaDelInmuebleProps) {
  const src = primeraFoto(property);

  if (!src) {
    return (
      <PortadaSinFotos tipo={property.type} semilla={property.id} compacta={compacta} espacioAbajo={conPrecioEncima} />
    );
  }

  return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className={cn('object-cover', className)} />;
}
