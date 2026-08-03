'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tag, X, Check } from '@phosphor-icons/react';
import { IconButton } from '@leasefy/cadence';
import { subscriptionsApi } from '@/lib/api/subscriptions.service';
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

    try {
      const result = await subscriptionsApi.validateCoupon(code.trim(), planId);

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
    } catch (err) {
      // Infrastructure failure (network down, 5xx) — distinct from "cupón inválido".
      setError(err instanceof Error ? err.message : 'No pudimos verificar el cupón. Intentá de nuevo.');
    } finally {
      setIsLoading(false);
    }
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
        <div className="flex items-center justify-between bg-success-soft border border-success/30 rounded-md p-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-success-soft flex items-center justify-center shrink-0">
              <Check className="w-3.5 h-3.5 text-success" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-success truncate">
                {appliedCoupon.code}
              </p>
              <p className="text-xs text-success truncate">
                {appliedCoupon.description}
              </p>
            </div>
          </div>
          <IconButton
            variant="ghost"
            onClick={handleRemove}
            className="min-w-[44px] min-h-[44px] text-success hover:bg-success-soft shrink-0"
            aria-label="Quitar cupón"
            icon={<X className="w-4 h-4" />}
          />
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
              error && 'border-danger/30 focus-visible:ring-danger'
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
          isLoading={isLoading}
          className="shrink-0"
        >
          Aplicar
        </Button>
      </div>
      {error && (
        <p className="text-sm text-danger mt-2" role="alert">
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
