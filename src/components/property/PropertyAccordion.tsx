'use client';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { formatCurrency, formatArea } from '@/lib/format';
import type { Property } from '@/lib/types/property';
import { cn } from '@/lib/utils';

interface PropertyAccordionProps {
  property: Property;
  className?: string;
  defaultOpen?: string[];
}

/**
 * PropertyAccordion - Luxterra-style collapsible sections for property details
 * Uses shadcn accordion with premium styling
 */
export function PropertyAccordion({
  property,
  className,
  defaultOpen = ['details', 'amenities'],
}: PropertyAccordionProps) {
  const typeLabels: Record<string, string> = {
    apartment: 'Apartamento',
    house: 'Casa',
    studio: 'Estudio',
    room: 'Habitacion',
  };

  return (
    <Accordion
      type="multiple"
      defaultValue={defaultOpen}
      className={cn('border-t border-border', className)}
    >
      {/* Property Details */}
      <AccordionItem value="details" className="border-b border-border">
        <AccordionTrigger className="py-5 text-sm font-medium text-foreground hover:no-underline hover:bg-black/[0.02] transition-colors">
          Detalles de la propiedad
        </AccordionTrigger>
        <AccordionContent className="pb-5">
          <ul className="space-y-2">
            <li className="flex items-center gap-2 text-sm text-foreground/70">
              <span className="text-muted-foreground">-</span>
              {property.bedrooms} {property.bedrooms === 1 ? 'habitacion' : 'habitaciones'}
            </li>
            <li className="flex items-center gap-2 text-sm text-foreground/70">
              <span className="text-muted-foreground">-</span>
              {property.bathrooms} {property.bathrooms === 1 ? 'bano' : 'banos'}
            </li>
            <li className="flex items-center gap-2 text-sm text-foreground/70">
              <span className="text-muted-foreground">-</span>
              {formatArea(property.area)} de area
            </li>
            {property.floor !== undefined && (
              <li className="flex items-center gap-2 text-sm text-foreground/70">
                <span className="text-muted-foreground">-</span>
                Piso {property.floor}
              </li>
            )}
            <li className="flex items-center gap-2 text-sm text-foreground/70">
              <span className="text-muted-foreground">-</span>
              {typeLabels[property.type]}
            </li>
          </ul>
        </AccordionContent>
      </AccordionItem>

      {/* Location */}
      <AccordionItem value="location" className="border-b border-border">
        <AccordionTrigger className="py-5 text-sm font-medium text-foreground hover:no-underline hover:bg-black/[0.02] transition-colors">
          Ubicacion
        </AccordionTrigger>
        <AccordionContent className="pb-5">
          <div className="space-y-3">
            <p className="text-sm text-foreground/70 leading-relaxed">
              Ubicado en {property.neighborhood}, {property.city}.
            </p>
            <p className="text-sm text-foreground/70">
              Direccion: {property.address}
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Excelente ubicacion con acceso a transporte publico, comercio y servicios.
            </p>
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Features & Amenities */}
      {property.amenities.length > 0 && (
        <AccordionItem value="amenities" className="border-b border-border">
          <AccordionTrigger className="py-5 text-sm font-medium text-foreground hover:no-underline hover:bg-black/[0.02] transition-colors">
            Caracteristicas y comodidades
          </AccordionTrigger>
          <AccordionContent className="pb-5">
            <div className="grid grid-cols-2 gap-2">
              {property.amenities.map((amenity) => (
                <div
                  key={amenity.id}
                  className="flex items-center gap-2 text-sm text-foreground/70"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-black/30" />
                  {amenity.name}
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      )}

      {/* Costs */}
      <AccordionItem value="costs" className="border-b border-border">
        <AccordionTrigger className="py-5 text-sm font-medium text-foreground hover:no-underline hover:bg-black/[0.02] transition-colors">
          Costos mensuales
        </AccordionTrigger>
        <AccordionContent className="pb-5">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Arriendo</span>
              <span className="text-foreground font-medium">
                {formatCurrency(property.monthlyRent)}
              </span>
            </div>
            {property.adminFee > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Administracion</span>
                <span className="text-foreground font-medium">
                  {formatCurrency(property.adminFee)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Deposito (unico)</span>
              <span className="text-foreground font-medium">
                {formatCurrency(property.deposit)}
              </span>
            </div>
            <div className="pt-3 border-t border-border">
              <div className="flex justify-between text-sm">
                <span className="text-foreground font-medium">Total mensual</span>
                <span className="text-foreground font-medium">
                  {formatCurrency(property.monthlyRent + property.adminFee)}
                </span>
              </div>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Policies */}
      <AccordionItem value="policies" className="border-b border-border">
        <AccordionTrigger className="py-5 text-sm font-medium text-foreground hover:no-underline hover:bg-black/[0.02] transition-colors">
          Politicas
        </AccordionTrigger>
        <AccordionContent className="pb-5">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-foreground/70">
              <span className="text-muted-foreground">-</span>
              {property.amenities.some((a) => a.id === 'pets')
                ? 'Se aceptan mascotas'
                : 'No se aceptan mascotas'}
            </div>
            <div className="flex items-center gap-2 text-sm text-foreground/70">
              <span className="text-muted-foreground">-</span>
              Contrato minimo de 12 meses
            </div>
            <div className="flex items-center gap-2 text-sm text-foreground/70">
              <span className="text-muted-foreground">-</span>
              Deposito equivalente a 1 mes de arriendo
            </div>
            <div className="flex items-center gap-2 text-sm text-foreground/70">
              <span className="text-muted-foreground">-</span>
              Sin codeudor requerido
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
