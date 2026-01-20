'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { PricingCard } from './PricingCard';
import { PLANS, PLAN_COMPARISON } from '@/lib/data/mock-subscriptions';
import { Check, X } from 'lucide-react';
import type { BillingCycle, PlanId } from '@/lib/types/subscription';

export interface PricingTableProps {
  currentPlanId?: PlanId;
  onSelectPlan?: (planId: PlanId) => void;
  showComparison?: boolean;
  className?: string;
}

/**
 * PricingTable - Full pricing comparison with billing toggle
 *
 * Features:
 * - Monthly/Yearly billing toggle
 * - Plan cards in responsive grid
 * - Optional detailed feature comparison table
 */
export function PricingTable({
  currentPlanId,
  onSelectPlan,
  showComparison = false,
  className,
}: PricingTableProps) {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');

  const handlePlanSelect = (planId: PlanId) => {
    if (onSelectPlan) {
      onSelectPlan(planId);
    }
  };

  return (
    <div className={cn('', className)}>
      {/* Billing cycle toggle */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-sm">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-sm transition-all',
              billingCycle === 'monthly'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            Mensual
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={cn(
              'px-4 py-2 text-sm font-medium rounded-sm transition-all',
              billingCycle === 'yearly'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            Anual
            <span className="ml-1.5 text-xs text-emerald-600 font-semibold">
              -20%
            </span>
          </button>
        </div>
      </div>

      {/* Plans grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
        {PLANS.map((plan) => (
          <PricingCard
            key={plan.id}
            plan={plan}
            billingCycle={billingCycle}
            isCurrentPlan={plan.id === currentPlanId}
            onSelect={handlePlanSelect}
          />
        ))}
      </div>

      {/* Feature comparison table (optional) */}
      {showComparison && (
        <div className="mt-16">
          <h3 className="text-xl font-semibold text-slate-900 text-center mb-8">
            Comparacion detallada
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-4 px-4 text-sm font-medium text-slate-500">
                    Caracteristica
                  </th>
                  <th className="text-center py-4 px-4 text-sm font-medium text-slate-700">
                    Gratis
                  </th>
                  <th className="text-center py-4 px-4 text-sm font-medium text-primary">
                    Pro
                  </th>
                  <th className="text-center py-4 px-4 text-sm font-medium text-slate-700">
                    Business
                  </th>
                </tr>
              </thead>
              <tbody>
                {PLAN_COMPARISON.map((row, index) => (
                  <tr
                    key={row.feature}
                    className={cn(
                      'border-b border-slate-100',
                      index % 2 === 0 && 'bg-slate-50/50'
                    )}
                  >
                    <td className="py-4 px-4">
                      <div className="text-sm font-medium text-slate-900">
                        {row.feature}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {row.description}
                      </div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <ComparisonCell value={row.free} />
                    </td>
                    <td className="text-center py-4 px-4 bg-primary/5">
                      <ComparisonCell value={row.pro} />
                    </td>
                    <td className="text-center py-4 px-4">
                      <ComparisonCell value={row.business} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Trust indicators */}
      <div className="mt-12 text-center">
        <p className="text-sm text-slate-500">
          Sin compromisos. Cancela cuando quieras.
        </p>
        <div className="flex items-center justify-center gap-6 mt-4 text-xs text-slate-400">
          <span>Pago seguro</span>
          <span className="w-1 h-1 rounded-full bg-slate-300" />
          <span>Facturacion mensual o anual</span>
          <span className="w-1 h-1 rounded-full bg-slate-300" />
          <span>Soporte incluido</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Cell renderer for comparison table values
 */
function ComparisonCell({ value }: { value: boolean | string | number }) {
  if (typeof value === 'boolean') {
    return value ? (
      <Check className="w-5 h-5 text-emerald-500 mx-auto" />
    ) : (
      <X className="w-5 h-5 text-slate-300 mx-auto" />
    );
  }

  return (
    <span className="text-sm text-slate-700 font-medium">{value}</span>
  );
}

export default PricingTable;
