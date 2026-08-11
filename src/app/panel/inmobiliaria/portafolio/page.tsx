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
  CaretLeft,
  CaretRight,
  FileArrowUp,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Button, EmptyState } from '@/components/ui';
import { SegmentedControl } from '@leasefy/cadence';
import { useConsignaciones, usePropietarios, useAgentes } from '@/lib/hooks/useInmobiliaria';
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import type { Consignacion } from '@/lib/types/inmobiliaria';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import { ConsignacionCard } from '@/components/inmobiliaria/ConsignacionCard';
import { ConsignacionTable } from '@/components/inmobiliaria/ConsignacionTable';
import { ConsignacionFilters, ConsignacionFiltersState } from '@/components/inmobiliaria/ConsignacionFilters';
import { PedirCitaModal } from '@/components/inmobiliaria/agenda/PedirCitaModal';

type ViewMode = 'grid' | 'table';

const ITEMS_PER_PAGE = 12;

/**
 * Portafolio Page - Main view for managing all consigned properties
 * Route: /panel/inmobiliaria/portafolio
 */
function PortafolioContent() {
  const { t } = useI18n();
  const router = useRouter();
  // `useApiData` captura el fallo en su estado y NO lo relanza: si sólo tomás
  // los datos, una petición que falló llega como `[]` y la pantalla afirma
  // «Todavía no hay inmuebles». Lo mismo pasaba durante la carga. Son estados
  // distintos y ahora se leen distinto.
  const {
    consignaciones: allConsignaciones,
    isLoading: cargandoConsignaciones,
    error: errorConsignaciones,
    refetch: recargarConsignaciones,
  } = useConsignaciones();
  const { propietarios: allPropietarios } = usePropietarios();
  const { agentes: allAgentes } = useAgentes();
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [currentPage, setCurrentPage] = useState(1);
  const [citaFor, setCitaFor] = useState<Consignacion | null>(null);
  const [filters, setFilters] = useState<ConsignacionFiltersState>({
    search: '',
    availability: 'available',
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

  const agentesMap = useMemo(() => {
    const map: Record<string, { name: string; avatar?: string }> = {};
    allAgentes.forEach((a) => {
      map[a.id] = { name: a.name, avatar: a.avatar };
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

  // Pagination
  const totalPages = Math.ceil(filteredConsignaciones.length / ITEMS_PER_PAGE);
  const paginatedConsignaciones = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return filteredConsignaciones.slice(start, end);
  }, [filteredConsignaciones, currentPage]);

  // Reset page when filters change
  const handleFiltersChange = useCallback((newFilters: ConsignacionFiltersState) => {
    setFilters(newFilters);
    setCurrentPage(1);
  }, []);

  // Handlers
  const handleView = useCallback((consignacion: Consignacion) => {
    router.push(`/panel/inmobiliaria/portafolio/${consignacion.id}`);
  }, [router]);

  const handleEdit = useCallback((consignacion: Consignacion) => {
    // Navigate to detail page where edit actions are available
    router.push(`/panel/inmobiliaria/portafolio/${consignacion.id}`);
  }, [router]);

  const handleNuevaConsignacion = useCallback(() => {
    router.push('/panel/inmobiliaria/portafolio/nuevo');
  }, [router]);

  const handleImportar = useCallback(() => {
    router.push('/panel/inmobiliaria/portafolio/importar');
  }, [router]);

  const handleAgendarCita = useCallback((consignacion: Consignacion) => {
    setCitaFor(consignacion);
  }, []);

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
                  <EmptyState
                    icon={Buildings}
                    title={t('inmobiliaria.portafolio.noProperties')}
                    description={t('inmobiliaria.portafolio.noPropertiesDesc')}
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
                  />
                ) : (
                  <EmptyState
                    icon={Buildings}
                    title={t('inmobiliaria.portafolio.noProperties')}
                    description={t('inmobiliaria.portafolio.noPropertiesDesc')}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
          </EstadoDeDatos>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-border flex items-center justify-center gap-2 bg-muted/10">
            <Button
              variant="outline"
              size="icon"
              hideArrow
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              aria-label="Página anterior"
            >
              <CaretLeft className="w-4 h-4" />
            </Button>

            <div className="flex items-center gap-1 px-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={page === currentPage ? 'default' : 'ghost'}
                  size="icon"
                  hideArrow
                  onClick={() => setCurrentPage(page)}
                  className="w-8 h-8 tabular-nums"
                  aria-label={`Página ${page}`}
                  aria-current={page === currentPage ? 'page' : undefined}
                >
                  {page}
                </Button>
              ))}
            </div>

            <Button
              variant="outline"
              size="icon"
              hideArrow
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              aria-label="Página siguiente"
            >
              <CaretRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </motion.div>

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
