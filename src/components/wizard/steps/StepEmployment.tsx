'use client';

import { useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
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

// ============================================================================
// Component
// ============================================================================

/**
 * StepEmployment - Step 2 of application wizard
 * Collects employment information for stability assessment
 * Shows conditional fields based on employment status
 */
export function StepEmployment() {
  const { application, updateEmployment } = useApplication();
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

  // Get error message for a field (only if touched)
  const getError = useCallback(
    (fieldName: string): string | undefined => {
      return touched[fieldName] ? validation.errors[fieldName] : undefined;
    },
    [touched, validation.errors]
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
        label="Situacion laboral"
        htmlFor="employmentStatus"
        error={getError('employmentStatus')}
        required
      >
        <Select
          value={employment.employmentStatus || ''}
          onValueChange={handleStatusChange}
        >
          <SelectTrigger
            id="employmentStatus"
            className={cn(getError('employmentStatus') && 'border-red-500')}
            onBlur={() => handleBlur('employmentStatus')}
          >
            <SelectValue placeholder="Selecciona tu situacion" />
          </SelectTrigger>
          <SelectContent>
            {EMPLOYMENT_STATUS_OPTIONS.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      {/* Status-specific messages */}
      {employment.employmentStatus === 'unemployed' && (
        <div className="p-4 bg-amber-50 border border-amber-100 rounded-sm">
          <p className="text-sm text-amber-800">
            Estar desempleado no descalifica tu aplicacion. Podras incluir otras
            fuentes de ingreso en el siguiente paso.
          </p>
        </div>
      )}

      {employment.employmentStatus === 'retired' && (
        <div className="p-4 bg-blue-50 border border-blue-100 rounded-sm">
          <p className="text-sm text-blue-800">
            Como pensionado, tu pension mensual se registrara en el paso de ingresos.
          </p>
        </div>
      )}

      {employment.employmentStatus === 'student' && (
        <div className="p-4 bg-blue-50 border border-blue-100 rounded-sm">
          <p className="text-sm text-blue-800">
            Si eres estudiante, puedes registrar ingresos de trabajo de medio tiempo
            o apoyo familiar en el siguiente paso.
          </p>
        </div>
      )}

      {/* Job Details Section - Only shown for employed/self-employed */}
      {showJobDetails && (
        <>
          <div className="border-t border-gray-100 pt-6">
            <h3 className="text-sm font-medium text-gray-900 mb-4">
              Informacion del empleo
            </h3>
          </div>

          {/* Company Name */}
          <FormField
            label="Nombre de la empresa"
            htmlFor="companyName"
            error={getError('companyName')}
            required
          >
            <Input
              id="companyName"
              placeholder="Empresa donde trabajas"
              value={employment.companyName || ''}
              onChange={(e) => handleInputChange('companyName', e.target.value)}
              onBlur={() => handleBlur('companyName')}
              className={cn(getError('companyName') && 'border-red-500')}
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
              <Select
                value={employment.industry || ''}
                onValueChange={(value) => handleInputChange('industry', value)}
              >
                <SelectTrigger
                  id="industry"
                  className={cn(getError('industry') && 'border-red-500')}
                  onBlur={() => handleBlur('industry')}
                >
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRY_OPTIONS.map((ind) => (
                    <SelectItem key={ind.value} value={ind.value}>
                      {ind.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField
              label="Cargo"
              htmlFor="position"
              error={getError('position')}
              required
            >
              <Input
                id="position"
                placeholder="Tu cargo actual"
                value={employment.position || ''}
                onChange={(e) => handleInputChange('position', e.target.value)}
                onBlur={() => handleBlur('position')}
                className={cn(getError('position') && 'border-red-500')}
              />
            </FormField>
          </div>

          {/* Contract Type and Time at Job - Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {employment.employmentStatus === 'employed' && (
              <FormField
                label="Tipo de contrato"
                htmlFor="contractType"
                error={getError('contractType')}
                required
              >
                <Select
                  value={employment.contractType || ''}
                  onValueChange={(value) => handleInputChange('contractType', value)}
                >
                  <SelectTrigger
                    id="contractType"
                    className={cn(getError('contractType') && 'border-red-500')}
                    onBlur={() => handleBlur('contractType')}
                  >
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTRACT_TYPE_OPTIONS.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormField>
            )}

            <FormField
              label="Antiguedad en el trabajo"
              htmlFor="timeAtJob"
              error={getError('timeAtJob')}
              hint="En meses"
            >
              <Input
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
                className={cn(
                  'max-w-[120px]',
                  getError('timeAtJob') && 'border-red-500'
                )}
              />
            </FormField>
          </div>

          {/* Employer Contact - Optional */}
          <div className="border-t border-gray-100 pt-6">
            <h3 className="text-sm font-medium text-gray-900 mb-1">
              Contacto del empleador
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Opcional - para verificacion de empleo
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Telefono del empleador"
              htmlFor="employerPhone"
              error={getError('employerPhone')}
            >
              <Input
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
                className={cn(getError('employerPhone') && 'border-red-500')}
              />
            </FormField>

            <FormField
              label="Direccion del empleador"
              htmlFor="employerAddress"
              error={getError('employerAddress')}
            >
              <Input
                id="employerAddress"
                placeholder="Ciudad, direccion"
                value={employment.employerAddress || ''}
                onChange={(e) => handleInputChange('employerAddress', e.target.value)}
                onBlur={() => handleBlur('employerAddress')}
                className={cn(getError('employerAddress') && 'border-red-500')}
              />
            </FormField>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
// FormField Helper Component
// ============================================================================

interface FormFieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}

function FormField({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
}: FormFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor} className="text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      {children}
      {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
