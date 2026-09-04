'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plugs,
  Bank,
  CreditCard,
  Wallet,
  Calculator,
  Receipt,
  WhatsappLogo,
  EnvelopeSimple,
  Cloud,
  Check,
  X,
  Warning,
  ArrowsClockwise,
  Gear,
  Info,
  Key,
  CaretRight,
  MagnifyingGlass,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { toast } from 'sonner';
import { formatRelativeTime } from '@/lib/format';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { Chip } from '@leasefy/cadence';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import type {
  AgencyIntegration,
  IntegrationCategory,
  IntegrationStatus,
} from '@/lib/types/inmobiliaria';
import {
  getIntegrationCategoryLabel,
  getIntegrationStatusColor,
  getIntegrationStatusLabel,
} from '@/lib/types/inmobiliaria';

// Icon mapping for integration icons
const ICON_MAP: Record<string, React.ElementType> = {
  Bank,
  CreditCard,
  Wallet,
  Calculator,
  Receipt,
  WhatsappLogo,
  EnvelopeSimple,
  Cloud,
};

interface ConfigIntegracionesProps {
  integrations: AgencyIntegration[];
  onToggle?: (integrationId: string, enabled: boolean) => void;
  onConfigure?: (integrationId: string, config: Record<string, string>) => void;
  isLoading?: boolean;
}

/**
 * ConfigIntegraciones - Integration management for third-party services
 *
 * Features:
 * - Category tabs for filtering integrations
 * - Toggle switches to enable/disable integrations
 * - Status badges (active, inactive, pending, error)
 * - Configuration dialog for API key setup
 * - Last sync time display
 * - Error message display for failed integrations
 */
export function ConfigIntegraciones({
  integrations,
  onToggle,
  onConfigure,
  isLoading = false,
}: ConfigIntegracionesProps) {
  const { t } = useI18n();

  const CATEGORY_TABS: { value: IntegrationCategory | 'all'; label: string; icon: React.ElementType }[] = useMemo(() => [
    { value: 'all', label: t('inmobiliaria.config.integrations.categories.all'), icon: Plugs },
    { value: 'payments', label: t('inmobiliaria.config.integrations.categories.payments'), icon: CreditCard },
    { value: 'accounting', label: t('inmobiliaria.config.integrations.categories.accounting'), icon: Calculator },
    { value: 'communications', label: t('inmobiliaria.config.integrations.categories.communications'), icon: EnvelopeSimple },
    { value: 'storage', label: t('inmobiliaria.config.integrations.categories.storage'), icon: Cloud },
  ], [t]);
  const [selectedCategory, setSelectedCategory] = useState<IntegrationCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [selectedIntegration, setSelectedIntegration] = useState<AgencyIntegration | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [apiKey, setApiKey] = useState('');

  // Filter integrations by category and search
  const filteredIntegrations = useMemo(() => {
    return integrations.filter((integration) => {
      const matchesCategory = selectedCategory === 'all' || integration.category === selectedCategory;
      const matchesSearch =
        !searchQuery ||
        integration.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        integration.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [integrations, selectedCategory, searchQuery]);

  // Count active integrations
  const activeCount = useMemo(() => {
    return integrations.filter((i) => i.status === 'active' && i.isEnabled).length;
  }, [integrations]);

  // Count by category
  const categoryCounts = useMemo(() => {
    const counts: Record<IntegrationCategory, number> = {
      payments: 0,
      accounting: 0,
      communications: 0,
      storage: 0,
    };
    integrations.forEach((integration) => {
      counts[integration.category]++;
    });
    return counts;
  }, [integrations]);

  const handleToggle = useCallback(
    async (integration: AgencyIntegration) => {
      const newEnabled = !integration.isEnabled;
      setTogglingId(integration.id);

      try {
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 600));

        onToggle?.(integration.id, newEnabled);
        toast.success(
          newEnabled
            ? t('inmobiliaria.config.integrations.toasts.activated', { name: integration.name })
            : t('inmobiliaria.config.integrations.toasts.deactivated', { name: integration.name })
        );
      } catch (err) {
        toast.error(t('inmobiliaria.config.integrations.toasts.updateError', { name: integration.name }));
      } finally {
        setTogglingId(null);
      }
    },
    [onToggle, t]
  );

  const handleConfigure = useCallback((integration: AgencyIntegration) => {
    setSelectedIntegration(integration);
    setApiKey('');
    setIsDialogOpen(true);
  }, []);

  const handleSaveConfig = useCallback(async () => {
    if (!selectedIntegration) return;

    setIsSaving(true);
    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 800));

      onConfigure?.(selectedIntegration.id, { apiKey });
      toast.success(t('inmobiliaria.config.integrations.toasts.configSaved', { name: selectedIntegration.name }));
      setIsDialogOpen(false);
    } catch (err) {
      toast.error(t('inmobiliaria.config.integrations.toasts.configError', { name: selectedIntegration.name }));
    } finally {
      setIsSaving(false);
    }
  }, [selectedIntegration, apiKey, onConfigure, t]);

  const handleTestConnection = useCallback(async () => {
    if (!selectedIntegration) return;

    setIsSaving(true);
    try {
      // Simulate connection test
      await new Promise((resolve) => setTimeout(resolve, 1500));
      toast.success(t('inmobiliaria.config.integrations.toasts.connectionSuccess', { name: selectedIntegration.name }));
    } catch (err) {
      toast.error(t('inmobiliaria.config.integrations.toasts.connectionError', { name: selectedIntegration.name }));
    } finally {
      setIsSaving(false);
    }
  }, [selectedIntegration, t]);

  const getStatusIcon = (status: IntegrationStatus) => {
    switch (status) {
      case 'active':
        return <Check className="w-3.5 h-3.5" />;
      case 'error':
        return <Warning className="w-3.5 h-3.5" />;
      case 'pending':
        return <ArrowsClockwise className="w-3.5 h-3.5" />;
      default:
        return <X className="w-3.5 h-3.5" />;
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-muted rounded-md w-1/3" />
        <div className="flex gap-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 w-24 bg-muted rounded-md" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-36 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-fg">{t('inmobiliaria.config.integrations.title')}</h2>
            <Badge variant="secondary" className="bg-success-soft text-success">
              {activeCount} {t('inmobiliaria.config.integrations.active')}
            </Badge>
          </div>
          <p className="text-sm text-fg-muted mt-1">
            {t('inmobiliaria.config.integrations.subtitleFull')}
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('inmobiliaria.config.integrations.searchPlaceholder')}
            className="w-full pl-9 pr-4"
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2">
        {CATEGORY_TABS.map((tab) => {
          const Icon = tab.icon;
          const count = tab.value === 'all' ? integrations.length : categoryCounts[tab.value];

          return (
            <Chip
              key={tab.value}
              selected={selectedCategory === tab.value}
              onClick={() => setSelectedCategory(tab.value)}
              icon={<Icon className="w-4 h-4" />}
            >
              {tab.label}
              <span className="text-xs opacity-70">({count})</span>
            </Chip>
          );
        })}
      </div>

      {/* Integration Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredIntegrations.map((integration) => {
            const Icon = ICON_MAP[integration.icon] || Plugs;
            const isToggling = togglingId === integration.id;

            return (
              <motion.div
                key={integration.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={cn(
                  'p-5 rounded-lg bg-card border transition-colors',
                  integration.status === 'error'
                    ? 'border-danger/30'
                    : 'border-border'
                )}
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div
                    className={cn(
                      'w-12 h-12 rounded-lg flex items-center justify-center shrink-0',
                      integration.isEnabled && integration.status === 'active'
                        ? 'bg-primary-soft text-primary'
                        : 'bg-surface-muted text-fg-muted'
                    )}
                  >
                    <Icon className="w-6 h-6" weight="duotone" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-foreground">
                          {integration.name}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {integration.description}
                        </p>
                      </div>

                      {/* Toggle Switch */}
                      <div className="flex items-center gap-2">
                        {isToggling && (
                          <Spinner size="sm" variant="default" className="shrink-0" />
                        )}
                        <Switch
                          checked={integration.isEnabled}
                          onCheckedChange={() => handleToggle(integration)}
                          disabled={isToggling}
                        />
                      </div>
                    </div>

                    {/* Status & Metadata Row */}
                    <div className="flex items-center gap-3 mt-3">
                      {/* Status Badge */}
                      <Badge
                        variant="secondary"
                        className={cn(
                          'gap-1',
                          getIntegrationStatusColor(integration.status)
                        )}
                      >
                        {getStatusIcon(integration.status)}
                        {getIntegrationStatusLabel(integration.status)}
                      </Badge>

                      {/* Category Badge */}
                      <Badge variant="outline" className="text-xs">
                        {getIntegrationCategoryLabel(integration.category)}
                      </Badge>

                      {/* Last Sync */}
                      {integration.lastSyncAt && integration.status === 'active' && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <ArrowsClockwise className="w-3 h-3" />
                          {t('inmobiliaria.config.integrations.syncedAt', { time: formatRelativeTime(integration.lastSyncAt) })}
                        </span>
                      )}
                    </div>

                    {/* Error Message */}
                    {integration.status === 'error' && integration.errorMessage && (
                      <div className="mt-3 p-2.5 rounded-md bg-danger-soft border border-danger/30">
                        <div className="flex items-start gap-2">
                          <Warning className="w-4 h-4 text-danger shrink-0 mt-0.5" />
                          <p className="text-xs text-danger">
                            {integration.errorMessage}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* API Key Not Configured Warning */}
                    {integration.isEnabled &&
                      integration.status === 'pending' &&
                      !integration.apiKeyConfigured && (
                        <div className="mt-3 p-2.5 rounded-md bg-warning-soft border border-warning/30">
                          <div className="flex items-start gap-2">
                            <Key className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                            <p className="text-xs text-warning">
                              {t('inmobiliaria.config.integrations.apiKeyNotConfigured')}
                            </p>
                          </div>
                        </div>
                      )}

                    {/* Configure Button */}
                    {integration.isEnabled && (
                      <Button
                        variant="link"
                        hideArrow
                        onClick={() => handleConfigure(integration)}
                        className="mt-3 h-auto p-0"
                      >
                        <Gear className="w-4 h-4" />
                        {t('inmobiliaria.config.integrations.configure')}
                        <CaretRight className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filteredIntegrations.length === 0 && (
          <div className="col-span-full py-12 text-center">
            <Plugs className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">
              {t('inmobiliaria.config.integrations.noResults')}
            </p>
          </div>
        )}
      </div>

      {/* Configuration Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedIntegration && ICON_MAP[selectedIntegration.icon] && (
                (() => {
                  const IconComponent = ICON_MAP[selectedIntegration.icon];
                  return <IconComponent className="w-5 h-5 text-fg-muted" weight="duotone" />;
                })()
              )}
              {t('inmobiliaria.config.integrations.configureTitle', { name: selectedIntegration?.name ?? '' })}
            </DialogTitle>
            <DialogDescription>
              {selectedIntegration?.description}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Info Banner */}
            <div className="p-3 rounded-md bg-primary-soft border border-primary/30">
              <div className="flex gap-2">
                <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" weight="fill" />
                <p className="text-xs text-primary">
                  {t('inmobiliaria.config.integrations.apiKeyInfo', { name: selectedIntegration?.name ?? '' })}
                </p>
              </div>
            </div>

            {/* API Key Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                API Key <span className="text-danger">*</span>
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk_live_xxxxxxxxxxxxx"
                  className="w-full pl-10 pr-4"
                />
              </div>
            </div>

            {/* Test Connection Button */}
            <Button
              variant="outline"
              hideArrow
              className="w-full justify-center"
              onClick={handleTestConnection}
              disabled={!apiKey || isSaving}
              isLoading={isSaving}
            >
              {!isSaving && <ArrowsClockwise className="w-4 h-4" />}
              {t('inmobiliaria.config.integrations.testConnection')}
            </Button>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="secondary"
              hideArrow
              onClick={() => setIsDialogOpen(false)}
              disabled={isSaving}
            >
              {t('inmobiliaria.config.integrations.cancel')}
            </Button>
            <Button
              hideArrow
              onClick={handleSaveConfig}
              disabled={!apiKey || isSaving}
              isLoading={isSaving}
            >
              {isSaving ? (
                t('inmobiliaria.config.integrations.saving')
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  {t('inmobiliaria.config.integrations.save')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

export default ConfigIntegraciones;
