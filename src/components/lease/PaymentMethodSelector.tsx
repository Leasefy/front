'use client';

import { cn } from '@/lib/utils';
import { Check, Info } from '@phosphor-icons/react';
import { PAYMENT_METHODS } from '@/lib/constants/payment-methods';
import type { PaymentMethod } from '@/lib/types/lease';

interface PaymentMethodSelectorProps {
  selectedMethod: PaymentMethod | null;
  onSelect: (method: PaymentMethod) => void;
  className?: string;
}

/**
 * PaymentMethodSelector - Grid of payment method options
 * Shows Colombian payment methods: PSE, cards, Nequi, Daviplata
 */
export function PaymentMethodSelector({
  selectedMethod,
  onSelect,
  className,
}: PaymentMethodSelectorProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">
          Método de pago
        </label>
        <span className="text-xs text-muted-foreground">
          Selecciona cómo deseas pagar
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {PAYMENT_METHODS.map((method) => {
          const isSelected = selectedMethod === method.id;
          const isDisabled = !method.enabled;

          return (
            <button
              key={method.id}
              onClick={() => method.enabled && onSelect(method.id)}
              disabled={isDisabled}
              type="button"
              className={cn(
                'relative flex items-start gap-3 p-4 rounded-sm border text-left transition-all',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                isSelected && method.enabled
                  ? 'border-primary bg-primary/5'
                  : method.enabled
                  ? 'border-border hover:border-border hover:bg-muted'
                  : 'border-border bg-muted opacity-60 cursor-not-allowed'
              )}
            >
              {/* Icon */}
              <span
                className={cn(
                  'text-2xl shrink-0 mt-0.5',
                  isDisabled && 'grayscale'
                )}
              >
                {method.icon}
              </span>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p
                    className={cn(
                      'font-medium',
                      isDisabled ? 'text-muted-foreground' : 'text-foreground'
                    )}
                  >
                    {method.name}
                  </p>
                  {method.fee && method.fee > 0 && (
                    <span className="text-xs px-1.5 py-0.5 bg-[#F8F0E0] text-[#B7791F] dark:bg-[#B7791F]/15 dark:text-[#D2992F] rounded">
                      +{method.fee}%
                    </span>
                  )}
                </div>
                <p
                  className={cn(
                    'text-xs mt-0.5',
                    isDisabled ? 'text-muted-foreground' : 'text-muted-foreground'
                  )}
                >
                  {method.description}
                </p>
                {method.processingTime && method.enabled && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {method.processingTime}
                  </p>
                )}
              </div>

              {/* Check indicator */}
              {isSelected && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}

              {/* Coming soon badge */}
              {isDisabled && (
                <span className="absolute top-3 right-3 text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded">
                  Próximamente
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Info note */}
      <div className="flex items-start gap-2 p-3 bg-[#EEF1FF] rounded-sm text-xs text-[#1A40FF]">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          Tu pago será procesado de forma segura. Recibirás confirmación por
          correo electrónico una vez completado.
        </p>
      </div>
    </div>
  );
}
