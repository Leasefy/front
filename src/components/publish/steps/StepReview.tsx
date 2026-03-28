'use client';

import { Check, MapPin, Bed, Bathtub, CornersOut, Car, PencilSimple, Sparkle, Lightning, Buildings, Lock, ArrowsOut } from '@phosphor-icons/react';
import { usePublish } from '@/lib/context/PublishContext';
import {
  PROPERTY_TYPES,
  AMENITIES_OPTIONS,
  EMPLOYMENT_OPTIONS,
  INCOME_RATIO_OPTIONS,
  PETS_POLICY_OPTIONS,
  SMOKING_POLICY_OPTIONS,
  CHILDREN_POLICY_OPTIONS,
  LEASE_DURATION_OPTIONS,
  VERIFICATION_OPTIONS,
} from '@/lib/types/publish';
import { formatCurrency } from '@/lib/format';
import { PLANS, AGENCY_PLANS } from '@/lib/constants/subscription-plans';
import { cn } from '@/lib/utils';

const PLAN_ICONS = { free: Lightning, pro: Sparkle, business: Buildings, starter: Lightning, flex: Buildings, enterprise: Buildings } as const;

const PLAN_INFO = Object.fromEntries([
  ...PLANS.map((plan) => [
    plan.id,
    {
      name: `Plan ${plan.name}`,
      icon: PLAN_ICONS[plan.id as keyof typeof PLAN_ICONS] ?? Lightning,
      price: plan.price.monthly === 0 ? '$0' : `${formatCurrency(plan.price.monthly)}/mes`,
      color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-900 dark:text-indigo-100',
    },
  ]),
  ...AGENCY_PLANS.map((plan) => [
    plan.id,
    {
      name: `Plan ${plan.name}`,
      icon: PLAN_ICONS[plan.id as keyof typeof PLAN_ICONS] ?? Lightning,
      price: plan.price.monthly != null ? `${formatCurrency(plan.price.monthly)}/mes` : 'Personalizado',
      color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-900 dark:text-indigo-100',
    },
  ]),
]) as Record<string, { name: string; icon: typeof Lightning; price: string; color: string }>;

interface SectionProps {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}

function Section({ title, onEdit, children }: SectionProps) {
  return (
    <div className="py-5 border-b border-neutral-200 dark:border-neutral-700 last:border-0">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-neutral-900 dark:text-white">{title}</h4>
        <button
          type="button"
          onClick={onEdit}
          className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
        >
          <PencilSimple className="w-3 h-3" />
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
        <h3 className="text-sm font-medium text-neutral-900 dark:text-white mb-1">
          Revisa tu publicación
        </h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Verifica que toda la información sea correcta antes de publicar
        </p>
      </div>

      {/* Preview Image */}
      {draft.photos.length > 0 && (
        <div className="aspect-video rounded-xl overflow-hidden mb-6">
          <img
            src={draft.photos[0]}
            alt="Vista previa"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Title and Description */}
      <Section title="Título y descripción" onEdit={() => goToStep(7)}>
        <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">{draft.title || 'Sin título'}</h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-3">{draft.description || 'Sin descripción'}</p>
      </Section>

      {/* Property TextT and Location */}
      <Section title="Tipo y ubicación" onEdit={() => goToStep(1)}>
        <div className="flex items-center gap-4 text-sm">
          <span className="px-3 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-neutral-700 dark:text-neutral-300">{typeLabel}</span>
          <span className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400">
            <MapPin className="w-4 h-4" />
            {draft.neighborhood}, {draft.city}
          </span>
        </div>
      </Section>

      {/* Details */}
      <Section title="Características" onEdit={() => goToStep(3)}>
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <Bed className="w-5 h-5 mx-auto text-neutral-400 dark:text-neutral-500 mb-1" />
            <p className="text-sm font-medium text-neutral-900 dark:text-white">{draft.bedrooms}</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Habitaciones</p>
          </div>
          <div className="text-center">
            <Bathtub className="w-5 h-5 mx-auto text-neutral-400 dark:text-neutral-500 mb-1" />
            <p className="text-sm font-medium text-neutral-900 dark:text-white">{draft.bathrooms}</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Baños</p>
          </div>
          <div className="text-center">
            <ArrowsOut className="w-5 h-5 mx-auto text-neutral-400 dark:text-neutral-500 mb-1" />
            <p className="text-sm font-medium text-neutral-900 dark:text-white">{draft.area}</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">m²</p>
          </div>
          <div className="text-center">
            <Car className="w-5 h-5 mx-auto text-neutral-400 dark:text-neutral-500 mb-1" />
            <p className="text-sm font-medium text-neutral-900 dark:text-white">{draft.parkingSpaces}</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Parqueaderos</p>
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-sm text-neutral-700 dark:text-neutral-300"
              >
                <Check className="w-3 h-3" />
                {amenity.label}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Sin amenidades seleccionadas</p>
        )}
      </Section>

      {/* Photos */}
      <Section title="Fotos" onEdit={() => goToStep(5)}>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {draft.photos.map((photo, index) => (
            <div
              key={photo}
              className="relative w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden"
            >
              <img
                src={photo}
                alt={`Foto ${index + 1}`}
                className="w-full h-full object-cover"
              />
              {index === 0 && (
                <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-indigo-600 text-white text-[10px] rounded-md">
                  Principal
                </span>
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">{draft.photos.length} foto{draft.photos.length !== 1 ? 's' : ''}</p>
      </Section>

      {/* Pricing */}
      <Section title="Precios" onEdit={() => goToStep(6)}>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-neutral-500 dark:text-neutral-400">Canon mensual</span>
            <span className="font-medium text-neutral-900 dark:text-white">{formatCurrency(draft.monthlyRent)}</span>
          </div>
          {draft.adminFee > 0 && (
            <div className="flex justify-between">
              <span className="text-neutral-500 dark:text-neutral-400">Administración</span>
              <span className="text-neutral-900 dark:text-white">{formatCurrency(draft.adminFee)}</span>
            </div>
          )}
          {draft.deposit > 0 && (
            <div className="flex justify-between">
              <span className="text-neutral-500 dark:text-neutral-400">Depósito</span>
              <span className="text-neutral-900 dark:text-white">{formatCurrency(draft.deposit)}</span>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t border-neutral-200 dark:border-neutral-700">
            <span className="font-medium text-neutral-900 dark:text-white">Total mensual</span>
            <span className="font-medium text-neutral-900 dark:text-white">{formatCurrency(draft.monthlyRent + draft.adminFee)}</span>
          </div>
        </div>
      </Section>

      {/* Tenant Requirements */}
      <Section title="Inquilino Ideal" onEdit={() => goToStep(8)}>
        {(() => {
          const req = draft.tenantRequirements;
          const hasRequirements =
            req.acceptedEmployment.length > 0 ||
            req.minIncomeRatio > 0 ||
            req.petsPolicy !== '' ||
            req.smokingPolicy !== '' ||
            req.maxOccupants > 0 ||
            req.minLeaseDuration > 0 ||
            Object.values(req.verifications).some((v) => v);

          if (!hasRequirements) {
            return (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                Sin requisitos especificos definidos
              </p>
            );
          }

          const requirements: { label: string; value: string; isNonNegotiable: boolean }[] = [];

          // Employment
          if (req.acceptedEmployment.length > 0) {
            const labels = req.acceptedEmployment
              .map((e) => EMPLOYMENT_OPTIONS.find((o) => o.value === e)?.label)
              .filter(Boolean)
              .join(', ');
            requirements.push({
              label: 'Empleo',
              value: labels,
              isNonNegotiable: req.employmentNonNegotiable,
            });
          }

          // Income
          if (req.minIncomeRatio > 0) {
            const incomeLabel = INCOME_RATIO_OPTIONS.find((o) => o.value === req.minIncomeRatio)?.label || '';
            requirements.push({
              label: 'Ingreso minimo',
              value: incomeLabel,
              isNonNegotiable: req.incomeNonNegotiable,
            });
          }

          // Pets
          if (req.petsPolicy !== '') {
            const petsLabel = PETS_POLICY_OPTIONS.find((o) => o.value === req.petsPolicy)?.label || '';
            requirements.push({
              label: 'Mascotas',
              value: petsLabel,
              isNonNegotiable: req.petsNonNegotiable,
            });
          }

          // Smoking
          if (req.smokingPolicy !== '') {
            const smokingLabel = SMOKING_POLICY_OPTIONS.find((o) => o.value === req.smokingPolicy)?.label || '';
            requirements.push({
              label: 'Fumadores',
              value: smokingLabel,
              isNonNegotiable: req.smokingNonNegotiable,
            });
          }

          // Occupants
          if (req.maxOccupants > 0) {
            requirements.push({
              label: 'Ocupantes max',
              value: `${req.maxOccupants} personas`,
              isNonNegotiable: req.occupantsNonNegotiable,
            });
          }

          // Children
          if (req.childrenPolicy !== 'indifferent') {
            const childrenLabel = CHILDREN_POLICY_OPTIONS.find((o) => o.value === req.childrenPolicy)?.label || '';
            requirements.push({
              label: 'Niños',
              value: childrenLabel,
              isNonNegotiable: false,
            });
          }

          // Lease Duration
          if (req.minLeaseDuration > 0) {
            const leaseLabel = LEASE_DURATION_OPTIONS.find((o) => o.value === req.minLeaseDuration)?.label || '';
            requirements.push({
              label: 'Duración mínima',
              value: leaseLabel,
              isNonNegotiable: req.leaseNonNegotiable,
            });
          }

          // Verifications
          const activeVerifications = VERIFICATION_OPTIONS.filter((v) => req.verifications[v.key]);
          if (activeVerifications.length > 0) {
            requirements.push({
              label: 'Verificaciones',
              value: activeVerifications.map((v) => v.label).join(', '),
              isNonNegotiable: req.verificationsNonNegotiable,
            });
          }

          return (
            <div className="space-y-2">
              {requirements.map((r, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-neutral-500 dark:text-neutral-400 min-w-[100px]">{r.label}:</span>
                  <span className="text-neutral-900 dark:text-white flex-1">{r.value}</span>
                  {r.isNonNegotiable && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded text-xs font-medium">
                      <Lock className="w-2.5 h-2.5" />
                      Innegociable
                    </span>
                  )}
                </div>
              ))}
            </div>
          );
        })()}
      </Section>

      {/* Plan */}
      {draft.selectedPlan && (
        <Section title="Plan seleccionado" onEdit={() => goToStep(9)}>
          {(() => {
            const plan = PLAN_INFO[draft.selectedPlan as keyof typeof PLAN_INFO];
            const Icon = plan.icon;
            return (
              <div className={cn(
                'inline-flex items-center gap-3 px-4 py-3 rounded-xl',
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
      <div className="mt-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
        <div className="flex items-start gap-3">
          <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
              Todo listo para publicar
            </p>
            <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-1">
              Al publicar, tu inmueble será visible para miles de inquilinos potenciales.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
