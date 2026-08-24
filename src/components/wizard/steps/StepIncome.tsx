'use client';

import { useState, useCallback } from 'react';
import { Wallet, CreditCard, PiggyBank } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { useApplication } from '@/lib/context/ApplicationContext';
import {
  validateIncomeStep,
  formatCurrencyInput,
} from '@/lib/validation/applicationValidation';
import {
  FormField,
  LightInput,
} from '../WizardFormField';

// ============================================================================
// Component
// ============================================================================

/**
 * StepIncome - Step 3 of application wizard
 * Collects income and obligations with Luxterra-style inputs
 */
export function StepIncome() {
  const { application, updateIncome, attemptedAdvance } = useApplication();
  const income = application.income;

  // Track which fields have been touched for error display
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Track formatted currency values for display
  const [displayValues, setDisplayValues] = useState({
    monthlySalary: formatCurrencyInput(income.monthlySalary),
    additionalIncome: formatCurrencyInput(income.additionalIncome),
    monthlyObligations: formatCurrencyInput(income.monthlyObligations),
  });

  // Validate all fields
  const validation = validateIncomeStep(income);

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

  // Handle currency input changes
  const handleCurrencyChange = useCallback(
    (fieldName: keyof typeof displayValues, rawValue: string) => {
      // Allow only numbers
      const numericValue = rawValue.replace(/\D/g, '');
      const numValue = numericValue ? parseInt(numericValue, 10) : 0;

      // Update display value (formatted)
      setDisplayValues((prev) => ({
        ...prev,
        [fieldName]: numericValue ? formatCurrencyInput(numValue) : '',
      }));

      // Update context with numeric value
      updateIncome({ [fieldName]: numValue });
    },
    [updateIncome]
  );

  // Handle currency input blur - format the display
  const handleCurrencyBlur = useCallback(
    (fieldName: keyof typeof displayValues) => {
      handleBlur(fieldName);
      // Re-format display value on blur
      const value = income[fieldName];
      if (value !== undefined && value > 0) {
        setDisplayValues((prev) => ({
          ...prev,
          [fieldName]: formatCurrencyInput(value),
        }));
      }
    },
    [handleBlur, income]
  );

  // Handle additional income source change
  const handleSourceChange = useCallback(
    (value: string) => {
      updateIncome({ additionalIncomeSource: value });
    },
    [updateIncome]
  );

  return (
    <div className="space-y-6">
      {/* Monthly Salary */}
      <FormField
        label="Salario mensual"
        htmlFor="monthlySalary"
        error={getError('monthlySalary')}
        hint="Tu salario base mensual antes de deducciones"
        required
      >
        <CurrencyInput
          id="monthlySalary"
          placeholder="0"
          value={displayValues.monthlySalary}
          onChange={(e) => handleCurrencyChange('monthlySalary', e.target.value)}
          onBlur={() => handleCurrencyBlur('monthlySalary')}
          hasError={!!getError('monthlySalary')}
          icon={<Wallet className="h-4 w-4" />}
        />
      </FormField>

      {/* Additional Income */}
      <FormField
        label="Ingresos adicionales"
        htmlFor="additionalIncome"
        error={getError('additionalIncome')}
        hint="Arriendos, inversiones, trabajo freelance, etc."
      >
        <CurrencyInput
          id="additionalIncome"
          placeholder="0"
          value={displayValues.additionalIncome}
          onChange={(e) => handleCurrencyChange('additionalIncome', e.target.value)}
          onBlur={() => handleCurrencyBlur('additionalIncome')}
          hasError={!!getError('additionalIncome')}
          icon={<PiggyBank className="h-4 w-4" />}
        />
      </FormField>

      {/* Additional Income Source - Required if additional income > 0 */}
      {(income.additionalIncome ?? 0) > 0 && (
        <FormField
          label="Fuente de ingresos adicionales"
          htmlFor="additionalIncomeSource"
          error={getError('additionalIncomeSource')}
          required
        >
          <LightInput
            id="additionalIncomeSource"
            placeholder="Ej: Arriendo de propiedad, trabajo freelance"
            value={income.additionalIncomeSource || ''}
            onChange={(e) => handleSourceChange(e.target.value)}
            onBlur={() => handleBlur('additionalIncomeSource')}
            hasError={!!getError('additionalIncomeSource')}
          />
        </FormField>
      )}

      {/* Monthly Obligations */}
      <FormField
        label="Obligaciones mensuales"
        htmlFor="monthlyObligations"
        error={getError('monthlyObligations')}
        hint="Créditos, deudas, cuotas de vehículo, otros arriendos, pensiones alimenticias"
        required
      >
        <CurrencyInput
          id="monthlyObligations"
          placeholder="0"
          value={displayValues.monthlyObligations}
          onChange={(e) => handleCurrencyChange('monthlyObligations', e.target.value)}
          onBlur={() => handleCurrencyBlur('monthlyObligations')}
          hasError={!!getError('monthlyObligations')}
          icon={<CreditCard className="h-4 w-4" />}
        />
      </FormField>
    </div>
  );
}

// ============================================================================
// CurrencyInput - Luxterra-style currency input with $ prefix
// ============================================================================

interface CurrencyInputProps {
  id: string;
  value: string;
  placeholder?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur: () => void;
  hasError?: boolean;
  icon?: React.ReactNode;
}

function CurrencyInput({
  id,
  value,
  placeholder,
  onChange,
  onBlur,
  hasError,
  icon,
}: CurrencyInputProps) {
  return (
    <div className="relative">
      {icon && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
          {icon}
        </div>
      )}
      <span className={cn(
        "absolute top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium",
        icon ? 'left-11' : 'left-4'
      )}>
        $
      </span>
      <Input
        id={id}
        type="text"
        inputMode="numeric"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        className={cn(
          'h-12 pr-4',
          icon ? 'pl-16' : 'pl-9',
          hasError && 'border-danger/40 focus-visible:ring-danger/20 focus-visible:border-danger/40'
        )}
      />
    </div>
  );
}
