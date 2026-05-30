'use client';

import Link from 'next/link';
import {
  Sparkle,
  Users,
  CurrencyDollar,
  Robot,
  Wrench,
  ArrowRight,
  CaretRight,
  TrendUp,
  Receipt,
  Bank,
  Lifebuoy,
  CalendarBlank,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { SectionLabel } from '@/components/ui/section-label';
import { getActiveAgents } from '@/lib/types/ai-agents';

/** A link/row inside a system block. `soon` renders muted + "Pronto" pill. */
interface BlockItem {
  labelKey: string;
  href: string;
  soon?: boolean;
}

interface SystemBlock {
  key: string;
  icon: React.ElementType;
  /** static tailwind classes — never build dynamically */
  iconWrap: string;
  iconColor: string;
  titleKey: string;
  descKey: string;
  cta: string;
  items: BlockItem[];
}

const BLOCKS: SystemBlock[] = [
  {
    key: 'crm',
    icon: Users,
    iconWrap: 'bg-indigo-50 dark:bg-indigo-950/40',
    iconColor: 'text-indigo-600 dark:text-indigo-400',
    titleKey: 'inmobiliaria.hoy.crmTitle',
    descKey: 'inmobiliaria.hoy.crmDesc',
    cta: '/panel/inmobiliaria/propietarios',
    items: [
      { labelKey: 'inmobiliaria.nav.propietarios', href: '/panel/inmobiliaria/propietarios' },
      { labelKey: 'inmobiliaria.nav.propiedades', href: '/panel/inmobiliaria/propiedades' },
      { labelKey: 'inmobiliaria.nav.portafolio', href: '/panel/inmobiliaria/portafolio' },
      { labelKey: 'inmobiliaria.nav.pipeline', href: '/panel/inmobiliaria/pipeline' },
      { labelKey: 'inmobiliaria.nav.agentes', href: '/panel/inmobiliaria/agentes' },
      { labelKey: 'inmobiliaria.nav.mensajes', href: '/panel/inmobiliaria/mensajes' },
    ],
  },
  {
    key: 'erp',
    icon: CurrencyDollar,
    iconWrap: 'bg-emerald-50 dark:bg-emerald-950/40',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    titleKey: 'inmobiliaria.hoy.erpTitle',
    descKey: 'inmobiliaria.hoy.erpDesc',
    cta: '/panel/inmobiliaria/cobros',
    items: [
      { labelKey: 'inmobiliaria.nav.cobros', href: '/panel/inmobiliaria/cobros' },
      { labelKey: 'inmobiliaria.nav.dispersiones', href: '/panel/inmobiliaria/dispersiones' },
      { labelKey: 'inmobiliaria.nav.facturacion', href: '/panel/inmobiliaria/facturacion', soon: true },
      { labelKey: 'inmobiliaria.nav.conciliacion', href: '/panel/inmobiliaria/conciliacion', soon: true },
      { labelKey: 'inmobiliaria.nav.reportes', href: '/panel/inmobiliaria/reportes' },
      { labelKey: 'inmobiliaria.nav.analitica', href: '/panel/inmobiliaria/analytics' },
    ],
  },
  {
    key: 'autopilot',
    icon: Robot,
    iconWrap: 'bg-violet-50 dark:bg-violet-950/40',
    iconColor: 'text-violet-600 dark:text-violet-400',
    titleKey: 'inmobiliaria.hoy.autopilotTitle',
    descKey: 'inmobiliaria.hoy.autopilotDesc',
    cta: '/panel/inmobiliaria/ai',
    items: [
      { labelKey: 'inmobiliaria.ai.nav.cobranza', href: '/panel/inmobiliaria/ai/cobranza' },
      { labelKey: 'inmobiliaria.ai.nav.cotizador', href: '/panel/inmobiliaria/ai/cotizador' },
    ],
  },
  {
    key: 'ops',
    icon: Wrench,
    iconWrap: 'bg-amber-50 dark:bg-amber-950/40',
    iconColor: 'text-amber-600 dark:text-amber-400',
    titleKey: 'inmobiliaria.hoy.opsTitle',
    descKey: 'inmobiliaria.hoy.opsDesc',
    cta: '/panel/inmobiliaria/operaciones',
    items: [
      { labelKey: 'inmobiliaria.nav.operaciones', href: '/panel/inmobiliaria/operaciones' },
      { labelKey: 'inmobiliaria.nav.pqrs', href: '/panel/inmobiliaria/pqrs', soon: true },
      { labelKey: 'inmobiliaria.nav.documentos', href: '/panel/inmobiliaria/documentos' },
      { labelKey: 'inmobiliaria.nav.agenda', href: '/panel/inmobiliaria/agenda', soon: true },
    ],
  },
];

/** Illustrative insight phrasings — real engine arrives with the Informes & Insights phase. */
const INSIGHT_EXAMPLES = [
  'inmobiliaria.hoy.insightsExample1',
  'inmobiliaria.hoy.insightsExample2',
  'inmobiliaria.hoy.insightsExample3',
];

export default function HoyPage() {
  const { t, locale } = useI18n();
  const agents = getActiveAgents();

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header — product framing */}
      <header className="space-y-2">
        <SectionLabel dotVariant="success">{t('inmobiliaria.hoy.title')}</SectionLabel>
        <h1 className="text-h2 text-foreground">{t('inmobiliaria.hoy.heading')}</h1>
        <p className="text-body text-muted-foreground max-w-2xl">{t('inmobiliaria.hoy.subtitle')}</p>
      </header>

      {/* Insights & Alertas — reserved zone (engine ships in the Informes & Insights phase) */}
      <section className="rounded-2xl border border-border bg-card p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center flex-shrink-0">
              <Sparkle className="w-5 h-5 text-indigo-600 dark:text-indigo-400" weight="fill" />
            </div>
            <div>
              <h2 className="text-h4 text-foreground">{t('inmobiliaria.hoy.insightsTitle')}</h2>
              <p className="text-body-sm text-muted-foreground mt-0.5">{t('inmobiliaria.hoy.insightsDesc')}</p>
            </div>
          </div>
          <span className="flex-shrink-0 text-[10px] font-mono uppercase tracking-wide px-2 py-1 rounded-full bg-muted text-muted-foreground">
            {t('inmobiliaria.nav.pronto')}
          </span>
        </div>

        {/* Illustrative previews of what the insights layer will surface */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {INSIGHT_EXAMPLES.map((key) => (
            <div
              key={key}
              className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-3 flex items-center gap-2.5"
            >
              <TrendUp className="w-4 h-4 text-muted-foreground/60 flex-shrink-0" />
              <p className="text-body-sm text-muted-foreground">{t(key)}</p>
            </div>
          ))}
        </div>
        <p className="text-caption text-muted-foreground/70">{t('inmobiliaria.hoy.insightsPronto')}</p>
      </section>

      {/* Autopilot activo */}
      {agents.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 bg-emerald-400" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            <div>
              <p className="text-overline text-muted-foreground">{t('inmobiliaria.hoy.autopilotActiveLabel')}</p>
              <p className="text-body-sm text-foreground mt-0.5">
                {t('inmobiliaria.hoy.autopilotRunning', { count: agents.length })}
                <span className="text-muted-foreground"> · {agents.map((a) => (locale === 'en' ? a.nameEn : a.nameEs)).join(' · ')}</span>
              </p>
            </div>
          </div>
          <Link
            href="/panel/inmobiliaria/ai"
            className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors flex-shrink-0"
          >
            {t('inmobiliaria.common.viewAll')}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </section>
      )}

      {/* Tu sistema — bloque map */}
      <section className="space-y-4">
        <SectionLabel>{t('inmobiliaria.hoy.systemLabel')}</SectionLabel>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {BLOCKS.map((block) => {
            const Icon = block.icon;
            return (
              <div key={block.key} className="rounded-2xl border border-border bg-card p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', block.iconWrap)}>
                      <Icon className={cn('w-5 h-5', block.iconColor)} />
                    </div>
                    <div>
                      <h3 className="text-h4 text-foreground">{t(block.titleKey)}</h3>
                      <p className="text-caption text-muted-foreground mt-0.5">{t(block.descKey)}</p>
                    </div>
                  </div>
                  <Link
                    href={block.cta}
                    aria-label={t(block.titleKey)}
                    className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>

                <ul className="grid grid-cols-2 gap-1">
                  {block.items.map((item) =>
                    item.soon ? (
                      <li
                        key={item.labelKey}
                        className="flex items-center gap-1.5 px-2 py-1.5 text-body-sm text-muted-foreground/60 cursor-default"
                        title={t('inmobiliaria.nav.pronto')}
                      >
                        <span className="truncate">{t(item.labelKey)}</span>
                        <span className="text-[9px] font-mono uppercase tracking-wide px-1 py-0.5 rounded-full bg-muted text-muted-foreground/70 flex-shrink-0">
                          {t('inmobiliaria.nav.pronto')}
                        </span>
                      </li>
                    ) : (
                      <li key={item.labelKey}>
                        <Link
                          href={item.href}
                          className="group flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-lg text-body-sm text-foreground hover:bg-muted transition-colors"
                        >
                          <span className="truncate">{t(item.labelKey)}</span>
                          <CaretRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors flex-shrink-0" />
                        </Link>
                      </li>
                    )
                  )}
                </ul>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
