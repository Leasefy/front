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
        <AccordionTrigger className="py-5 text-[13px] font-semibold text-foreground uppercase tracking-wide hover:no-underline hover:bg-neutral-50 transition-colors rounded-md px-2 -mx-2">
          Detalles de la propiedad
        </AccordionTrigger>
        <AccordionContent className="pb-5">
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 px-3 py-2 bg-neutral-50 rounded-md text-[13px] text-foreground/80">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/50" />
              {property.bedrooms} {property.bedrooms === 1 ? 'habitación' : 'habitaciones'}
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-neutral-50 rounded-md text-[13px] text-foreground/80">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/50" />
              {property.bathrooms} {property.bathrooms === 1 ? 'baño' : 'baños'}
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-neutral-50 rounded-md text-[13px] text-foreground/80">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/50" />
              {formatArea(property.area)}
            </div>
            {property.floor !== undefined && (
              <div className="flex items-center gap-2 px-3 py-2 bg-neutral-50 rounded-md text-[13px] text-foreground/80">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                Piso {property.floor}
              </div>
            )}
            <div className="flex items-center gap-2 px-3 py-2 bg-neutral-50 rounded-md text-[13px] text-foreground/80">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/50" />
              {typeLabels[property.type]}
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Location */}
      <AccordionItem value="location" className="border-b border-border">
        <AccordionTrigger className="py-5 text-[13px] font-semibold text-foreground uppercase tracking-wide hover:no-underline hover:bg-neutral-50 transition-colors rounded-md px-2 -mx-2">
          Ubicación
        </AccordionTrigger>
        <AccordionContent className="pb-5">
          <div className="space-y-3">
            <p className="text-[14px] text-foreground/80 leading-relaxed">
              Ubicado en <span className="font-medium text-foreground">{property.neighborhood}</span>, {property.city}.
            </p>
            <p className="text-[14px] text-foreground/80">
              Dirección: {property.address}
            </p>
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              Excelente ubicación con acceso a transporte público, comercio y servicios.
            </p>
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Features & Amenities */}
      {property.amenities.length > 0 && (
        <AccordionItem value="amenities" className="border-b border-border">
          <AccordionTrigger className="py-5 text-[13px] font-semibold text-foreground uppercase tracking-wide hover:no-underline hover:bg-neutral-50 transition-colors rounded-md px-2 -mx-2">
            Características y comodidades
          </AccordionTrigger>
          <AccordionContent className="pb-5">
            <div className="flex flex-wrap gap-2">
              {property.amenities.map((amenity) => (
                <span
                  key={amenity.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-50 border border-border rounded-full text-[12px] text-foreground/80"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                  {amenity.name}
                </span>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      )}

      {/* Costs */}
      <AccordionItem value="costs" className="border-b border-border">
        <AccordionTrigger className="py-5 text-[13px] font-semibold text-foreground uppercase tracking-wide hover:no-underline hover:bg-neutral-50 transition-colors rounded-md px-2 -mx-2">
          Costos mensuales
        </AccordionTrigger>
        <AccordionContent className="pb-5">
          <div className="bg-neutral-50 rounded-xl p-4 space-y-3">
            <div className="flex justify-between text-[14px]">
              <span className="text-muted-foreground">Arriendo</span>
              <span className="text-foreground font-semibold">
                {formatCurrency(property.monthlyRent)}
              </span>
            </div>
            {property.adminFee > 0 && (
              <div className="flex justify-between text-[14px]">
                <span className="text-muted-foreground">Administración</span>
                <span className="text-foreground font-semibold">
                  {formatCurrency(property.adminFee)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-[14px]">
              <span className="text-muted-foreground">Depósito (único)</span>
              <span className="text-foreground font-semibold">
                {formatCurrency(property.deposit)}
              </span>
            </div>
            <div className="pt-3 border-t border-border">
              <div className="flex justify-between text-[14px]">
                <span className="text-foreground font-semibold">Total mensual</span>
                <span className="text-primary font-bold">
                  {formatCurrency(property.monthlyRent + property.adminFee)}
                </span>
              </div>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>

      {/* Policies */}
      <AccordionItem value="policies" className="border-b border-border">
        <AccordionTrigger className="py-5 text-[13px] font-semibold text-foreground uppercase tracking-wide hover:no-underline hover:bg-neutral-50 transition-colors rounded-md px-2 -mx-2">
          Políticas
        </AccordionTrigger>
        <AccordionContent className="pb-5">
          <div className="flex flex-wrap gap-2">
            <span className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] border",
              property.amenities.some((a) => a.id === 'pets')
                ? 'bg-[hsl(var(--success-50))] text-[hsl(var(--success-700))] border-[hsl(var(--success-100))]'
                : 'bg-neutral-50 text-foreground/70 border-border'
            )}>
              <span className={cn(
                "w-1.5 h-1.5 rounded-full",
                property.amenities.some((a) => a.id === 'pets') ? 'bg-[hsl(var(--success-500))]' : 'bg-muted-foreground/40'
              )} />
              {property.amenities.some((a) => a.id === 'pets')
                ? 'Se aceptan mascotas'
                : 'No se aceptan mascotas'}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-50 border border-border rounded-full text-[12px] text-foreground/80">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/50" />
              Contrato mínimo 12 meses
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-50 border border-border rounded-full text-[12px] text-foreground/80">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/50" />
              Depósito 1 mes
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[hsl(var(--success-50))] text-[hsl(var(--success-700))] border border-[hsl(var(--success-100))] rounded-full text-[12px]">
              <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--success-500))]" />
              Sin codeudor
            </span>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
