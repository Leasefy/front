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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/empty-state';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
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
      <div className="rounded-lg bg-primary-soft border border-primary/30 p-3 flex items-start gap-2.5">
        <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" weight="fill" />
        <div>
          <p className="text-xs font-semibold text-primary">{t(k('m2BannerTitle'))}</p>
          <p className="text-xs text-primary/90 mt-0.5">{t(k('m2BannerDesc'))}</p>
        </div>
      </div>

      {/* Tabs (segmented) */}
      <Tabs value={active} onValueChange={(v) => setActive(v as FacturacionTab)}>
      <TabsList variant="segmented" aria-label={t(k('label'))}>
        {TABS.map((x) => (
          <TabsTrigger key={x.key} value={x.key} className="whitespace-nowrap">
            {t(k(`tab_${x.key}`))}
          </TabsTrigger>
        ))}
      </TabsList>

      {/* Active tab panel */}
      <TabsContent value={active} className="mt-4">
      <section
        className="rounded-lg border border-border bg-card overflow-hidden"
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
        <Table>
          <TableHeader>
            <TableRow>
              {tab.columns.map((c) => (
                <TableHead key={c} className="whitespace-nowrap">
                  {t(k(c))}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={tab.columns.length} className="p-0">
                <EmptyState
                  icon={Receipt}
                  title={t(k(`empty_${tab.key}_title`))}
                  description={t(k('emptyDesc'))}
                />
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </section>
      </TabsContent>
      </Tabs>
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
