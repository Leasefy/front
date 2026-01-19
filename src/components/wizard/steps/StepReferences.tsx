'use client';

import { useState, useCallback, useMemo } from 'react';
import { Plus, Trash2, Building2, Briefcase, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useApplication } from '@/lib/context/ApplicationContext';
import type {
  PreviousLandlordReference,
  EmploymentReference,
  PersonalReference,
} from '@/lib/types/application';

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

const EMPTY_PERSONAL: PersonalReference = {
  name: '',
  phone: '',
  relationship: '',
};

// ============================================================================
// Component
// ============================================================================

/**
 * StepReferences - Step 4 of application wizard
 * Collects references for verification: landlords, employment, personal
 */
export function StepReferences() {
  const { application, updateReferences } = useApplication();
  const references = application.references;

  // Track which fields have been touched for error display
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Initialize with at least one of each type, memoized to avoid recreation
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
  const personalRefs = useMemo(
    () =>
      references.personalReferences?.length
        ? references.personalReferences
        : [{ ...EMPTY_PERSONAL }],
    [references.personalReferences]
  );

  // Mark field as touched on blur
  const handleBlur = useCallback((fieldName: string) => {
    setTouched((prev) => ({ ...prev, [fieldName]: true }));
  }, []);

  // Get error for a field
  const getError = useCallback(
    (fieldName: string, value: string | number | undefined): string | undefined => {
      if (!touched[fieldName]) return undefined;

      // Name validation
      if (fieldName.includes('name') && (!value || String(value).length < 3)) {
        return 'Minimo 3 caracteres';
      }

      // Phone validation (Colombian)
      if (fieldName.includes('phone')) {
        const phone = String(value || '').replace(/\D/g, '');
        if (!phone || !/^3\d{9}$/.test(phone)) {
          return 'Telefono invalido';
        }
      }

      // Address validation
      if (fieldName.includes('address') && (!value || String(value).length < 10)) {
        return 'Minimo 10 caracteres';
      }

      // Duration validation
      if (fieldName.includes('duration') && (!value || Number(value) < 1)) {
        return 'Minimo 1 mes';
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
    [touched]
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

  // ========================================================================
  // Personal reference handlers
  // ========================================================================

  const handlePersonalChange = useCallback(
    (index: number, field: keyof PersonalReference, value: string) => {
      const updated = [...personalRefs];
      updated[index] = { ...updated[index], [field]: value };
      updateReferences({ personalReferences: updated });
    },
    [personalRefs, updateReferences]
  );

  const addPersonalRef = useCallback(() => {
    if (personalRefs.length < MAX_REFERENCES) {
      updateReferences({ personalReferences: [...personalRefs, { ...EMPTY_PERSONAL }] });
    }
  }, [personalRefs, updateReferences]);

  const removePersonalRef = useCallback(
    (index: number) => {
      if (personalRefs.length > 1) {
        const updated = personalRefs.filter((_, i) => i !== index);
        updateReferences({ personalReferences: updated });
      }
    },
    [personalRefs, updateReferences]
  );

  return (
    <div className="space-y-8">
      {/* Previous Landlords Section */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="h-5 w-5 text-blue-600" />
          <h3 className="text-base font-medium text-gray-900">
            Arrendadores Anteriores
          </h3>
          <span className="text-xs text-gray-500">(min. 1)</span>
        </div>

        <div className="space-y-4">
          {landlords.map((landlord, index) => (
            <div
              key={index}
              className="p-4 bg-gray-50 border border-gray-200 rounded-sm space-y-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Referencia {index + 1}
                </span>
                {landlords.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeLandlord(index)}
                    className="h-8 w-8 p-0 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Eliminar</span>
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  label="Nombre"
                  error={getError(`landlord-${index}-name`, landlord.name)}
                  required
                >
                  <Input
                    placeholder="Nombre completo"
                    value={landlord.name}
                    onChange={(e) => handleLandlordChange(index, 'name', e.target.value)}
                    onBlur={() => handleBlur(`landlord-${index}-name`)}
                    className={cn(
                      getError(`landlord-${index}-name`, landlord.name) && 'border-red-500'
                    )}
                  />
                </FormField>

                <FormField
                  label="Telefono"
                  error={getError(`landlord-${index}-phone`, landlord.phone)}
                  required
                >
                  <Input
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
                    className={cn(
                      getError(`landlord-${index}-phone`, landlord.phone) && 'border-red-500'
                    )}
                  />
                </FormField>

                <FormField
                  label="Direccion del inmueble"
                  error={getError(`landlord-${index}-address`, landlord.address)}
                  required
                >
                  <Input
                    placeholder="Direccion donde arrendaste"
                    value={landlord.address}
                    onChange={(e) => handleLandlordChange(index, 'address', e.target.value)}
                    onBlur={() => handleBlur(`landlord-${index}-address`)}
                    className={cn(
                      getError(`landlord-${index}-address`, landlord.address) && 'border-red-500'
                    )}
                  />
                </FormField>

                <FormField
                  label="Duracion (meses)"
                  error={getError(`landlord-${index}-duration`, landlord.duration)}
                  required
                >
                  <Input
                    type="number"
                    min={1}
                    placeholder="Ej: 12"
                    value={landlord.duration || ''}
                    onChange={(e) =>
                      handleLandlordChange(
                        index,
                        'duration',
                        e.target.value ? parseInt(e.target.value, 10) : 0
                      )
                    }
                    onBlur={() => handleBlur(`landlord-${index}-duration`)}
                    className={cn(
                      'max-w-[120px]',
                      getError(`landlord-${index}-duration`, landlord.duration) && 'border-red-500'
                    )}
                  />
                </FormField>
              </div>
            </div>
          ))}

          {landlords.length < MAX_REFERENCES && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addLandlord}
              className="w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar otro arrendador
            </Button>
          )}
        </div>
      </section>

      {/* Employment References Section */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Briefcase className="h-5 w-5 text-green-600" />
          <h3 className="text-base font-medium text-gray-900">
            Referencias Laborales
          </h3>
          <span className="text-xs text-gray-500">(min. 1)</span>
        </div>

        <div className="space-y-4">
          {employmentRefs.map((ref, index) => (
            <div
              key={index}
              className="p-4 bg-gray-50 border border-gray-200 rounded-sm space-y-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Referencia {index + 1}
                </span>
                {employmentRefs.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeEmploymentRef(index)}
                    className="h-8 w-8 p-0 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Eliminar</span>
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  label="Nombre"
                  error={getError(`employment-${index}-name`, ref.name)}
                  required
                >
                  <Input
                    placeholder="Nombre de la persona"
                    value={ref.name}
                    onChange={(e) => handleEmploymentChange(index, 'name', e.target.value)}
                    onBlur={() => handleBlur(`employment-${index}-name`)}
                    className={cn(
                      getError(`employment-${index}-name`, ref.name) && 'border-red-500'
                    )}
                  />
                </FormField>

                <FormField
                  label="Telefono"
                  error={getError(`employment-${index}-phone`, ref.phone)}
                  required
                >
                  <Input
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
                    className={cn(
                      getError(`employment-${index}-phone`, ref.phone) && 'border-red-500'
                    )}
                  />
                </FormField>

                <FormField
                  label="Empresa"
                  error={getError(`employment-${index}-company`, ref.company)}
                  required
                >
                  <Input
                    placeholder="Nombre de la empresa"
                    value={ref.company}
                    onChange={(e) => handleEmploymentChange(index, 'company', e.target.value)}
                    onBlur={() => handleBlur(`employment-${index}-company`)}
                    className={cn(
                      getError(`employment-${index}-company`, ref.company) && 'border-red-500'
                    )}
                  />
                </FormField>

                <FormField
                  label="Relacion"
                  error={getError(`employment-${index}-relationship`, ref.relationship)}
                  required
                >
                  <Input
                    placeholder="Ej: Jefe directo, RRHH"
                    value={ref.relationship}
                    onChange={(e) =>
                      handleEmploymentChange(index, 'relationship', e.target.value)
                    }
                    onBlur={() => handleBlur(`employment-${index}-relationship`)}
                    className={cn(
                      getError(`employment-${index}-relationship`, ref.relationship) &&
                        'border-red-500'
                    )}
                  />
                </FormField>
              </div>
            </div>
          ))}

          {employmentRefs.length < MAX_REFERENCES && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addEmploymentRef}
              className="w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar otra referencia
            </Button>
          )}
        </div>
      </section>

      {/* Personal References Section */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <User className="h-5 w-5 text-purple-600" />
          <h3 className="text-base font-medium text-gray-900">
            Referencias Personales
          </h3>
          <span className="text-xs text-gray-500">(min. 1)</span>
        </div>

        <div className="space-y-4">
          {personalRefs.map((ref, index) => (
            <div
              key={index}
              className="p-4 bg-gray-50 border border-gray-200 rounded-sm space-y-4"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Referencia {index + 1}
                </span>
                {personalRefs.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removePersonalRef(index)}
                    className="h-8 w-8 p-0 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Eliminar</span>
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  label="Nombre"
                  error={getError(`personal-${index}-name`, ref.name)}
                  required
                >
                  <Input
                    placeholder="Nombre completo"
                    value={ref.name}
                    onChange={(e) => handlePersonalChange(index, 'name', e.target.value)}
                    onBlur={() => handleBlur(`personal-${index}-name`)}
                    className={cn(
                      getError(`personal-${index}-name`, ref.name) && 'border-red-500'
                    )}
                  />
                </FormField>

                <FormField
                  label="Telefono"
                  error={getError(`personal-${index}-phone`, ref.phone)}
                  required
                >
                  <Input
                    type="tel"
                    placeholder="3XX XXX XXXX"
                    value={ref.phone}
                    onChange={(e) =>
                      handlePersonalChange(
                        index,
                        'phone',
                        e.target.value.replace(/\D/g, '').slice(0, 10)
                      )
                    }
                    onBlur={() => handleBlur(`personal-${index}-phone`)}
                    className={cn(
                      getError(`personal-${index}-phone`, ref.phone) && 'border-red-500'
                    )}
                  />
                </FormField>

                <FormField label="Relacion" error={getError(`personal-${index}-relationship`, ref.relationship)} required>
                  <Input
                    placeholder="Ej: Amigo, Familiar, Vecino"
                    value={ref.relationship}
                    onChange={(e) =>
                      handlePersonalChange(index, 'relationship', e.target.value)
                    }
                    onBlur={() => handleBlur(`personal-${index}-relationship`)}
                    className={cn(
                      getError(`personal-${index}-relationship`, ref.relationship) &&
                        'border-red-500'
                    )}
                  />
                </FormField>
              </div>
            </div>
          ))}

          {personalRefs.length < MAX_REFERENCES && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addPersonalRef}
              className="w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar otra referencia
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}

// ============================================================================
// FormField Helper Component
// ============================================================================

interface FormFieldProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}

function FormField({ label, error, hint, required, children }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      {children}
      {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
