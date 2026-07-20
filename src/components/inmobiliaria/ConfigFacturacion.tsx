'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard,
  Bank,
  Receipt,
  Calendar,
  Check,
  X,
  Crown,
  Sparkle,
  CaretRight,
  Download,
  Info,
  ChartLineUp,
  Users,
  Buildings,
  Headset,
  FileText,
  Lightning,
  Plugs,
  Code,
  ArrowUp,
  Rocket,
  ShieldCheck,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { toast } from 'sonner';
import { formatCurrency as formatCOP, formatDate } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type {
  AgencyBilling,
  BillingInvoice,
  BillingPlan,
} from '@/lib/types/inmobiliaria';
import {
  getPlanLabel,
  getPlanColor,
  PLAN_LIMITS,
} from '@/lib/types/inmobiliaria';

interface ConfigFacturacionProps {
  billing: AgencyBilling;
  invoices: BillingInvoice[];
  onUpgrade?: (plan: BillingPlan) => void;
  onUpdatePaymentMethod?: () => void;
  isLoading?: boolean;
}

/**
 * ConfigFacturacion - Billing and subscription management
 *
 * Features:
 * - Current plan display with badge
 * - Usage meters with progress bars
 * - Payment method card
 * - Plan features list
 * - Invoice history table
 * - Upgrade modal with plan comparison
 */
export function ConfigFacturacion({
  billing,
  invoices,
  onUpgrade,
  onUpdatePaymentMethod,
  isLoading = false,
}: ConfigFacturacionProps) {
  const { t } = useI18n();
  const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<BillingPlan | null>(null);
  const [isUpgrading, setIsUpgrading] = useState(false);

  // Plan display configuration
  const PLAN_CONFIG = useMemo<Record<BillingPlan, {
    icon: React.ElementType;
    price: number;
    description: string;
    highlight?: boolean;
  }>>(() => ({
    starter: {
      icon: Rocket,
      price: 99000,
      description: t('inmobiliaria.config.billing.plans.starter.description'),
    },
    professional: {
      icon: Crown,
      price: 299000,
      description: t('inmobiliaria.config.billing.plans.professional.description'),
      highlight: true,
    },
    enterprise: {
      icon: ShieldCheck,
      price: 599000,
      description: t('inmobiliaria.config.billing.plans.enterprise.description'),
    },
  }), [t]);

  // Feature list for plan comparison
  const PLAN_FEATURES = useMemo(() => [
    {
      key: 'properties',
      label: t('inmobiliaria.config.billing.features.properties'),
      icon: Buildings,
      getValue: (limits: typeof PLAN_LIMITS['starter']) =>
        limits.maxProperties === -1
          ? t('inmobiliaria.config.billing.features.unlimitedFem')
          : t('inmobiliaria.config.billing.features.upTo', { count: limits.maxProperties }),
    },
    {
      key: 'users',
      label: t('inmobiliaria.config.billing.features.users'),
      icon: Users,
      getValue: (limits: typeof PLAN_LIMITS['starter']) =>
        limits.maxUsers === -1
          ? t('inmobiliaria.config.billing.features.unlimitedMasc')
          : t('inmobiliaria.config.billing.features.upTo', { count: limits.maxUsers }),
    },
    {
      key: 'agents',
      label: t('inmobiliaria.config.billing.features.agents'),
      icon: Users,
      getValue: (limits: typeof PLAN_LIMITS['starter']) =>
        limits.maxAgents === -1
          ? t('inmobiliaria.config.billing.features.unlimitedMasc')
          : t('inmobiliaria.config.billing.features.upTo', { count: limits.maxAgents }),
    },
    {
      key: 'reports',
      label: t('inmobiliaria.config.billing.features.reports'),
      icon: FileText,
      getValue: (limits: typeof PLAN_LIMITS['starter']) =>
        limits.includesReports ? t('inmobiliaria.config.billing.features.included') : null,
    },
    {
      key: 'analytics',
      label: t('inmobiliaria.config.billing.features.analytics'),
      icon: ChartLineUp,
      getValue: (limits: typeof PLAN_LIMITS['starter']) =>
        limits.includesAnalytics ? t('inmobiliaria.config.billing.features.included') : null,
    },
    {
      key: 'integrations',
      label: t('inmobiliaria.config.billing.features.integrations'),
      icon: Plugs,
      getValue: (limits: typeof PLAN_LIMITS['starter']) =>
        limits.includesIntegrations ? t('inmobiliaria.config.billing.features.included') : null,
    },
    {
      key: 'api',
      label: t('inmobiliaria.config.billing.features.api'),
      icon: Code,
      getValue: (limits: typeof PLAN_LIMITS['starter']) =>
        limits.includesApi ? t('inmobiliaria.config.billing.features.included') : null,
    },
    {
      key: 'support',
      label: t('inmobiliaria.config.billing.features.support'),
      icon: Headset,
      getValue: (limits: typeof PLAN_LIMITS['starter']) => {
        const labels = {
          email: t('inmobiliaria.config.billing.supportLevel.email'),
          priority: t('inmobiliaria.config.billing.supportLevel.priority'),
          dedicated: t('inmobiliaria.config.billing.supportLevel.dedicated'),
        };
        return labels[limits.supportLevel];
      },
    },
  ], [t]);

  // Calculate usage percentages. Guarded: billing / usage / limits can be
  // absent (billing-less or un-provisioned agency) — never crash on the maths.
  const usagePercentages = useMemo(() => {
    const usage = billing?.usage;
    const limits = billing?.limits;
    if (!usage || !limits) {
      return { properties: 0, users: 0, agents: 0 };
    }
    return {
      properties:
        limits.maxProperties === -1
          ? 0
          : Math.round((usage.properties / limits.maxProperties) * 100),
      users:
        limits.maxUsers === -1
          ? 0
          : Math.round((usage.users / limits.maxUsers) * 100),
      agents:
        limits.maxAgents === -1
          ? 0
          : Math.round((usage.agents / limits.maxAgents) * 100),
    };
  }, [billing]);

  // Get usage variant based on percentage
  const getUsageVariant = (percentage: number): 'success' | 'warning' | 'error' => {
    if (percentage >= 90) return 'error';
    if (percentage >= 70) return 'warning';
    return 'success';
  };

  // Get invoice status color
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

  // Handle plan upgrade
  const handleUpgrade = useCallback(
    async (plan: BillingPlan) => {
      if (plan === billing?.plan) return;

      setIsUpgrading(true);
      try {
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 1200));

        onUpgrade?.(plan);
        toast.success(t('inmobiliaria.config.billing.planUpdated', { plan: getPlanLabel(plan) }));
        setIsUpgradeDialogOpen(false);
      } catch (err) {
        toast.error(t('inmobiliaria.config.billing.planUpdateError'));
      } finally {
        setIsUpgrading(false);
      }
    },
    [billing?.plan, onUpgrade, t]
  );

  // Handle payment method update
  const handleUpdatePaymentMethod = useCallback(() => {
    onUpdatePaymentMethod?.();
    toast.info(t('inmobiliaria.config.billing.openingPaymentForm'));
  }, [onUpdatePaymentMethod, t]);

  // Handle invoice download
  const handleDownloadInvoice = useCallback((invoice: BillingInvoice) => {
    toast.success(t('inmobiliaria.config.billing.downloadingInvoice', { id: invoice.id }));
  }, [t]);

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-muted rounded-md w-1/3" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-48 bg-muted rounded-xl" />
          <div className="h-48 bg-muted rounded-xl" />
        </div>
        <div className="h-64 bg-muted rounded-xl" />
      </div>
    );
  }

  // Billing payload absent or incomplete (billing-less / un-provisioned agency,
  // or a partial response). Render a safe empty state instead of crashing — this
  // single guard makes every `billing.*` access below unconditionally safe.
  if (!billing || !billing.usage || !billing.limits || !billing.plan || !PLAN_CONFIG[billing.plan]) {
    return (
      <div className="p-5 rounded-xl bg-card border border-border">
        <div className="flex items-center gap-2 mb-4">
          <Receipt className="w-5 h-5 text-fg-muted" />
          <h2 className="text-base font-semibold text-fg">{t('inmobiliaria.config.billing.title')}</h2>
        </div>
        <div className="py-8 text-center">
          <Info className="w-10 h-10 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">
            {t('inmobiliaria.config.billing.unavailable')}
          </p>
        </div>
      </div>
    );
  }

  const PlanIcon = PLAN_CONFIG[billing.plan].icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-fg">{t('inmobiliaria.config.billing.title')}</h2>
        <p className="text-sm text-fg-muted">
          {t('inmobiliaria.config.billing.subtitle')}
        </p>
      </div>

      {/* Plan & Usage Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Plan Card */}
        <div className="p-5 rounded-xl bg-card border border-border">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-surface-muted flex items-center justify-center">
                <PlanIcon className="w-6 h-6 text-fg-muted" weight="duotone" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground">
                    {t('inmobiliaria.config.billing.currentPlan', { plan: getPlanLabel(billing.plan) })}
                  </h3>
                  <Badge className={getPlanColor(billing.plan)}>
                    {billing.cycle === 'monthly' ? t('inmobiliaria.config.billing.monthly') : t('inmobiliaria.config.billing.annual')}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {PLAN_CONFIG[billing.plan].description}
                </p>
              </div>
            </div>
          </div>

          {/* Price */}
          <div className="p-4 rounded-md bg-muted/50 mb-4">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-semibold text-foreground">
                {formatCOP(billing.pricePerMonth)}
              </span>
              <span className="text-muted-foreground">{t('inmobiliaria.config.billing.perMonth')}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t('inmobiliaria.config.billing.nextBilling', { date: formatDate(billing.nextBillingDate) })}
            </p>
          </div>

          {/* Upgrade Button */}
          {billing.plan !== 'enterprise' && (
            <Button hideArrow className="w-full justify-center" onClick={() => setIsUpgradeDialogOpen(true)}>
              <ArrowUp className="w-4 h-4" />
              {t('inmobiliaria.config.billing.upgradePlan')}
            </Button>
          )}
        </div>

        {/* Usage Meters Card */}
        <div className="p-5 rounded-xl bg-card border border-border">
          <div className="flex items-center gap-2 mb-4">
            <ChartLineUp className="w-5 h-5 text-fg-muted" />
            <h3 className="text-base font-semibold text-fg">{t('inmobiliaria.config.billing.planUsage')}</h3>
          </div>

          <div className="space-y-5">
            {/* Properties Usage */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Buildings className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">{t('inmobiliaria.config.billing.properties')}</span>
                </div>
                <span className="text-sm font-medium text-foreground">
                  {billing.usage.properties}
                  {billing.limits.maxProperties === -1
                    ? ''
                    : ` / ${billing.limits.maxProperties}`}
                </span>
              </div>
              {billing.limits.maxProperties !== -1 && (
                <Progress
                  value={usagePercentages.properties}
                  className="h-2"
                  variant={getUsageVariant(usagePercentages.properties)}
                />
              )}
              {billing.limits.maxProperties === -1 && (
                <div className="flex items-center gap-1 text-xs text-success">
                  <Lightning className="w-3 h-3" />
                  {t('inmobiliaria.config.billing.unlimited')}
                </div>
              )}
            </div>

            {/* Users Usage */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">{t('inmobiliaria.config.billing.users')}</span>
                </div>
                <span className="text-sm font-medium text-foreground">
                  {billing.usage.users}
                  {billing.limits.maxUsers === -1
                    ? ''
                    : ` / ${billing.limits.maxUsers}`}
                </span>
              </div>
              {billing.limits.maxUsers !== -1 && (
                <Progress
                  value={usagePercentages.users}
                  className="h-2"
                  variant={getUsageVariant(usagePercentages.users)}
                />
              )}
              {billing.limits.maxUsers === -1 && (
                <div className="flex items-center gap-1 text-xs text-success">
                  <Lightning className="w-3 h-3" />
                  {t('inmobiliaria.config.billing.unlimited')}
                </div>
              )}
            </div>

            {/* Agents Usage */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-foreground">{t('inmobiliaria.config.billing.agentsLabel')}</span>
                </div>
                <span className="text-sm font-medium text-foreground">
                  {billing.usage.agents}
                  {billing.limits.maxAgents === -1
                    ? ''
                    : ` / ${billing.limits.maxAgents}`}
                </span>
              </div>
              {billing.limits.maxAgents !== -1 && (
                <Progress
                  value={usagePercentages.agents}
                  className="h-2"
                  variant={getUsageVariant(usagePercentages.agents)}
                />
              )}
              {billing.limits.maxAgents === -1 && (
                <div className="flex items-center gap-1 text-xs text-success">
                  <Lightning className="w-3 h-3" />
                  {t('inmobiliaria.config.billing.unlimited')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Payment Method & Features Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Method Card */}
        <div className="p-5 rounded-xl bg-card border border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-fg-muted" />
              <h3 className="text-base font-semibold text-fg">{t('inmobiliaria.config.billing.paymentMethod')}</h3>
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

          {billing.paymentMethod ? (
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
                    <p className="font-medium text-foreground">{t('inmobiliaria.config.billing.transfer')}</p>
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

        {/* Plan Features Card */}
        <div className="p-5 rounded-xl bg-card border border-border">
          <div className="flex items-center gap-2 mb-4">
            <Sparkle className="w-5 h-5 text-fg-muted" />
            <h3 className="text-base font-semibold text-fg">{t('inmobiliaria.config.billing.planIncludes')}</h3>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {PLAN_FEATURES.map((feature) => {
              const value = feature.getValue(billing.limits);
              const FeatureIcon = feature.icon;
              const isIncluded = value !== null;

              return (
                <div
                  key={feature.key}
                  className="flex items-center gap-2"
                >
                  {isIncluded ? (
                    <Check className="w-4 h-4 text-success shrink-0" />
                  ) : (
                    <X className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                  )}
                  <span
                    className={cn(
                      'text-sm',
                      isIncluded ? 'text-foreground' : 'text-muted-foreground/60'
                    )}
                  >
                    {feature.label}
                    {isIncluded && value !== t('inmobiliaria.config.billing.features.included') && (
                      <span className="text-muted-foreground"> ({value})</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Invoice History */}
      <div className="p-5 rounded-xl bg-card border border-border">
        <div className="flex items-center gap-2 mb-4">
          <Receipt className="w-5 h-5 text-fg-muted" />
          <h3 className="text-base font-semibold text-fg">{t('inmobiliaria.config.billing.invoiceHistory')}</h3>
        </div>

        {invoices.length > 0 ? (
          <div className="overflow-x-auto">
            <Table className="w-full">
              <TableHeader>
                <TableRow className="border-b border-border">
                  <TableHead className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t('inmobiliaria.config.billing.invoiceDate')}
                  </TableHead>
                  <TableHead className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t('inmobiliaria.config.billing.invoiceAmount')}
                  </TableHead>
                  <TableHead className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t('inmobiliaria.config.billing.invoiceStatus')}
                  </TableHead>
                  <TableHead className="text-right py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t('inmobiliaria.config.billing.invoiceActions')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
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

      {/* Upgrade Dialog */}
      <Dialog open={isUpgradeDialogOpen} onOpenChange={setIsUpgradeDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('inmobiliaria.config.billing.changePlan')}</DialogTitle>
            <DialogDescription>
              {t('inmobiliaria.config.billing.changePlanDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
            {(Object.keys(PLAN_CONFIG) as BillingPlan[]).map((plan) => {
              const config = PLAN_CONFIG[plan];
              const limits = PLAN_LIMITS[plan];
              const PlanIconComponent = config.icon;
              const isCurrentPlan = plan === billing.plan;
              const isSelected = selectedPlan === plan;

              return (
                <motion.button
                  key={plan}
                  onClick={() => setSelectedPlan(isCurrentPlan ? null : plan)}
                  disabled={isCurrentPlan || isUpgrading}
                  className={cn(
                    'relative p-4 rounded-xl border-2 text-left transition-all',
                    isCurrentPlan
                      ? 'border-border bg-muted/50 cursor-default'
                      : isSelected
                      ? 'border-primary/30 bg-primary-soft'
                      : 'border-border hover:border-primary/30',
                    config.highlight && !isCurrentPlan && 'ring-2 ring-primary/20'
                  )}
                >
                  {config.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge variant="default" className="bg-primary text-primary-foreground">
                        <Sparkle className="w-3 h-3 mr-1" />
                        {t('inmobiliaria.config.billing.popular')}
                      </Badge>
                    </div>
                  )}

                  <div className="flex items-center gap-2 mb-3 mt-1">
                    <PlanIconComponent
                      className="w-5 h-5 text-fg-muted"
                      weight="duotone"
                    />
                    <span className="font-semibold text-foreground">
                      {getPlanLabel(plan)}
                    </span>
                    {isCurrentPlan && (
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {t('inmobiliaria.config.billing.current')}
                      </Badge>
                    )}
                  </div>

                  <div className="mb-3">
                    <span className="text-2xl font-semibold text-foreground">
                      {formatCOP(config.price)}
                    </span>
                    <span className="text-muted-foreground">{t('inmobiliaria.config.billing.perMonth')}</span>
                  </div>

                  <p className="text-xs text-muted-foreground mb-3">
                    {config.description}
                  </p>

                  <div className="space-y-1.5">
                    {PLAN_FEATURES.slice(0, 4).map((feature) => {
                      const value = feature.getValue(limits);
                      const isIncluded = value !== null;

                      return (
                        <div
                          key={feature.key}
                          className="flex items-center gap-1.5 text-xs"
                        >
                          {isIncluded ? (
                            <Check className="w-3 h-3 text-success" />
                          ) : (
                            <X className="w-3 h-3 text-muted-foreground/50" />
                          )}
                          <span
                            className={
                              isIncluded
                                ? 'text-foreground'
                                : 'text-muted-foreground/60'
                            }
                          >
                            {feature.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </motion.button>
              );
            })}
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
            <Button
              variant="secondary"
              hideArrow
              onClick={() => {
                setIsUpgradeDialogOpen(false);
                setSelectedPlan(null);
              }}
              disabled={isUpgrading}
            >
              {t('inmobiliaria.config.billing.cancel')}
            </Button>
            <Button
              hideArrow
              onClick={() => selectedPlan && handleUpgrade(selectedPlan)}
              disabled={!selectedPlan || isUpgrading}
            >
              {isUpgrading ? (
                <>
                  <Spinner size="sm" variant="current" />
                  {t('inmobiliaria.config.billing.updating')}
                </>
              ) : (
                <>
                  <ArrowUp className="w-4 h-4" />
                  {t('inmobiliaria.config.billing.changeTo', { plan: selectedPlan ? getPlanLabel(selectedPlan) : 'plan' })}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

export default ConfigFacturacion;
