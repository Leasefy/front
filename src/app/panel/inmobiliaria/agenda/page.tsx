'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { CalendarBlank, CalendarPlus, Plus, Info } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { SectionLabel } from '@/components/ui/section-label';
import { SinDatos } from '@/components/estado/SinDatos';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { PageGuard } from '@/components/auth/PageGuard';
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { RESUMEN_AGENDA_VACIO } from '@/lib/api/agenda.types';
import type { AgendaListResponse, EventoAgenda, EventoTipo, EventoEstado } from '@/lib/api/agenda.types';
import { agendaApi } from '@/lib/api/agenda.service';
import { PedirCitaModal } from '@/components/inmobiliaria/agenda/PedirCitaModal';

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
  completado: 'bg-success-500/10 text-success',
  vencido: 'bg-error-500/10 text-danger',
  cancelado: 'bg-neutral-400/10 text-muted-foreground',
};

/** Recover the raw PropertyVisit id from an agenda event id (`visit-<uuid>`). */
const visitIdOf = (eventId: string) => eventId.replace(/^visit-/, '');

function AgendaContent() {
  const { t, locale } = useI18n();
  const k = (s: string) => `inmobiliaria.agenda.${s}`;

  const [data, setData] = useState<AgendaListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // El error entero, no un booleano: `FalloDeCarga` lo clasifica para saber si
  // reintentar puede dar otro resultado. Con un `true` pelado, una sesión
  // vencida y un 500 se veían igual, y los dos ofrecían un "Reintentar" que
  // sobre el 401 no arregla nada.
  const [error, setError] = useState<unknown>(null);
  const [citaOpen, setCitaOpen] = useState(false);
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

  // Confirm / reject / cancel a visit straight from the feed, then refresh.
  const runCitaAction = useCallback(
    async (visitId: string, action: () => Promise<void>) => {
      setActingId(visitId);
      try {
        await action();
        toast.success(t(k('citaAccionOk')));
        load();
      } catch {
        toast.error(t(k('citaAccionError')));
      } finally {
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

  const formatFecha = (iso: string) => {
    const d = new Date(iso);
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
          <p className="text-body text-muted-foreground max-w-2xl">{t(k('subtitle'))}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" onClick={() => setCitaOpen(true)} hideArrow>
            <CalendarPlus className="w-4 h-4" weight="bold" />
            {t(k('pedirCita'))}
          </Button>
          <Button onClick={() => toast.info(t(k('newSoon')))} hideArrow>
            <Plus className="w-4 h-4" weight="bold" />
            {t(k('new'))}
          </Button>
        </div>
      </header>

      {/* Engine note — system events are live; tasks/follow-ups are next */}
      <div className="rounded-xl bg-primary/10 border border-primary/30 p-3 flex items-start gap-2.5">
        <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" weight="fill" />
        <p className="text-xs text-primary/90">{t(k('engineNote'))}</p>
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
                      crear={{ label: 'Agendar una visita', onClick: () => setCitaOpen(true) }}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                eventos.map((e: EventoAgenda) => (
                  <TableRow key={e.id}>
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
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {e.responsableNombre ?? t(k('sinVinculo'))}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-caption font-medium', ESTADO_BADGE[e.estado])}>
                          {t(k(`estado_${e.estado}`))}
                        </span>
                        {e.tipo === 'visita' && e.estadoRaw === 'PENDING' && (
                          <span className="flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={actingId === visitIdOf(e.id)}
                              onClick={() => runCitaAction(visitIdOf(e.id), () => agendaApi.aceptarCita(visitIdOf(e.id)))}
                              className="text-caption font-medium text-success hover:underline disabled:opacity-50"
                            >
                              {t(k('citaConfirmar'))}
                            </button>
                            <span className="text-border">·</span>
                            <button
                              type="button"
                              disabled={actingId === visitIdOf(e.id)}
                              onClick={() => runCitaAction(visitIdOf(e.id), () => agendaApi.rechazarCita(visitIdOf(e.id)))}
                              className="text-caption font-medium text-danger hover:underline disabled:opacity-50"
                            >
                              {t(k('citaRechazar'))}
                            </button>
                          </span>
                        )}
                        {e.tipo === 'visita' && e.estadoRaw === 'ACCEPTED' && (
                          <button
                            type="button"
                            disabled={actingId === visitIdOf(e.id)}
                            onClick={() => runCitaAction(visitIdOf(e.id), () => agendaApi.cancelarCita(visitIdOf(e.id)))}
                            className="text-caption font-medium text-muted-foreground hover:underline disabled:opacity-50"
                          >
                            {t(k('citaCancelar'))}
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </EstadoDeDatos>
      </section>

      <PedirCitaModal isOpen={citaOpen} onClose={() => setCitaOpen(false)} onCreated={load} />
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
