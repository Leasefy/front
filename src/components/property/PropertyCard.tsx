'use client';

import { ventanaDePuntos } from '@/lib/marketplace/ventana-de-puntos'
import { barrioYCiudad } from '@/lib/inmuebles/barrio-y-ciudad';
import { useState, useCallback, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, MapPin, CaretLeft, CaretRight, Check, Info, Play, ShieldCheck } from '@phosphor-icons/react';
import { IconButton } from '@leasefy/cadence';

import { cn } from '@/lib/utils';
import { AdministradoPor } from '@/components/property/AdministradoPor';
import { PortadaSinFotos } from '@/components/property/PortadaSinFotos';
import { areaConocida } from '@/lib/inmuebles/area-conocida';
import { formatCurrency, formatArea } from '@/lib/format';
import { costoMensual, sinDeposito } from '@/lib/marketplace/busqueda';
import { NOMBRE_DE_LA_RED, videoDelInmueble } from '@/lib/marketplace/video';
import type { Property } from '@/lib/types/property';
import type { QualificationResult } from '@/lib/scoring/propertyMatching';

export interface PropertyCardProps {
  property: Property;
  isWishlisted?: boolean;
  onWishlistToggle?: (propertyId: string) => void;
  qualification?: QualificationResult;
  isHighlighted?: boolean;
  onHoverStart?: () => void;
  onHoverEnd?: () => void;
  className?: string;
  /** Prefix for the detail link. Public '/propiedades', tenant '/inquilino/propiedades'. */
  basePath?: string;
  /** Query extra en el link (p.ej. `from=para-ti`) para que el detalle sepa de dónde vino. */
  linkQuery?: string;
  /**
   * Por qué sale en la lista (marketplace, 09-10-2026): lo pedido que cumple y
   * lo que el inmueble no dice. Sin búsqueda no se pinta nada.
   */
  explicacion?: { cumple: string[]; sinDato: string[]; noCumple?: string[] } | null;
  /**
   * Debajo de «Administrado por…» (marketplace, 09-10-2026): «% la recomienda»
   * de esa inmobiliaria. Lo pone quien sabe de ella; sin él, nada.
   */
  debajoDeQuienLoOfrece?: ReactNode;
}

export function PropertyCard({
  property,
  isWishlisted = false,
  onWishlistToggle,
  qualification,
  isHighlighted = false,
  onHoverStart,
  onHoverEnd,
  className,
  basePath = '/propiedades',
  linkQuery,
  explicacion,
  debajoDeQuienLoOfrece,
}: PropertyCardProps) {
  const {
    id,
    title,
    thumbnailUrl,
    images,
    monthlyRent,
    neighborhood,
    city,
    bedrooms,
    bathrooms,
    area,
    status,
    type,
    agencyName,
    agencyId,
    agencyLogoUrl,
    listingType,
    salePrice,
  } = property;

  // T-0038 §3.2.2/§3.2.3/§3.2.4 — a SALE listing shows `salePrice`, never
  // the (absent) `monthlyRent`. `displayPrice == null` renders "Sin dato",
  // never `formatCurrency(null)` (silently "$ 0", C6).
  const isSaleListing = listingType === 'sale';
  const displayPrice = isSaleListing ? salePrice : monthlyRent;
  // Lo que cuesta al mes de verdad y si la ley prohíbe el depósito (Ley 820).
  const costo = costoMensual(property);
  const vivienda = sinDeposito(property);
  // El video que la inmobiliaria subió a su red (marketplace, 09-10-2026): la
  // ficha lo abre; aquí sólo se avisa que lo hay.
  const video = videoDelInmueble(property);

  const [activeImage, setActiveImage] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Use images array if available, fallback to thumbnailUrl. Empty strings are
  // filtered first: demo/incomplete properties can carry a blank thumbnailUrl
  // or blank entries, and `next/image` warns (and preloads an empty href) on
  // `src=""`. If nothing usable is left, fall back to the shared placeholder.
  const PLACEHOLDER = '/placeholder-property.svg';
  // `trim()` y no `length > 0`: la base trae entradas de puros espacios, y
  // `next/image` no las trata como vacías — las intenta resolver como ruta
  // relativa y tira «Failed to parse src "   "», que rompe el render entero
  // de la tarjeta en vez de degradar a placeholder.
  const isNonEmpty = (src: unknown): src is string =>
    typeof src === 'string' && src.trim().length > 0;
  const gallery = (images ?? []).filter(isNonEmpty);
  const sinFotos = gallery.length === 0 && !isNonEmpty(thumbnailUrl);
  const allImages =
    gallery.length > 0
      ? gallery
      : isNonEmpty(thumbnailUrl)
        ? [thumbnailUrl]
        : [PLACEHOLDER];

  const handlePrev = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveImage((prev) => (prev - 1 + allImages.length) % allImages.length);
  }, [allImages.length]);

  const handleNext = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveImage((prev) => (prev + 1) % allImages.length);
  }, [allImages.length]);

  const handleDotClick = useCallback((e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveImage(index);
  }, []);

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onWishlistToggle?.(id);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    onHoverStart?.();
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setActiveImage(0);
    onHoverEnd?.();
  };

  // Ronda 30 (diseño nuevo del marketplace): lo que se sabe del inmueble va en UNA línea en mono
  // («2 hab · 1 baño · 60 m²»), como la tarjeta de la galería; antes eran tres pastillas con ícono.
  const caracteristicas = [
    areaConocida(area) ? formatArea(area) : null,
    (bedrooms ?? 0) > 0 ? `${bedrooms} hab` : null,
    (bathrooms ?? 0) > 0 ? `${bathrooms} baño${bathrooms !== 1 ? 's' : ''}` : null,
  ].filter(Boolean);

  const typeLabels: Record<string, string> = {
    apartment: 'Apartamento',
    house: 'Casa',
    studio: 'Estudio',
    room: 'Habitación',
    // Sin estos, la etiqueta salía en inglés («COMMERCIAL»; QA del marketplace, 10-10-2026).
    commercial: 'Local',
    office: 'Oficina',
    warehouse: 'Bodega',
    parking: 'Parqueadero',
    land: 'Lote',
  };

  // Ronda 30 (diseño nuevo): las marcas sobre la foto son papel blanco con letra en mono, sin vidrio
  // ni velo; la primera lleva el cuadrito de voltaje. Se leen igual sobre una foto clara u oscura.
  const marca =
    'inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-sm bg-ink-fg px-[9px] font-mono text-[11px] uppercase tracking-[0.08em] text-ink';

  return (
    <Link
      href={linkQuery ? `${basePath}/${id}?${linkQuery}` : `${basePath}/${id}`}
      className={cn(
        'group block min-w-0 rounded-lg transition-transform duration-base ease-enter hover:-translate-y-0.5 active:scale-[0.99] motion-reduce:hover:translate-y-0',
        className
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* La foto: esquina de 22 px con superelipse, sin velo encima. */}
      <div
        className={cn(
          'relative aspect-[4/3] overflow-hidden rounded-lg bg-surface-muted',
          isHighlighted && 'outline outline-2 outline-offset-[3px] outline-primary'
        )}
      >
        {/* All images stacked with opacity crossfade */}
        {allImages.map((src, i) => (
          <Image
            // Con la posición: un inmueble puede traer la misma foto dos veces.
            key={`${i}-${src}`}
            src={src}
            alt={`${title} - ${i + 1}`}
            fill
            className={cn(
              'object-cover transition-[opacity,transform] duration-[700ms] ease-enter',
              i === activeImage ? 'opacity-100' : 'opacity-0',
              isHovered && i === activeImage && 'scale-[1.04]'
            )}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            priority={i === 0}
          />
        ))}

        {sinFotos && <PortadaSinFotos tipo={type} semilla={id} />}

        {/* Las flechas: círculos blancos que entran al pasar el mouse. */}
        {allImages.length > 1 && (
          <>
            <IconButton
              variant="ghost"
              size="sm"
              icon={<CaretLeft className="h-4 w-4" />}
              onClick={handlePrev}
              aria-label="Imagen anterior"
              className={cn(
                'absolute left-2.5 top-1/2 -translate-y-1/2 z-20',
                'h-[34px] w-[34px] rounded-full',
                'bg-ink-fg text-ink hover:bg-ink-fg',
                'transition-[opacity,transform] duration-slow ease-enter',
                isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-1.5 pointer-events-none'
              )}
            />
            <IconButton
              variant="ghost"
              size="sm"
              icon={<CaretRight className="h-4 w-4" />}
              onClick={handleNext}
              aria-label="Imagen siguiente"
              className={cn(
                'absolute right-2.5 top-1/2 -translate-y-1/2 z-20',
                'h-[34px] w-[34px] rounded-full',
                'bg-ink-fg text-ink hover:bg-ink-fg',
                'transition-[opacity,transform] duration-slow ease-enter',
                isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-1.5 pointer-events-none'
              )}
            />
          </>
        )}

        {/* Los puntos: cuadritos de 7 px, abajo al centro, al pasar el mouse. */}
        {allImages.length > 1 && (
          <div
            className={cn(
              'absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5',
              'transition-[opacity,transform] duration-slow ease-enter',
              isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1.5 pointer-events-none'
            )}
          >
            {/* Nico (27-10-2026): con muchas fotos, a lo sumo cinco puntos que se corren con la foto. */}
            {ventanaDePuntos(allImages.length, activeImage).map(({ indice: i, chico }) => (
              <button
                key={i}
                onClick={(e) => handleDotClick(e, i)}
                className={cn(
                  'rounded-[2px] transition-[background-color,width,height] duration-slow ease-enter',
                  chico ? 'h-[5px] w-[5px]' : 'h-[7px] w-[7px]',
                  i === activeImage ? 'bg-ink-fg' : 'bg-white/55 hover:bg-white/80'
                )}
                aria-label={`Ver imagen ${i + 1} de ${allImages.length}`}
              />
            ))}
          </div>
        )}

        {/* Las marcas — arriba a la izquierda */}
        <div className="absolute top-3 left-3 z-10 flex flex-col items-start gap-1.5 pointer-events-none">
          <div className="flex flex-wrap gap-1.5">
            <span className={marca}>
              <span className="h-1.5 w-1.5 rounded-[2px] bg-primary" aria-hidden />
              {isSaleListing ? 'En venta' : 'En arriendo'}
            </span>
            <span className={marca}>{typeLabels[type] || type}</span>
          </div>
          {video && (
            <span data-testid="tiene-video" className={marca}>
              <Play className="h-3 w-3" weight="fill" aria-hidden />
              Video en {NOMBRE_DE_LA_RED[video.red]}
            </span>
          )}
        </div>

        {/* Guardar — arriba a la derecha, círculo blanco; guardado, en voltaje. */}
        {onWishlistToggle && (
          <IconButton
            variant="ghost"
            size="sm"
            icon={<Heart className="h-[18px] w-[18px]" weight={isWishlisted ? 'fill' : 'regular'} />}
            onClick={handleWishlistClick}
            aria-label={isWishlisted ? 'Quitar de favoritos' : 'Agregar a favoritos'}
            className={cn(
              'absolute right-3 top-3 z-10 h-[38px] w-[38px] rounded-full bg-ink-fg hover:bg-ink-fg',
              'transition-[color,transform] duration-base active:scale-[0.94]',
              isWishlisted ? 'text-primary' : 'text-ink'
            )}
          />
        )}

        {/* Arrendado: la foto se apaga y lo dice una marca blanca (sin vidrio). */}
        {status === 'rented' && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/50">
            <span className="rounded-sm bg-ink-fg px-3 py-1.5 font-mono text-[12px] uppercase tracking-[0.08em] text-ink">
              Arrendado
            </span>
          </div>
        )}

        {/* ¿Califica? — abajo a la derecha, marca blanca con su punto. */}
        {qualification && (
          <div className={cn(marca, 'absolute bottom-3 right-3 z-10 normal-case tracking-normal font-sans text-[12px]')}>
            <span
              className={cn('h-1.5 w-1.5 rounded-[2px]', qualification.qualifies ? 'bg-success' : 'bg-warning')}
              aria-hidden
            />
            {qualification.qualifies ? 'Califica' : 'Fuera de presupuesto'}
          </div>
        )}
      </div>

      {/* El texto */}
      <div className="px-0.5 pb-0.5 pt-3.5">
        {/* El lugar, pequeño, arriba del título */}
        <div className="flex min-w-0 items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-primary" strokeWidth={1.5} />
          <p className="truncate text-[13px] text-fg-muted">
            {barrioYCiudad(neighborhood, city)}
          </p>
        </div>

        {/* Title */}
        <h3 className="mt-[3px] truncate text-[16.5px] font-[450] leading-[1.3] tracking-[-0.015em] text-fg transition-colors duration-base group-hover:text-primary">
          {title}
        </h3>

        {/* Quién lo administra, con su logo: Leasefy u otra inmobiliaria. */}
        {agencyName && (
          <AdministradoPor
            className="mt-[7px]"
            administrador={{ agencyId: agencyId ?? null, nombre: agencyName, logoUrl: agencyLogoUrl ?? null, esAgente: property.agencyEsAgente }}
          />
        )}
        {agencyName && debajoDeQuienLoOfrece && <div className="mt-1">{debajoDeQuienLoOfrece}</div>}

        {/* El precio, en mono y sin negrilla */}
        <p className="mt-3 font-mono text-[21px] font-normal leading-none tracking-[-0.02em] tabular-nums text-fg">
          {displayPrice != null ? formatCurrency(displayPrice) : 'Sin dato'}
          {!isSaleListing && (
            <span className="ml-[3px] font-sans text-[13px] tracking-normal text-fg-subtle">/mes</span>
          )}
        </p>
        {/* Lo que se paga de verdad: canon + administración. Sólo si la hay. */}
        {costo && costo.administracion > 0 && (
          <p className="mt-1.5 text-[13px] text-fg-muted" data-testid="costo-mensual">
            Con administración:{' '}
            <span className="font-mono tabular-nums text-fg">{formatCurrency(costo.total)}</span> al mes
          </p>
        )}

        {/* Lo que se sabe: sólo lo conocido (antes «— hab» en un local; QA, 10-10-2026). */}
        {caracteristicas.length > 0 && (
          <p
            className="mt-2 truncate font-mono text-[13px] tabular-nums text-fg-muted"
            aria-label="Características del inmueble"
          >
            {caracteristicas.join(' · ')}
          </p>
        )}

        {/* Lo que pesa al decidir: sin depósito (ley) y por qué sale en la lista. */}
        {(vivienda || (explicacion && (explicacion.cumple.length > 0 || (explicacion.noCumple?.length ?? 0) > 0))) && (
          <div className="mt-3 space-y-1.5 border-t border-border-faint pt-3 text-[13px] leading-[1.4]">
            {vivienda && (
              <p className="flex items-start gap-[7px] text-fg-muted" data-testid="sin-deposito">
                <ShieldCheck className="mt-[1px] h-3.5 w-3.5 shrink-0 text-success" aria-hidden />
                <span>Sin depósito: en vivienda la ley no permite pedirlo</span>
              </p>
            )}
            {explicacion && explicacion.cumple.length > 0 && (
              <p className="flex items-start gap-[7px] text-fg-muted" data-testid="por-que-sale">
                <Check className="mt-[1px] h-3.5 w-3.5 shrink-0 text-primary" weight="bold" aria-hidden />
                <span className="line-clamp-2">
                  Cumple: {explicacion.cumple.join(' · ')}
                  {explicacion.sinDato.length > 0 && (
                    <span className="text-fg-subtle"> · No dice: {explicacion.sinDato.join(', ')}</span>
                  )}
                </span>
              </p>
            )}
            {/* «Los más cercanos»: lo que pediste y éste no tiene, dicho sin rodeos. */}
            {explicacion && (explicacion.noCumple?.length ?? 0) > 0 && (
              <p className="flex items-start gap-[7px] text-fg-muted" data-testid="no-cumple">
                <Info className="mt-[1px] h-3.5 w-3.5 shrink-0 text-warning" aria-hidden />
                <span className="line-clamp-2">
                  No cumple: {explicacion.noCumple!.join(' · ')}
                  {explicacion.cumple.length === 0 && explicacion.sinDato.length > 0 && (
                    <span className="text-fg-subtle"> · No dice: {explicacion.sinDato.join(', ')}</span>
                  )}
                </span>
              </p>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
