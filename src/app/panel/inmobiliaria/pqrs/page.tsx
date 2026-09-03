'use client';

import Link from 'next/link';
import { toast } from 'sonner';
import { Lifebuoy, Plus, Info, Wrench, ArrowRight } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { SectionLabel } from '@/components/ui/section-label';
import { EmptyState } from '@/components/ui/empty-state';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { PageGuard } from '@/components/auth/PageGuard';
import { RESUMEN_PQRS_VACIO } from '@/lib/api/pqrs.types';

/** Resumen por estado del ciclo PQRS — color por estado (token semántico). */
const RESUMEN_ITEMS: { key: string; dot: string; field: keyof typeof RESUMEN_PQRS_VACIO }[] = [
  { key: 'recibidas', dot: 'bg-primary', field: 'recibidas' },
  { key: 'asignadas', dot: 'bg-primary', field: 'asignadas' },
  { key: 'enProceso', dot: 'bg-warning', field: 'enProceso' },
  { key: 'enCotizacion', dot: 'bg-muted', field: 'enCotizacion' },
  { key: 'resueltas', dot: 'bg-success', field: 'resueltas' },
  { key: 'cerradas', dot: 'bg-surface-muted', field: 'cerradas' },
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
        <Button onClick={() => toast.info(t(k('newSoon')))} hideArrow className="shrink-0">
          <Plus className="w-4 h-4" weight="bold" />
          {t(k('new'))}
        </Button>
      </header>

      {/* Honest M1 banner — triage IA (Mastra en agent) */}
      <div className="rounded-lg bg-primary-soft border border-primary/30 p-3 flex items-start gap-2.5">
        <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" weight="fill" />
        <div>
          <p className="text-xs font-semibold text-primary">{t(k('m1BannerTitle'))}</p>
          <p className="text-xs text-primary/90 mt-0.5">{t(k('m1BannerDesc'))}</p>
        </div>
      </div>

      {/* Resumen por estado */}
      <section className="space-y-3">
        <SectionLabel>{t(k('resumenLabel'))}</SectionLabel>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {RESUMEN_ITEMS.map((item) => (
            <div key={item.key} className="rounded-lg border border-border bg-card p-4">
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
        className="flex items-center gap-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors p-4"
      >
        <div className="w-9 h-9 rounded-md bg-surface-muted flex items-center justify-center flex-shrink-0">
          <Wrench className="w-[18px] h-[18px] text-fg-muted" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-body-sm font-medium text-foreground">{t(k('repairFlowTitle'))}</p>
          <p className="text-caption text-muted-foreground mt-0.5">{t(k('repairFlowDesc'))}</p>
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      </Link>

      {/* Solicitudes */}
      <section className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-3 p-5 border-b border-border">
          <div className="w-9 h-9 rounded-md bg-surface-muted flex items-center justify-center flex-shrink-0">
            <Lifebuoy className="w-[18px] h-[18px] text-fg-muted" />
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
                  icon={Lifebuoy}
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

export default function PqrsPage() {
  return (
    <PageGuard adminOnly>
      <PqrsContent />
    </PageGuard>
  );
}
