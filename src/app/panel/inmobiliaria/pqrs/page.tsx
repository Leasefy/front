'use client';

import Link from 'next/link';
import { toast } from 'sonner';
import { Lifebuoy, Plus, Info, Wrench, ArrowRight } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { SectionLabel } from '@/components/ui/section-label';
import { EmptyState } from '@/components/ui/empty-state';
import { PageGuard } from '@/components/auth/PageGuard';
import { RESUMEN_PQRS_VACIO } from '@/lib/api/pqrs.types';

/** Resumen por estado del ciclo PQRS — color por estado (estático). */
const RESUMEN_ITEMS: { key: string; dot: string; field: keyof typeof RESUMEN_PQRS_VACIO }[] = [
  { key: 'recibidas', dot: 'bg-[#1A40FF]', field: 'recibidas' },
  { key: 'asignadas', dot: 'bg-[#1A40FF]', field: 'asignadas' },
  { key: 'enProceso', dot: 'bg-[#B7791F]', field: 'enProceso' },
  { key: 'enCotizacion', dot: 'bg-neutral-100 dark:bg-neutral-800', field: 'enCotizacion' },
  { key: 'resueltas', dot: 'bg-[#2C7A53]', field: 'resueltas' },
  { key: 'cerradas', dot: 'bg-[#6B6B6B]', field: 'cerradas' },
];

const COLUMNS = [
  'colRadicado', 'colSolicitante', 'colTipo', 'colInmueble',
  'colAsignado', 'colEstado', 'colSla', 'colAccion',
];

function PqrsContent() {
  const { t } = useI18n();
  const k = (s: string) => `inmobiliaria.pqrs.${s}`;
  const resumen = RESUMEN_PQRS_VACIO;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-2">
          <SectionLabel>{t(k('label'))}</SectionLabel>
          <h1 className="text-h2 text-foreground">{t(k('title'))}</h1>
          <p className="text-body text-muted-foreground max-w-2xl">{t(k('subtitle'))}</p>
        </div>
        <button
          onClick={() => toast.info(t(k('newSoon')))}
          className="inline-flex items-center gap-2 h-11 px-4 rounded-xl bg-primary text-primary-foreground text-sm transition-transform active:scale-[0.97] flex-shrink-0 font-medium"
        >
          <Plus className="w-4 h-4" weight="bold" />
          {t(k('new'))}
        </button>
      </header>

      {/* Honest M1 banner — triage IA (Mastra en agent) */}
      <div className="rounded-xl bg-[#EEF1FF] dark:bg-[#1A40FF]/15 border border-[#1A40FF]/30 dark:border-[#1A40FF]/40 p-3 flex items-start gap-2.5">
        <Info className="w-5 h-5 text-[#1A40FF] dark:text-[#5570FF] flex-shrink-0 mt-0.5" weight="fill" />
        <div>
          <p className="text-xs font-semibold text-[#1A40FF] dark:text-[#5570FF]">{t(k('m1BannerTitle'))}</p>
          <p className="text-xs text-[#1A40FF] dark:text-[#5570FF]/90 mt-0.5">{t(k('m1BannerDesc'))}</p>
        </div>
      </div>

      {/* Resumen por estado */}
      <section className="space-y-3">
        <SectionLabel>{t(k('resumenLabel'))}</SectionLabel>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {RESUMEN_ITEMS.map((item) => (
            <div key={item.key} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <span className={cn('w-2 h-2 rounded-full flex-shrink-0', item.dot)} />
                <span className="text-caption text-muted-foreground truncate">{t(k(`estado_${item.key}`))}</span>
              </div>
              <p className="mt-1.5 text-2xl font-mono tabular-nums text-foreground">{resumen[item.field]}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Reparación → cotización (PQRS-03) */}
      <Link
        href="/panel/inmobiliaria/operaciones"
        className="flex items-center gap-3 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors p-4"
      >
        <div className="w-9 h-9 rounded-md bg-[#F8F0E0] dark:bg-[#B7791F]/15 flex items-center justify-center flex-shrink-0">
          <Wrench className="w-[18px] h-[18px] text-[#B7791F] dark:text-[#D2992F]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-body-sm font-medium text-foreground">{t(k('repairFlowTitle'))}</p>
          <p className="text-caption text-muted-foreground mt-0.5">{t(k('repairFlowDesc'))}</p>
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      </Link>

      {/* Solicitudes */}
      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-3 p-5 border-b border-border">
          <div className="w-9 h-9 rounded-md bg-[#EEF1FF] dark:bg-[#1A40FF]/15 flex items-center justify-center flex-shrink-0">
            <Lifebuoy className="w-[18px] h-[18px] text-[#1A40FF] dark:text-[#5570FF]" />
          </div>
          <div>
            <h2 className="text-h4 text-foreground">{t(k('listTitle'))}</h2>
            <p className="text-caption text-muted-foreground mt-0.5">{t(k('listDesc'))}</p>
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
                    icon={Lifebuoy}
                    title={t(k('emptyTitle'))}
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

export default function PqrsPage() {
  return (
    <PageGuard adminOnly>
      <PqrsContent />
    </PageGuard>
  );
}
