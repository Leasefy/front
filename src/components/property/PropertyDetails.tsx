'use client';

import { Heart, Bed, Bath, Maximize, Building2, MapPin, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatCurrency, formatArea } from '@/lib/format';
import type { Property } from '@/lib/types/property';

export interface PropertyDetailsProps {
  property: Property;
  isWishlisted: boolean;
  onWishlistToggle: () => void;
  className?: string;
}

/**
 * Property details component displaying all property information
 * Used in the property detail page
 */
export function PropertyDetails({
  property,
  isWishlisted,
  onWishlistToggle,
  className,
}: PropertyDetailsProps) {
  const {
    title,
    description,
    type,
    status,
    city,
    neighborhood,
    address,
    monthlyRent,
    adminFee,
    deposit,
    bedrooms,
    bathrooms,
    area,
    floor,
    amenities,
  } = property;

  // Map property type to Spanish
  const typeLabels: Record<string, string> = {
    apartment: 'Apartamento',
    house: 'Casa',
    studio: 'Estudio',
    room: 'Habitacion',
  };

  // Map status to Spanish
  const statusLabels: Record<string, string> = {
    available: 'Disponible',
    pending: 'En proceso',
    rented: 'Arrendado',
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header section */}
      <div>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-foreground md:text-3xl">
              {title}
            </h1>
            <div className="mt-2 flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>
                {neighborhood}, {city}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{address}</p>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={onWishlistToggle}
            className={cn(
              'h-12 w-12 rounded-full flex-shrink-0',
              isWishlisted && 'text-red-500 hover:text-red-600'
            )}
            aria-label={isWishlisted ? 'Quitar de favoritos' : 'Agregar a favoritos'}
          >
            <Heart className={cn('h-6 w-6', isWishlisted && 'fill-current')} />
          </Button>
        </div>

        {/* Status badge */}
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant={status === 'available' ? 'default' : 'secondary'}>
            {statusLabels[status]}
          </Badge>
          <Badge variant="outline">{typeLabels[type]}</Badge>
        </div>
      </div>

      {/* Price section */}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-foreground">
            {formatCurrency(monthlyRent)}
          </span>
          <span className="text-muted-foreground">/mes</span>
        </div>

        <div className="mt-4 space-y-2 text-sm">
          {adminFee > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Administracion</span>
              <span className="font-medium">{formatCurrency(adminFee)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Deposito</span>
            <span className="font-medium">{formatCurrency(deposit)}</span>
          </div>
          <div className="border-t pt-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total mensual estimado</span>
              <span className="font-bold">
                {formatCurrency(monthlyRent + adminFee)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Features section */}
      <div className="rounded-lg border bg-card p-4">
        <h2 className="mb-4 font-semibold text-foreground">Caracteristicas</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-muted p-2">
              <Bed className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-lg font-semibold">{bedrooms}</p>
              <p className="text-sm text-muted-foreground">
                {bedrooms === 1 ? 'Habitacion' : 'Habitaciones'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-muted p-2">
              <Bath className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-lg font-semibold">{bathrooms}</p>
              <p className="text-sm text-muted-foreground">
                {bathrooms === 1 ? 'Bano' : 'Banos'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-muted p-2">
              <Maximize className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-lg font-semibold">{formatArea(area)}</p>
              <p className="text-sm text-muted-foreground">Area</p>
            </div>
          </div>
          {floor !== undefined && (
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-muted p-2">
                <Building2 className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-lg font-semibold">{floor}</p>
                <p className="text-sm text-muted-foreground">Piso</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Amenities section */}
      {amenities.length > 0 && (
        <div className="rounded-lg border bg-card p-4">
          <h2 className="mb-4 font-semibold text-foreground">Comodidades</h2>
          <div className="flex flex-wrap gap-2">
            {amenities.map((amenity) => (
              <Badge key={amenity.id} variant="outline" className="px-3 py-1">
                {amenity.name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Description section */}
      <div className="rounded-lg border bg-card p-4">
        <h2 className="mb-4 font-semibold text-foreground">Descripcion</h2>
        <p className="text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
