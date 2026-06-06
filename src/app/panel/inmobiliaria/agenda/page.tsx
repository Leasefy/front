'use client';

import { toast } from 'sonner';
import { CalendarBlank, Plus, Info } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { SectionLabel } from '@/components/ui/section-label';
import { EmptyState } from '@/components/ui/empty-state';
import { PageGuard } from '@/components/auth/PageGuard';
import { RESUMEN_AGENDA_VACIO } from '@/lib/api/agenda.types';

/** Resumen por tipo de evento — color por tipo (estático). */
const RESUMEN_ITEMS: { key: string; dot: string; field: keyof typeof RESUMEN_AGENDA_VACIO }[] = [
  { key: 'visitas', dot: 'bg-indigo-500', field: 'visitas' },
  { key: 'firmas', dot: 'bg-amber-500', field: 'firmasPendientes' },
  { key: 'vencimientos', dot: 'bg-rose-500', field: 'vencimientos' },
  { key: 'seguimientos', dot: 'bg-blue-500', field: 'seguimientos' },
  { key: 'inspecciones', dot: 'bg-teal-500', field: 'inspecciones' },
  { key: 'tareas', dot: 'bg-violet-500', field: 'tareas' },
];

const COLUMNS = [
  'colFecha', 'colEvento', 'colTipo', 'colOrigen',
  'colVinculo', 'colResponsable', 'colEstado',
];

function AgendaContent() {
  const { t } = useI18n();
  const k = (s: string) => `inmobiliaria.agenda.${s}`;
  const resumen = RESUMEN_AGENDA_VACIO;

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
          className="inline-flex items-center gap-2 h-11 px-4 rounded-xl bg-primary text-primary-foreground font-mono uppercase tracking-wide text-sm transition-transform active:scale-[0.97] flex-shrink-0"
        >
          <Plus className="w-4 h-4" weight="bold" />
          {t(k('new'))}
        </button>
      </header>

      {/* Honest M1 banner */}
      <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 p-3 flex items-start gap-2.5">
        <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" weight="fill" />
        <div>
          <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">{t(k('m1BannerTitle'))}</p>
          <p className="text-xs text-blue-600 dark:text-blue-300/90 mt-0.5">{t(k('m1BannerDesc'))}</p>
        </div>
      </div>

      {/* Resumen por tipo */}
      <section className="space-y-3">
        <SectionLabel>{t(k('resumenLabel'))}</SectionLabel>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {RESUMEN_ITEMS.map((item) => (
            <div key={item.key} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <span className={cn('w-2 h-2 rounded-full flex-shrink-0', item.dot)} />
                <span className="text-caption text-muted-foreground truncate">{t(k(`tipo_${item.key}`))}</span>
              </div>
              <p className="mt-1.5 text-2xl font-mono tabular-nums text-foreground">{resumen[item.field]}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Eventos y tareas */}
      <section className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-3 p-5 border-b border-border">
          <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center flex-shrink-0">
            <CalendarBlank className="w-[18px] h-[18px] text-indigo-600 dark:text-indigo-400" />
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
                    icon={CalendarBlank}
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

export default function AgendaPage() {
  return (
    <PageGuard adminOnly>
      <AgendaContent />
    </PageGuard>
  );
}
