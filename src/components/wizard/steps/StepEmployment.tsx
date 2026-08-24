'use client';

import { useState, useCallback } from 'react';
import { Briefcase, Buildings } from '@phosphor-icons/react';
import { useApplication } from '@/lib/context/ApplicationContext';
import {
  EMPLOYMENT_STATUS_OPTIONS,
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
 * Collects employment information: only employmentStatus + companyName
 * (T-0020 — the rest of the job-detail fields were removed).
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

  // Handle employment status change - clears company name if not needed
  const handleStatusChange = useCallback(
    (value: string) => {
      const status = value as EmploymentStatus;
      const shouldClearFields =
        status === 'unemployed' || status === 'retired' || status === 'student';

      updateEmployment({
        employmentStatus: status,
        ...(shouldClearFields ? { companyName: undefined } : {}),
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
        <div className="p-4 bg-warning-soft border border-warning/30 rounded-sm">
          <p className="text-sm text-warning">
            Estar desempleado no descalifica tu aplicación. Podrás incluir otras
            fuentes de ingreso en el siguiente paso.
          </p>
        </div>
      )}

      {employment.employmentStatus === 'retired' && (
        <div className="p-4 bg-primary-soft border border-[#1A40FF]/30 rounded-sm">
          <p className="text-sm text-[#1A40FF]">
            Como pensionado, tu pensión mensual se registrará en el paso de ingresos.
          </p>
        </div>
      )}

      {employment.employmentStatus === 'student' && (
        <div className="p-4 bg-primary-soft border border-[#1A40FF]/30 rounded-sm">
          <p className="text-sm text-[#1A40FF]">
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
        </>
      )}
    </div>
  );
}
