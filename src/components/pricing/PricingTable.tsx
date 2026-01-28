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
      {/* Billing cycle toggle - Usa Tabs de shadcn */}
      <div className="flex justify-center mb-8">
        <Tabs value={billingCycle} onValueChange={(value) => setBillingCycle(value as BillingCycle)}>
          <TabsList>
            <TabsTrigger value="monthly">Mensual</TabsTrigger>
            <TabsTrigger value="yearly">
              Anual
              <span className="ml-1.5 text-xs text-emerald-600 font-semibold">
                -20%
              </span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-left">Caracteristica</TableHead>
                  <TableHead className="text-center">Gratis</TableHead>
                  <TableHead className="text-center bg-primary/5 text-primary">Pro</TableHead>
                  <TableHead className="text-center">Business</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {PLAN_COMPARISON.map((row, index) => (
                  <TableRow
                    key={row.feature}
                    className={cn(index % 2 === 0 && 'bg-muted/30')}
                  >
                    <TableCell>
                      <div className="text-sm font-medium">{row.feature}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {row.description}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <ComparisonCell value={row.free} />
                    </TableCell>
                    <TableCell className="text-center bg-primary/5">
                      <ComparisonCell value={row.pro} />
                    </TableCell>
                    <TableCell className="text-center">
                      <ComparisonCell value={row.business} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
      <X className="w-5 h-5 text-muted-foreground mx-auto" />
    );
  }

  return (
    <span className="text-sm font-medium">{value}</span>
  );
}

export default PricingTable;
