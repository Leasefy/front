'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { PricingCard } from './PricingCard';
import { AgencyTierCard } from './AgencyTierCard';
import { PLANS, PLAN_COMPARISON } from '@/lib/constants/subscription-plans';
import { Check, X } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { BillingCycle, PlanId, AgencyPlan, AgencyPlanId } from '@/lib/types/subscription';
import { formatCurrency } from '@/lib/format';

export interface PricingTableProps {
  currentPlanId?: PlanId | AgencyPlanId;
  onSelectPlan?: (planId: string) => void;
  showComparison?: boolean;
  className?: string;
  /** When provided, renders agency tier cards instead of landlord plan cards */
  agencyPlans?: AgencyPlan[];
}

/**
 * PricingTable - Full pricing comparison with billing toggle
 *
 * Features:
 * - Monthly/Yearly billing toggle
 * - Plan cards in responsive grid
 * - Optional detailed feature comparison table
 */
function formatAgencyPrice(plan: AgencyPlan, cycle: BillingCycle): { price: string; period: string } {
  if (plan.pricingModel === 'percentage') {
    return { price: `${plan.canonPercentage ?? 1}% del canon`, period: 'mensual' };
  }
  if (plan.pricingModel === 'custom' || plan.price.monthly === null) {
    return { price: 'A la medida', period: '' };
  }
  const amount = cycle === 'yearly' && plan.price.yearly ? plan.price.yearly : (plan.price.monthly ?? 0);
  return {
    price: formatCurrency(amount).replace('$', '').trim(),
    period: cycle === 'yearly' ? '/año' : '/mes',
  };
}

export function PricingTable({
  currentPlanId,
  onSelectPlan,
  showComparison = false,
  className,
  agencyPlans,
}: PricingTableProps) {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');

  const handlePlanSelect = (planId: string) => {
    onSelectPlan?.(planId);
  };

  // Agency mode: render AgencyTierCard grid
  if (agencyPlans && agencyPlans.length > 0) {
    return (
      <div className={cn('', className)}>
        {/* Billing cycle toggle */}
        <div className="flex justify-center mb-12">
        <Tabs value={billingCycle} onValueChange={(v) => setBillingCycle(v as BillingCycle)}>
          <TabsList variant="segmented">
            <TabsTrigger value="monthly">Mensual</TabsTrigger>
            <TabsTrigger value="yearly" className="inline-flex items-center gap-2">
              Anual
              <Badge variant="success" className="font-mono tabular-nums">
                -20%
              </Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {agencyPlans.map((plan) => {
            const { price, period } = formatAgencyPrice(plan, billingCycle);
            return (
              <AgencyTierCard
                key={plan.id}
                name={plan.name}
                price={price}
                period={period}
                description={plan.description}
                features={plan.features}
                properties={plan.limits.properties ?? undefined}
                users={plan.limits.users ?? undefined}
                popular={plan.highlighted}
                isFlex={plan.id === 'flex'}
                isEnterprise={plan.id === 'enterprise'}
                selected={plan.id === currentPlanId}
                noCurrencySymbol={plan.pricingModel !== 'flat'}
                onSelect={() => handlePlanSelect(plan.id)}
              />
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('', className)}>
      {/* Billing cycle toggle - Premium pill design */}
      <div className="flex justify-center mb-12">
        <Tabs value={billingCycle} onValueChange={(v) => setBillingCycle(v as BillingCycle)}>
          <TabsList variant="segmented">
            <TabsTrigger value="monthly">Mensual</TabsTrigger>
            <TabsTrigger value="yearly" className="inline-flex items-center gap-2">
              Anual
              <Badge variant="success" className="font-mono tabular-nums">
                -20%
              </Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Plans grid with stagger animation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 stagger-children">
        {PLANS.map((plan) => (
          <PricingCard
            key={plan.id}
            plan={plan}
            billingCycle={billingCycle}
            isCurrentPlan={plan.id === currentPlanId}
            onSelect={(id) => handlePlanSelect(id)}
          />
        ))}
      </div>

      {/* Feature comparison table (optional) */}
      {showComparison && (
        <div className="mt-20">
          <h3 className="text-2xl font-semibold text-foreground text-center mb-10">
            Comparacion detallada
          </h3>

          <div className="overflow-x-auto rounded-[18px] border border-border/60 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
            <Table>
              <TableHeader>
                <TableRow className="border-b-border">
                  <TableHead className="text-left font-semibold">Caracteristica</TableHead>
                  <TableHead className="text-center font-semibold">Gratis</TableHead>
                  <TableHead className="text-center bg-primary/5 font-semibold text-primary">Propietario</TableHead>
                  <TableHead className="text-center font-semibold">Inversionista</TableHead>
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
                      <ComparisonCell value={row.starter} />
                    </TableCell>
                    <TableCell className="text-center py-4 bg-primary/5">
                      <ComparisonCell value={row.pro} highlighted />
                    </TableCell>
                    <TableCell className="text-center py-4">
                      <ComparisonCell value={row.flex} />
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
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
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
        highlighted ? 'bg-primary/10' : 'bg-success-soft'
      )}>
        <Check className={cn(
          'w-4 h-4',
          highlighted ? 'text-primary' : 'text-success'
        )} />
      </div>
    ) : (
      <X className="w-5 h-5 text-muted-foreground mx-auto" />
    );
  }

  return (
    <span className={cn(
      'text-sm font-semibold font-mono tabular-nums',
      highlighted ? 'text-primary' : 'text-foreground'
    )}>
      {value}
    </span>
  );
}

export default PricingTable;
