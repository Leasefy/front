'use client';

import { Check, Lock, LockOpen } from '@phosphor-icons/react';
import { usePublish } from '@/lib/context/PublishContext';
import {
  TenantRequirements,
  TenantVerifications,
  EmploymentType,
  EMPLOYMENT_OPTIONS,
  INCOME_RATIO_OPTIONS,
  PETS_POLICY_OPTIONS,
  SMOKING_POLICY_OPTIONS,
  CHILDREN_POLICY_OPTIONS,
  LEASE_DURATION_OPTIONS,
  VERIFICATION_OPTIONS,
  IncomeRatio,
  PetsPolicy,
  SmokingPolicy,
  ChildrenPolicy,
  LeaseDuration,
} from '@/lib/types/publish';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';

interface RequirementSectionProps {
  title: string;
  description?: string;
  isNonNegotiable: boolean;
  onToggleNonNegotiable: () => void;
  children: React.ReactNode;
}

function RequirementSection({
  title,
  description,
  isNonNegotiable,
  onToggleNonNegotiable,
  children,
}: RequirementSectionProps) {
  return (
    <div className="p-4 rounded-[20px] border border-border bg-surface">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <h4 className="text-sm font-medium text-fg">
            {title}
          </h4>
          {description && (
            <p className="text-xs text-fg-muted mt-0.5">
              {description}
            </p>
          )}
        </div>
        <div className="flex items-center shrink-0 rounded-full border border-border bg-surface-muted p-0.5">
          <button
            type="button"
            onClick={() => { if (isNonNegotiable) onToggleNonNegotiable(); }}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200',
              !isNonNegotiable
                ? 'bg-surface text-fg'
                : 'text-fg-subtle hover:text-fg-muted'
            )}
          >
            <LockOpen className="w-3 h-3" />
            Preferido
          </button>
          <button
            type="button"
            onClick={() => { if (!isNonNegotiable) onToggleNonNegotiable(); }}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200',
              isNonNegotiable
                ? 'bg-primary text-primary-fg'
                : 'text-fg-subtle hover:text-fg-muted'
            )}
          >
            <Lock className="w-3 h-3" />
            Innegociable
          </button>
        </div>
      </div>
      {children}
    </div>
  );
}

export function StepTenantRequirements() {
  const { draft, updateDraft } = usePublish();
  const requirements = draft.tenantRequirements;

  const updateRequirements = (updates: Partial<TenantRequirements>) => {
    updateDraft({
      tenantRequirements: {
        ...requirements,
        ...updates,
      },
    });
  };

  const toggleEmployment = (type: EmploymentType) => {
    const current = requirements.acceptedEmployment;
    const updated = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    updateRequirements({ acceptedEmployment: updated });
  };

  const toggleVerification = (key: keyof TenantVerifications) => {
    updateRequirements({
      verifications: {
        ...requirements.verifications,
        [key]: !requirements.verifications[key],
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-fg mb-1">
          Define el perfil de tu inquilino ideal
        </h3>
        <p className="text-sm text-fg-muted">
          Especifica tus requisitos y preferencias. Marca como &quot;Innegociable&quot; los requisitos obligatorios.
        </p>
      </div>

      <div className="space-y-4">
        {/* Employment Section */}
        <RequirementSection
          title="Situación Laboral"
          description="Tipo de empleo aceptado para el inquilino"
          isNonNegotiable={requirements.employmentNonNegotiable}
          onToggleNonNegotiable={() =>
            updateRequirements({ employmentNonNegotiable: !requirements.employmentNonNegotiable })
          }
        >
          <div className="grid grid-cols-2 gap-2">
            {EMPLOYMENT_OPTIONS.map((option) => {
              const isSelected = requirements.acceptedEmployment.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleEmployment(option.value)}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2.5 rounded-[12px] border text-left transition-all duration-200',
                    isSelected
                      ? 'border-2 border-primary bg-primary-soft'
                      : 'border-border hover:border-border-strong'
                  )}
                >
                  <div
                    className={cn(
                      'w-4 h-4 rounded-[5px] flex items-center justify-center flex-shrink-0 border-2 transition-all duration-200',
                      isSelected
                        ? 'bg-primary border-primary'
                        : 'border-border-strong'
                    )}
                  >
                    {isSelected && <Check className="w-2.5 h-2.5 text-primary-fg" weight="bold" />}
                  </div>
                  <span
                    className={cn(
                      'text-sm',
                      isSelected
                        ? 'text-fg font-medium'
                        : 'text-fg-muted'
                    )}
                  >
                    {option.label}
                  </span>
                </button>
              );
            })}
          </div>
        </RequirementSection>

        {/* Income Section */}
        <RequirementSection
          title="Ingreso Mínimo"
          description="Ingreso mensual requerido en relación al arriendo"
          isNonNegotiable={requirements.incomeNonNegotiable}
          onToggleNonNegotiable={() =>
            updateRequirements({ incomeNonNegotiable: !requirements.incomeNonNegotiable })
          }
        >
          <Select
            value={requirements.minIncomeRatio.toString()}
            onValueChange={(value) =>
              updateRequirements({ minIncomeRatio: parseInt(value) as IncomeRatio })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Seleccionar ingreso mínimo" />
            </SelectTrigger>
            <SelectContent>
              {INCOME_RATIO_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value.toString()}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </RequirementSection>

        {/* Pets Section */}
        <RequirementSection
          title="Política de Mascotas"
          isNonNegotiable={requirements.petsNonNegotiable}
          onToggleNonNegotiable={() =>
            updateRequirements({ petsNonNegotiable: !requirements.petsNonNegotiable })
          }
        >
          <div className="space-y-2">
            {PETS_POLICY_OPTIONS.map((option) => {
              const isSelected = requirements.petsPolicy === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateRequirements({ petsPolicy: option.value as PetsPolicy })}
                  className={cn(
                    'w-full flex items-start gap-3 px-3 py-2.5 rounded-[12px] border text-left transition-all duration-200',
                    isSelected
                      ? 'border-2 border-primary bg-primary-soft'
                      : 'border-border hover:border-border-strong'
                  )}
                >
                  <div
                    className={cn(
                      'w-4 h-4 mt-0.5 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all duration-200',
                      isSelected
                        ? 'border-primary'
                        : 'border-border-strong'
                    )}
                  >
                    {isSelected && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  <div>
                    <span
                      className={cn(
                        'text-sm block',
                        isSelected
                          ? 'text-fg font-medium'
                          : 'text-fg-muted'
                      )}
                    >
                      {option.label}
                    </span>
                    <span className="text-xs text-fg-subtle">
                      {option.description}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </RequirementSection>

        {/* Smoking Section */}
        <RequirementSection
          title="Política de Fumadores"
          isNonNegotiable={requirements.smokingNonNegotiable}
          onToggleNonNegotiable={() =>
            updateRequirements({ smokingNonNegotiable: !requirements.smokingNonNegotiable })
          }
        >
          <div className="space-y-2">
            {SMOKING_POLICY_OPTIONS.map((option) => {
              const isSelected = requirements.smokingPolicy === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateRequirements({ smokingPolicy: option.value as SmokingPolicy })}
                  className={cn(
                    'w-full flex items-start gap-3 px-3 py-2.5 rounded-[12px] border text-left transition-all duration-200',
                    isSelected
                      ? 'border-2 border-primary bg-primary-soft'
                      : 'border-border hover:border-border-strong'
                  )}
                >
                  <div
                    className={cn(
                      'w-4 h-4 mt-0.5 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all duration-200',
                      isSelected
                        ? 'border-primary'
                        : 'border-border-strong'
                    )}
                  >
                    {isSelected && <div className="w-2 h-2 rounded-full bg-primary" />}
                  </div>
                  <div>
                    <span
                      className={cn(
                        'text-sm block',
                        isSelected
                          ? 'text-fg font-medium'
                          : 'text-fg-muted'
                      )}
                    >
                      {option.label}
                    </span>
                    <span className="text-xs text-fg-subtle">
                      {option.description}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </RequirementSection>

        {/* Occupants and Children Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Max Occupants */}
          <RequirementSection
            title="Ocupantes Máximos"
            isNonNegotiable={requirements.occupantsNonNegotiable}
            onToggleNonNegotiable={() =>
              updateRequirements({ occupantsNonNegotiable: !requirements.occupantsNonNegotiable })
            }
          >
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min={0}
                max={10}
                value={requirements.maxOccupants || ''}
                onChange={(e) =>
                  updateRequirements({ maxOccupants: parseInt(e.target.value) || 0 })
                }
                placeholder="Sin límite"
                className="w-full font-mono tabular-nums"
              />
              <span className="text-xs text-fg-subtle whitespace-nowrap">
                {requirements.maxOccupants === 0 ? 'Sin límite' : 'personas'}
              </span>
            </div>
          </RequirementSection>

          {/* Children Policy - No non-negotiable toggle for this one */}
          <div className="p-4 rounded-[20px] border border-border bg-surface">
            <h4 className="text-sm font-medium text-fg mb-3">
              Niños
            </h4>
            <Select
              value={requirements.childrenPolicy}
              onValueChange={(value) =>
                updateRequirements({ childrenPolicy: value as ChildrenPolicy })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                {CHILDREN_POLICY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Lease Duration */}
        <RequirementSection
          title="Duración mínima del contrato"
          isNonNegotiable={requirements.leaseNonNegotiable}
          onToggleNonNegotiable={() =>
            updateRequirements({ leaseNonNegotiable: !requirements.leaseNonNegotiable })
          }
        >
          <Select
            value={requirements.minLeaseDuration.toString()}
            onValueChange={(value) =>
              updateRequirements({ minLeaseDuration: parseInt(value) as LeaseDuration })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Seleccionar duración" />
            </SelectTrigger>
            <SelectContent>
              {LEASE_DURATION_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value.toString()}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </RequirementSection>

        {/* Verifications Section */}
        <RequirementSection
          title="Verificaciones Requeridas"
          description="Documentos y verificaciones que solicitarás al inquilino"
          isNonNegotiable={requirements.verificationsNonNegotiable}
          onToggleNonNegotiable={() =>
            updateRequirements({
              verificationsNonNegotiable: !requirements.verificationsNonNegotiable,
            })
          }
        >
          <div className="space-y-2">
            {VERIFICATION_OPTIONS.map((option) => {
              const isSelected = requirements.verifications[option.key];
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => toggleVerification(option.key)}
                  className={cn(
                    'w-full flex items-start gap-3 px-3 py-2.5 rounded-[12px] border text-left transition-all duration-200',
                    isSelected
                      ? 'border-2 border-primary bg-primary-soft'
                      : 'border-border hover:border-border-strong'
                  )}
                >
                  <div
                    className={cn(
                      'w-4 h-4 mt-0.5 rounded-[5px] flex items-center justify-center flex-shrink-0 border-2 transition-all duration-200',
                      isSelected
                        ? 'bg-primary border-primary'
                        : 'border-border-strong'
                    )}
                  >
                    {isSelected && <Check className="w-2.5 h-2.5 text-primary-fg" weight="bold" />}
                  </div>
                  <div>
                    <span
                      className={cn(
                        'text-sm block',
                        isSelected
                          ? 'text-fg font-medium'
                          : 'text-fg-muted'
                      )}
                    >
                      {option.label}
                    </span>
                    <span className="text-xs text-fg-subtle">
                      {option.description}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </RequirementSection>
      </div>

      {/* Summary */}
      {(() => {
        const nonNegotiableCount = [
          requirements.employmentNonNegotiable && requirements.acceptedEmployment.length > 0,
          requirements.incomeNonNegotiable && requirements.minIncomeRatio > 0,
          requirements.petsNonNegotiable && requirements.petsPolicy !== '',
          requirements.smokingNonNegotiable && requirements.smokingPolicy !== '',
          requirements.occupantsNonNegotiable && requirements.maxOccupants > 0,
          requirements.leaseNonNegotiable && requirements.minLeaseDuration > 0,
          requirements.verificationsNonNegotiable &&
            Object.values(requirements.verifications).some((v) => v),
        ].filter(Boolean).length;

        if (nonNegotiableCount > 0) {
          return (
            <p className="text-sm text-fg-muted">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-soft text-primary rounded-full text-xs font-medium">
                <Lock className="w-3 h-3" />
                <span className="font-mono tabular-nums">{nonNegotiableCount}</span>
              </span>{' '}
              requisito{nonNegotiableCount !== 1 ? 's' : ''} innegociable{nonNegotiableCount !== 1 ? 's' : ''}
            </p>
          );
        }
        return null;
      })()}
    </div>
  );
}
