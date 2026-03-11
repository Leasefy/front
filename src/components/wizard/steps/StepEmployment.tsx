'use client';

import { useState, useCallback } from 'react';
import { Briefcase, Buildings, Factory, FileText, Clock, Phone, MapPin } from '@phosphor-icons/react';
import { useApplication } from '@/lib/context/ApplicationContext';
import {
  EMPLOYMENT_STATUS_OPTIONS,
  CONTRACT_TYPE_OPTIONS,
  INDUSTRY_OPTIONS,
  type EmploymentStatus,
} from '@/lib/types/application';
import {
  validateEmploymentStep,
  requiresJobDetails,
} from '@/lib/validation/applicationValidation';
import {
  FormField,
  LightInput,
  LightSelect,
} from '../WizardFormField';

// ============================================================================
// Component
// ============================================================================

/**
 * StepEmployment - Step 2 of application wizard
 * Collects employment information with Luxterra-style inputs
 */
export function StepEmployment() {
  const { application, updateEmployment, attemptedAdvance } = useApplication();
  const employment = application.employment;

  // Track which fields have been touched for error display
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Validate all fields
  const validation = validateEmploymentStep(employment);

  // Check if job details are required
  const showJobDetails = requiresJobDetails(employment.employmentStatus);

  // Mark field as touched on blur
  const handleBlur = useCallback((fieldName: string) => {
    setTouched((prev) => ({ ...prev, [fieldName]: true }));
  }, []);

  // Get error message for a field (show if touched OR if user attempted to advance)
  const getError = useCallback(
    (fieldName: string): string | undefined => {
      return (touched[fieldName] || attemptedAdvance) ? validation.errors[fieldName] : undefined;
    },
    [touched, validation.errors, attemptedAdvance]
  );

  // Handle input changes
  const handleInputChange = useCallback(
    (fieldName: keyof typeof employment, value: string | number | undefined) => {
      updateEmployment({ [fieldName]: value });
    },
    [updateEmployment]
  );

  // Handle employment status change - clears job fields if not needed
  const handleStatusChange = useCallback(
    (value: string) => {
      const status = value as EmploymentStatus;
      const shouldClearFields =
        status === 'unemployed' || status === 'retired' || status === 'student';

      updateEmployment({
        employmentStatus: status,
        // Reset job fields when switching to non-employed status
        ...(shouldClearFields
          ? {
              companyName: undefined,
              industry: undefined,
              position: undefined,
              contractType: undefined,
              timeAtJob: undefined,
              employerPhone: undefined,
              employerAddress: undefined,
            }
          : {}),
      });
    },
    [updateEmployment]
  );

  return (
    <div className="space-y-6">
      {/* Employment Status */}
      <FormField
        label="Situación laboral"
        htmlFor="employmentStatus"
        error={getError('employmentStatus')}
        required
      >
        <LightSelect
          id="employmentStatus"
          value={employment.employmentStatus || ''}
          onChange={handleStatusChange}
          onBlur={() => handleBlur('employmentStatus')}
          options={EMPLOYMENT_STATUS_OPTIONS}
          placeholder="Selecciona tu situación"
          icon={<Briefcase className="h-4 w-4" />}
          hasError={!!getError('employmentStatus')}
        />
      </FormField>

      {/* Status-specific messages */}
      {employment.employmentStatus === 'unemployed' && (
        <div className="p-4 bg-amber-50/50 border border-amber-200/50 rounded-sm">
          <p className="text-sm text-amber-800">
            Estar desempleado no descalifica tu aplicación. Podrás incluir otras
            fuentes de ingreso en el siguiente paso.
          </p>
        </div>
      )}

      {employment.employmentStatus === 'retired' && (
        <div className="p-4 bg-blue-50/50 border border-blue-200/50 rounded-sm">
          <p className="text-sm text-blue-800">
            Como pensionado, tu pensión mensual se registrará en el paso de ingresos.
          </p>
        </div>
      )}

      {employment.employmentStatus === 'student' && (
        <div className="p-4 bg-blue-50/50 border border-blue-200/50 rounded-sm">
          <p className="text-sm text-blue-800">
            Si eres estudiante, puedes registrar ingresos de trabajo de medio tiempo
            o apoyo familiar en el siguiente paso.
          </p>
        </div>
      )}

      {/* Job Details Section - Only shown for employed/self-employed */}
      {showJobDetails && (
        <>
          <div className="border-t border-border pt-6">
            <h3 className="text-sm font-medium text-foreground mb-4">
              Información del empleo
            </h3>
          </div>

          {/* Company Name */}
          <FormField
            label="Nombre de la empresa"
            htmlFor="companyName"
            error={getError('companyName')}
            required
          >
            <LightInput
              id="companyName"
              placeholder="Empresa donde trabajas"
              value={employment.companyName || ''}
              onChange={(e) => handleInputChange('companyName', e.target.value)}
              onBlur={() => handleBlur('companyName')}
              icon={<Buildings className="h-4 w-4" />}
              hasError={!!getError('companyName')}
            />
          </FormField>

          {/* Industry and Position - Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Industria"
              htmlFor="industry"
              error={getError('industry')}
              required
            >
              <LightSelect
                id="industry"
                value={employment.industry || ''}
                onChange={(value) => handleInputChange('industry', value)}
                onBlur={() => handleBlur('industry')}
                options={INDUSTRY_OPTIONS}
                placeholder="Seleccionar"
                icon={<Factory className="h-4 w-4" />}
                hasError={!!getError('industry')}
              />
            </FormField>

            <FormField
              label="Cargo"
              htmlFor="position"
              error={getError('position')}
              required
            >
              <LightInput
                id="position"
                placeholder="Tu cargo actual"
                value={employment.position || ''}
                onChange={(e) => handleInputChange('position', e.target.value)}
                onBlur={() => handleBlur('position')}
                icon={<FileText className="h-4 w-4" />}
                hasError={!!getError('position')}
              />
            </FormField>
          </div>

          {/* Contract TextT and Time at Job - Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {employment.employmentStatus === 'employed' && (
              <FormField
                label="Tipo de contrato"
                htmlFor="contractType"
                error={getError('contractType')}
                required
              >
                <LightSelect
                  id="contractType"
                  value={employment.contractType || ''}
                  onChange={(value) => handleInputChange('contractType', value)}
                  onBlur={() => handleBlur('contractType')}
                  options={CONTRACT_TYPE_OPTIONS}
                  placeholder="Seleccionar"
                  hasError={!!getError('contractType')}
                />
              </FormField>
            )}

            <FormField
              label="Antigüedad en el trabajo"
              htmlFor="timeAtJob"
              error={getError('timeAtJob')}
              hint="En meses"
            >
              <LightInput
                id="timeAtJob"
                type="number"
                min={0}
                placeholder="Ej: 12"
                value={employment.timeAtJob ?? ''}
                onChange={(e) =>
                  handleInputChange(
                    'timeAtJob',
                    e.target.value ? parseInt(e.target.value, 10) : undefined
                  )
                }
                onBlur={() => handleBlur('timeAtJob')}
                icon={<Clock className="h-4 w-4" />}
                hasError={!!getError('timeAtJob')}
                className="max-w-[180px]"
              />
            </FormField>
          </div>

          {/* Employer Contact - Optional */}
          <div className="border-t border-border pt-6">
            <h3 className="text-sm font-medium text-foreground mb-1">
              Contacto del empleador
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Opcional - para verificación de empleo
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Teléfono del empleador"
              htmlFor="employerPhone"
              error={getError('employerPhone')}
            >
              <LightInput
                id="employerPhone"
                type="tel"
                placeholder="3XX XXX XXXX"
                value={employment.employerPhone || ''}
                onChange={(e) =>
                  handleInputChange(
                    'employerPhone',
                    e.target.value.replace(/\D/g, '').slice(0, 10)
                  )
                }
                onBlur={() => handleBlur('employerPhone')}
                icon={<Phone className="h-4 w-4" />}
                hasError={!!getError('employerPhone')}
              />
            </FormField>

            <FormField
              label="Dirección del empleador"
              htmlFor="employerAddress"
              error={getError('employerAddress')}
            >
              <LightInput
                id="employerAddress"
                placeholder="Ciudad, dirección"
                value={employment.employerAddress || ''}
                onChange={(e) => handleInputChange('employerAddress', e.target.value)}
                onBlur={() => handleBlur('employerAddress')}
                icon={<MapPin className="h-4 w-4" />}
                hasError={!!getError('employerAddress')}
              />
            </FormField>
          </div>
        </>
      )}
    </div>
  );
}
