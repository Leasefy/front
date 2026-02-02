'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { PricingCard } from './PricingCard';
import { PLANS, PLAN_COMPARISON } from '@/lib/data/mock-subscriptions';
import { Check, X } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
      {/* Billing cycle toggle - Premium pill design */}
      <div className="flex justify-center mb-12">
        <div className="inline-flex items-center bg-muted/80 p-1.5 rounded-full">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={cn(
              'px-6 py-2.5 text-sm font-semibold rounded-full transition-all duration-300',
              billingCycle === 'monthly'
                ? 'bg-white text-foreground shadow-md'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Mensual
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={cn(
              'px-6 py-2.5 text-sm font-semibold rounded-full transition-all duration-300 flex items-center gap-2',
              billingCycle === 'yearly'
                ? 'bg-white text-foreground shadow-md'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Anual
            <span className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-xs px-2 py-0.5 rounded-full font-bold">
              -20%
            </span>
          </button>
        </div>
      </div>

      {/* Plans grid with stagger animation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 stagger-children">
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
        <div className="mt-20">
          <h3 className="text-2xl font-semibold text-foreground text-center mb-10">
            Comparacion detallada
          </h3>

          <div className="overflow-x-auto rounded-2xl border border-border/60 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
            <Table>
              <TableHeader>
                <TableRow className="border-b-slate-200/60">
                  <TableHead className="text-left font-semibold">Caracteristica</TableHead>
                  <TableHead className="text-center font-semibold">Gratis</TableHead>
                  <TableHead className="text-center bg-[black]/5 font-semibold text-[black]">Pro</TableHead>
                  <TableHead className="text-center font-semibold">Business</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {PLAN_COMPARISON.map((row, index) => (
                  <TableRow
                    key={row.feature}
                    className={cn(
                      'transition-colors hover:bg-muted/50',
                      index % 2 === 0 && 'bg-muted/30'
                    )}
                  >
                    <TableCell className="py-4">
                      <div className="text-sm font-medium text-foreground">{row.feature}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {row.description}
                      </div>
                    </TableCell>
                    <TableCell className="text-center py-4">
                      <ComparisonCell value={row.free} />
                    </TableCell>
                    <TableCell className="text-center py-4 bg-[black]/5">
                      <ComparisonCell value={row.pro} highlighted />
                    </TableCell>
                    <TableCell className="text-center py-4">
                      <ComparisonCell value={row.business} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Trust indicators - Premium design */}
      <div className="mt-16 text-center">
        <p className="text-base text-muted-foreground font-medium">
          Sin compromisos. Cancela cuando quieras.
        </p>
        <div className="flex items-center justify-center gap-8 mt-6">
          {['Pago seguro', 'Facturacion flexible', 'Soporte incluido'].map((item, i) => (
            <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-1.5 h-1.5 rounded-full bg-[black]" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Cell renderer for comparison table values
 */
function ComparisonCell({ value, highlighted }: { value: boolean | string | number; highlighted?: boolean }) {
  if (typeof value === 'boolean') {
    return value ? (
      <div className={cn(
        'w-7 h-7 rounded-full mx-auto flex items-center justify-center',
        highlighted ? 'bg-[black]/10' : 'bg-emerald-50'
      )}>
        <Check className={cn(
          'w-4 h-4',
          highlighted ? 'text-[black]' : 'text-emerald-500'
        )} />
      </div>
    ) : (
      <X className="w-5 h-5 text-muted-foreground mx-auto" />
    );
  }

  return (
    <span className={cn(
      'text-sm font-semibold',
      highlighted ? 'text-[black]' : 'text-foreground'
    )}>
      {value}
    </span>
  );
}

export default PricingTable;
