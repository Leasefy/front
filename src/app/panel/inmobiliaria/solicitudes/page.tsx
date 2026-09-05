'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Lifebuoy, Plus, Wrench, ArrowRight } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';
import { SectionLabel } from '@/components/ui/section-label';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TablePagination } from '@/components/ui/pagination';
import { useTablePagination, PAGE_SIZE_OPTIONS } from '@/lib/hooks/use-table-pagination';
import { PageGuard } from '@/components/auth/PageGuard';
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { SinDatos } from '@/components/estado/SinDatos';
import { pqrsApi } from '@/lib/api/pqrs-agencia.service';
import { RESUMEN_PQRS_VACIO } from '@/lib/api/pqrs-agencia.types';
import type { Pqrs, PqrsListResponse } from '@/lib/api/pqrs-agencia.types';
import { NuevaPqrsDrawer } from '@/components/inmobiliaria/pqrs/NuevaPqrsDrawer';
import { PqrsDrawer } from '@/components/inmobiliaria/pqrs/PqrsDrawer';
import {
  ESTADO_BADGE,
  ESTADO_LABEL,
  SOLICITANTE_LABEL,
  TIPO_LABEL,
  textoSla,
} from '@/components/inmobiliaria/pqrs/pqrs-reglas';

/** Resumen por estado del ciclo PQRS — color por estado (token semántico). */
const RESUMEN_ITEMS: { key: string; dot: string; field: keyof typeof RESUMEN_PQRS_VACIO }[] = [
  { key: 'recibidas', dot: 'bg-primary', field: 'recibidas' },
  { key: 'asignadas', dot: 'bg-primary', field: 'asignadas' },
  { key: 'enProceso', dot: 'bg-warning', field: 'enProceso' },
  { key: 'enCotizacion', dot: 'bg-warning', field: 'enCotizacion' },
  { key: 'resueltas', dot: 'bg-success', field: 'resueltas' },
  { key: 'cerradas', dot: 'bg-fg-subtle', field: 'cerradas' },
];

const COLUMNS = [
  'colRadicado', 'colSolicitante', 'colTipo', 'colInmueble',
  'colAsignado', 'colEstado', 'colSla',
];

function PqrsContent() {
  const { t } = useI18n();
  const k = (s: string) => `inmobiliaria.pqrs.${s}`;

  const [data, setData] = useState<PqrsListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // El error entero, no un booleano: `FalloDeCarga` decide si reintentar sirve.
  const [error, setError] = useState<unknown>(null);
  const [nuevaOpen, setNuevaOpen] = useState(false);
  const [seleccionada, setSeleccionada] = useState<Pqrs | null>(null);

  const load = useCallback(() => {
    setIsLoading(true);
    setError(null);
    pqrsApi
      .listar()
      .then(setData)
      .catch(setError)
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const resumen = data?.resumen ?? RESUMEN_PQRS_VACIO;
  const solicitudes = data?.solicitudes ?? [];
  const { pageItems, total, page, pageSize, setPage, setPageSize, shouldPaginate } =
    useTablePagination(solicitudes);

  // Mover de estado o reasignar devuelve la fila entera: se reemplaza en su
  // lugar y se recarga el resumen de fondo, sin borrar la tabla.
  const onActualizada = (p: Pqrs) => {
    setData((prev) =>
      prev ? { ...prev, solicitudes: prev.solicitudes.map((s) => (s.id === p.id ? p : s)) } : prev,
    );
    setSeleccionada(p);
    pqrsApi.listar().then(setData).catch(() => undefined);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-2">
          <SectionLabel>{t(k('label'))}</SectionLabel>
          <h1 className="text-h2 text-fg">{t(k('title'))}</h1>
          <p className="text-body text-fg-muted max-w-2xl line-clamp-2">{t(k('subtitle'))}</p>
        </div>
        <Button onClick={() => setNuevaOpen(true)} hideArrow className="shrink-0" data-testid="pqrs-nueva">
          <Plus className="w-4 h-4" weight="bold" />
          {t(k('new'))}
        </Button>
      </header>

      {/* Resumen por estado */}
      <section className="space-y-3">
        <SectionLabel>{t(k('resumenLabel'))}</SectionLabel>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {RESUMEN_ITEMS.map((item) => (
            <div key={item.key} className="rounded-lg border border-border bg-surface p-4">
              <div className="flex items-center gap-2">
                <span className={cn('w-2 h-2 rounded-full flex-shrink-0', item.dot)} />
                <span className="text-caption text-fg-muted truncate">{t(k(`estado_${item.key}`))}</span>
              </div>
              <p className="mt-1.5 text-2xl font-semibold tabular-nums text-fg">{resumen[item.field]}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Reparación → cotización (PQRS-03) */}
      <Link
        href="/panel/inmobiliaria/mantenimientos"
        className="flex items-center gap-3 rounded-lg border border-border bg-surface hover:bg-surface-muted/50 transition-colors p-4"
      >
        <div className="w-9 h-9 rounded-md bg-surface-muted flex items-center justify-center flex-shrink-0">
          <Wrench className="w-[18px] h-[18px] text-fg-muted" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-body-sm font-medium text-fg">{t(k('repairFlowTitle'))}</p>
          <p className="text-caption text-fg-muted mt-0.5">{t(k('repairFlowDesc'))}</p>
        </div>
        <ArrowRight className="w-4 h-4 text-fg-muted flex-shrink-0" />
      </Link>

      {/* Solicitudes — la tabla sola dentro de la tarjeta, sin título encima
          (Nico: «nosotros no nombramos las tablas»). */}
      <section className="rounded-lg border border-border bg-surface overflow-hidden">
        {/* El vacío vive dentro del <TableBody> para que se sigan viendo los
            encabezados. Acá sólo carga y fallo. */}
        <EstadoDeDatos
          cargando={isLoading}
          error={error}
          queEs="las solicitudes"
          onReintentar={load}
          esqueleto={
            <div className="flex items-center justify-center py-16">
              <Spinner />
            </div>
          }
        >
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
              {solicitudes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={COLUMNS.length} className="p-0">
                    <SinDatos
                      queSon="solicitudes"
                      icono={Lifebuoy}
                      titulo={t(k('emptyTitle'))}
                      descripcion={t(k('emptyDesc'))}
                      crear={{ label: t(k('new')), onClick: () => setNuevaOpen(true) }}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                pageItems.map((p) => {
                  const sla = textoSla(p.slaVenceAt, p.estado);
                  return (
                    <TableRow
                      key={p.id}
                      className="cursor-pointer"
                      data-testid="pqrs-fila"
                      tabIndex={0}
                      onClick={() => setSeleccionada(p)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSeleccionada(p);
                        }
                      }}
                    >
                      <TableCell className="whitespace-nowrap font-mono text-fg">{p.radicado}</TableCell>
                      <TableCell className="max-w-[220px]">
                        <p className="text-fg font-medium truncate">{p.solicitanteNombre}</p>
                        <p className="text-caption text-fg-muted">{SOLICITANTE_LABEL[p.solicitanteTipo]}</p>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-fg-muted">{TIPO_LABEL[p.tipo]}</TableCell>
                      <TableCell className="max-w-[240px]">
                        <span className="text-fg-muted truncate block">
                          {p.inmuebleLabel ?? t(k('sinInmueble'))}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-fg-muted">
                        {p.asignadoANombre ?? t(k('sinAsignar'))}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-caption font-medium', ESTADO_BADGE[p.estado])}>
                          {ESTADO_LABEL[p.estado]}
                        </span>
                      </TableCell>
                      <TableCell className={cn('whitespace-nowrap tabular-nums', sla.vencido ? 'text-danger font-medium' : 'text-fg-muted')}>
                        {sla.texto}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {shouldPaginate && (
            <div className="border-t border-border px-4 py-3">
              <TablePagination
                total={total}
                page={page}
                pageSize={pageSize}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageChange={setPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          )}
        </EstadoDeDatos>
      </section>

      <NuevaPqrsDrawer open={nuevaOpen} onOpenChange={setNuevaOpen} onCreated={load} />
      <PqrsDrawer
        pqrs={seleccionada}
        open={seleccionada !== null}
        onOpenChange={(abierto) => {
          if (!abierto) setSeleccionada(null);
        }}
        onActualizado={onActualizada}
      />
    </div>
  );
}

export default function PqrsPage() {
  return (
    // El sidebar (`arquitectura-del-panel.ts`) ofrece esta pantalla a TODOS
    // los roles de agencia y el back la sirve con `operaciones:view`. Con
    // `adminOnly` el enlace existía y al tocarlo te sacaba, sin decir nada.
    <PageGuard module="operaciones">
      <PqrsContent />
    </PageGuard>
  );
}
