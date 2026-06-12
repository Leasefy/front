'use client';

import Link from 'next/link';
import {
  FileText,
  Warning,
  Wallet,
  House,
  PenNib,
  ArrowRight,
  Sparkle,
  CheckCircle,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import type { Insight, InsightKind, InsightSeverity } from '@/lib/insights/types';

/** Presentación por tipo de insight: icono, acción y plantilla i18n. */
const KIND_PRESENTATION: Record<
  InsightKind,
  { icon: React.ElementType; titleKey: string; actionKey: string; href: string }
> = {
  contratos_por_vencer: { icon: FileText, titleKey: 'title_contratos_por_vencer', actionKey: 'action_contratos', href: '/panel/inmobiliaria/contratos' },
  mora_prioritaria: { icon: Warning, titleKey: 'title_mora_prioritaria', actionKey: 'action_cobranza', href: '/panel/inmobiliaria/ai/cobranza' },
  por_dispersar: { icon: Wallet, titleKey: 'title_por_dispersar', actionKey: 'action_tesoreria', href: '/panel/inmobiliaria/tesoreria' },
  propiedad_estancada: { icon: House, titleKey: 'title_propiedad_estancada', actionKey: 'action_propiedades', href: '/panel/inmobiliaria/propiedades' },
  firma_pendiente: { icon: PenNib, titleKey: 'title_firma_pendiente', actionKey: 'action_firma', href: '/panel/inmobiliaria/contratos' },
};

/** Acento por severidad (icon circle + dot). */
const SEVERITY_STYLE: Record<InsightSeverity, { wrap: string; color: string; dot: string }> = {
  critical: { wrap: 'bg-rose-50 dark:bg-rose-950/40', color: 'text-rose-600 dark:text-rose-400', dot: 'bg-rose-500' },
  warning: { wrap: 'bg-amber-50 dark:bg-amber-950/40', color: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' },
  info: { wrap: 'bg-indigo-50 dark:bg-indigo-950/40', color: 'text-indigo-600 dark:text-indigo-400', dot: 'bg-indigo-500' },
  success: { wrap: 'bg-emerald-50 dark:bg-emerald-950/40', color: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
};

interface InsightsPanelProps {
  insights: Insight[];
  /** When true, labels the data as illustrative preview (until real data is wired). */
  preview?: boolean;
  className?: string;
}

export function InsightsPanel({ insights, preview, className }: InsightsPanelProps) {
  const { t } = useI18n();
  const k = (s: string) => `inmobiliaria.insights.${s}`;

  /** Format params for the i18n template (COP amounts → formatCurrency). */
  function displayParams(ins: Insight): Record<string, string | number> {
    const p: Record<string, string | number> = { ...ins.params };
    if ('monto' in p) p.monto = formatCurrency(Number(p.monto));
    return p;
  }

  return (
    <section className={cn('rounded-2xl border border-border bg-card p-6 space-y-5', className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center flex-shrink-0">
            <Sparkle className="w-5 h-5 text-indigo-600 dark:text-indigo-400" weight="fill" />
          </div>
          <div>
            <h2 className="text-h4 text-foreground">{t(k('label'))}</h2>
            <p className="text-body-sm text-muted-foreground mt-0.5">{t(k('subtitle'))}</p>
          </div>
        </div>
        {preview && (
          <span className="flex-shrink-0 text-[10px] font-mono uppercase tracking-wide px-2 py-1 rounded-full bg-muted text-muted-foreground">
            {t(k('previewBadge'))}
          </span>
        )}
      </div>

      {insights.length === 0 ? (
        <div className="rounded-xl bg-muted/30 py-10 px-6 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center mx-auto mb-3">
            <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-body-sm font-medium text-foreground">{t(k('emptyTitle'))}</p>
          <p className="text-caption text-muted-foreground mt-0.5">{t(k('emptyDesc'))}</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {insights.map((ins) => {
            const pres = KIND_PRESENTATION[ins.kind];
            const sev = SEVERITY_STYLE[ins.severity];
            const Icon = pres.icon;
            return (
              <Link
                key={ins.id}
                href={pres.href}
                className="group flex items-center gap-3 rounded-xl border border-border bg-background hover:bg-muted/50 hover:border-foreground/15 transition-colors p-3.5"
              >
                <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', sev.wrap)}>
                  <Icon className={cn('w-[18px] h-[18px]', sev.color)} />
                </div>
                <p className="flex-1 text-body-sm text-foreground">{t(k(pres.titleKey), displayParams(ins))}</p>
                <span className="flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                  <span className="hidden sm:inline">{t(k(pres.actionKey))}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </Link>
            );
          })}
        </div>
      )}

      {preview && (
        <p className="text-caption text-muted-foreground/70">{t(k('previewNote'))}</p>
      )}
    </section>
  );
}

export default InsightsPanel;
