'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tag, X, Check, SpinnerGap } from '@phosphor-icons/react';
import { validateCoupon } from '@/lib/utils/coupon-validation';
import type { PlanId } from '@/lib/types/subscription';
import type { AppliedCoupon } from '@/lib/types/coupon';

export interface CouponInputProps {
  /** Plan ID to validate coupon against */
  planId: PlanId;
  /** Current price in COP */
  price: number;
  /** Currently applied coupon (if any) */
  appliedCoupon: AppliedCoupon | null;
  /** Callback when coupon is applied or removed */
  onApplyCoupon: (coupon: AppliedCoupon | null) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Coupon input component with validation and feedback
 * Shows input field when no coupon, shows applied coupon when active
 */
export function CouponInput({
  planId,
  price,
  appliedCoupon,
  onApplyCoupon,
  className,
}: CouponInputProps) {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApply = async () => {
    if (!code.trim()) return;

    setIsLoading(true);
    setError(null);

    // Simulate API call delay for realistic UX
    await new Promise((resolve) => setTimeout(resolve, 500));

    const result = validateCoupon(code.trim(), planId, price);

    if (result.valid && result.coupon && result.discount) {
      onApplyCoupon({
        code: result.coupon.code,
        type: result.coupon.type,
        discount: result.discount.value,
        description: result.discount.description,
      });
      setCode('');
    } else {
      setError(result.error || 'Cupón no válido');
    }

    setIsLoading(false);
  };

  const handleRemove = () => {
    onApplyCoupon(null);
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && code.trim() && !isLoading) {
      e.preventDefault();
      handleApply();
    }
  };

  // Show applied coupon state
  if (appliedCoupon) {
    return (
      <div className={cn('', className)}>
        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-sm p-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-emerald-800 truncate">
                {appliedCoupon.code}
              </p>
              <p className="text-xs text-emerald-600 truncate">
                {appliedCoupon.description}
              </p>
            </div>
          </div>
          <button
            onClick={handleRemove}
            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100 rounded transition-colors shrink-0"
            aria-label="Quitar cupón"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Show input state
  return (
    <div className={cn('', className)}>
      <label
        htmlFor="coupon-code"
        className="text-sm font-medium text-foreground mb-2 block"
      >
        ¿Tienes un cupón?
      </label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            id="coupon-code"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setError(null);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ingresa tu código"
            className={cn(
              'pl-10',
              error && 'border-red-300 focus-visible:ring-red-500'
            )}
            disabled={isLoading}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="characters"
            spellCheck={false}
          />
        </div>
        <Button
          onClick={handleApply}
          disabled={!code.trim() || isLoading}
          variant="outline"
          className="shrink-0"
        >
          {isLoading ? (
            <SpinnerGap className="w-4 h-4 animate-spin" />
          ) : (
            'Aplicar'
          )}
        </Button>
      </div>
      {error && (
        <p className="text-sm text-red-600 mt-2" role="alert">
          {error}
        </p>
      )}

      {/* Example coupon hint for testing */}
      <p className="text-xs text-muted-foreground mt-2">
        Prueba: LAUNCH100, VERANO20, GRATIS3
      </p>
    </div>
  );
}

export default CouponInput;
