'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { toast } from '@/components/ui/toast';
import { CalendarBlank, CalendarPlus, Plus } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { SectionLabel } from '@/components/ui/section-label';
import { SinDatos } from '@/components/estado/SinDatos';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { TablePagination } from '@/components/ui/pagination';
import { useTablePagination, PAGE_SIZE_OPTIONS } from '@/lib/hooks/use-table-pagination';
import { PageGuard } from '@/components/auth/PageGuard';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { KpiValor } from '@/components/estado/KpiValor';
import { ApiError } from '@/lib/api/client';
import { RESUMEN_AGENDA_VACIO } from '@/lib/api/agenda.types';
import { rotuloDeLaPersona } from '@/lib/agenda/rotulo-de-la-persona';
import type { AgendaListResponse, EventoAgenda, EventoTipo, EventoEstado } from '@/lib/api/agenda.types';
import { agendaApi } from '@/lib/api/agenda.service';
import { fechaLocal } from '@/lib/fechas-locales';
import { PedirCitaModal } from '@/components/inmobiliaria/agenda/PedirCitaModal';
import { NuevaTareaDrawer } from '@/components/inmobiliaria/agenda/NuevaTareaDrawer';
import { EventoAgendaDrawer } from '@/components/inmobiliaria/agenda/EventoAgendaDrawer';

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
  'colVinculo', 'colPersona', 'colEstado',
];

/** Dot color per event type (matches the summary tiles). */
const TIPO_DOT: Record<EventoTipo, string> = {
  visita: 'bg-primary',
  firma_pendiente: 'bg-warning-500',
  vencimiento_contrato: 'bg-error-500',
  seguimiento: 'bg-primary',
  inspeccion: 'bg-neutral-300 dark:bg-neutral-600',
  tarea: 'bg-neutral-300 dark:bg-neutral-600',
};

/** Badge classes per event status. */
const ESTADO_BADGE: Record<EventoEstado, string> = {
  pendiente: 'bg-primary/10 text-primary',
  confirmado: 'bg-success-500/10 text-success',
  completado: 'bg-success-500/10 text-success',
  vencido: 'bg-error-500/10 text-danger',
  cancelado: 'bg-neutral-400/10 text-muted-foreground',
};

/** Recover the raw PropertyVisit id from an agenda event id (`visit-<uuid>`). */
const visitIdOf = (eventId: string) => eventId.replace(/^visit-/, '');

function AgendaContent() {
  const { t, locale } = useI18n();
  const k = (s: string) => `inmobiliaria.agenda.${s}`;

  // El back sirve la agenda con `operaciones:view` pero exige `operaciones:edit`
  // para TODO lo que la cambia (`agenda.controller.ts`). Un CONTADOR o un VIEWER
  // veían «Pedir cita», «Nueva tarea» y Confirmar/Rechazar/Cancelar, y cada clic
  // terminaba en un 403 sin explicación. Si no se puede, no se dibuja.
  const { canAccess } = usePermissions();
  const puedeEditar = canAccess('operaciones', 'edit');

  const [data, setData] = useState<AgendaListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // El error entero, no un booleano: `FalloDeCarga` lo clasifica para saber si
  // reintentar puede dar otro resultado. Con un `true` pelado, una sesión
  // vencida y un 500 se veían igual, y los dos ofrecían un "Reintentar" que
  // sobre el 401 no arregla nada.
  const [error, setError] = useState<unknown>(null);
  const [citaOpen, setCitaOpen] = useState(false);
  const [tareaOpen, setTareaOpen] = useState(false);
  const [seleccionado, setSeleccionado] = useState<EventoAgenda | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = useCallback(() => {
    setIsLoading(true);
    setError(null);
    agendaApi
      .getAgenda()
      .then(setData)
      .catch(setError)
      .finally(() => setIsLoading(false));
  }, []);

  /**
   * Confirmar / rechazar / cancelar una visita desde el feed, y refrescar.
   *
   * 🔴 La guarda del doble clic es un `useRef`, no el `disabled` del botón:
   * `setActingId` pinta en el render SIGUIENTE, así que dos clics seguidos
   * (o un doble clic, que es lo normal cuando algo tarda) entraban los dos y
   * mandaban dos confirmaciones de la misma cita. El ref cambia en el mismo
   * tick que el clic, antes de que React vuelva a pintar.
   */
  const enCurso = useRef<string | null>(null);
  const runCitaAction = useCallback(
    async (visitId: string, action: () => Promise<void>) => {
      if (enCurso.current) return;
      enCurso.current = visitId;
      setActingId(visitId);
      try {
        await action();
        toast.success(t(k('citaAccionOk')));
        load();
      } catch (err) {
        // Con la sesión vencida el cliente HTTP ya está cerrando sesión: un
        // «no se pudo actualizar» encima sería mentira.
        if (err instanceof ApiError && err.status === 401) return;
        // El back explica POR QUÉ no se pudo (una cita ya cancelada, una que
        // no es de esta agencia…). Ese motivo vale más que «Intenta de nuevo»,
        // así que viaja en la descripción del toast en vez de perderse en un
        // `catch` sin argumento.
        toast.error(t(k('citaAccionError')), {
          description:
            err instanceof ApiError && err.message && err.message.length < 160
              ? err.message
              : undefined,
        });
      } finally {
        enCurso.current = null;
        setActingId(null);
      }
    },
    [load, t],
  );

  useEffect(() => {
    load();
  }, [load]);

  const resumen = data?.resumen ?? RESUMEN_AGENDA_VACIO;
  const eventos = data?.eventos ?? [];

  /**
   * Paginado de presentación: `agendaApi.getAgenda()` trae el feed completo de
   * eventos y crece con cada visita, firma y vencimiento. Sin filtros en esta
   * pantalla ⇒ sin `resetKey`.
   */
  const {
    pageItems,
    total,
    page,
    pageSize,
    setPage,
    setPageSize,
    shouldPaginate,
  } = useTablePagination(eventos);

  /**
   * El día se lee del CALENDARIO, no del instante: `new Date('2026-10-01…Z')`
   * en Colombia (UTC-5) cae el 30 de septiembre, y una agenda que corre los
   * vencimientos un día para atrás no sirve. Mismo helper que usa el cajón,
   * así que tabla y detalle nunca dicen días distintos.
   */
  const formatFecha = (iso: string) => {
    const d = fechaLocal(iso) ?? new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return new Intl.DateTimeFormat(locale === 'es' ? 'es-CO' : 'en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(d);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-2">
          <SectionLabel>{t(k('label'))}</SectionLabel>
          <h1 className="text-h2 text-foreground">{t(k('title'))}</h1>
          <p className="text-body text-muted-foreground max-w-2xl line-clamp-2">{t(k('subtitle'))}</p>
        </div>
        <PermissionGate module="operaciones" action="edit" fallback={null}>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" onClick={() => setCitaOpen(true)} hideArrow data-testid="pedir-cita">
              <CalendarPlus className="w-4 h-4" weight="bold" />
              {t(k('pedirCita'))}
            </Button>
            <Button onClick={() => setTareaOpen(true)} hideArrow data-testid="nueva-tarea">
              <Plus className="w-4 h-4" weight="bold" />
              {t(k('new'))}
            </Button>
          </div>
        </PermissionGate>
      </header>

      {/* Resumen por tipo */}
      <section className="space-y-3">
        <SectionLabel>{t(k('resumenLabel'))}</SectionLabel>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {RESUMEN_ITEMS.map((item) => (
            <div key={item.key} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <span className={cn('w-2 h-2 rounded-full flex-shrink-0', item.dot)} />
                <span className="text-caption text-muted-foreground truncate">{t(k(`tipo_${item.key}`))}</span>
              </div>
              {/* El número entra a los cuatro estados: con la carga caída, la
                  tabla decía «no se pudo cargar» y un renglón más arriba los
                  tiles afirmaban «0 visitas · 0 firmas». Un cero es un dato;
                  «no sé» no es cero. */}
              <p className="mt-1.5 text-2xl font-semibold tabular-nums text-foreground">
                <KpiValor cargando={isLoading} fallo={error}>
                  {resumen[item.field]}
                </KpiValor>
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* La tabla, sin título encima: no se nombran las tablas (Nico, 2026-09-03). */}
      <section className="rounded-lg border border-border bg-card overflow-hidden">

        {/* El vacío NO va acá: vive dentro del <TableBody> para que se sigan
            viendo los encabezados de columna. Acá sólo carga y fallo. */}
        <EstadoDeDatos
          cargando={isLoading}
          error={error}
          queEs="la agenda"
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
              {eventos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={COLUMNS.length} className="p-0">
                    {/* Sin filtros en esta pantalla: un vacío acá es «no hay
                        nada agendado», y lo útil es poder agendar desde acá.
                        `setCitaOpen` abre el mismo modal del botón de arriba. */}
                    <SinDatos
                      queSon="eventos"
                      icono={CalendarBlank}
                      titulo={t(k('emptyTitle'))}
                      descripcion={t(k('emptyDesc'))}
                      crear={
                        puedeEditar
                          ? { label: 'Agendar una visita', onClick: () => setCitaOpen(true) }
                          : undefined
                      }
                    />
                  </TableCell>
                </TableRow>
              ) : (
                pageItems.map((e: EventoAgenda) => (
                  <TableRow
                    key={e.id}
                    onClick={() => setSeleccionado(e)}
                    className="cursor-pointer"
                    data-testid="agenda-fila"
                  >
                    <TableCell className="whitespace-nowrap tabular-nums text-muted-foreground">
                      {formatFecha(e.fecha)}
                    </TableCell>
                    <TableCell>
                      <div className="min-w-0">
                        <p className="text-foreground font-medium truncate">{e.titulo}</p>
                        {e.descripcion && (
                          <p className="text-caption text-muted-foreground truncate">{e.descripcion}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5">
                        <span className={cn('w-2 h-2 rounded-full flex-shrink-0', TIPO_DOT[e.tipo])} />
                        <span className="text-muted-foreground">{t(k(`rowTipo_${e.tipo}`))}</span>
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {t(k(`origen_${e.origen}`))}
                    </TableCell>
                    <TableCell className="max-w-[220px]">
                      <span className="text-muted-foreground truncate block">
                        {e.vinculoLabel ?? t(k('sinVinculo'))}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {/* El mismo campo es el inquilino, quien visita o el responsable
                          según el tipo: se dice debajo del nombre para que la fila no se
                          lea al revés (ver `rotulo-de-la-persona.ts`). */}
                      <span className="block text-muted-foreground">{e.responsableNombre ?? t(k('sinVinculo'))}</span>
                      {e.responsableNombre && (
                        <span className="block text-caption text-muted-foreground/80" data-testid="agenda-rol-persona">
                          {rotuloDeLaPersona(e.tipo) ?? t(k('colResponsable'))}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-caption font-medium', ESTADO_BADGE[e.estado])}>
                          {t(k(`estado_${e.estado}`))}
                        </span>
                        {puedeEditar && e.tipo === 'visita' && e.estadoRaw === 'PENDING' && (
                          <span className="flex items-center gap-1.5">
                            <Button
                              type="button"
                              variant="link"
                              size="sm"
                              disabled={actingId === visitIdOf(e.id)}
                              onClick={(ev) => { ev.stopPropagation(); void runCitaAction(visitIdOf(e.id), () => agendaApi.aceptarCita(visitIdOf(e.id))); }}
                              className="h-auto px-0 text-caption font-medium text-success"
                            >
                              {t(k('citaConfirmar'))}
                            </Button>
                            <span className="text-border">·</span>
                            <Button
                              type="button"
                              variant="link"
                              size="sm"
                              disabled={actingId === visitIdOf(e.id)}
                              onClick={(ev) => { ev.stopPropagation(); void runCitaAction(visitIdOf(e.id), () => agendaApi.rechazarCita(visitIdOf(e.id))); }}
                              className="h-auto px-0 text-caption font-medium text-danger"
                            >
                              {t(k('citaRechazar'))}
                            </Button>
                          </span>
                        )}
                        {puedeEditar && e.tipo === 'visita' && e.estadoRaw === 'ACCEPTED' && (
                          <Button
                            type="button"
                            variant="link"
                            size="sm"
                            disabled={actingId === visitIdOf(e.id)}
                            onClick={(ev) => { ev.stopPropagation(); void runCitaAction(visitIdOf(e.id), () => agendaApi.cancelarCita(visitIdOf(e.id))); }}
                            className="h-auto px-0 text-caption font-medium text-fg-muted"
                          >
                            {t(k('citaCancelar'))}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pie: sólo si hay más de una página. */}
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

      <PedirCitaModal isOpen={citaOpen} onClose={() => setCitaOpen(false)} onCreated={load} />
      <NuevaTareaDrawer abierto={tareaOpen} onOpenChange={setTareaOpen} onCreada={load} />
      <EventoAgendaDrawer
        evento={seleccionado}
        onOpenChange={(o) => { if (!o) setSeleccionado(null); }}
        onCambio={load}
        onAccionVisita={runCitaAction}
        puedeEditar={puedeEditar}
      />
    </div>
  );
}

export default function AgendaPage() {
  return (
    // El sidebar (`arquitectura-del-panel.ts`) ofrece esta pantalla a TODOS
    // los roles de agencia y el back la sirve con `operaciones:view`. Con
    // `adminOnly` el enlace existía y al tocarlo te sacaba, sin decir nada.
    <PageGuard module="operaciones">
      <AgendaContent />
    </PageGuard>
  );
}
