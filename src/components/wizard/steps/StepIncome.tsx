'use client';

import { useState, useCallback, useMemo } from 'react';
import { DollarSign, Wallet, CreditCard, PiggyBank } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
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

  // Computed values for capacity summary
  const totalIncome = income.totalMonthlyIncome || 0;
  const obligations = income.monthlyObligations || 0;
  const availableForRent = income.availableForRent || 0;
  const recommendedRent = Math.floor(availableForRent * 0.3);

  // Capacity level indicator
  const capacityLevel = useMemo(() => {
    if (availableForRent <= 0) return 'insufficient';
    if (recommendedRent < 500000) return 'limited';
    if (recommendedRent < 1500000) return 'moderate';
    return 'good';
  }, [availableForRent, recommendedRent]);

  const capacityStyles = {
    insufficient: 'bg-red-50/50 border-red-200/50 text-red-900',
    limited: 'bg-amber-50/50 border-amber-200/50 text-amber-900',
    moderate: 'bg-blue-50/50 border-blue-200/50 text-blue-900',
    good: 'bg-emerald-50/50 border-emerald-200/50 text-emerald-900',
  };

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
        hint="Creditos, deudas, cuotas de vehiculo, otros arriendos, pensiones alimenticias"
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

      {/* Capacity Summary Card */}
      {totalIncome > 0 && (
        <div className={cn(
          'mt-8 p-5 border rounded-sm',
          capacityStyles[capacityLevel]
        )}>
          <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Tu capacidad de pago
          </h3>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="opacity-80">Ingreso total mensual:</span>
              <span className="font-medium">{formatCurrency(totalIncome)}</span>
            </div>

            <div className="flex justify-between">
              <span className="opacity-80">Obligaciones mensuales:</span>
              <span className="font-medium">- {formatCurrency(obligations)}</span>
            </div>

            <div className="border-t border-current/10 pt-2 flex justify-between">
              <span>Disponible:</span>
              <span className="font-semibold">{formatCurrency(availableForRent)}</span>
            </div>
          </div>

          {/* Recommended Rent */}
          {availableForRent > 0 && (
            <div className="mt-4 pt-4 border-t border-current/10">
              <p className="text-xs opacity-70 mb-2">
                Regla del 30%: El arriendo no deberia superar el 30% de tu
                disponibilidad
              </p>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Arriendo recomendado:</span>
                <span className="text-lg font-bold">
                  {formatCurrency(recommendedRent)}
                </span>
              </div>
            </div>
          )}

          {/* Capacity Message */}
          <div className="mt-4">
            {capacityLevel === 'insufficient' && (
              <p className="text-xs opacity-80">
                Tus obligaciones actuales superan tus ingresos. Considera agregar
                un codeudor para mejorar tu aplicacion.
              </p>
            )}
            {capacityLevel === 'limited' && (
              <p className="text-xs opacity-80">
                Tu capacidad de pago es limitada. Busca propiedades dentro de tu
                presupuesto recomendado.
              </p>
            )}
            {capacityLevel === 'moderate' && (
              <p className="text-xs opacity-80">
                Tienes una capacidad de pago moderada. Hay buenas opciones de
                arriendo dentro de tu rango.
              </p>
            )}
            {capacityLevel === 'good' && (
              <p className="text-xs opacity-80">
                Tienes buena capacidad de pago para opciones de arriendo variadas.
              </p>
            )}
          </div>
        </div>
      )}
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
      <input
        id={id}
        type="text"
        inputMode="numeric"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        className={cn(
          'w-full h-12 rounded-sm',
          'bg-black/5 text-foreground placeholder:text-muted-foreground',
          'border border-border',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:border-border',
          'transition-colors',
          icon ? 'pl-16' : 'pl-9',
          'pr-4',
          hasError && 'border-red-500 focus:ring-red-500/20 focus:border-red-500'
        )}
      />
    </div>
  );
}
