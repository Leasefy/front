'use client';

import { Check, MapPin, Bed, Bath, Maximize2, Car, Edit2, Sparkles, Zap, Building2 } from 'lucide-react';
import { usePublish } from '@/lib/context/PublishContext';
import { PROPERTY_TYPES, AMENITIES_OPTIONS } from '@/lib/types/publish';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

const PLAN_INFO = {
  free: { name: 'Plan Gratis', icon: Zap, price: '$0', color: 'bg-indigo-100 text-indigo-900' },
  pro: { name: 'Plan Propietario', icon: Sparkles, price: '$149.900/mes', color: 'bg-indigo-100 text-indigo-900' },
  business: { name: 'Plan Inmobiliaria', icon: Building2, price: '$499.900/mes', color: 'bg-indigo-100 text-indigo-900' },
};

interface SectionProps {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}

function Section({ title, onEdit, children }: SectionProps) {
  return (
    <div className="py-5 border-b border-border last:border-0">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-foreground">{title}</h4>
        <button
          type="button"
          onClick={onEdit}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Edit2 className="w-3 h-3" />
          Editar
        </button>
      </div>
      {children}
    </div>
  );
}

export function StepReview() {
  const { draft, goToStep } = usePublish();

  const typeLabel = PROPERTY_TYPES.find(t => t.value === draft.type)?.label || '';
  const selectedAmenities = AMENITIES_OPTIONS.filter(a => draft.amenities.includes(a.value));

  return (
    <div className="space-y-2">
      <div className="mb-6">
        <h3 className="text-sm font-medium text-foreground mb-1">
          Revisa tu publicacion
        </h3>
        <p className="text-sm text-muted-foreground">
          Verifica que toda la informacion sea correcta antes de publicar
        </p>
      </div>

      {/* Preview Image */}
      {draft.photos.length > 0 && (
        <div className="aspect-video rounded-sm overflow-hidden mb-6">
          <img
            src={draft.photos[0]}
            alt="Vista previa"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Title and Description */}
      <Section title="Titulo y descripcion" onEdit={() => goToStep(7)}>
        <h3 className="text-lg font-medium text-foreground mb-2">{draft.title || 'Sin titulo'}</h3>
        <p className="text-sm text-muted-foreground line-clamp-3">{draft.description || 'Sin descripcion'}</p>
      </Section>

      {/* Property Type and Location */}
      <Section title="Tipo y ubicacion" onEdit={() => goToStep(1)}>
        <div className="flex items-center gap-4 text-sm">
          <span className="px-3 py-1 bg-black/5 rounded-sm text-foreground/70">{typeLabel}</span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <MapPin className="w-4 h-4" />
            {draft.neighborhood}, {draft.city}
          </span>
        </div>
      </Section>

      {/* Details */}
      <Section title="Caracteristicas" onEdit={() => goToStep(3)}>
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <Bed className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
            <p className="text-sm font-medium text-foreground">{draft.bedrooms}</p>
            <p className="text-xs text-muted-foreground">Habitaciones</p>
          </div>
          <div className="text-center">
            <Bath className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
            <p className="text-sm font-medium text-foreground">{draft.bathrooms}</p>
            <p className="text-xs text-muted-foreground">Banos</p>
          </div>
          <div className="text-center">
            <Maximize2 className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
            <p className="text-sm font-medium text-foreground">{draft.area}</p>
            <p className="text-xs text-muted-foreground">m²</p>
          </div>
          <div className="text-center">
            <Car className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
            <p className="text-sm font-medium text-foreground">{draft.parkingSpaces}</p>
            <p className="text-xs text-muted-foreground">Parqueaderos</p>
          </div>
        </div>
      </Section>

      {/* Amenities */}
      <Section title="Amenidades" onEdit={() => goToStep(4)}>
        {selectedAmenities.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {selectedAmenities.map((amenity) => (
              <span
                key={amenity.value}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-black/5 rounded-sm text-sm text-foreground/70"
              >
                <Check className="w-3 h-3" />
                {amenity.label}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Sin amenidades seleccionadas</p>
        )}
      </Section>

      {/* Photos */}
      <Section title="Fotos" onEdit={() => goToStep(5)}>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {draft.photos.map((photo, index) => (
            <div
              key={photo}
              className="relative w-20 h-20 flex-shrink-0 rounded-sm overflow-hidden"
            >
              <img
                src={photo}
                alt={`Foto ${index + 1}`}
                className="w-full h-full object-cover"
              />
              {index === 0 && (
                <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black text-white text-[10px] rounded-sm">
                  Principal
                </span>
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">{draft.photos.length} foto{draft.photos.length !== 1 ? 's' : ''}</p>
      </Section>

      {/* Pricing */}
      <Section title="Precios" onEdit={() => goToStep(6)}>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Canon mensual</span>
            <span className="font-medium text-foreground">{formatCurrency(draft.monthlyRent)}</span>
          </div>
          {draft.adminFee > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Administracion</span>
              <span className="text-foreground">{formatCurrency(draft.adminFee)}</span>
            </div>
          )}
          {draft.deposit > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Deposito</span>
              <span className="text-foreground">{formatCurrency(draft.deposit)}</span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t border-border">
            <span className="font-medium text-foreground">Total mensual</span>
            <span className="font-medium text-foreground">{formatCurrency(draft.monthlyRent + draft.adminFee)}</span>
          </div>
        </div>
      </Section>

      {/* Plan */}
      {draft.selectedPlan && (
        <Section title="Plan seleccionado" onEdit={() => goToStep(8)}>
          {(() => {
            const plan = PLAN_INFO[draft.selectedPlan as keyof typeof PLAN_INFO];
            const Icon = plan.icon;
            return (
              <div className={cn(
                'inline-flex items-center gap-3 px-4 py-3 rounded-sm',
                plan.color
              )}>
                <Icon className="w-5 h-5" />
                <div>
                  <p className="font-semibold">{plan.name}</p>
                  <p className="text-xs opacity-70">{plan.price}</p>
                </div>
              </div>
            );
          })()}
        </Section>
      )}

      {/* Confirmation notice */}
      <div className="mt-6 p-4 bg-[hsl(var(--sand-50))] border border-[hsl(var(--sand-200))] rounded-sm">
        <div className="flex items-start gap-3">
          <Check className="w-5 h-5 text-[hsl(var(--sand-700))] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-[hsl(var(--sand-900))]">
              Todo listo para publicar
            </p>
            <p className="text-sm text-[hsl(var(--sand-700))] mt-1">
              Al publicar, tu inmueble sera visible para miles de inquilinos potenciales.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
