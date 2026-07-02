'use client';

import { toast } from 'sonner';
import { CalendarBlank, Plus, Info } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { SectionLabel } from '@/components/ui/section-label';
import { EmptyState } from '@/components/ui/empty-state';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { PageGuard } from '@/components/auth/PageGuard';
import { RESUMEN_AGENDA_VACIO } from '@/lib/api/agenda.types';

/** Resumen por tipo de evento — color por tipo (estático). */
const RESUMEN_ITEMS: { key: string; dot: string; field: keyof typeof RESUMEN_AGENDA_VACIO }[] = [
  { key: 'visitas', dot: 'bg-primary', field: 'visitas' },
  { key: 'firmas', dot: 'bg-warning-500', field: 'firmasPendientes' },
  { key: 'vencimientos', dot: 'bg-error-500', field: 'vencimientos' },
  { key: 'seguimientos', dot: 'bg-primary', field: 'seguimientos' },
  { key: 'inspecciones', dot: 'bg-neutral-300 dark:bg-neutral-600', field: 'inspecciones' },
  { key: 'tareas', dot: 'bg-neutral-300 dark:bg-neutral-600', field: 'tareas' },
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
        <Button onClick={() => toast.info(t(k('newSoon')))} hideArrow className="shrink-0">
          <Plus className="w-4 h-4" weight="bold" />
          {t(k('new'))}
        </Button>
      </header>

      {/* Honest M1 banner */}
      <div className="rounded-xl bg-primary/10 border border-primary/30 p-3 flex items-start gap-2.5">
        <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" weight="fill" />
        <div>
          <p className="text-xs font-semibold text-primary">{t(k('m1BannerTitle'))}</p>
          <p className="text-xs text-primary/90 mt-0.5">{t(k('m1BannerDesc'))}</p>
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
              <p className="mt-1.5 text-2xl font-semibold tabular-nums text-foreground">{resumen[item.field]}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Eventos y tareas */}
      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-3 p-5 border-b border-border">
          <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
            <CalendarBlank className="w-[18px] h-[18px] text-primary" />
          </div>
          <div>
            <h2 className="text-h4 text-foreground">{t(k('listTitle'))}</h2>
            <p className="text-caption text-muted-foreground mt-0.5">{t(k('listDesc'))}</p>
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
                  icon={CalendarBlank}
                  title={t(k('emptyTitle'))}
                  description={t(k('emptyDesc'))}
                />
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
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
