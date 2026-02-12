'use client';

import { useState, useCallback } from 'react';
import { User, FileText, Calendar, Phone, MapPin, Users, Heart, Envelope } from '@phosphor-icons/react';
import { useApplication } from '@/lib/context/ApplicationContext';
import {
  DOCUMENT_TYPES,
  MARITAL_STATUS_OPTIONS,
} from '@/lib/types/application';
import { validatePersonalStep } from '@/lib/validation/applicationValidation';
import {
  FormField,
  LightInput,
  LightSelect,
} from '../WizardFormField';

// ============================================================================
// Component
// ============================================================================

/**
 * StepPersonal - Step 1 of application wizard
 * Collects personal information with Luxterra-style inputs
 */
export function StepPersonal() {
  const { application, updatePersonal, attemptedAdvance } = useApplication();
  const personal = application.personal;

  // Track which fields have been touched for error display
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Validate all fields
  const validation = validatePersonalStep(personal);

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
        <LightInput
          id="fullName"
          placeholder="Cómo aparece en tu documento"
          value={personal.fullName || ''}
          onChange={(e) => handleInputChange('fullName', e.target.value)}
          onBlur={() => handleBlur('fullName')}
          icon={<User className="h-4 w-4" />}
          hasError={!!getError('fullName')}
        />
      </FormField>

      {/* Email */}
      <FormField
        label="Correo electrónico"
        htmlFor="email"
        error={getError('email')}
        required
      >
        <LightInput
          id="email"
          type="email"
          placeholder="tu@email.com"
          value={personal.email || ''}
          onChange={(e) => handleInputChange('email', e.target.value)}
          onBlur={() => handleBlur('email')}
          icon={<Envelope className="h-4 w-4" />}
          hasError={!!getError('email')}
        />
      </FormField>

      {/* Document TextT and Number - Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          label="Tipo de documento"
          htmlFor="documentType"
          error={getError('documentType')}
          required
        >
          <LightSelect
            id="documentType"
            value={personal.documentType || ''}
            onChange={(value) => handleInputChange('documentType', value)}
            onBlur={() => handleBlur('documentType')}
            options={DOCUMENT_TYPES}
            placeholder="Seleccionar tipo"
            icon={<FileText className="h-4 w-4" />}
            hasError={!!getError('documentType')}
          />
        </FormField>

        <FormField
          label="Número de documento"
          htmlFor="documentNumber"
          error={getError('documentNumber')}
          required
        >
          <LightInput
            id="documentNumber"
            placeholder="Sin puntos ni guiones"
            value={personal.documentNumber || ''}
            onChange={(e) =>
              handleInputChange('documentNumber', e.target.value.replace(/\D/g, ''))
            }
            onBlur={() => handleBlur('documentNumber')}
            icon={<FileText className="h-4 w-4" />}
            hasError={!!getError('documentNumber')}
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
          <LightInput
            id="dateOfBirth"
            type="date"
            value={personal.dateOfBirth || ''}
            onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
            onBlur={() => handleBlur('dateOfBirth')}
            icon={<Calendar className="h-4 w-4" />}
            hasError={!!getError('dateOfBirth')}
            max={new Date().toISOString().split('T')[0]}
          />
        </FormField>

        <FormField
          label="Teléfono celular"
          htmlFor="phone"
          error={getError('phone')}
          required
        >
          <LightInput
            id="phone"
            type="tel"
            placeholder="3XX XXX XXXX"
            value={personal.phone || ''}
            onChange={(e) =>
              handleInputChange('phone', e.target.value.replace(/\D/g, '').slice(0, 10))
            }
            onBlur={() => handleBlur('phone')}
            icon={<Phone className="h-4 w-4" />}
            hasError={!!getError('phone')}
          />
        </FormField>
      </div>

      {/* Current Address */}
      <FormField
        label="Dirección actual"
        htmlFor="currentAddress"
        error={getError('currentAddress')}
        required
      >
        <LightInput
          id="currentAddress"
          placeholder="Calle, número, barrio, ciudad"
          value={personal.currentAddress || ''}
          onChange={(e) => handleInputChange('currentAddress', e.target.value)}
          onBlur={() => handleBlur('currentAddress')}
          icon={<MapPin className="h-4 w-4" />}
          hasError={!!getError('currentAddress')}
        />
      </FormField>

      {/* Time at Current Address */}
      <FormField
        label="Tiempo en dirección actual"
        htmlFor="timeAtCurrentAddress"
        error={getError('timeAtCurrentAddress')}
        hint="En meses"
      >
        <LightInput
          id="timeAtCurrentAddress"
          type="number"
          min={0}
          placeholder="Ej: 24"
          value={personal.timeAtCurrentAddress ?? ''}
          onChange={(e) =>
            handleInputChange(
              'timeAtCurrentAddress',
              e.target.value === '' ? '' : parseInt(e.target.value, 10)
            )
          }
          onBlur={() => handleBlur('timeAtCurrentAddress')}
          hasError={!!getError('timeAtCurrentAddress')}
          className="max-w-[180px]"
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
          <LightSelect
            id="maritalStatus"
            value={personal.maritalStatus || ''}
            onChange={(value) => handleInputChange('maritalStatus', value)}
            onBlur={() => handleBlur('maritalStatus')}
            options={MARITAL_STATUS_OPTIONS}
            placeholder="Seleccionar"
            icon={<Heart className="h-4 w-4" />}
            hasError={!!getError('maritalStatus')}
          />
        </FormField>

        <FormField
          label="Número de dependientes"
          htmlFor="dependents"
          error={getError('dependents')}
          hint="Personas que dependen de ti"
        >
          <LightInput
            id="dependents"
            type="number"
            min={0}
            max={20}
            placeholder="0"
            value={personal.dependents ?? ''}
            onChange={(e) =>
              handleInputChange(
                'dependents',
                e.target.value === '' ? '' : parseInt(e.target.value, 10)
              )
            }
            onBlur={() => handleBlur('dependents')}
            icon={<Users className="h-4 w-4" />}
            hasError={!!getError('dependents')}
          />
        </FormField>
      </div>
    </div>
  );
}
