'use client';

import { useState, useCallback, useMemo } from 'react';
import { Plus, TrashSimple, Buildings, Briefcase, User, Phone, MapPin, Clock, Users } from '@phosphor-icons/react';
import { IconButton } from '@leasefy/cadence';
import { Button } from '@/components/ui/button';
import { useApplication } from '@/lib/context/ApplicationContext';
import type {
  PreviousLandlordReference,
  EmploymentReference,
} from '@/lib/types/application';
import {
  FormField,
  LightInput,
} from '../WizardFormField';

// ============================================================================
// Constants
// ============================================================================

const MAX_REFERENCES = 3;

const EMPTY_LANDLORD: PreviousLandlordReference = {
  name: '',
  phone: '',
  address: '',
  duration: 0,
  relationship: 'Arrendador',
};

const EMPTY_EMPLOYMENT: EmploymentReference = {
  name: '',
  phone: '',
  company: '',
  relationship: '',
};

// ============================================================================
// Component
// ============================================================================

/**
 * StepReferences - Step 4 of application wizard
 * Collects references with Luxterra-style inputs
 */
export function StepReferences() {
  const { application, updateReferences, attemptedAdvance } = useApplication();
  const references = application.references;

  // Track which fields have been touched for error display
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Initialize with at least one of each type
  const landlords = useMemo(
    () =>
      references.previousLandlords?.length
        ? references.previousLandlords
        : [{ ...EMPTY_LANDLORD }],
    [references.previousLandlords]
  );
  const employmentRefs = useMemo(
    () =>
      references.employmentReferences?.length
        ? references.employmentReferences
        : [{ ...EMPTY_EMPLOYMENT }],
    [references.employmentReferences]
  );

  // Mark field as touched on blur
  const handleBlur = useCallback((fieldName: string) => {
    setTouched((prev) => ({ ...prev, [fieldName]: true }));
  }, []);

  // Get error for a field (show if touched OR if user attempted to advance)
  const getError = useCallback(
    (fieldName: string, value: string | number | undefined): string | undefined => {
      if (!touched[fieldName] && !attemptedAdvance) return undefined;

      // Name validation
      if (fieldName.includes('name') && (!value || String(value).length < 3)) {
        return 'Mínimo 3 caracteres';
      }

      // Phone validation (Colombian)
      if (fieldName.includes('phone')) {
        const phone = String(value || '').replace(/\D/g, '');
        if (!phone || !/^3\d{9}$/.test(phone)) {
          return 'Teléfono inválido';
        }
      }

      // Address validation
      if (fieldName.includes('address') && (!value || String(value).length < 10)) {
        return 'Mínimo 10 caracteres';
      }

      // Duration validation
      if (fieldName.includes('duration') && (!value || Number(value) < 1)) {
        return 'Mínimo 1 mes';
      }

      // Company validation
      if (fieldName.includes('company') && (!value || String(value).length < 2)) {
        return 'Requerido';
      }

      // Relationship validation
      if (
        fieldName.includes('relationship') &&
        !fieldName.includes('landlord') &&
        (!value || String(value).length < 2)
      ) {
        return 'Requerido';
      }

      return undefined;
    },
    [touched, attemptedAdvance]
  );

  // ========================================================================
  // Landlord handlers
  // ========================================================================

  const handleLandlordChange = useCallback(
    (index: number, field: keyof PreviousLandlordReference, value: string | number) => {
      const updated = [...landlords];
      updated[index] = { ...updated[index], [field]: value };
      updateReferences({ previousLandlords: updated });
    },
    [landlords, updateReferences]
  );

  const addLandlord = useCallback(() => {
    if (landlords.length < MAX_REFERENCES) {
      updateReferences({ previousLandlords: [...landlords, { ...EMPTY_LANDLORD }] });
    }
  }, [landlords, updateReferences]);

  const removeLandlord = useCallback(
    (index: number) => {
      if (landlords.length > 1) {
        const updated = landlords.filter((_, i) => i !== index);
        updateReferences({ previousLandlords: updated });
      }
    },
    [landlords, updateReferences]
  );

  // ========================================================================
  // Employment reference handlers
  // ========================================================================

  const handleEmploymentChange = useCallback(
    (index: number, field: keyof EmploymentReference, value: string) => {
      const updated = [...employmentRefs];
      updated[index] = { ...updated[index], [field]: value };
      updateReferences({ employmentReferences: updated });
    },
    [employmentRefs, updateReferences]
  );

  const addEmploymentRef = useCallback(() => {
    if (employmentRefs.length < MAX_REFERENCES) {
      updateReferences({ employmentReferences: [...employmentRefs, { ...EMPTY_EMPLOYMENT }] });
    }
  }, [employmentRefs, updateReferences]);

  const removeEmploymentRef = useCallback(
    (index: number) => {
      if (employmentRefs.length > 1) {
        const updated = employmentRefs.filter((_, i) => i !== index);
        updateReferences({ employmentReferences: updated });
      }
    },
    [employmentRefs, updateReferences]
  );

  return (
    <div className="space-y-8">
      {/* Previous Landlords Section */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Buildings className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-sm font-medium text-foreground">
            Arrendadores Anteriores
          </h3>
          <span className="text-xs text-muted-foreground">(min. 1)</span>
        </div>

        <div className="space-y-4">
          {landlords.map((landlord, index) => (
            <div
              key={index}
              className="p-4 bg-black/[0.02] border border-border rounded-sm space-y-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground/70">
                  Referencia {index + 1}
                </span>
                {landlords.length > 1 && (
                  <IconButton
                    variant="ghost"
                    aria-label="Eliminar"
                    onClick={() => removeLandlord(index)}
                    icon={<TrashSimple className="h-4 w-4" />}
                    className="h-8 w-8 rounded-sm text-muted-foreground hover:text-danger hover:bg-danger-soft"
                  />
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  label="Nombre"
                  htmlFor={`landlord-${index}-name`}
                  error={getError(`landlord-${index}-name`, landlord.name)}
                  required
                >
                  <LightInput
                    id={`landlord-${index}-name`}
                    placeholder="Nombre completo"
                    value={landlord.name}
                    onChange={(e) => handleLandlordChange(index, 'name', e.target.value)}
                    onBlur={() => handleBlur(`landlord-${index}-name`)}
                    icon={<User className="h-4 w-4" />}
                    hasError={!!getError(`landlord-${index}-name`, landlord.name)}
                  />
                </FormField>

                <FormField
                  label="Teléfono"
                  htmlFor={`landlord-${index}-phone`}
                  error={getError(`landlord-${index}-phone`, landlord.phone)}
                  required
                >
                  <LightInput
                    id={`landlord-${index}-phone`}
                    type="tel"
                    placeholder="3XX XXX XXXX"
                    value={landlord.phone}
                    onChange={(e) =>
                      handleLandlordChange(
                        index,
                        'phone',
                        e.target.value.replace(/\D/g, '').slice(0, 10)
                      )
                    }
                    onBlur={() => handleBlur(`landlord-${index}-phone`)}
                    icon={<Phone className="h-4 w-4" />}
                    hasError={!!getError(`landlord-${index}-phone`, landlord.phone)}
                  />
                </FormField>

                <FormField
                  label="Dirección del inmueble"
                  htmlFor={`landlord-${index}-address`}
                  error={getError(`landlord-${index}-address`, landlord.address)}
                  required
                >
                  <LightInput
                    id={`landlord-${index}-address`}
                    placeholder="Dirección donde arrendaste"
                    value={landlord.address}
                    onChange={(e) => handleLandlordChange(index, 'address', e.target.value)}
                    onBlur={() => handleBlur(`landlord-${index}-address`)}
                    icon={<MapPin className="h-4 w-4" />}
                    hasError={!!getError(`landlord-${index}-address`, landlord.address)}
                  />
                </FormField>

                <FormField
                  label="Duración (meses)"
                  htmlFor={`landlord-${index}-duration`}
                  error={getError(`landlord-${index}-duration`, landlord.duration)}
                  required
                >
                  <LightInput
                    id={`landlord-${index}-duration`}
                    type="number"
                    min={1}
                    placeholder="Ej: 12"
                    value={landlord.duration || ''}
                    onChange={(e) =>
                      handleLandlordChange(
                        index,
                        'duration',
                        e.target.value === '' ? '' : parseInt(e.target.value, 10)
                      )
                    }
                    onBlur={() => handleBlur(`landlord-${index}-duration`)}
                    icon={<Clock className="h-4 w-4" />}
                    hasError={!!getError(`landlord-${index}-duration`, landlord.duration)}
                    className="max-w-[180px]"
                  />
                </FormField>
              </div>
            </div>
          ))}

          {landlords.length < MAX_REFERENCES && (
            <AddButton onClick={addLandlord} label="Agregar otro arrendador" />
          )}
        </div>
      </section>

      {/* Employment References Section */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Briefcase className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-sm font-medium text-foreground">
            Referencias Laborales
          </h3>
          <span className="text-xs text-muted-foreground">(min. 1)</span>
        </div>

        <div className="space-y-4">
          {employmentRefs.map((ref, index) => (
            <div
              key={index}
              className="p-4 bg-black/[0.02] border border-border rounded-sm space-y-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground/70">
                  Referencia {index + 1}
                </span>
                {employmentRefs.length > 1 && (
                  <IconButton
                    variant="ghost"
                    aria-label="Eliminar"
                    onClick={() => removeEmploymentRef(index)}
                    icon={<TrashSimple className="h-4 w-4" />}
                    className="h-8 w-8 rounded-sm text-muted-foreground hover:text-danger hover:bg-danger-soft"
                  />
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  label="Nombre"
                  htmlFor={`employment-${index}-name`}
                  error={getError(`employment-${index}-name`, ref.name)}
                  required
                >
                  <LightInput
                    id={`employment-${index}-name`}
                    placeholder="Nombre de la persona"
                    value={ref.name}
                    onChange={(e) => handleEmploymentChange(index, 'name', e.target.value)}
                    onBlur={() => handleBlur(`employment-${index}-name`)}
                    icon={<User className="h-4 w-4" />}
                    hasError={!!getError(`employment-${index}-name`, ref.name)}
                  />
                </FormField>

                <FormField
                  label="Teléfono"
                  htmlFor={`employment-${index}-phone`}
                  error={getError(`employment-${index}-phone`, ref.phone)}
                  required
                >
                  <LightInput
                    id={`employment-${index}-phone`}
                    type="tel"
                    placeholder="3XX XXX XXXX"
                    value={ref.phone}
                    onChange={(e) =>
                      handleEmploymentChange(
                        index,
                        'phone',
                        e.target.value.replace(/\D/g, '').slice(0, 10)
                      )
                    }
                    onBlur={() => handleBlur(`employment-${index}-phone`)}
                    icon={<Phone className="h-4 w-4" />}
                    hasError={!!getError(`employment-${index}-phone`, ref.phone)}
                  />
                </FormField>

                <FormField
                  label="Empresa"
                  htmlFor={`employment-${index}-company`}
                  error={getError(`employment-${index}-company`, ref.company)}
                  required
                >
                  <LightInput
                    id={`employment-${index}-company`}
                    placeholder="Nombre de la empresa"
                    value={ref.company}
                    onChange={(e) => handleEmploymentChange(index, 'company', e.target.value)}
                    onBlur={() => handleBlur(`employment-${index}-company`)}
                    icon={<Buildings className="h-4 w-4" />}
                    hasError={!!getError(`employment-${index}-company`, ref.company)}
                  />
                </FormField>

                <FormField
                  label="Relación"
                  htmlFor={`employment-${index}-relationship`}
                  error={getError(`employment-${index}-relationship`, ref.relationship)}
                  required
                >
                  <LightInput
                    id={`employment-${index}-relationship`}
                    placeholder="Ej: Jefe directo, RRHH"
                    value={ref.relationship}
                    onChange={(e) =>
                      handleEmploymentChange(index, 'relationship', e.target.value)
                    }
                    onBlur={() => handleBlur(`employment-${index}-relationship`)}
                    icon={<Users className="h-4 w-4" />}
                    hasError={!!getError(`employment-${index}-relationship`, ref.relationship)}
                  />
                </FormField>
              </div>
            </div>
          ))}

          {employmentRefs.length < MAX_REFERENCES && (
            <AddButton onClick={addEmploymentRef} label="Agregar otra referencia" />
          )}
        </div>
      </section>

    </div>
  );
}

// ============================================================================
// AddButton - Luxterra-style add button
// ============================================================================

interface AddButtonProps {
  onClick: () => void;
  label: string;
}

function AddButton({ onClick, label }: AddButtonProps) {
  return (
    <Button
      variant="outline"
      hideArrow
      onClick={onClick}
      className="rounded-xl"
    >
      <Plus className="h-4 w-4" />
      {label}
    </Button>
  );
}
