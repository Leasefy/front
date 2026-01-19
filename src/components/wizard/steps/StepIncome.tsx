'use client';

import { useState, useCallback, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import { useApplication } from '@/lib/context/ApplicationContext';
import {
  validateIncomeStep,
  parseCurrency,
  formatCurrencyInput,
} from '@/lib/validation/applicationValidation';

// ============================================================================
// Component
// ============================================================================

/**
 * StepIncome - Step 3 of application wizard
 * Collects income and obligations for payment capacity assessment
 * Shows computed capacity summary in real-time
 */
export function StepIncome() {
  const { application, updateIncome } = useApplication();
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

  // Get error message for a field (only if touched)
  const getError = useCallback(
    (fieldName: string): string | undefined => {
      return touched[fieldName] ? validation.errors[fieldName] : undefined;
    },
    [touched, validation.errors]
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

  const capacityColors = {
    insufficient: 'bg-red-50 border-red-100 text-red-800',
    limited: 'bg-amber-50 border-amber-100 text-amber-800',
    moderate: 'bg-blue-50 border-blue-100 text-blue-800',
    good: 'bg-green-50 border-green-100 text-green-800',
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
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
            $
          </span>
          <Input
            id="monthlySalary"
            type="text"
            inputMode="numeric"
            placeholder="0"
            value={displayValues.monthlySalary}
            onChange={(e) => handleCurrencyChange('monthlySalary', e.target.value)}
            onBlur={() => handleCurrencyBlur('monthlySalary')}
            className={cn('pl-7', getError('monthlySalary') && 'border-red-500')}
          />
        </div>
      </FormField>

      {/* Additional Income */}
      <FormField
        label="Ingresos adicionales"
        htmlFor="additionalIncome"
        error={getError('additionalIncome')}
        hint="Arriendos, inversiones, trabajo freelance, etc."
      >
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
            $
          </span>
          <Input
            id="additionalIncome"
            type="text"
            inputMode="numeric"
            placeholder="0"
            value={displayValues.additionalIncome}
            onChange={(e) => handleCurrencyChange('additionalIncome', e.target.value)}
            onBlur={() => handleCurrencyBlur('additionalIncome')}
            className={cn('pl-7', getError('additionalIncome') && 'border-red-500')}
          />
        </div>
      </FormField>

      {/* Additional Income Source - Required if additional income > 0 */}
      {(income.additionalIncome ?? 0) > 0 && (
        <FormField
          label="Fuente de ingresos adicionales"
          htmlFor="additionalIncomeSource"
          error={getError('additionalIncomeSource')}
          required
        >
          <Input
            id="additionalIncomeSource"
            placeholder="Ej: Arriendo de propiedad, trabajo freelance"
            value={income.additionalIncomeSource || ''}
            onChange={(e) => handleSourceChange(e.target.value)}
            onBlur={() => handleBlur('additionalIncomeSource')}
            className={cn(getError('additionalIncomeSource') && 'border-red-500')}
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
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
            $
          </span>
          <Input
            id="monthlyObligations"
            type="text"
            inputMode="numeric"
            placeholder="0"
            value={displayValues.monthlyObligations}
            onChange={(e) => handleCurrencyChange('monthlyObligations', e.target.value)}
            onBlur={() => handleCurrencyBlur('monthlyObligations')}
            className={cn('pl-7', getError('monthlyObligations') && 'border-red-500')}
          />
        </div>
      </FormField>

      {/* Capacity Summary Card */}
      {totalIncome > 0 && (
        <Card className={cn('mt-8 border', capacityColors[capacityLevel])}>
          <CardContent className="p-4">
            <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
              <span className="text-lg">📊</span>
              Tu capacidad de pago
            </h3>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span>Ingreso total mensual:</span>
                <span className="font-medium">{formatCurrency(totalIncome)}</span>
              </div>

              <div className="flex justify-between">
                <span>Obligaciones mensuales:</span>
                <span className="font-medium text-red-600">
                  - {formatCurrency(obligations)}
                </span>
              </div>

              <div className="border-t border-current/20 pt-2 flex justify-between">
                <span>Disponible:</span>
                <span className="font-semibold">{formatCurrency(availableForRent)}</span>
              </div>
            </div>

            {/* Recommended Rent */}
            {availableForRent > 0 && (
              <div className="mt-4 pt-4 border-t border-current/20">
                <p className="text-xs opacity-80 mb-2">
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
                <p className="text-xs">
                  Tus obligaciones actuales superan tus ingresos. Considera agregar
                  un codeudor para mejorar tu aplicacion.
                </p>
              )}
              {capacityLevel === 'limited' && (
                <p className="text-xs">
                  Tu capacidad de pago es limitada. Busca propiedades dentro de tu
                  presupuesto recomendado.
                </p>
              )}
              {capacityLevel === 'moderate' && (
                <p className="text-xs">
                  Tienes una capacidad de pago moderada. Hay buenas opciones de
                  arriendo dentro de tu rango.
                </p>
              )}
              {capacityLevel === 'good' && (
                <p className="text-xs">
                  Excelente! Tienes buena capacidad de pago para opciones de
                  arriendo variadas.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
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
