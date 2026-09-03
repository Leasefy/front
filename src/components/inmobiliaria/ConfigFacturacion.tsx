'use client';

import { useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  CreditCard,
  Bank,
  Receipt,
  Calendar,
  Check,
  Crown,
  Sparkle,
  Download,
  Info,
  ChartLineUp,
  Users,
  Buildings,
  Lightning,
  ArrowUp,
  Percent,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { toast } from 'sonner';
import { formatCurrency as formatCOP, formatDate } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { TablePagination } from '@/components/ui/pagination';
import { useTablePagination, PAGE_SIZE_OPTIONS } from '@/lib/hooks/use-table-pagination';
import { useAgencySubscription } from '@/lib/hooks/useAgencySubscription';
import { useAgencyPlans } from '@/lib/hooks/useSubscription';
import type { AgencyPlan } from '@/lib/types/subscription';
import type { AgencyBilling, BillingInvoice } from '@/lib/types/inmobiliaria';

const UPGRADE_ROUTE = '/panel/inmobiliaria/upgrade';

interface ConfigFacturacionProps {
  /** Real usage counters + payment method (from useAgencyBilling). */
  billing: AgencyBilling | null | undefined;
  invoices: BillingInvoice[];
  onUpdatePaymentMethod?: () => void;
  isLoading?: boolean;
}

/**
 * ConfigFacturacion — Billing tab for the agency panel.
 *
 * Single source of truth for the CURRENT PLAN is the REAL agency subscription:
 * `useAgencySubscription()` resolves `currentPlanId` against the AGENCY catalog,
 * and `useAgencyPlans()` provides that catalog as `AgencyPlan[]` — the exact same
 * shape/derivation the `/upgrade` cards render, so the plan shown here always
 * matches `/upgrade`. The legacy `BillingPlan`/`PLAN_LIMITS`/hardcoded prices are
 * gone; the mock upgrade dialog is replaced by a link to `/upgrade` (Wompi flow).
 *
 * `billing` (from useAgencyBilling) is used ONLY for the real usage counters and
 * the payment method / invoice history — never for the plan/price/limits.
 */
export function ConfigFacturacion({
  billing,
  invoices,
  onUpdatePaymentMethod,
  isLoading = false,
}: ConfigFacturacionProps) {
  const { t } = useI18n();
  const router = useRouter();

  /**
   * Paginado de presentación: el histórico de facturas se acumula un renglón
   * por ciclo y no se depura nunca. Sin filtros en esta tabla ⇒ sin `resetKey`.
   */
  const {
    pageItems,
    total,
    page,
    pageSize,
    setPage,
    setPageSize,
    shouldPaginate,
  } = useTablePagination(invoices);

  const { currentPlanId, state, isLoading: subLoading, error: subError } =
    useAgencySubscription();
  const { plans, isLoading: plansLoading } = useAgencyPlans();

  // Resolve the current plan from the SAME catalog `/upgrade` uses so both
  // surfaces show one plan. Null while unresolved (loading, error, or a slug not
  // yet in the catalog) → the UI highlights nothing rather than a wrong plan.
  const currentPlan: AgencyPlan | null =
    currentPlanId && plans.length > 0
      ? plans.find((p) => p.id === currentPlanId) ?? null
      : null;

  const planLoading = isLoading || subLoading || plansLoading;

  // Next billing date comes from the real subscription state, not a hardcoded
  // date. Absent for free/postpaid plans or a brand-new agency → simply hidden.
  const nextBillingDate =
    state?.subscription?.currentPeriodEnd ??
    state?.subscription?.nextBillingDate ??
    null;

  // Headline price derived from the plan's billing model (mirrors /upgrade):
  // percentage-of-canon, free, custom/quote, or a flat monthly amount.
  const priceDisplay = useMemo(() => {
    if (!currentPlan) return null;
    if (currentPlan.pricingModel === 'percentage') {
      return {
        amount: t('inmobiliaria.config.billing.perCanon', {
          percent: currentPlan.canonPercentage ?? 1,
        }),
        period: '',
      };
    }
    if (currentPlan.pricingModel === 'free') {
      return { amount: t('inmobiliaria.config.billing.free'), period: '' };
    }
    if (currentPlan.pricingModel === 'custom' || currentPlan.price.monthly == null) {
      return { amount: t('inmobiliaria.config.billing.customPrice'), period: '' };
    }
    return {
      amount: formatCOP(currentPlan.price.monthly),
      period: t('inmobiliaria.config.billing.perMonth'),
    };
  }, [currentPlan, t]);

  // Usage counters are REAL (useAgencyBilling.usage). Limits come from the real
  // plan (currentPlan.limits, null = unlimited). Guarded: usage/plan may be
  // absent — never crash on the maths, show a safe state instead.
  const usage = billing?.usage ?? null;
  const usageMeters = useMemo(() => {
    if (!usage) return null;
    const pct = (used: number, limit: number | null) =>
      limit == null || limit <= 0
        ? null
        : Math.min(100, Math.round((used / limit) * 100));
    return {
      properties: {
        used: usage.properties,
        limit: currentPlan?.limits.properties ?? null,
        pct: pct(usage.properties, currentPlan?.limits.properties ?? null),
      },
      users: {
        used: usage.users,
        limit: currentPlan?.limits.users ?? null,
        pct: pct(usage.users, currentPlan?.limits.users ?? null),
      },
      // The real plan model caps team members via `users` — there is no separate
      // agent cap — so agents are shown as an informational count (no bar).
      agents: { used: usage.agents },
    };
  }, [usage, currentPlan]);

  const getUsageVariant = (pct: number): 'success' | 'warning' | 'error' => {
    if (pct >= 90) return 'error';
    if (pct >= 70) return 'warning';
    return 'success';
  };

  const getInvoiceStatusColor = (status: BillingInvoice['status']) => {
    const colors = {
      paid: 'bg-success-soft text-success',
      pending: 'bg-warning-soft text-warning',
      failed: 'bg-danger-soft text-danger',
    };
    return colors[status];
  };

  const getInvoiceStatusLabel = (status: BillingInvoice['status']) => {
    const labels = {
      paid: t('inmobiliaria.config.billing.invoiceStatusLabels.paid'),
      pending: t('inmobiliaria.config.billing.invoiceStatusLabels.pending'),
      failed: t('inmobiliaria.config.billing.invoiceStatusLabels.failed'),
    };
    return labels[status];
  };

  const handleUpdatePaymentMethod = useCallback(() => {
    onUpdatePaymentMethod?.();
    toast.info(t('inmobiliaria.config.billing.openingPaymentForm'));
  }, [onUpdatePaymentMethod, t]);

  const handleDownloadInvoice = useCallback(
    (invoice: BillingInvoice) => {
      toast.success(
        t('inmobiliaria.config.billing.downloadingInvoice', { id: invoice.id })
      );
    },
    [t]
  );

  const goToUpgrade = useCallback(() => {
    router.push(UPGRADE_ROUTE);
  }, [router]);

  if (planLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-muted rounded-md w-1/3" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-48 bg-muted rounded-lg" />
          <div className="h-48 bg-muted rounded-lg" />
        </div>
        <div className="h-64 bg-muted rounded-lg" />
      </div>
    );
  }

  const PlanIcon =
    currentPlan?.pricingModel === 'percentage'
      ? Percent
      : currentPlan?.pricingModel === 'free'
      ? Sparkle
      : Crown;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-fg">
          {t('inmobiliaria.config.billing.title')}
        </h2>
        <p className="text-sm text-fg-muted">
          {t('inmobiliaria.config.billing.subtitle')}
        </p>
      </div>

      {/* Plan & Usage Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Plan Card */}
        <div className="p-5 rounded-lg bg-card border border-border">
          {currentPlan ? (
            <>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-surface-muted flex items-center justify-center">
                    <PlanIcon className="w-6 h-6 text-fg-muted" weight="duotone" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">
                      {t('inmobiliaria.config.billing.currentPlan', {
                        plan: currentPlan.name,
                      })}
                    </h3>
                    {currentPlan.description && (
                      <p className="text-sm text-muted-foreground">
                        {currentPlan.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Price */}
              <div className="p-4 rounded-md bg-muted/50 mb-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-semibold text-foreground">
                    {priceDisplay?.amount}
                  </span>
                  {priceDisplay?.period && (
                    <span className="text-muted-foreground">
                      {priceDisplay.period}
                    </span>
                  )}
                </div>
                {nextBillingDate && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('inmobiliaria.config.billing.nextBilling', {
                      date: formatDate(nextBillingDate),
                    })}
                  </p>
                )}
              </div>

              {/* Upgrade → real /upgrade flow (Wompi). No mock dialog. */}
              <Button
                hideArrow
                className="w-full justify-center"
                onClick={goToUpgrade}
              >
                <ArrowUp className="w-4 h-4" />
                {t('inmobiliaria.config.billing.upgradePlan')}
              </Button>
            </>
          ) : (
            // Plan could not be resolved (subscription/catalog error). Highlight
            // nothing; offer the plans page as the safe next step.
            <div className="py-6 text-center">
              <Info className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground mb-4">
                {subError
                  ? t('inmobiliaria.config.billing.planUnavailable')
                  : t('inmobiliaria.config.billing.unavailable')}
              </p>
              <Button hideArrow onClick={goToUpgrade}>
                <Lightning className="w-4 h-4" />
                {t('inmobiliaria.config.billing.upgradePlan')}
              </Button>
            </div>
          )}
        </div>

        {/* Usage Meters Card */}
        <div className="p-5 rounded-lg bg-card border border-border">
          <div className="flex items-center gap-2 mb-4">
            <ChartLineUp className="w-5 h-5 text-fg-muted" />
            <h3 className="text-base font-semibold text-fg">
              {t('inmobiliaria.config.billing.planUsage')}
            </h3>
          </div>

          {usageMeters ? (
            <div className="space-y-5">
              {/* Properties */}
              <UsageRow
                icon={Buildings}
                label={t('inmobiliaria.config.billing.properties')}
                used={usageMeters.properties.used}
                limit={usageMeters.properties.limit}
                pct={usageMeters.properties.pct}
                unlimitedLabel={t('inmobiliaria.config.billing.unlimited')}
                getVariant={getUsageVariant}
              />
              {/* Users */}
              <UsageRow
                icon={Users}
                label={t('inmobiliaria.config.billing.users')}
                used={usageMeters.users.used}
                limit={usageMeters.users.limit}
                pct={usageMeters.users.pct}
                unlimitedLabel={t('inmobiliaria.config.billing.unlimited')}
                getVariant={getUsageVariant}
              />
              {/* Agents — informational count (no separate cap in the plan) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">
                      {t('inmobiliaria.config.billing.agentsLabel')}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {usageMeters.agents.used}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center">
              <Info className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                {t('inmobiliaria.config.billing.usageUnavailable')}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Payment Method & Features Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Method Card */}
        <div className="p-5 rounded-lg bg-card border border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-fg-muted" />
              <h3 className="text-base font-semibold text-fg">
                {t('inmobiliaria.config.billing.paymentMethod')}
              </h3>
            </div>
            <Button
              variant="link"
              size="sm"
              hideArrow
              onClick={handleUpdatePaymentMethod}
              className="h-auto p-0 text-sm font-medium"
            >
              {t('inmobiliaria.config.billing.update')}
            </Button>
          </div>

          {billing?.paymentMethod ? (
            <div className="flex items-center gap-4 p-4 rounded-md bg-muted/50">
              <div className="w-12 h-8 rounded-md bg-ink flex items-center justify-center">
                {billing.paymentMethod.type === 'card' ? (
                  <CreditCard className="w-5 h-5 text-ink-fg" />
                ) : (
                  <Bank className="w-5 h-5 text-ink-fg" />
                )}
              </div>
              <div>
                {billing.paymentMethod.type === 'card' && (
                  <>
                    <p className="font-medium text-foreground">
                      {billing.paymentMethod.brand} **** {billing.paymentMethod.last4}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t('inmobiliaria.config.billing.creditDebitCard')}
                    </p>
                  </>
                )}
                {billing.paymentMethod.type === 'pse' && (
                  <>
                    <p className="font-medium text-foreground">PSE</p>
                    <p className="text-xs text-muted-foreground">
                      {billing.paymentMethod.bankName}
                    </p>
                  </>
                )}
                {billing.paymentMethod.type === 'transfer' && (
                  <>
                    <p className="font-medium text-foreground">
                      {t('inmobiliaria.config.billing.transfer')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {billing.paymentMethod.bankName}
                    </p>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-md bg-warning-soft border border-warning/30">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-warning" />
                <p className="text-sm text-warning">
                  {t('inmobiliaria.config.billing.noPaymentMethod')}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Plan Features Card — derived from the real plan columns (same as /upgrade) */}
        <div className="p-5 rounded-lg bg-card border border-border">
          <div className="flex items-center gap-2 mb-4">
            <Sparkle className="w-5 h-5 text-fg-muted" />
            <h3 className="text-base font-semibold text-fg">
              {t('inmobiliaria.config.billing.planIncludes')}
            </h3>
          </div>

          {currentPlan && currentPlan.features.length > 0 ? (
            <div className="grid grid-cols-1 gap-3">
              {currentPlan.features.map((feature) => (
                <div key={feature} className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-success shrink-0" />
                  <span className="text-sm text-foreground">{feature}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t('inmobiliaria.config.billing.usageUnavailable')}
            </p>
          )}
        </div>
      </div>

      {/* Invoice History */}
      <div className="p-5 rounded-lg bg-card border border-border">
        <div className="flex items-center gap-2 mb-4">
          <Receipt className="w-5 h-5 text-fg-muted" />
          <h3 className="text-base font-semibold text-fg">
            {t('inmobiliaria.config.billing.invoiceHistory')}
          </h3>
        </div>

        {invoices.length > 0 ? (
          <div className="overflow-x-auto">
            <Table className="w-full">
              <TableHeader>
                <TableRow className="border-b border-border">
                  <TableHead className="text-left py-3 px-4">
                    {t('inmobiliaria.config.billing.invoiceDate')}
                  </TableHead>
                  <TableHead className="text-left py-3 px-4">
                    {t('inmobiliaria.config.billing.invoiceAmount')}
                  </TableHead>
                  <TableHead className="text-left py-3 px-4">
                    {t('inmobiliaria.config.billing.invoiceStatus')}
                  </TableHead>
                  <TableHead className="text-right py-3 px-4">
                    {t('inmobiliaria.config.billing.invoiceActions')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((invoice) => (
                  <TableRow
                    key={invoice.id}
                    className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
                  >
                    <TableCell className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-foreground">
                          {formatDate(invoice.date)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      <span className="text-sm font-medium text-foreground">
                        {formatCOP(invoice.amount)}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      <Badge
                        variant="secondary"
                        className={getInvoiceStatusColor(invoice.status)}
                      >
                        {getInvoiceStatusLabel(invoice.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-3 px-4 text-right">
                      {invoice.pdfUrl && invoice.status === 'paid' && (
                        <Button
                          variant="link"
                          size="sm"
                          hideArrow
                          onClick={() => handleDownloadInvoice(invoice)}
                          className="h-auto p-0 gap-1.5 text-sm font-medium"
                        >
                          <Download className="w-4 h-4" />
                          {t('common.download')}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pie: sólo si hay más de una página. */}
            {shouldPaginate && (
              <div className="border-t border-border px-4 py-3">
                <TablePagination
                  total={total}
                  page={page}
                  pageSize={pageSize}
                  pageSizeOptions={PAGE_SIZE_OPTIONS}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="py-8 text-center">
            <Receipt className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">
              {t('inmobiliaria.config.billing.noInvoices')}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Usage meter row ──────────────────────────────────────────────────────────

interface UsageRowProps {
  icon: React.ElementType;
  label: string;
  used: number;
  limit: number | null;
  pct: number | null;
  unlimitedLabel: string;
  getVariant: (pct: number) => 'success' | 'warning' | 'error';
}

/** One metered usage row. `limit == null` (or pct null) → unlimited, no bar. */
function UsageRow({
  icon: Icon,
  label,
  used,
  limit,
  pct,
  unlimitedLabel,
  getVariant,
}: UsageRowProps) {
  const isUnlimited = limit == null || pct == null;
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-foreground">{label}</span>
        </div>
        <span className="text-sm font-medium text-foreground">
          {used}
          {isUnlimited ? '' : ` / ${limit}`}
        </span>
      </div>
      {isUnlimited ? (
        <div className="flex items-center gap-1 text-xs text-success">
          <Lightning className="w-3 h-3" />
          {unlimitedLabel}
        </div>
      ) : (
        <Progress value={pct} className="h-2" variant={getVariant(pct)} />
      )}
    </div>
  );
}

export default ConfigFacturacion;
