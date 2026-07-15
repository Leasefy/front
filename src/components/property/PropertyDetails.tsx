'use client';

import { Heart, Bed, Bathtub, ArrowsOut, Buildings, MapPin, CurrencyDollar } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
    room: 'Habitación',
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
              isWishlisted && 'text-danger hover:text-danger'
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
      <Card className="rounded-lg p-4">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-foreground font-mono tabular-nums">
            {formatCurrency(monthlyRent)}
          </span>
          <span className="text-muted-foreground">/mes</span>
        </div>

        <div className="mt-4 space-y-2 text-sm">
          {adminFee > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Administración</span>
              <span className="font-medium font-mono tabular-nums">{formatCurrency(adminFee)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Depósito</span>
            <span className="font-medium font-mono tabular-nums">{formatCurrency(deposit)}</span>
          </div>
          <div className="border-t pt-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total mensual estimado</span>
              <span className="font-bold font-mono tabular-nums">
                {formatCurrency(monthlyRent + adminFee)}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Features section */}
      <Card className="rounded-lg p-4">
        <h2 className="mb-4 font-semibold text-foreground">Características</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-muted p-2">
              <Bed className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-lg font-semibold font-mono tabular-nums">{bedrooms}</p>
              <p className="text-sm text-muted-foreground">
                {bedrooms === 1 ? 'Habitación' : 'Habitaciones'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-muted p-2">
              <Bathtub className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-lg font-semibold font-mono tabular-nums">{bathrooms}</p>
              <p className="text-sm text-muted-foreground">
                {bathrooms === 1 ? 'Baño' : 'Baños'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-muted p-2">
              <ArrowsOut className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-lg font-semibold font-mono tabular-nums">{formatArea(area)}</p>
              <p className="text-sm text-muted-foreground">Área</p>
            </div>
          </div>
          {floor !== undefined && (
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-muted p-2">
                <Buildings className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-lg font-semibold font-mono tabular-nums">{floor}</p>
                <p className="text-sm text-muted-foreground">Piso</p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Amenities section */}
      {amenities.length > 0 && (
        <Card className="rounded-lg p-4">
          <h2 className="mb-4 font-semibold text-foreground">Comodidades</h2>
          <div className="flex flex-wrap gap-2">
            {amenities.map((amenity) => (
              <Badge key={amenity.id} variant="outline" className="px-3 py-1">
                {amenity.name}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {/* Description section */}
      <Card className="rounded-lg p-4">
        <h2 className="mb-4 font-semibold text-foreground">Descripción</h2>
        <p className="text-muted-foreground leading-relaxed">{description}</p>
      </Card>
    </div>
  );
}
