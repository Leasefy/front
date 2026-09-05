'use client';
import { PageGuard } from '@/components/auth/PageGuard';
import { mesEnTitulo } from '@/lib/utils/mes';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  CurrencyCircleDollar,
  GearSix,
  Scales,
  Table,
  SquaresFour,
  Plus,
  CaretLeft,
  CaretRight,
} from '@phosphor-icons/react';
import { useI18n } from '@/lib/i18n';
import { useIsMobile } from '@/hooks/use-mobile';
import { TablePagination } from '@/components/ui/pagination';
import { useTablePagination, PAGE_SIZE_OPTIONS } from '@/lib/hooks/use-table-pagination';
import { Button, Spinner } from '@/components/ui';
import { FalloDeCarga } from '@/components/estado/FalloDeCarga';
import { IconButton, SegmentedControl } from '@leasefy/cadence';
import {
  useCobros,
  useCobroSummary,
  useConsignaciones,
  usePropietarios,
  useInmobiliariaConfig,
  cobrosApi,
} from '@/lib/hooks/useInmobiliaria';
import { agencyApi } from '@/lib/api/inmobiliaria.service';
import type { Cobro, CobroStatus, CobroSummary } from '@/lib/types/inmobiliaria';
import { recibosDeCajaApi } from '@/lib/api/recibos-de-caja.service';
import type {
  CobroConDesglose,
  ConciliacionDePagoAnterior,
  NuevoReciboDeCaja,
} from '@/lib/api/recibos-de-caja.types';
import {
  CobroResumen,
  CobroFilters,
  CobroTable,
  RegistrarPagoModal,
  RecordatorioConfig,
  CobroDetail,
  type CobroFiltersState,
} from '@/components/inmobiliaria';
import { CobroCard } from '@/components/inmobiliaria/CobroCard';
import { type RecordatorioConfigData } from '@/components/inmobiliaria/RecordatorioConfig';
import {
  RUTA_DE_LA_MIGRACION,
  useCopyDeMigracionEnLista,
} from '@/components/migracion/VeredictoDeMigracion';
import { vacioPorMigracion } from '@/components/migracion/muro-reglas';
import { useMigracionConDeuda } from '@/lib/hooks/use-migracion-con-deuda';

// View modes
type ViewMode = 'table' | 'cards';

// Get current month in YYYY-MM format
function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * CobrosPage - Main page for collection management
 * Route: /panel/inmobiliaria/cobros
 */
function CobrosContent() {
  const { t, locale } = useI18n();
  const searchParams = useSearchParams();

  // State for filters
  const [filters, setFilters] = useState<CobroFiltersState>({
    month: getCurrentMonth(),
    status: 'all',
    consignacionId: undefined,
    propietarioId: undefined,
    search: undefined,
  });

  // Fetch cobros from API
  const {
    cobros: apiCobros,
    isLoading: cobrosLoading,
    errorCrudo: cobrosError,
    refetch: refetchCobros,
    setData: setCobrosData,
  } = useCobros({
    month: filters.month,
    status: filters.status === 'all' ? undefined : filters.status,
    propietarioId: filters.propietarioId,
  });

  // Fetch summary from API
  const {
    summary: apiSummary,
    isLoading: summaryLoading,
    refetch: refetchSummary,
  } = useCobroSummary(filters.month);

  // Fetch consignaciones for filters
  const { consignaciones, isLoading: consignacionesLoading } = useConsignaciones();

  // Fetch propietarios for filters
  const { propietarios, isLoading: propietariosLoading } = usePropietarios();

  // Fetch config for reminder defaults
  const { config: inmobiliariaConfig, isLoading: configLoading } = useInmobiliariaConfig();

  // State for view mode.
  // `null` = no explicit user choice → default from viewport (cards under md).
  // useIsMobile is false on SSR + first client render and only flips after
  // mount, so the server and client first paint agree ('table') and the
  // mobile default applies post-hydration without a mismatch.
  const isMobile = useIsMobile();
  const [viewModeOverride, setViewModeOverride] = useState<ViewMode | null>(null);
  const viewMode: ViewMode = viewModeOverride ?? (isMobile ? 'cards' : 'table');
  const setViewMode = setViewModeOverride;

  // State for modals
  const [selectedCobro, setSelectedCobro] = useState<Cobro | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [paymentCobro, setPaymentCobro] = useState<Cobro | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  // State for reminder config (initialized from API config)
  const [reminderConfig, setReminderConfig] = useState<RecordatorioConfigData>({
    daysBefore: inmobiliariaConfig?.agency?.reminderDaysBefore ?? [5],
    daysAfter: inmobiliariaConfig?.agency?.reminderDaysAfter ?? [3],
    channels: ['email', 'whatsapp'],
  });

  // Update reminder config when API config loads
  useEffect(() => {
    if (inmobiliariaConfig?.agency) {
      setReminderConfig((prev) => ({
        ...prev,
        daysBefore: inmobiliariaConfig.agency.reminderDaysBefore ?? prev.daysBefore,
        daysAfter: inmobiliariaConfig.agency.reminderDaysAfter ?? prev.daysAfter,
      }));
    }
  }, [inmobiliariaConfig]);

  // Read status from URL query params
  useEffect(() => {
    const statusParam = searchParams.get('status');
    if (statusParam && ['pending', 'paid', 'partial', 'late', 'defaulted'].includes(statusParam)) {
      setFilters((prev) => ({ ...prev, status: statusParam as CobroStatus }));
    }
  }, [searchParams]);

  // Filter cobros based on current filters (client-side filtering for consignacion and search)
  const filteredCobros = useMemo(() => {
    let result = apiCobros || [];

    // Filter by consignacion (property) - client-side only
    if (filters.consignacionId) {
      result = result.filter((c) => c.consignacionId === filters.consignacionId);
    }

    // Filter by search (tenant name, property title, property address) - client-side only
    if (filters.search) {
      const query = filters.search.toLowerCase();
      result = result.filter(
        (c) =>
          c.tenantName.toLowerCase().includes(query) ||
          c.propertyTitle.toLowerCase().includes(query) ||
          c.propertyAddress.toLowerCase().includes(query)
      );
    }

    return result;
  }, [apiCobros, filters.consignacionId, filters.search]);

  // Paginación — el pie canónico del panel (`useTablePagination` +
  // `TablePagination`, el mismo de Solicitudes e Inmuebles). Antes era un
  // slice a mano de 6 por página con el paginador de ventana: no dejaba
  // elegir cuántas filas ver ni decía cuántas había en total.
  // `resetKey` lleva todo lo que cambia el conjunto de filas: el mes y el
  // estado los resuelve el backend, la consignación y la búsqueda acá.
  const {
    pageItems: paginatedCobros,
    total,
    page,
    pageSize,
    setPage,
    setPageSize,
    shouldPaginate,
  } = useTablePagination(filteredCobros, {
    resetKey: `${filters.month}|${filters.status}|${filters.consignacionId ?? ''}|${filters.search}`,
  });

  /*
   * ¿La tabla está vacía por la migración a medias? Sin inmueble no hay
   * consignación y sin consignación no hay cobro: 89 contratos migrados
   * dejan esta pantalla en cero sin que nada lo explique. Sólo cuando NO hay
   * filtros puestos — con un filtro, el vacío es del filtro.
   */
  const deudaDeMigracion = useMigracionConDeuda();
  const armarCopyDeMigracion = useCopyDeMigracionEnLista();
  const sinFiltrosPropios =
    filters.status === 'all' && !filters.consignacionId && !filters.search;
  const copyDeMigracion =
    sinFiltrosPropios && deudaDeMigracion && vacioPorMigracion(deudaDeMigracion)
      ? armarCopyDeMigracion(deudaDeMigracion)
      : null;

  // Use summary from API (fallback to default if loading)
  const summary: CobroSummary = useMemo(() => {
    if (apiSummary) return apiSummary;

    // Fallback summary while loading
    return {
      month: filters.month,
      totalExpected: 0,
      totalCollected: 0,
      totalPending: 0,
      totalLate: 0,
      collectionRate: 0,
      cobrosPaid: 0,
      cobrosPending: 0,
      cobrosLate: 0,
    };
  }, [apiSummary, filters.month]);

  // Count cobros by status for tabs (from API data)
  const cobroCountByStatus = useMemo(() => {
    const monthCobros = apiCobros || [];
    return {
      all: monthCobros.length,
      pending: monthCobros.filter((c) => c.status === 'pending').length,
      paid: monthCobros.filter((c) => c.status === 'paid').length,
      partial: monthCobros.filter((c) => c.status === 'partial').length,
      late: monthCobros.filter((c) => c.status === 'late').length,
      defaulted: monthCobros.filter((c) => c.status === 'defaulted').length,
    };
  }, [apiCobros]);

  // Handle cobro click - open detail modal
  const handleCobroClick = useCallback((cobro: Cobro) => {
    setSelectedCobro(cobro);
    setIsDetailOpen(true);
  }, []);

  // Handle register payment click - open payment modal
  const handleRegisterPaymentClick = useCallback((cobro: Cobro) => {
    setPaymentCobro(cobro);
    setIsPaymentModalOpen(true);
  }, []);

  /**
   * Pone en la tabla el cobro que devolvió el back.
   *
   * 🔴 Antes esto se calculaba a mano (`paidAmount + monto`, y si daba <= 0
   * entonces «pagado»). Esa cuenta se equivocaba con cualquier cosa que el back
   * recomponga y nosotros no sepamos: mora que dejó de correr, un descuento,
   * un recibo anulado. El endpoint de recibo de caja devuelve el cobro YA
   * recompuesto justamente para no tener que adivinarlo.
   */
  const aplicarCobro = useCallback(
    (actualizado: Cobro) => {
      setCobrosData((prev) => {
        if (!prev) return prev;
        return prev.map((c) => (c.id === actualizado.id ? { ...c, ...actualizado } : c));
      });
      refetchSummary();
    },
    [setCobrosData, refetchSummary],
  );

  /**
   * Emitir el recibo de caja.
   *
   * 🔴 RELANZA el error a propósito: el 400 del sobrepago trae el máximo
   * abonable y el 409 dice que hay plata vieja sin conciliar. Los dos se
   * resuelven DENTRO del formulario; tragarlos acá con un `console.error`
   * —como estaba— dejaba al usuario apretando un botón que no hacía nada.
   */
  const emitirRecibo = useCallback(
    async (datos: NuevoReciboDeCaja) => {
      const res = await recibosDeCajaApi.crear(datos);
      aplicarCobro(res.cobro);
      return res;
    },
    [aplicarCobro],
  );

  /** Cuadrar la plata que el cobro ya registraba sin recibo (cartera vieja y PSE). */
  const conciliarPagoAnterior = useCallback(
    async (cobroId: string, datos: ConciliacionDePagoAnterior) => {
      const res = await recibosDeCajaApi.conciliar(cobroId, datos);
      aplicarCobro(res.cobro);
      return res;
    },
    [aplicarCobro],
  );

  /** Anular un recibo devuelve plata al saldo: la fila tiene que enterarse. */
  const handleCobroActualizado = useCallback(
    (actualizado: CobroConDesglose) => aplicarCobro(actualizado),
    [aplicarCobro],
  );

  // Handle send reminder
  const handleSendReminder = useCallback(
    async (cobro: Cobro) => {
      try {
        // Call API to send reminder
        await cobrosApi.sendReminder(cobro.id);

        // Optimistically update local state
        setCobrosData((prev) => {
          if (!prev) return prev;
          return prev.map((c) =>
            c.id === cobro.id
              ? {
                  ...c,
                  remindersSent: c.remindersSent + 1,
                  lastReminderDate: new Date().toISOString().split('T')[0],
                  updatedAt: new Date().toISOString(),
                }
              : c
          );
        });
      } catch (error) {
        console.error('Error sending reminder:', error);
        // In a production app, show error toast here
      }
    },
    [setCobrosData]
  );

  // Handle filter change
  // La vuelta a la página 1 la hace `useTablePagination` por `resetKey`, no acá.
  const handleFilterChange = useCallback((newFilters: CobroFiltersState) => {
    setFilters(newFilters);
  }, []);

  /**
   * Guardar los recordatorios — de verdad.
   *
   * Esto era `setReminderConfig(config)` a secas mientras el cajón anunciaba
   * «Configuración guardada»: ningún request. Los días viven en
   * `agency.reminderDaysBefore/After` y se recargan al volver a entrar, así que
   * lo editado se perdía y el back seguía mandando con lo viejo.
   *
   * Los CANALES no se mandan: el back no tiene dónde guardarlos
   * (`UpdateAgencyDto` sólo acepta los dos arreglos de días). Mandarlos sería
   * un 400 por `forbidNonWhitelisted`; el cajón lo dice en pantalla.
   */
  const handleConfigSave = useCallback(async (config: RecordatorioConfigData) => {
    await agencyApi.updateAgency({
      reminderDaysBefore: config.daysBefore,
      reminderDaysAfter: config.daysAfter,
    });
    setReminderConfig(config);
  }, []);

  // Handle detail modal close
  const handleDetailClose = useCallback(() => {
    setIsDetailOpen(false);
    setTimeout(() => setSelectedCobro(null), 300);
  }, []);

  // Handle payment modal close
  const handlePaymentModalClose = useCallback(() => {
    setIsPaymentModalOpen(false);
    setTimeout(() => setPaymentCobro(null), 300);
  }, []);

  // Handle view pending filter
  const handleViewPending = useCallback(() => {
    setFilters((prev) => ({ ...prev, status: 'pending' }));
  }, []);

  // Handle view late filter
  const handleViewLate = useCallback(() => {
    setFilters((prev) => ({ ...prev, status: 'late' }));
  }, []);


  // Step the selected month backward/forward (handles year rollover).
  const shiftMonth = useCallback((delta: number) => {
    setFilters((prev) => {
      const [y, m] = prev.month.split('-').map(Number);
      const d = new Date(y, m - 1 + delta, 1);
      return {
        ...prev,
        month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      };
    });
  }, []);

  // Format month for display. Build the Date in LOCAL time (Y, M-1, 1) — parsing
  // `'YYYY-MM-01'` as a string is treated as UTC and shifts to the previous month
  // in negative-offset timezones (e.g. Colombia UTC-5 rendered July as "junio").
  const [monthDisplayYear, monthDisplayMonth] = filters.month.split('-').map(Number);
  const monthDisplay = mesEnTitulo(
    `${monthDisplayYear}-${String(monthDisplayMonth).padStart(2, '0')}`,
    locale === 'en' ? 'en' : 'es',
  );

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-h2 text-fg">{t('inmobiliaria.cobros.title')}</h1>
          <p className="text-sm text-fg-muted max-w-2xl line-clamp-2">
            {t('inmobiliaria.cobros.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* El engranaje va PRIMERO y sin texto: es la acción que menos se
              usa y la que menos tiene que pesar (Nico, 2026-09-03). El
              extracto bancario ya no se enlaza desde acá — vive en
              Conciliación, que es otra sección. */}
          <IconButton
            variant="outline"
            icon={<GearSix className="w-4 h-4" />}
            aria-label="Configuración de cobros"
            title="Configuración de cobros"
            data-testid="configuracion-de-cobros"
            onClick={() => setIsConfigOpen(true)}
          />
          <Button asChild variant="secondary" hideArrow>
            <Link href="/panel/inmobiliaria/cobros/reglas-de-mora">
              <Scales className="w-4 h-4" />
              <span className="hidden sm:inline">Reglas de mora</span>
            </Link>
          </Button>
          <Button
            hideArrow
            onClick={() => {
              setPaymentCobro(null);
              setIsPaymentModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4" />
            {t('recibos.hacer')}
          </Button>
        </div>
      </div>

      {/* Summary Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <CobroResumen
          summary={summary}
          onViewPending={handleViewPending}
          onViewLate={handleViewLate}
        />
      </motion.div>

      {/* Unified Data Card - View Toggle + Filters + Content + Pagination */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-lg border border-border bg-card"
      >
        {/* View Toggle Header - FIRST (Primary hierarchy) */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-muted/20">
          <SegmentedControl
            aria-label={t('inmobiliaria.cobros.viewTable')}
            value={viewMode}
            onChange={(v) => setViewMode(v as ViewMode)}
            options={[
              {
                value: 'table',
                label: (
                  <span className="flex items-center gap-2">
                    <Table className="w-4 h-4" />
                    {t('inmobiliaria.cobros.viewTable')}
                  </span>
                ),
                ariaLabel: t('inmobiliaria.cobros.viewTable'),
              },
              {
                value: 'cards',
                label: (
                  <span className="flex items-center gap-2">
                    <SquaresFour className="w-4 h-4" />
                    {t('inmobiliaria.cobros.viewCards')}
                  </span>
                ),
                ariaLabel: t('inmobiliaria.cobros.viewCards'),
              },
            ]}
          />
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                aria-label="Mes anterior"
                className="p-1 rounded-md text-fg-muted hover:text-fg hover:bg-muted transition-colors"
              >
                <CaretLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-fg text-center tabular-nums min-w-[7rem]">
                {monthDisplay}
              </span>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                aria-label="Mes siguiente"
                className="p-1 rounded-md text-fg-muted hover:text-fg hover:bg-muted transition-colors"
              >
                <CaretRight className="w-4 h-4" />
              </button>
            </div>
            <span className="text-xs text-fg-muted tabular-nums">
              {filteredCobros.length} {t('inmobiliaria.nav.cobros').toLowerCase()}
            </span>
          </div>
        </div>

        {/* Filters Section - SECOND (Search + collapsible filters) */}
        <CobroFilters
          consignaciones={consignaciones}
          propietarios={propietarios}
          filters={filters}
          onFilterChange={handleFilterChange}
          cobroCountByStatus={cobroCountByStatus}
        />

        {/* Content */}
        <div>
          {cobrosLoading ? (
            <div className="p-12 text-center">
              <Spinner size="lg" className="mb-4" />
              <p className="text-sm text-fg-muted">Cargando cobros...</p>
            </div>
          ) : cobrosError ? (
            /* Mostraba `description={cobrosError}`: el mensaje crudo del
               backend, en inglés, dentro de la tarjeta de la tabla. */
            <FalloDeCarga
              error={cobrosError}
              queEs="los cobros"
              onReintentar={() => refetchCobros()}
              enmarcado={false}
            />
          ) : paginatedCobros.length > 0 ? (
            viewMode === 'table' ? (
              <CobroTable
                cobros={paginatedCobros}
                onCobroClick={handleCobroClick}
                onRegisterPayment={handleRegisterPaymentClick}
                showSummary
              />
            ) : (
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedCobros.map((cobro) => (
                  <CobroCard
                    key={cobro.id}
                    cobro={cobro}
                    onClick={handleCobroClick}
                    onRegisterPayment={handleRegisterPaymentClick}
                  />
                ))}
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800/60">
                <CurrencyCircleDollar
                  weight="duotone"
                  className="h-6 w-6 text-fg-muted"
                  aria-hidden="true"
                />
              </div>
              {/*
                Un cobro sale de la consignación del inmueble. Si la migración
                dejó contratos sin inmueble o sin propietario, esta tabla está
                vacía POR ESO — decir «todavía no generaste cobros» es cierto y
                a la vez inútil: esconde la causa. Una línea, con el botón.
              */}
              <div className="space-y-1.5">
                <p className="text-base font-semibold text-fg">
                  {copyDeMigracion?.titulo ?? t('inmobiliaria.cobros.noPayments')}
                </p>
                <p className="mx-auto max-w-sm text-sm leading-relaxed text-fg-muted">
                  {copyDeMigracion?.detalle ?? t('inmobiliaria.cobros.noPaymentsDesc')}
                </p>
              </div>
              {copyDeMigracion && (
                <Button asChild hideArrow>
                  <Link href={RUTA_DE_LA_MIGRACION}>{copyDeMigracion.accion}</Link>
                </Button>
              )}
              {filters.status !== 'all' && (
                <Button
                  variant="link"
                  onClick={() => setFilters((prev) => ({ ...prev, status: 'all' }))}
                >
                  {t('inmobiliaria.cobros.filters.all')}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Pie de tabla del design system: «X cobros · Filas por página · n/m».
            Se monta con una sola fila también — decirle a alguien que tiene 3
            cobros cuántos hay y dejarlo elegir el tamaño es parte de que la
            tabla se lea como tabla. */}
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
      </motion.div>

      {/* Cobro Detail Modal */}
      <CobroDetail
        isOpen={isDetailOpen}
        onClose={handleDetailClose}
        cobro={selectedCobro}
        onRegisterPayment={handleRegisterPaymentClick}
        onSendReminder={handleSendReminder}
        onCobroActualizado={handleCobroActualizado}
      />

      {/* Recibo de caja */}
      <RegistrarPagoModal
        isOpen={isPaymentModalOpen}
        onClose={handlePaymentModalClose}
        cobro={paymentCobro}
        consignaciones={consignaciones}
        mesActual={getCurrentMonth()}
        onCobrosGenerados={() => {
          refetchCobros();
          refetchSummary();
        }}
        onSubmit={emitirRecibo}
        onConciliar={conciliarPagoAnterior}
      />

      {/* Reminder Configuration Sheet */}
      <RecordatorioConfig
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        config={reminderConfig}
        onSave={handleConfigSave}
      />
    </div>
  );
}

export default function CobrosPage() {
  return (
    <PageGuard module="cobros">
      <CobrosContent />
    </PageGuard>
  );
}
