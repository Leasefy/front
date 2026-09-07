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
  Key,
  CaretRight,
  MagnifyingGlass,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
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
  /**
   * Prende o apaga la integración. Devuelve la promesa del pedido: el
   * interruptor espera al back y el aviso lo da quien hizo el pedido.
   */
  onToggle?: (integrationId: string, enabled: boolean) => void | Promise<void>;
  isLoading?: boolean;
}

/**
 * ConfigIntegraciones — las integraciones de la agencia: prenderlas, apagarlas
 * y ver en qué estado están.
 *
 * ── Lo que esta pantalla NO hace, y por qué ya no lo dice ───────────────────
 *
 * Tenía tres afirmaciones falsas, las tres con un `setTimeout` haciendo de
 * servidor:
 *
 *   · «Probar conexión» esperaba 1,5 s y SIEMPRE decía «Conexión con X
 *     exitosa». No contactaba nada; no podía fallar.
 *   · «Guardar» esperaba 0,8 s, tiraba la API Key escrita y decía
 *     «Configuración de X guardada». La llave nunca salía del navegador.
 *   · El interruptor avisaba «X activado» ANTES de que el back contestara
 *     —el pedido ni se esperaba— y encima el aviso salía dos veces, porque
 *     quien hace el pedido ya avisa.
 *
 * No hay endpoint para las llaves de una integración (el back sólo expone
 * `GET /agency/integrations` y `PUT /agency/integrations/:id` con
 * `{ isEnabled }`). Así que el formulario se fue: el detalle dice qué pasa y
 * qué falta, en vez de cobrar una llave que nadie guarda. Un botón apagado que
 * explica por qué es mejor que uno que dice «guardado» y no guarda.
 */
export function ConfigIntegraciones({
  integrations,
  onToggle,
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

  /**
   * El interruptor ESPERA al back. El aviso lo da quien hizo el pedido
   * (`SeccionIntegraciones.alternar`), que es el único que sabe si salió bien:
   * avisar acá además duplicaba el toast y, cuando el back fallaba, se veían
   * los dos —«activado» y «Error al actualizar»— uno encima del otro.
   */
  const handleToggle = useCallback(
    async (integration: AgencyIntegration) => {
      setTogglingId(integration.id);
      try {
        await onToggle?.(integration.id, !integration.isEnabled);
      } finally {
        setTogglingId(null);
      }
    },
    [onToggle]
  );

  const handleConfigure = useCallback((integration: AgencyIntegration) => {
    setSelectedIntegration(integration);
    setIsDialogOpen(true);
  }, []);

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
      {/* Cabecera. Sin título ni subtítulo propios: el marco de Configuración
          ya pone «Integraciones» y su explicación arriba, y repetirlos dejaba
          dos encabezados iguales pegados. Queda lo que ESE marco no dice:
          cuántas están activas. */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Badge variant="secondary" className="bg-success-soft text-success">
          {activeCount} {t('inmobiliaria.config.integrations.active')}
        </Badge>

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

                    {/* Detalle. Se llamaba «Configurar» y abría un formulario
                        de API Key que no guardaba nada: ahora dice lo que
                        muestra. */}
                    {integration.isEnabled && (
                      <Button
                        variant="link"
                        hideArrow
                        onClick={() => handleConfigure(integration)}
                        className="mt-3 h-auto p-0"
                      >
                        <Gear className="w-4 h-4" />
                        {t('inmobiliaria.config.integrations.viewDetail')}
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

      {/* Detalle de la integración.
          Era un formulario de API Key con «Probar conexión» y «Guardar»: los
          dos esperaban un `setTimeout` y decían que había salido bien sin
          hablar con nadie, y la llave escrita se tiraba. Como no hay endpoint
          para las llaves, el diálogo dice qué hay y qué falta. */}
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
              {selectedIntegration?.name ?? ''}
            </DialogTitle>
            <DialogDescription>
              {selectedIntegration?.description}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <dl className="grid grid-cols-2 gap-3">
              <div>
                <dt className="text-xs uppercase tracking-wide text-fg-subtle">
                  {t('inmobiliaria.config.integrations.detailStatus')}
                </dt>
                <dd className="mt-1 text-sm text-fg">
                  {selectedIntegration
                    ? getIntegrationStatusLabel(selectedIntegration.status)
                    : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-fg-subtle">
                  {t('inmobiliaria.config.integrations.detailCategory')}
                </dt>
                <dd className="mt-1 text-sm text-fg">
                  {selectedIntegration
                    ? getIntegrationCategoryLabel(selectedIntegration.category)
                    : '—'}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs uppercase tracking-wide text-fg-subtle">
                  {t('inmobiliaria.config.integrations.detailLastSync')}
                </dt>
                <dd className="mt-1 text-sm text-fg">
                  {selectedIntegration?.lastSyncAt
                    ? formatRelativeTime(selectedIntegration.lastSyncAt)
                    : t('inmobiliaria.config.integrations.detailNeverSynced')}
                </dd>
              </div>
            </dl>

            {selectedIntegration?.status === 'error' && selectedIntegration.errorMessage && (
              <div className="flex gap-2 rounded-md border border-danger/30 bg-danger-soft p-3">
                <Warning className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
                <p className="text-xs text-danger">{selectedIntegration.errorMessage}</p>
              </div>
            )}

            <div className="flex gap-2 rounded-md border border-border bg-surface-muted p-3">
              <Key className="mt-0.5 h-4 w-4 shrink-0 text-fg-muted" />
              <p className="text-xs text-fg-muted">
                {t('inmobiliaria.config.integrations.keysNotHere')}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button hideArrow onClick={() => setIsDialogOpen(false)}>
              {t('inmobiliaria.config.integrations.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

export default ConfigIntegraciones;
