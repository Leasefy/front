'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { toast } from '@/components/ui/toast';
import { CalendarBlank, CalendarPlus, Plus, CaretLeft, CaretRight, Check } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { SectionLabel } from '@/components/ui/section-label';
import { SinDatos } from '@/components/estado/SinDatos';
import { Spinner } from '@/components/ui/spinner';
import { Table, TableHeader, TableBodyAnimado, TableRow, TableRowAnimada, TableHead, TableCell } from '@/components/ui/table';
import { TablePagination } from '@/components/ui/pagination';
import { PAGE_SIZE_OPTIONS } from '@/lib/hooks/use-table-pagination';
import { PageGuard } from '@/components/auth/PageGuard';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { KpiValor } from '@/components/estado/KpiValor';
import { ApiError } from '@/lib/api/client';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { EVENTOS_POR_PAGINA, RESUMEN_AGENDA_VACIO } from '@/lib/api/agenda.types';
import { rotuloDeLaPersona } from '@/lib/agenda/rotulo-de-la-persona';
import type { AgendaListResponse, EventoAgenda, EventoTipo, EventoEstado } from '@/lib/api/agenda.types';
import { agendaApi } from '@/lib/api/agenda.service';
import { fechaLocal } from '@/lib/fechas-locales';
import { PedirCitaModal } from '@/components/inmobiliaria/agenda/PedirCitaModal';
import { NuevaTareaDrawer } from '@/components/inmobiliaria/agenda/NuevaTareaDrawer';
import { EventoAgendaDrawer } from '@/components/inmobiliaria/agenda/EventoAgendaDrawer';
import { MotivoDialog, mensajeDelRechazoDelMotivo } from '@/components/inmobiliaria/agenda/MotivoDialog';
import { origenDelEvento } from '@/lib/agenda/origen-del-evento';
import { useMiUserId } from '@/lib/agenda/use-equipo';
import { horaDeLaCasa, diaDeLaCasa, lunesDe } from '@/lib/agenda/hora-de-la-casa';
import { aFechaIso } from '@/lib/fechas-locales';
import { tareaIdOf, type VistaDeAgenda } from '@/lib/api/agenda.types';

/** Resumen por tipo de evento — color por tipo (estático). */
const RESUMEN_ITEMS: { key: string; dot: string; field: keyof typeof RESUMEN_AGENDA_VACIO }[] = [
  { key: 'visitas', dot: 'bg-primary', field: 'visitas' },
  { key: 'firmas', dot: 'bg-warning-500', field: 'firmasPendientes' },
  { key: 'vencimientos', dot: 'bg-error-500', field: 'vencimientos' },
  { key: 'seguimientos', dot: 'bg-primary', field: 'seguimientos' },
  { key: 'inspecciones', dot: 'bg-neutral-300 dark:bg-neutral-600', field: 'inspecciones' },
  { key: 'tareas', dot: 'bg-neutral-300 dark:bg-neutral-600', field: 'tareas' },
];

/**
 * AG-03 (QA del 04-10-2026): a 1440 px la tabla no cabía. El tipo y el origen
 * van ahora DEBAJO del evento (no en columnas propias) y la fecha lleva la
 * hora debajo. Cinco columnas que caben en un escritorio normal.
 */
const COLUMNS = ['colFecha', 'colEvento', 'colVinculo', 'colPersona', 'colEstado'];

/** AG-02/AG-04: las pestañas de la agenda. */
type Pestana = VistaDeAgenda | 'semana';
const PESTANAS: { id: Pestana; label: string }[] = [
  { id: 'proximas', label: 'Próximas' },
  { id: 'vencidas', label: 'Vencidas' },
  { id: 'hechas', label: 'Hechas' },
  { id: 'semana', label: 'Semana' },
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
  // Desde el 17-09-2026 el asesor comercial también la escribe (`pipeline:edit`):
  // sus citas y tareas. El back acepta cualquiera de los dos.
  const puedeEditar = canAccess('operaciones', 'edit') || canAccess('pipeline', 'edit');

  const [data, setData] = useState<AgendaListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  /**
   * La página la resuelve el BACK, no esta pantalla (caso A8 de la auditoría
   * del 13-09). Antes `agendaApi.getAgenda()` traía el feed entero —con la
   * inmobiliaria migrada, el portafolio completo a la RAM del back en cada
   * carga— y `useTablePagination` cortaba de a diez acá. Ahora cambiar de
   * página es una consulta nueva: por eso son estado, y por eso `load`
   * depende de ellos.
   */
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(EVENTOS_POR_PAGINA);
  // El error entero, no un booleano: `FalloDeCarga` lo clasifica para saber si
  // reintentar puede dar otro resultado. Con un `true` pelado, una sesión
  // vencida y un 500 se veían igual, y los dos ofrecían un "Reintentar" que
  // sobre el 401 no arregla nada.
  const [error, setError] = useState<unknown>(null);
  const [citaOpen, setCitaOpen] = useState(false);
  const [tareaOpen, setTareaOpen] = useState(false);
  const [seleccionado, setSeleccionado] = useState<EventoAgenda | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const miUserId = useMiUserId();
  /**
   * AG-04: quien NO ve la operación (la asesora) arranca en «Lo mío»: sus
   * visitas, las que nadie atiende todavía y sus tareas.
   */
  const esAsesor = canAccess('pipeline', 'edit') && !canAccess('operaciones', 'view');
  const [pestana, setPestana] = useState<Pestana>('proximas');
  const [soloLoMio, setSoloLoMio] = useState<boolean>(esAsesor);
  useEffect(() => setSoloLoMio(esAsesor), [esAsesor]);
  const [lunes, setLunes] = useState<Date>(() => lunesDe(new Date()));
  /** AG-08: cancelar y rechazar desde la fila también preguntan el motivo. */
  const [motivoDe, setMotivoDe] = useState<{ visitId: string; cual: 'cancelar' | 'rechazar' } | null>(null);
  const [errorDelMotivo, setErrorDelMotivo] = useState<string | null>(null);

  const load = useCallback(() => {
    setIsLoading(true);
    setError(null);
    const semana =
      pestana === 'semana'
        ? (() => {
            const fin = new Date(lunes);
            fin.setDate(fin.getDate() + 6);
            return { desde: aFechaIso(lunes), hasta: aFechaIso(fin), page: 1, pageSize: 100 };
          })()
        : { vista: pestana as VistaDeAgenda, page, pageSize };
    agendaApi
      .getAgenda({ ...semana, mias: soloLoMio })
      .then(setData)
      .catch(setError)
      .finally(() => setIsLoading(false));
  }, [page, pageSize, pestana, soloLoMio, lunes]);

  /** Cambiar cuántas filas se ven vuelve a la primera página. */
  const cambiarTamano = useCallback((tamano: number) => {
    setPageSize(tamano);
    setPage(1);
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
  /**
   * Devuelve si la acción salió: el cajón sólo se cierra (y el motivo tipeado
   * sólo se descarta) cuando el back la aceptó.
   */
  const runCitaAction = useCallback(
    async (
      visitId: string,
      action: () => Promise<void>,
      // `avisar: false`: el error lo dice quien llamó, bajo su campo (el
      // diálogo del motivo al cancelar o rechazar), no un toast de acá.
      { avisar = true }: { avisar?: boolean } = {},
    ): Promise<boolean> => {
      if (enCurso.current) return false;
      enCurso.current = visitId;
      setActingId(visitId);
      try {
        await action();
        toast.success(t(k('citaAccionOk')));
        load();
        return true;
      } catch (err) {
        // Con la sesión vencida el cliente HTTP ya está cerrando sesión: un
        // «no se pudo actualizar» encima sería mentira.
        if (err instanceof ApiError && err.status === 401) return false;
        if (!avisar) return false;
        // El back explica POR QUÉ no se pudo (una cita ya cancelada, una que
        // no es de esta agencia…). Ese motivo viaja en la descripción, por el
        // traductor (02-10-2026): entero —antes un motivo de más de 160
        // caracteres se perdía—, «conexión» sólo si no hubo respuesta y un 5xx
        // con su referencia.
        toast.error(t(k('citaAccionError')), {
          description: mensajeParaLaPersona(err, {
            porDefecto: 'Prueba de nuevo en un momento.',
            accion: 'actualizar la cita',
          }),
        });
        return false;
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
   * `total` es el feed ENTERO; `eventos` es sólo esta página. Si una respuesta
   * no lo trajera, vale más lo que SÍ tenemos en la mano que un cero: un cero
   * pintaría «no hay nada agendado» encima de filas que están ahí.
   */
  const total = data?.total ?? eventos.length;
  const ultimaPagina = Math.max(1, Math.ceil(total / pageSize));
  // El pie se monta siempre que haya filas, aunque sean una página (Nico,
  // 2026-09-02): es lo que hace que una tabla se lea como tabla.
  const shouldPaginate = total > 0;

  /**
   * Si la página actual se quedó sin datos —completaste la última tarea de la
   * página 4— la base no tiene nada que devolver y la tabla quedaría vacía
   * sobre un feed que sí tiene filas. Se reencuadra a la última con datos, que
   * dispara una carga más. Es un viaje de ida, no un ciclo: `ultimaPagina`
   * sólo baja.
   */
  useEffect(() => {
    if (!isLoading && data && page > ultimaPagina) setPage(ultimaPagina);
  }, [isLoading, data, page, ultimaPagina]);

  /**
   * El día se lee del CALENDARIO, no del instante: `new Date('2026-10-01…Z')`
   * en Colombia (UTC-5) cae el 30 de septiembre, y una agenda que corre los
   * vencimientos un día para atrás no sirve. Mismo helper que usa el cajón,
   * así que tabla y detalle nunca dicen días distintos.
   */
  const formatFecha = (iso: string) => {
    const d = fechaLocal(iso) ?? new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    // AG-05: «3 de octubre de 2026», la fecha de la casa.
    return locale === 'es'
      ? diaDeLaCasa(d)
      : new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
  };

  /** AG-12: completar una tarea desde la fila (su responsable o quien coordina). */
  const completarTarea = useCallback(
    async (e: EventoAgenda) => {
      const id = tareaIdOf(e.id);
      if (enCurso.current) return;
      enCurso.current = id;
      setActingId(id);
      try {
        await agendaApi.actualizarTarea(id, { estado: 'COMPLETADA' });
        toast.success('Tarea completada');
        load();
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return;
        toast.error('No se pudo completar la tarea', {
          description: mensajeParaLaPersona(err, { porDefecto: 'Prueba de nuevo en un momento.', accion: 'completar la tarea' }),
        });
      } finally {
        enCurso.current = null;
        setActingId(null);
      }
    },
    [load],
  );

  /** AG-08: el motivo de la fila, con el error bajo el campo. */
  const confirmarMotivo = async (motivo: string) => {
    if (!motivoDe) return;
    const { visitId, cual } = motivoDe;
    let rechazo: unknown;
    setErrorDelMotivo(null);
    const salio = await runCitaAction(
      visitId,
      async () => {
        try {
          await (cual === 'cancelar' ? agendaApi.cancelarCita(visitId, motivo) : agendaApi.rechazarCita(visitId, motivo));
        } catch (err) {
          rechazo = err;
          throw err;
        }
      },
      { avisar: false },
    );
    if (salio) {
      setMotivoDe(null);
      return;
    }
    if (rechazo !== undefined) {
      setErrorDelMotivo(
        mensajeDelRechazoDelMotivo(rechazo, {
          campo: 'reason',
          porDefecto: `No se pudo ${cual} la visita. Prueba de nuevo en un momento.`,
          accion: `${cual} la visita`,
        }),
      );
    }
  };

  const porVista = data?.porVista;
  const diasDeLaSemana = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lunes);
    d.setDate(d.getDate() + i);
    return d;
  });

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-2">
          <SectionLabel>{t(k('label'))}</SectionLabel>
          <h1 className="text-h2 text-foreground">{t(k('title'))}</h1>
          <p className="text-body text-muted-foreground max-w-2xl line-clamp-2">{t(k('subtitle'))}</p>
        </div>
        {/* AG-11 (04-10-2026): la asesora también agenda (su `pipeline:edit`).
            Antes el botón pedía `operaciones:edit` y a ella no le salía. */}
        {puedeEditar && (
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
        )}
      </header>

      {/* AG-02/AG-04: las vistas. «Vencidas» aparte de «Próximas»; «Semana»
          para ver huecos y choques. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="tablist" aria-label="Qué ver" className="inline-flex flex-wrap gap-1 rounded-lg border border-border bg-card p-1">
          {PESTANAS.map((p) => (
            <Button
              key={p.id}
              type="button"
              variant="ghost"
              size="sm"
              role="tab"
              aria-selected={pestana === p.id}
              data-testid={`agenda-pestana-${p.id}`}
              onClick={() => {
                setPestana(p.id);
                setPage(1);
              }}
              className={cn(
                'relative h-auto rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:bg-transparent',
                pestana === p.id ? 'text-fg' : 'text-fg-muted hover:text-fg',
              )}
            >
              {pestana === p.id && (
                <motion.span
                  layoutId="agenda-pestana"
                  className="absolute inset-0 rounded-md bg-surface-muted"
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                />
              )}
              <span className="relative">
                {p.label}
                {p.id !== 'semana' && porVista && (
                  <span
                    className={cn(
                      'ml-1.5 tabular-nums',
                      p.id === 'vencidas' && porVista.vencidas > 0 ? 'text-danger' : 'text-fg-muted',
                    )}
                  >
                    {porVista[p.id as VistaDeAgenda]}
                  </span>
                )}
              </span>
            </Button>
          ))}
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-fg-muted">
          <Checkbox
            checked={soloLoMio}
            onCheckedChange={(marcada) => {
              setSoloLoMio(marcada === true);
              setPage(1);
            }}
            data-testid="agenda-solo-lo-mio"
          />
          Sólo lo mío
        </label>
      </div>

      {/* Resumen por tipo */}
      <section className="space-y-3">
        <SectionLabel>
          {pestana === 'vencidas' ? 'Vencidas' : pestana === 'hechas' ? 'Hechas (última semana)' : pestana === 'semana' ? 'Esta semana' : t(k('resumenLabel'))}
        </SectionLabel>
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
        <EstadoDeDatos
          cargando={isLoading && data === null}
          error={error}
          queEs="la agenda"
          onReintentar={load}
          esqueleto={
            <div className="flex items-center justify-center py-16">
              <Spinner />
            </div>
          }
        >
          {pestana === 'semana' ? (
            /* AG-04: la semana del asesor, día por día. */
            <div data-testid="agenda-semana">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <Button
                  variant="ghost"
                  size="sm"
                  hideArrow
                  aria-label="Semana anterior"
                  onClick={() => setLunes((l) => { const d = new Date(l); d.setDate(d.getDate() - 7); return d; })}
                >
                  <CaretLeft className="h-4 w-4" />
                </Button>
                <p className="text-sm font-medium text-fg">
                  Semana del {diaDeLaCasa(diasDeLaSemana[0])}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  hideArrow
                  aria-label="Semana siguiente"
                  onClick={() => setLunes((l) => { const d = new Date(l); d.setDate(d.getDate() + 7); return d; })}
                >
                  <CaretRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-1 divide-y divide-border md:grid-cols-7 md:divide-x md:divide-y-0">
                {diasDeLaSemana.map((d) => {
                  const iso = aFechaIso(d);
                  const delDia = eventos.filter((e) => e.fecha.slice(0, 10) === iso);
                  const esHoy = iso === aFechaIso(new Date());
                  return (
                    <div key={iso} className="min-h-[7rem] p-2" data-testid="agenda-dia">
                      <p className={cn('mb-2 text-caption font-medium', esHoy ? 'text-primary' : 'text-fg-muted')}>
                        {new Intl.DateTimeFormat('es-CO', { weekday: 'short', day: 'numeric' }).format(d)}
                      </p>
                      <ul className="space-y-1.5">
                        <AnimatePresence initial={false}>
                          {delDia.map((e) => (
                            <motion.li
                              key={e.id}
                              layout
                              initial={{ opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0 }}
                            >
                              <button
                                type="button"
                                onClick={() => setSeleccionado(e)}
                                className={cn(
                                  'w-full rounded-md border border-border px-2 py-1.5 text-left text-caption hover:border-primary/40',
                                  e.estado === 'vencido' && 'border-danger/40',
                                  (e.estado === 'completado' || e.estado === 'cancelado') && 'opacity-60',
                                )}
                              >
                                <span className="flex items-center gap-1.5">
                                  <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', TIPO_DOT[e.tipo])} />
                                  <span className="tabular-nums text-fg-muted">{e.hora ? horaDeLaCasa(e.hora) : 'Todo el día'}</span>
                                </span>
                                <span className="mt-0.5 block truncate text-fg">{e.titulo}</span>
                              </button>
                            </motion.li>
                          ))}
                        </AnimatePresence>
                        {delDia.length === 0 && <li className="text-caption text-fg-subtle">—</li>}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
          <>
          {/* AG-14: a 390 px, tarjetas en vez de una tabla que se corre a los lados. */}
          <ul className="divide-y divide-border md:hidden" data-testid="agenda-tarjetas">
            {total === 0 ? (
              <li>
                <SinDatos
                  queSon="eventos"
                  icono={CalendarBlank}
                  titulo={pestana === 'vencidas' ? 'Nada vencido' : pestana === 'hechas' ? 'Nada hecho esta semana' : t(k('emptyTitle'))}
                  descripcion={pestana === 'proximas' ? t(k('emptyDesc')) : ''}
                  crear={puedeEditar && pestana === 'proximas' ? { label: 'Agendar una visita', onClick: () => setCitaOpen(true) } : undefined}
                />
              </li>
            ) : (
              eventos.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => setSeleccionado(e)}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left"
                    data-testid="agenda-tarjeta"
                  >
                    <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', TIPO_DOT[e.tipo])} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-fg">{e.titulo}</span>
                      <span className="block text-caption text-fg-muted">
                        {formatFecha(e.fecha)}
                        {e.hora ? ` · ${horaDeLaCasa(e.hora)}` : ''} · {t(k(`rowTipo_${e.tipo}`))}
                      </span>
                      {e.responsableNombre && (
                        <span className="block truncate text-caption text-fg-muted">{e.responsableNombre}</span>
                      )}
                    </span>
                    <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-caption font-medium', ESTADO_BADGE[e.estado])}>
                      {t(k(`estado_${e.estado}`))}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>

          <div className="hidden md:block">
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
            <TableBodyAnimado>
              {total === 0 ? (
                <TableRowAnimada key="vacio">
                  <TableCell colSpan={COLUMNS.length} className="p-0">
                    <SinDatos
                      queSon="eventos"
                      icono={CalendarBlank}
                      titulo={pestana === 'vencidas' ? 'Nada vencido' : pestana === 'hechas' ? 'Nada hecho esta semana' : t(k('emptyTitle'))}
                      descripcion={pestana === 'proximas' ? t(k('emptyDesc')) : ''}
                      crear={
                        puedeEditar && pestana === 'proximas'
                          ? { label: 'Agendar una visita', onClick: () => setCitaOpen(true) }
                          : undefined
                      }
                    />
                  </TableCell>
                </TableRowAnimada>
              ) : (
                eventos.map((e: EventoAgenda) => (
                  <TableRowAnimada
                    key={e.id}
                    onClick={() => setSeleccionado(e)}
                    className="cursor-pointer"
                    data-testid="agenda-fila"
                  >
                    <TableCell className="whitespace-nowrap tabular-nums text-muted-foreground">
                      <span className="block">{formatFecha(e.fecha)}</span>
                      {/* AG-12: la hora sale en la fila. */}
                      {e.hora && <span className="block text-caption" data-testid="agenda-hora">{horaDeLaCasa(e.hora)}</span>}
                    </TableCell>
                    <TableCell className="max-w-[320px]">
                      <div className="min-w-0">
                        <p className="text-foreground font-medium truncate">{e.titulo}</p>
                        <p className="text-caption text-muted-foreground truncate">
                          <span className="inline-flex items-center gap-1.5">
                            <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', TIPO_DOT[e.tipo])} />
                            {t(k(`rowTipo_${e.tipo}`))}
                          </span>
                          {' · '}
                          {/* AG-13: «Tú» sólo a quien creó la tarea. */}
                          {origenDelEvento(e, miUserId, (o) => t(k(`origen_${o}`)))}
                          {e.descripcion && e.tipo !== 'visita' ? ` · ${e.descripcion}` : ''}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <span className="text-muted-foreground truncate block">
                        {e.vinculoLabel ?? t(k('sinVinculo'))}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <span className="block truncate text-muted-foreground">{e.responsableNombre ?? t(k('sinVinculo'))}</span>
                      {e.tipo === 'visita' ? (
                        <span className="block text-caption text-muted-foreground/80" data-testid="agenda-rol-persona">
                          {e.asesorNombre ? `Atiende ${e.asesorNombre}` : 'Sin asesor'}
                        </span>
                      ) : (
                        e.responsableNombre && (
                          <span className="block text-caption text-muted-foreground/80" data-testid="agenda-rol-persona">
                            {rotuloDeLaPersona(e.tipo) ?? t(k('colResponsable'))}
                          </span>
                        )
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
                              // AG-06: sin asesor, confirmar abre el cajón para elegirlo.
                              onClick={(ev) => {
                                ev.stopPropagation();
                                if (e.sinAsesor) {
                                  setSeleccionado(e);
                                  return;
                                }
                                void runCitaAction(visitIdOf(e.id), () => agendaApi.aceptarCita(visitIdOf(e.id)));
                              }}
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
                              onClick={(ev) => { ev.stopPropagation(); setErrorDelMotivo(null); setMotivoDe({ visitId: visitIdOf(e.id), cual: 'rechazar' }); }}
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
                            onClick={(ev) => { ev.stopPropagation(); setErrorDelMotivo(null); setMotivoDe({ visitId: visitIdOf(e.id), cual: 'cancelar' }); }}
                            className="h-auto px-0 text-caption font-medium text-fg-muted"
                          >
                            {t(k('citaCancelar'))}
                          </Button>
                        )}
                        {puedeEditar && e.tipo === 'tarea' && e.estadoRaw === 'PENDIENTE' && (
                          <Button
                            type="button"
                            variant="link"
                            size="sm"
                            disabled={actingId === tareaIdOf(e.id)}
                            onClick={(ev) => { ev.stopPropagation(); void completarTarea(e); }}
                            className="h-auto gap-1 px-0 text-caption font-medium text-success"
                            data-testid="tarea-hecha-fila"
                          >
                            <Check className="h-3.5 w-3.5" weight="bold" />
                            Hecha
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRowAnimada>
                ))
              )}
            </TableBodyAnimado>
          </Table>
          </div>

          {/* Pie: sólo si hay más de una página. */}
          {shouldPaginate && (
            <div className="border-t border-border px-4 py-3">
              <TablePagination
                total={total}
                page={page}
                pageSize={pageSize}
                pageSizeOptions={PAGE_SIZE_OPTIONS}
                onPageChange={setPage}
                onPageSizeChange={cambiarTamano}
              />
            </div>
          )}
          </>
          )}
        </EstadoDeDatos>
      </section>

      <MotivoDialog
        abierto={motivoDe !== null}
        enviando={actingId !== null}
        titulo={motivoDe?.cual === 'rechazar' ? '¿Rechazar esta visita?' : '¿Cancelar esta visita?'}
        descripcion={
          motivoDe?.cual === 'rechazar'
            ? 'La visita no se agenda. Cuéntale a quien la pidió por qué.'
            : 'La visita se cancela. Avísale a quien la tenía agendada.'
        }
        etiquetaConfirmar={motivoDe?.cual === 'rechazar' ? 'Rechazar la visita' : 'Cancelar la visita'}
        ayuda={
          motivoDe?.cual === 'rechazar'
            ? 'Se guarda en la visita como el motivo del rechazo.'
            : 'Se guarda en la visita como el motivo de la cancelación.'
        }
        ejemplo={
          motivoDe?.cual === 'rechazar'
            ? 'Cuenta por qué no se puede hacer esta visita.'
            : 'Cuenta qué pasó y por qué se cancela la visita.'
        }
        error={errorDelMotivo}
        onCerrar={() => {
          setMotivoDe(null);
          setErrorDelMotivo(null);
        }}
        onConfirmar={(motivo) => void confirmarMotivo(motivo)}
      />

      <PedirCitaModal isOpen={citaOpen} onClose={() => setCitaOpen(false)} onCreated={load} />
      <NuevaTareaDrawer
        abierto={tareaOpen}
        onOpenChange={setTareaOpen}
        onCreada={load}
        coordina={canAccess('operaciones', 'edit')}
      />
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
    // Operación o el asesor comercial (`pipeline`, 17-09-2026): a quien no ve
    // contratos el back le sirve sólo visitas y tareas.
    <PageGuard modulos={['operaciones', 'pipeline']}>
      <AgendaContent />
    </PageGuard>
  );
}
