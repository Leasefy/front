'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Receipt,
  Plus,
  Info,
  ArrowDownRight,
  ArrowUpRight,
  Lightning,
  ArrowsClockwise,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { SectionLabel } from '@/components/ui/section-label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui';
import { EmptyState } from '@/components/ui/empty-state';
import { PageGuard } from '@/components/auth/PageGuard';
import type { FacturacionTab } from '@/lib/api/facturacion.types';

type BadgeVariant = 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline';

interface TabDef {
  key: FacturacionTab;
  icon: React.ElementType;
  iconWrap: string;
  iconColor: string;
  /** i18n key suffixes under inmobiliaria.facturacion */
  columns: string[];
  estados: { labelKey: string; variant: BadgeVariant }[];
}

const TABS: TabDef[] = [
  {
    key: 'ventas',
    icon: ArrowUpRight,
    iconWrap: 'bg-success-soft',
    iconColor: 'text-success',
    columns: ['colNumero', 'colTercero', 'colConcepto', 'colFecha', 'colSubtotal', 'colIva', 'colTotal', 'colPago', 'colDian'],
    estados: [
      { labelKey: 'estadoAceptada', variant: 'success' },
      { labelKey: 'estadoPendiente', variant: 'warning' },
      { labelKey: 'estadoVencida', variant: 'destructive' },
      { labelKey: 'estadoBorrador', variant: 'secondary' },
    ],
  },
  {
    key: 'compras',
    icon: ArrowDownRight,
    iconWrap: 'bg-warning-soft',
    iconColor: 'text-warning',
    columns: ['colNumero', 'colProveedor', 'colConcepto', 'colFecha', 'colTotal', 'colVence', 'colPago'],
    estados: [
      { labelKey: 'estadoPagada', variant: 'success' },
      { labelKey: 'estadoPendiente', variant: 'warning' },
      { labelKey: 'estadoVencida', variant: 'destructive' },
      { labelKey: 'estadoCredito', variant: 'outline' },
    ],
  },
  {
    key: 'electronica',
    icon: Lightning,
    iconWrap: 'bg-primary-soft',
    iconColor: 'text-primary',
    columns: ['colTipo', 'colNumero', 'colCufe', 'colTercero', 'colFecha', 'colTotal', 'colDian'],
    estados: [
      { labelKey: 'estadoAceptada', variant: 'success' },
      { labelKey: 'estadoEmitida', variant: 'secondary' },
      { labelKey: 'estadoRechazada', variant: 'destructive' },
      { labelKey: 'estadoAnulada', variant: 'outline' },
    ],
  },
  {
    key: 'notas',
    icon: ArrowsClockwise,
    iconWrap: 'bg-neutral-100 dark:bg-neutral-800',
    iconColor: 'text-neutral-600 dark:text-neutral-300',
    columns: ['colTipo', 'colNumero', 'colFacturaRef', 'colMotivo', 'colValor', 'colFecha', 'colDian'],
    estados: [
      { labelKey: 'estadoNotaCredito', variant: 'default' },
      { labelKey: 'estadoNotaDebito', variant: 'secondary' },
      { labelKey: 'estadoAceptada', variant: 'success' },
    ],
  },
];

function FacturacionContent() {
  const { t } = useI18n();
  const [active, setActive] = useState<FacturacionTab>('ventas');
  const tab = TABS.find((x) => x.key === active)!;
  const TabIcon = tab.icon;

  const k = (suffix: string) => `inmobiliaria.facturacion.${suffix}`;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-1.5">
          <SectionLabel>{t(k('label'))}</SectionLabel>
          <h1 className="text-2xl font-semibold tracking-tight text-fg">{t(k('title'))}</h1>
          <p className="text-sm text-fg-muted max-w-2xl">{t(k('subtitle'))}</p>
        </div>
        <Button hideArrow onClick={() => toast.info(t(k('newSoon')))} className="flex-shrink-0">
          <Plus className="w-4 h-4" weight="bold" />
          {t(k('new'))}
        </Button>
      </header>

      {/* Honest "engine arrives in M2" banner */}
      <div className="rounded-xl bg-primary-soft border border-primary/30 p-3 flex items-start gap-2.5">
        <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" weight="fill" />
        <div>
          <p className="text-xs font-semibold text-primary">{t(k('m2BannerTitle'))}</p>
          <p className="text-xs text-primary/90 mt-0.5">{t(k('m2BannerDesc'))}</p>
        </div>
      </div>

      {/* Tabs (segmented) */}
      <div role="tablist" aria-label={t(k('label'))} className="inline-flex items-center gap-1 p-1 rounded-xl bg-muted overflow-x-auto max-w-full">
        {TABS.map((x) => {
          const isActive = x.key === active;
          return (
            <button
              key={x.key}
              type="button"
              role="tab"
              id={`fact-tab-${x.key}`}
              aria-selected={isActive}
              aria-controls="fact-tabpanel"
              tabIndex={isActive ? 0 : -1}
              onClick={() => setActive(x.key)}
              className={cn(
                'whitespace-nowrap px-3.5 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-card text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t(k(`tab_${x.key}`))}
            </button>
          );
        })}
      </div>

      {/* Active tab panel */}
      <section
        role="tabpanel"
        id="fact-tabpanel"
        aria-labelledby={`fact-tab-${active}`}
        tabIndex={0}
        className="rounded-xl border border-border bg-card overflow-hidden"
      >
        {/* Panel header: descriptor + estados legend */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className={cn('w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0', tab.iconWrap)}>
              <TabIcon className={cn('w-[18px] h-[18px]', tab.iconColor)} />
            </div>
            <p className="text-body-sm text-muted-foreground">{t(k(`desc_${tab.key}`))}</p>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-label text-muted-foreground mr-1">{t(k('estadosLabel'))}</span>
            {tab.estados.map((e) => (
              <Badge key={e.labelKey} variant={e.variant}>
                {t(k(e.labelKey))}
              </Badge>
            ))}
          </div>
        </div>

        {/* Column schema + empty state */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {tab.columns.map((c) => (
                  <th
                    key={c}
                    className="text-left px-5 py-2.5 text-label text-muted-foreground font-normal whitespace-nowrap"
                  >
                    {t(k(c))}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={tab.columns.length} className="p-0">
                  <EmptyState
                    icon={Receipt}
                    title={t(k(`empty_${tab.key}_title`))}
                    description={t(k('emptyDesc'))}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default function FacturacionPage() {
  return (
    <PageGuard adminOnly>
      <FacturacionContent />
    </PageGuard>
  );
}
