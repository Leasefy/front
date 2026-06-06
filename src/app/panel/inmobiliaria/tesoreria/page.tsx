'use client';

import Link from 'next/link';
import { Wallet, Info, PaperPlaneTilt } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { SectionLabel } from '@/components/ui/section-label';
import { EmptyState } from '@/components/ui/empty-state';
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
    { labelKey: 'fCanon', value: EJEMPLO.canonRecibido, sign: '', tone: 'text-foreground' },
    { labelKey: 'fComision', value: EJEMPLO.comisionAdmin, sign: '−', tone: 'text-rose-600 dark:text-rose-400', note: `${EJEMPLO.comisionPorcentaje}%` },
    { labelKey: 'fIva', value: EJEMPLO.ivaComision, sign: '−', tone: 'text-rose-600 dark:text-rose-400', note: `${EJEMPLO.ivaPorcentaje}%` },
    { labelKey: 'fDescuentos', value: EJEMPLO.descuentos, sign: '−', tone: 'text-rose-600 dark:text-rose-400' },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-2">
          <SectionLabel>{t(k('label'))}</SectionLabel>
          <h1 className="text-h2 text-foreground">{t(k('title'))}</h1>
          <p className="text-body text-muted-foreground max-w-2xl">{t(k('subtitle'))}</p>
        </div>
        <Link
          href="/panel/inmobiliaria/dispersiones"
          className="inline-flex items-center gap-2 h-11 px-4 rounded-xl border border-border bg-card hover:bg-muted text-foreground font-mono uppercase tracking-wide text-sm transition-colors flex-shrink-0"
        >
          <PaperPlaneTilt className="w-4 h-4" />
          {t(k('processCta'))}
        </Link>
      </header>

      {/* Honest M1 banner */}
      <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 p-3 flex items-start gap-2.5">
        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" weight="fill" />
        <div>
          <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">{t(k('m2BannerTitle'))}</p>
          <p className="text-xs text-blue-600 dark:text-blue-300/90 mt-0.5">{t(k('m2BannerDesc'))}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fórmula del neto — ejemplo ilustrativo */}
        <section className="lg:col-span-1 rounded-2xl border border-border bg-card p-5 space-y-4 h-fit">
          <div className="flex items-center justify-between">
            <SectionLabel>{t(k('formulaLabel'))}</SectionLabel>
            <span className="text-[10px] font-mono uppercase tracking-wide px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              {t(k('ejemplo'))}
            </span>
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
              <span className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                {t(k('fNeto'))}
              </span>
              <span className="font-mono tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(EJEMPLO_NETO)}
              </span>
            </div>
          </div>
        </section>

        {/* Egresos table */}
        <section className="lg:col-span-2 rounded-2xl border border-border bg-card overflow-hidden">
          <div className="flex items-center gap-3 p-5 border-b border-border">
            <div className="w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center flex-shrink-0">
              <Wallet className="w-[18px] h-[18px] text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-h4 text-foreground">{t(k('egresosTitle'))}</h2>
              <p className="text-caption text-muted-foreground mt-0.5">{t(k('egresosDesc'))}</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {COLUMNS.map((c) => (
                    <th key={c} className="text-left px-5 py-2.5 text-label text-muted-foreground font-normal whitespace-nowrap">
                      {t(k(c))}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={COLUMNS.length} className="p-0">
                    <EmptyState
                      icon={Wallet}
                      title={t(k('emptyTitle'))}
                      description={t(k('emptyDesc'))}
                      action={{ label: t(k('processCta')), href: '/panel/inmobiliaria/dispersiones' }}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
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
