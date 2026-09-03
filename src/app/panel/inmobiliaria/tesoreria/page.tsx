'use client';

import Link from 'next/link';
import { Wallet, Info, PaperPlaneTilt, Receipt, Sparkle } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { SectionLabel } from '@/components/ui/section-label';
import { EmptyState } from '@/components/ui/empty-state';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button, Badge } from '@/components/ui';
import { PageGuard } from '@/components/auth/PageGuard';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import { calcularNeto } from '@/lib/api/tesoreria.types';

const COLUMNS = [
  'colPropietario', 'colCanon', 'colComision', 'colIva', 'colDescuentos', 'colNeto', 'colCuenta', 'colEstado', 'colComprobante',
];

// Ejemplo ilustrativo de la fórmula del neto (etiquetado como ejemplo — no es data real).
const EJEMPLO = { canonRecibido: 2_500_000, comisionAdmin: 250_000, comisionPorcentaje: 10, ivaPorcentaje: 19, ivaComision: 47_500, descuentos: 0 };
const EJEMPLO_NETO = calcularNeto(EJEMPLO);

function TesoreriaContent() {
  const { t } = useI18n();
  const k = (s: string) => `inmobiliaria.tesoreria.${s}`;

  const formulaRows = [
    { labelKey: 'fCanon', value: EJEMPLO.canonRecibido, sign: '', tone: 'text-fg' },
    { labelKey: 'fComision', value: EJEMPLO.comisionAdmin, sign: '−', tone: 'text-danger', note: `${EJEMPLO.comisionPorcentaje}%` },
    { labelKey: 'fIva', value: EJEMPLO.ivaComision, sign: '−', tone: 'text-danger', note: `${EJEMPLO.ivaPorcentaje}%` },
    { labelKey: 'fDescuentos', value: EJEMPLO.descuentos, sign: '−', tone: 'text-danger' },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-1.5">
          <SectionLabel>{t(k('label'))}</SectionLabel>
          <h1 className="text-2xl font-semibold tracking-tight text-fg">{t(k('title'))}</h1>
          <p className="text-sm text-fg-muted max-w-2xl">{t(k('subtitle'))}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
          <Button asChild variant="secondary" hideArrow>
            <Link href="/panel/inmobiliaria/dispersiones">
              <PaperPlaneTilt className="w-4 h-4" />
              {t(k('processCta'))}
            </Link>
          </Button>
          <Button asChild hideArrow>
            <Link href="/panel/inmobiliaria/tesoreria/facturas/nueva" data-testid="tesoreria-registrar-factura">
              <Receipt className="w-4 h-4" weight="bold" />
              {t(k('registrarFacturaCta'))}
            </Link>
          </Button>
        </div>
      </header>

      {/* Honest M1 banner */}
      <div className="rounded-lg bg-primary-soft border border-primary/30 p-3 flex items-start gap-2.5">
        <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" weight="fill" />
        <div>
          <p className="text-xs font-semibold text-primary">{t(k('m2BannerTitle'))}</p>
          <p className="text-xs text-primary/90 mt-0.5">{t(k('m2BannerDesc'))}</p>
        </div>
      </div>

      {/* Facturas de proveedores — captura desde foto/PDF con IA */}
      <section className="rounded-lg border border-border bg-card p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-md bg-primary-soft flex items-center justify-center flex-shrink-0">
            <Sparkle className="w-[18px] h-[18px] text-primary" weight="fill" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-fg">{t(k('facturasCardTitle'))}</h2>
            <p className="text-xs text-fg-muted mt-0.5 max-w-xl">{t(k('facturasCardDesc'))}</p>
          </div>
        </div>
        <Button asChild variant="secondary" hideArrow className="flex-shrink-0">
          <Link href="/panel/inmobiliaria/tesoreria/facturas/nueva">
            <Receipt className="w-4 h-4" />
            {t(k('facturasCardCta'))}
          </Link>
        </Button>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fórmula del neto — ejemplo ilustrativo */}
        <section className="lg:col-span-1 rounded-lg border border-border bg-card p-5 space-y-4 h-fit">
          <div className="flex items-center justify-between">
            <SectionLabel>{t(k('formulaLabel'))}</SectionLabel>
            <Badge variant="secondary">{t(k('ejemplo'))}</Badge>
          </div>
          <div className="space-y-2.5">
            {formulaRows.map((row) => (
              <div key={row.labelKey} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {t(k(row.labelKey))}
                  {row.note && <span className="text-muted-foreground/60"> ({row.note})</span>}
                </span>
                <span className={cn('font-mono tabular-nums', row.tone)}>
                  {row.sign}{formatCurrency(row.value)}
                </span>
              </div>
            ))}
            <div className="border-t border-border pt-2.5 flex items-center justify-between">
              <span className="text-sm font-semibold text-fg flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-success" />
                {t(k('fNeto'))}
              </span>
              <span className="font-mono tabular-nums font-semibold text-success">
                {formatCurrency(EJEMPLO_NETO)}
              </span>
            </div>
          </div>
        </section>

        {/* Egresos table */}
        <section className="lg:col-span-2 rounded-lg border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-3 p-5 border-b border-border">
            <div className="w-9 h-9 rounded-md bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center flex-shrink-0">
              <Wallet className="w-[18px] h-[18px] text-neutral-600 dark:text-neutral-300" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-fg">{t(k('egresosTitle'))}</h2>
              <p className="text-xs text-fg-muted mt-0.5">{t(k('egresosDesc'))}</p>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                {COLUMNS.map((c) => (
                  <TableHead key={c} className="whitespace-nowrap">
                    {t(k(c))}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={COLUMNS.length} className="p-0">
                  <EmptyState
                    icon={Wallet}
                    title={t(k('emptyTitle'))}
                    description={t(k('emptyDesc'))}
                    action={{ label: t(k('processCta')), href: '/panel/inmobiliaria/dispersiones' }}
                  />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </section>
      </div>
    </div>
  );
}

export default function TesoreriaPage() {
  return (
    <PageGuard adminOnly>
      <TesoreriaContent />
    </PageGuard>
  );
}
