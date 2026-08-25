'use client';
import { PageGuard } from '@/components/auth/PageGuard';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Buildings,
  SquaresFour,
  List,
  Plus,
  CheckCircle,
  HouseSimple,
  Timer,
  Wrench,
  FileArrowUp,
  Sparkle,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Button, EmptyState } from '@/components/ui';
import { TablePagination } from '@/components/ui/pagination';
import {
  useTablePagination,
  PAGE_SIZE_OPTIONS,
  DEFAULT_PAGE_SIZE,
} from '@/lib/hooks/use-table-pagination';
import { SegmentedControl } from '@leasefy/cadence';
import { useConsignaciones, usePropietarios, useAgentes } from '@/lib/hooks/useInmobiliaria';
import { consignacionesApi } from '@/lib/api/inmobiliaria.service';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { SinDatos } from '@/components/estado/SinDatos';
import type { Consignacion } from '@/lib/types/inmobiliaria';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import { ConsignacionCard } from '@/components/inmobiliaria/ConsignacionCard';
import { ConsignacionTable } from '@/components/inmobiliaria/ConsignacionTable';
import { ConsignacionFilters, ConsignacionFiltersState } from '@/components/inmobiliaria/ConsignacionFilters';
import { PedirCitaModal } from '@/components/inmobiliaria/agenda/PedirCitaModal';

type ViewMode = 'grid' | 'table';


/**
 * Portafolio Page - Main view for managing all consigned properties
 * Route: /panel/inmobiliaria/inmuebles
 */
function PortafolioContent() {
  const { t } = useI18n();
  const router = useRouter();
  // `useApiData` captura el fallo en su estado y NO lo relanza: si sólo tomás
  // los datos, una petición que falló llega como `[]` y la pantalla afirma
  // «Todavía no hay inmuebles». Lo mismo pasaba durante la carga. Son estados
  // distintos y ahora se leen distinto.
  // `errorCrudo`, no `error`: el segundo es sólo el mensaje, y sin el status
  // `FalloDeCarga` no puede distinguir un 404 —donde reintentar es mentir— de
  // un 401 por token recién renovado. Con el string todo caía en «fue un
  // problema nuestro».
  const {
    consignaciones: allConsignaciones,
    isLoading: cargandoConsignaciones,
    errorCrudo: errorConsignaciones,
    refetch: recargarConsignaciones,
  } = useConsignaciones();
  const { propietarios: allPropietarios } = usePropietarios();
  const { agentes: allAgentes } = useAgentes();
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [citaFor, setCitaFor] = useState<Consignacion | null>(null);
  // ⚠️ 'all', no 'available'.
  //
  // Esta lista abría filtrada por «disponibles» y la de al lado —«Inmuebles ·
  // catálogo»— no. Medido antes de unificarlas: 6 filas contra 10, con los
  // mismos 10 inmuebles detrás. La diferencia entera era este valor, y era la
  // razón principal por la que las dos pantallas parecían listar cosas
  // distintas. Una sección que se llama «Inmuebles» muestra los inmuebles.
  const [filters, setFilters] = useState<ConsignacionFiltersState>({
    search: '',
    availability: 'all',
    agenteId: 'all',
    propietarioId: 'all',
    city: 'all',
    propertyType: 'all',
  });

  // Create lookup maps for propietarios and agentes
  const propietariosMap = useMemo(() => {
    const map: Record<string, string> = {};
    allPropietarios.forEach((p) => {
      map[p.id] = p.name;
    });
    return map;
  }, [allPropietarios]);

  /**
   * Se llavea por `userId`, no sólo por `id`.
   *
   * `Agente.id` es un `AgencyMember.id`, y `consignacion.agenteId` sale de
   * `agenteUserId`, que es un `User.id`. Nunca se cruzaban: la columna AGENTE
   * mostraba «—» en TODAS las filas, tuvieran agente asignado o no — y «—» se
   * lee igual que «no tiene». Se deja el `id` como llave también, por si alguna
   * respuesta del back todavía no trae `userId`.
   */
  const agentesMap = useMemo(() => {
    const map: Record<string, { name: string; avatar?: string }> = {};
    allAgentes.forEach((a) => {
      const info = { name: a.name, avatar: a.avatar };
      if (a.userId) map[a.userId] = info;
      map[a.id] = info;
    });
    return map;
  }, [allAgentes]);

  // Filter consignaciones
  const filteredConsignaciones = useMemo(() => {
    // Normalize backend values to lowercase to match frontend enum definitions
    const normalize = (val: string) => val?.toLowerCase() ?? '';

    let result = [...allConsignaciones];

    // Search filter
    if (filters.search) {
      const query = filters.search.toLowerCase();
      result = result.filter(
        (c) =>
          c.propertyTitle.toLowerCase().includes(query) ||
          c.propertyAddress.toLowerCase().includes(query)
      );
    }

    // Availability filter
    if (filters.availability !== 'all') {
      result = result.filter((c) => normalize(c.availability) === filters.availability);
    }

    // Agente filter
    if (filters.agenteId !== 'all') {
      result = result.filter((c) => c.agenteId === filters.agenteId);
    }

    // Propietario filter
    if (filters.propietarioId !== 'all') {
      result = result.filter((c) => c.propietarioId === filters.propietarioId);
    }

    // City filter
    if (filters.city !== 'all') {
      result = result.filter((c) => normalize(c.propertyCity) === normalize(filters.city));
    }

    // Property type filter
    if (filters.propertyType !== 'all') {
      result = result.filter((c) => normalize(c.propertyType) === normalize(filters.propertyType));
    }

    return result;
  }, [filters, allConsignaciones]);

  /**
   * ¿Hay algún filtro puesto? Es lo ÚNICO que distingue «todavía no tenés
   * inmuebles» de «ninguno coincide con lo que buscaste». Decirle lo primero a
   * quien tiene 200 y filtró mal es afirmar algo falso y dejarlo sin salida.
   */
  //
  // ⚠️ Y un filtro sólo EXPLICA el vacío si había algo que filtrar: sin este
  // `&& hay alguno` una inmobiliaria recién creada —cero inmuebles— vería
  // «quitá los filtros» en vez de «creá el primero».
  const hayFiltrosPuestos =
    Boolean(filters.search) ||
    filters.availability !== 'all' ||
    filters.agenteId !== 'all' ||
    filters.propietarioId !== 'all' ||
    filters.city !== 'all' ||
    filters.propertyType !== 'all';

  const elVacioEsPorLosFiltros = hayFiltrosPuestos && allConsignaciones.length > 0;

  const limpiarFiltros = useCallback(() => {
    setFilters({
      search: '',
      availability: 'all',
      agenteId: 'all',
      propietarioId: 'all',
      city: 'all',
      propertyType: 'all',
    });
    // La vuelta a la página 1 la hace el `resetKey` del paginador.
  }, []);

  // Calculate stats from filtered data
  const stats = useMemo(() => {
    const total = filteredConsignaciones.length;
    const available = filteredConsignaciones.filter((c) => c.availability === 'available').length;
    const rented = filteredConsignaciones.filter((c) => c.availability === 'rented').length;
    const inProcess = filteredConsignaciones.filter((c) => c.availability === 'in_process').length;
    const maintenance = filteredConsignaciones.filter((c) => c.availability === 'maintenance').length;
    const totalMonthlyRent = filteredConsignaciones.reduce((sum, c) => sum + c.monthlyRent, 0);

    return { total, available, rented, inProcess, maintenance, totalMonthlyRent };
  }, [filteredConsignaciones]);

  // Paginación — el pie canónico del panel (`useTablePagination` +
  // `TablePagination`). Antes era un prev/next hecho a mano de 12 por página:
  // sin conteo de filas y sin selector de tamaño, y sólo aparecía a partir del
  // inmueble 13, así que en una cartera chica la tabla se veía sin paginar.
  // El `resetKey` lleva los filtros: cambiar uno vuelve a la página 1 en vez de
  // dejar la tabla vacía sobre un resultado que sí tiene filas.
  const {
    pageItems: paginatedConsignaciones,
    total: totalPaginado,
    page: currentPage,
    pageSize,
    setPage: setCurrentPage,
    setPageSize,
    shouldPaginate,
  } = useTablePagination(filteredConsignaciones, {
    // El 12 de antes no está entre las opciones del selector, así que el pie
    // decía «Filas 10» mientras mostraba 12: el tamaño por defecto tiene que
    // ser uno de los que el usuario puede elegir.
    initialPageSize: DEFAULT_PAGE_SIZE,
    resetKey: JSON.stringify(filters),
  });

  const handleFiltersChange = useCallback((newFilters: ConsignacionFiltersState) => {
    setFilters(newFilters);
  }, []);

  // Handlers
  const handleView = useCallback((consignacion: Consignacion) => {
    router.push(`/panel/inmobiliaria/inmuebles/${consignacion.id}`);
  }, [router]);

  const handleEdit = useCallback((consignacion: Consignacion) => {
    // Navigate to detail page where edit actions are available
    router.push(`/panel/inmobiliaria/inmuebles/${consignacion.id}`);
  }, [router]);

  const handleNuevaConsignacion = useCallback(() => {
    router.push('/panel/inmobiliaria/inmuebles/nuevo');
  }, [router]);

  const handleImportar = useCallback(() => {
    router.push('/panel/inmobiliaria/inmuebles/importar');
  }, [router]);

  const handleAgendarCita = useCallback((consignacion: Consignacion) => {
    setCitaFor(consignacion);
  }, []);

  // ── Lo que traía «Inmuebles · catálogo» ─────────────────────────────────
  // Al fusionar las dos listas estas tres acciones tenían que venirse con
  // ella; si no, unificar habría sido perder funciones.

  const handleCaptura = useCallback(() => {
    router.push('/panel/inmobiliaria/inmuebles/captura');
  }, [router]);

  const handleCandidatos = useCallback((consignacion: Consignacion) => {
    router.push(`/panel/inmobiliaria/inmuebles/${consignacion.id}/candidatos`);
  }, [router]);

  // El aviso PÚBLICO — otra pestaña, para no perder la lista de atrás. Va con
  // el id del inmueble porque es la ficha del marketplace, no el mandato.
  const handleVerAviso = useCallback((consignacion: Consignacion) => {
    if (!consignacion.propertyId) return;
    window.open(`/propiedades/${consignacion.propertyId}`, '_blank', 'noopener,noreferrer');
  }, []);

  const [porEliminar, setPorEliminar] = useState<Consignacion | null>(null);
  const [eliminando, setEliminando] = useState(false);
  /**
   * El motivo del rechazo se muestra DENTRO del diálogo, no en un toast.
   *
   * Dos razones. La primera es de producto: el motivo del back —«tiene cobros,
   * actas o renovaciones»— es la respuesta a lo que la persona acaba de
   * preguntar, y su lugar es al lado del botón que apretó, no en una esquina
   * que se va sola a los cuatro segundos.
   *
   * La segunda la encontré probándolo: **los toasts de este panel no se
   * pintan**. El DELETE devolvía 409, la fila sobrevivía —correcto— y en
   * pantalla no pasaba absolutamente nada. Medido: el `<section>` de sonner
   * está montado y vacío, así que `toast()` escribe en un sitio que nadie
   * muestra. Es anterior a este cambio y está anotado aparte; acá el arreglo
   * no puede depender de eso.
   */
  const [motivoDelRechazo, setMotivoDelRechazo] = useState<string | null>(null);

  const abrirEliminar = useCallback((c: Consignacion) => {
    setMotivoDelRechazo(null);
    setPorEliminar(c);
  }, []);

  const confirmarEliminar = useCallback(async () => {
    if (!porEliminar || eliminando) return;
    setEliminando(true);
    setMotivoDelRechazo(null);
    try {
      await consignacionesApi.delete(porEliminar.id);
      // La lista se refresca sola: el cliente HTTP avisa que cambió
      // `consignaciones` y este hook lo escucha.
      setPorEliminar(null);
    } catch (err) {
      // El back responde 409 con el motivo. Ese texto explica QUÉ lo retiene,
      // así que se muestra tal cual en vez de un «no se pudo» genérico.
      setMotivoDelRechazo(
        err instanceof Error && err.message
          ? err.message
          : 'No pudimos retirarlo. Probá de nuevo en un momento.',
      );
    } finally {
      setEliminando(false);
    }
  }, [porEliminar, eliminando]);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">
            {t('inmobiliaria.portafolio.title')}
          </h1>
          <p className="text-sm text-fg-muted max-w-2xl">
            {t('inmobiliaria.portafolio.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Captura con IA — venía de «Inmuebles · catálogo». */}
          <Button variant="secondary" hideArrow onClick={handleCaptura}>
            <Sparkle className="w-4 h-4 text-primary" weight="fill" />
            {t('inmobiliaria.inmuebles.acciones.captura')}
          </Button>
          {/* Import (secundaria) */}
          <Button variant="secondary" hideArrow onClick={handleImportar}>
            <FileArrowUp className="w-4 h-4" />
            {t('inmobiliaria.import.title')}
          </Button>
          {/* Nueva consignación (principal) */}
          <Button hideArrow onClick={handleNuevaConsignacion}>
            <Plus className="w-4 h-4" />
            {t('inmobiliaria.portafolio.addProperty')}
          </Button>
        </div>
      </div>

      {/* Stats Row — KPIs parejos con tints semánticos por token.
          Escalón intermedio a propósito: saltar de 2 a 5 columnas en `sm` deja
          cada card en ~134px en un portátil de 1024 (icono de 40px + padding no
          dejan aire para "Total propiedades"). Las 5 columnas entran recién en
          `xl`, donde cada card pasa de ~230px. */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
        <StatTile
          icon={<Buildings className="w-5 h-5" weight="duotone" />}
          value={stats.total}
          label={t('inmobiliaria.portafolio.summary.totalProperties')}
          tone="neutral"
        />
        <StatTile
          icon={<CheckCircle className="w-5 h-5" weight="duotone" />}
          value={stats.available}
          label={t('inmobiliaria.portafolio.summary.available')}
          tone="ok"
        />
        <StatTile
          icon={<HouseSimple className="w-5 h-5" weight="duotone" />}
          value={stats.rented}
          label={t('inmobiliaria.portafolio.summary.rented')}
          tone="info"
        />
        <StatTile
          icon={<Timer className="w-5 h-5" weight="duotone" />}
          value={stats.inProcess}
          label={t('inmobiliaria.portafolio.stats.inProcess')}
          tone="warn"
        />
        <StatTile
          icon={<Wrench className="w-5 h-5" weight="duotone" />}
          value={stats.maintenance}
          label={t('inmobiliaria.portafolio.stats.maintenance')}
          tone="bad"
          className="hidden sm:flex"
        />
      </div>

      {/* Unified Data Card - View Toggle + Filters + Content + Pagination */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-xl border border-border bg-card overflow-hidden"
      >
        {/* View Toggle Header - First */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-muted/20">
          <SegmentedControl<ViewMode>
            aria-label={t('inmobiliaria.portafolio.views.table')}
            value={viewMode}
            onChange={setViewMode}
            options={[
              {
                value: 'table',
                label: (
                  <span className="flex items-center gap-2">
                    <List className="w-4 h-4" />
                    {t('inmobiliaria.portafolio.views.table')}
                  </span>
                ),
                ariaLabel: t('inmobiliaria.portafolio.views.table'),
              },
              {
                value: 'grid',
                label: (
                  <span className="flex items-center gap-2">
                    <SquaresFour className="w-4 h-4" />
                    {t('inmobiliaria.portafolio.views.cards')}
                  </span>
                ),
                ariaLabel: t('inmobiliaria.portafolio.views.cards'),
              },
            ]}
          />
          <span className="text-sm text-fg-muted tabular-nums">
            {t('inmobiliaria.portafolio.stats.propertyCount', { count: filteredConsignaciones.length })}
          </span>
        </div>

        {/* Filters - Second */}
        <ConsignacionFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          consignaciones={allConsignaciones}
          propietarios={allPropietarios}
          agentes={allAgentes}
        />

        {/* Content */}
        <div>
          {/* El vacío de acá abajo es «los filtros no encontraron nada», que NO
              es lo mismo que «todavía no cargó» ni «falló». Esos dos los
              resuelve EstadoDeDatos antes de llegar. */}
          <EstadoDeDatos
            cargando={cargandoConsignaciones}
            error={errorConsignaciones}
            queEs="los inmuebles"
            onReintentar={recargarConsignaciones}
          >
          <AnimatePresence mode="wait">
            {viewMode === 'grid' ? (
              <motion.div
                key="grid"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {paginatedConsignaciones.length > 0 ? (
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {paginatedConsignaciones.map((consignacion) => (
                      <ConsignacionCard
                        key={consignacion.id}
                        consignacion={consignacion}
                        propietarioName={propietariosMap[consignacion.propietarioId]}
                        agenteName={agentesMap[consignacion.agenteId]?.name}
                        agenteAvatar={agentesMap[consignacion.agenteId]?.avatar}
                        onClick={() => handleView(consignacion)}
                        onView={() => handleView(consignacion)}
                        onEdit={() => handleEdit(consignacion)}
                        onAgendarCita={() => handleAgendarCita(consignacion)}
                      />
                    ))}
                  </div>
                ) : (
                  <SinDatos
                    hayFiltros={elVacioEsPorLosFiltros}
                    queSon="inmuebles"
                    icono={Buildings}
                    titulo={t('inmobiliaria.portafolio.noProperties')}
                    descripcion={t('inmobiliaria.portafolio.noPropertiesDesc')}
                    crear={{ label: 'Nueva consignación', href: '/panel/inmobiliaria/inmuebles/nuevo' }}
                    onLimpiarFiltros={limpiarFiltros}
                  />
                )}
              </motion.div>
            ) : (
              <motion.div
                key="table"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                {paginatedConsignaciones.length > 0 ? (
                  <ConsignacionTable
                    consignaciones={paginatedConsignaciones}
                    propietariosMap={propietariosMap}
                    agentesMap={agentesMap}
                    onView={handleView}
                    onEdit={handleEdit}
                    onAgendarCita={handleAgendarCita}
                    onCandidatos={handleCandidatos}
                    onVerAviso={handleVerAviso}
                    onEliminar={abrirEliminar}
                  />
                ) : (
                  <SinDatos
                    hayFiltros={elVacioEsPorLosFiltros}
                    queSon="inmuebles"
                    icono={Buildings}
                    titulo={t('inmobiliaria.portafolio.noProperties')}
                    descripcion={t('inmobiliaria.portafolio.noPropertiesDesc')}
                    crear={{ label: 'Nueva consignación', href: '/panel/inmobiliaria/inmuebles/nuevo' }}
                    onLimpiarFiltros={limpiarFiltros}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
          </EstadoDeDatos>
        </div>

        {/* Pie de tabla — el paginador del design system. */}
        {shouldPaginate && (
          <TablePagination
            className="border-t border-border px-4 py-3"
            total={totalPaginado}
            page={currentPage}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        )}
      </motion.div>

      <AlertDialog open={Boolean(porEliminar)} onOpenChange={(abierto) => !abierto && setPorEliminar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Retirar este inmueble de tu portafolio?</AlertDialogTitle>
            {/* Se dice qué se termina y qué NO se toca. «Eliminar» a secas deja
                a quien lo lee sin saber si borra también el aviso, el
                propietario o la plata. */}
            <AlertDialogDescription>
              Termina la consignación de «{porEliminar?.propertyTitle}»: deja de aparecer
              en tu portafolio y de generarte cobros. El inmueble sigue siendo del
              propietario. Si ya tiene historia en la agencia —cobros, actas o
              renovaciones— no se puede retirar, y te lo vamos a decir.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {motivoDelRechazo && (
            <p
              role="alert"
              className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger"
            >
              {motivoDelRechazo}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              tone="danger"
              // `preventDefault` para que Radix NO cierre el diálogo al apretar:
              // si el back lo rechaza, cerrarlo se lleva el motivo con él.
              onClick={(e) => {
                e.preventDefault();
                void confirmarEliminar();
              }}
              disabled={eliminando}
            >
              {eliminando ? 'Retirando…' : 'Retirar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PedirCitaModal
        isOpen={!!citaFor}
        onClose={() => setCitaFor(null)}
        onCreated={() => {}}
        presetPropertyId={citaFor?.propertyId}
        presetPropertyTitle={citaFor?.propertyTitle}
      />
    </div>
  );
}

// KPI tile — número, label e ícono parejos; tint semántico por token.
const TILE_TONES = {
  neutral: 'bg-surface-muted text-fg-muted',
  ok: 'bg-success-soft text-success',
  info: 'bg-primary-soft text-primary',
  warn: 'bg-warning-soft text-warning',
  bad: 'bg-danger-soft text-danger',
} as const;

function StatTile({
  icon,
  value,
  label,
  tone,
  className,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  tone: keyof typeof TILE_TONES;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-3 p-4 rounded-xl border border-border bg-card', className)}>
      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', TILE_TONES[tone])}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-semibold text-fg tabular-nums leading-none">{value}</p>
        <p className="text-xs text-fg-muted mt-1 truncate">{label}</p>
      </div>
    </div>
  );
}

export default function PortafolioPage() {
  return (
    <PageGuard module="portafolio">
      <PortafolioContent />
    </PageGuard>
  );
}
