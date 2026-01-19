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
  DOCUMENT_TYPES,
  MARITAL_STATUS_OPTIONS,
} from '@/lib/types/application';
import {
  validatePersonalStep,
  isValidColombianPhone,
  isValidEmail,
  isAdult,
  isValidDocument,
} from '@/lib/validation/applicationValidation';

// ============================================================================
// Component
// ============================================================================

/**
 * StepPersonal - Step 1 of application wizard
 * Collects personal information for identity and stability assessment
 */
export function StepPersonal() {
  const { application, updatePersonal } = useApplication();
  const personal = application.personal;

  // Track which fields have been touched for error display
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Validate all fields
  const validation = validatePersonalStep(personal);

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

  // Handle text input changes
  const handleInputChange = useCallback(
    (fieldName: keyof typeof personal, value: string | number) => {
      updatePersonal({ [fieldName]: value });
    },
    [updatePersonal]
  );

  return (
    <div className="space-y-6">
      {/* Full Name */}
      <FormField
        label="Nombre completo"
        htmlFor="fullName"
        error={getError('fullName')}
        required
      >
        <Input
          id="fullName"
          placeholder="Como aparece en tu documento"
          value={personal.fullName || ''}
          onChange={(e) => handleInputChange('fullName', e.target.value)}
          onBlur={() => handleBlur('fullName')}
          className={cn(getError('fullName') && 'border-red-500')}
        />
      </FormField>

      {/* Document Type and Number - Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          label="Tipo de documento"
          htmlFor="documentType"
          error={getError('documentType')}
          required
        >
          <Select
            value={personal.documentType || ''}
            onValueChange={(value) => handleInputChange('documentType', value)}
          >
            <SelectTrigger
              id="documentType"
              className={cn(getError('documentType') && 'border-red-500')}
              onBlur={() => handleBlur('documentType')}
            >
              <SelectValue placeholder="Seleccionar" />
            </SelectTrigger>
            <SelectContent>
              {DOCUMENT_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField
          label="Numero de documento"
          htmlFor="documentNumber"
          error={getError('documentNumber')}
          required
        >
          <Input
            id="documentNumber"
            placeholder="Sin puntos ni guiones"
            value={personal.documentNumber || ''}
            onChange={(e) =>
              handleInputChange('documentNumber', e.target.value.replace(/\D/g, ''))
            }
            onBlur={() => handleBlur('documentNumber')}
            className={cn(getError('documentNumber') && 'border-red-500')}
          />
        </FormField>
      </div>

      {/* Date of Birth and Phone - Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          label="Fecha de nacimiento"
          htmlFor="dateOfBirth"
          error={getError('dateOfBirth')}
          required
        >
          <Input
            id="dateOfBirth"
            type="date"
            value={personal.dateOfBirth || ''}
            onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
            onBlur={() => handleBlur('dateOfBirth')}
            className={cn(getError('dateOfBirth') && 'border-red-500')}
            max={new Date().toISOString().split('T')[0]}
          />
        </FormField>

        <FormField
          label="Telefono celular"
          htmlFor="phone"
          error={getError('phone')}
          required
        >
          <Input
            id="phone"
            type="tel"
            placeholder="3XX XXX XXXX"
            value={personal.phone || ''}
            onChange={(e) =>
              handleInputChange('phone', e.target.value.replace(/\D/g, '').slice(0, 10))
            }
            onBlur={() => handleBlur('phone')}
            className={cn(getError('phone') && 'border-red-500')}
          />
        </FormField>
      </div>

      {/* Email */}
      <FormField
        label="Correo electronico"
        htmlFor="email"
        error={getError('email')}
        required
      >
        <Input
          id="email"
          type="email"
          placeholder="tu@email.com"
          value={personal.email || ''}
          onChange={(e) => handleInputChange('email', e.target.value)}
          onBlur={() => handleBlur('email')}
          className={cn(getError('email') && 'border-red-500')}
        />
      </FormField>

      {/* Current Address */}
      <FormField
        label="Direccion actual"
        htmlFor="currentAddress"
        error={getError('currentAddress')}
        required
      >
        <Input
          id="currentAddress"
          placeholder="Calle, numero, barrio, ciudad"
          value={personal.currentAddress || ''}
          onChange={(e) => handleInputChange('currentAddress', e.target.value)}
          onBlur={() => handleBlur('currentAddress')}
          className={cn(getError('currentAddress') && 'border-red-500')}
        />
      </FormField>

      {/* Time at Current Address */}
      <FormField
        label="Tiempo en direccion actual"
        htmlFor="timeAtCurrentAddress"
        error={getError('timeAtCurrentAddress')}
        hint="En meses"
      >
        <Input
          id="timeAtCurrentAddress"
          type="number"
          min={0}
          placeholder="Ej: 24"
          value={personal.timeAtCurrentAddress ?? ''}
          onChange={(e) =>
            handleInputChange(
              'timeAtCurrentAddress',
              e.target.value ? parseInt(e.target.value, 10) : 0
            )
          }
          onBlur={() => handleBlur('timeAtCurrentAddress')}
          className={cn(
            'max-w-[120px]',
            getError('timeAtCurrentAddress') && 'border-red-500'
          )}
        />
      </FormField>

      {/* Marital Status and Dependents - Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          label="Estado civil"
          htmlFor="maritalStatus"
          error={getError('maritalStatus')}
          required
        >
          <Select
            value={personal.maritalStatus || ''}
            onValueChange={(value) => handleInputChange('maritalStatus', value)}
          >
            <SelectTrigger
              id="maritalStatus"
              className={cn(getError('maritalStatus') && 'border-red-500')}
              onBlur={() => handleBlur('maritalStatus')}
            >
              <SelectValue placeholder="Seleccionar" />
            </SelectTrigger>
            <SelectContent>
              {MARITAL_STATUS_OPTIONS.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField
          label="Numero de dependientes"
          htmlFor="dependents"
          error={getError('dependents')}
          hint="Personas que dependen de ti economicamente"
        >
          <Input
            id="dependents"
            type="number"
            min={0}
            max={20}
            placeholder="0"
            value={personal.dependents ?? ''}
            onChange={(e) =>
              handleInputChange(
                'dependents',
                e.target.value ? parseInt(e.target.value, 10) : 0
              )
            }
            onBlur={() => handleBlur('dependents')}
            className={cn('max-w-[120px]', getError('dependents') && 'border-red-500')}
          />
        </FormField>
      </div>
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
      {hint && !error && (
        <p className="text-xs text-gray-500">{hint}</p>
      )}
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}
