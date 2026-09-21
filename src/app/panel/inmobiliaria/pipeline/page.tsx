'use client';
import { PageGuard } from '@/components/auth/PageGuard';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Funnel,
  Users,
  CalendarCheck,
  CheckCircle,
  ChartLineUp,
  Plus,
} from '@phosphor-icons/react';
import { toast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { PermissionGate } from '@/components/auth/PermissionGate';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import {
  usePipelineItems,
  useAgentes,
  useConsignaciones,
  pipelineApi,
} from '@/lib/hooks/useInmobiliaria';
import type { PipelineItem, PipelineStage } from '@/lib/types/inmobiliaria';
import {
  PipelineBoard,
  PipelineFilters,
  PipelineDetail,
  type PipelineFiltersState,
} from '@/components/inmobiliaria';
import { KpiCard } from '@leasefy/cadence';
import { usePermissions } from '@/lib/hooks/usePermissions';
import { EstadoDeDatos } from '@/components/estado/EstadoDeDatos';
import { SinDatos } from '@/components/estado/SinDatos';
import { KpiValor } from '@/components/estado/KpiValor';
import { NuevoLeadDialog } from '@/components/inmobiliaria/NuevoLeadDialog';
import { tasaMedida, textoDeTasa } from '@/lib/tasas';

/**
 * Pipeline Page - Kanban board for managing the rental pipeline
 * Route: /panel/inmobiliaria/pipeline
 */
function PipelineContent() {
  const { t } = useI18n();

  // Fetch data from API
  // `errorCrudo` es el error entero (status incluido): sin él, un 500/403/red
  // se veía como seis columnas «Arrastra aquí» y KPIs en 0.
  const { pipelineItems, isLoading, errorCrudo, refetch } = usePipelineItems();
  const { canAccess } = usePermissions();
  // El back exige `pipeline:edit` para mover y `pipeline:create` para crear
  // (`pipeline.controller.ts`): lo que responde 403 no se ofrece.
  const puedeMover = canAccess('pipeline', 'edit');
  const puedeCrear = canAccess('pipeline', 'create');
  const { agentes } = useAgentes();
  const { consignaciones } = useConsignaciones();

  // State for pipeline items (local copy for optimistic updates)
  const [items, setItems] = useState<PipelineItem[]>([]);

  // State for selected item (detail modal)
  const [selectedItem, setSelectedItem] = useState<PipelineItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // State for filters
  const [filters, setFilters] = useState<PipelineFiltersState>({
    agenteId: undefined,
    consignacionId: undefined,
    dateFrom: undefined,
    dateTo: undefined,
    search: undefined,
  });

  /*
   * La copia local (para el arrastre optimista) sigue SIEMPRE a la del back.
   * Antes sólo se copiaba `if (length > 0)`: al borrar el último lead el back
   * devolvía `[]` y la tarjeta quedaba de fantasma. Un refresco que falla no
   * vacía nada: `useApiData` conserva el último `data` bueno.
   */
  useEffect(() => {
    setItems(pipelineItems);
  }, [pipelineItems]);

  /*
   * ¿Ya se mostró el tablero una vez? Después de mover un lead se hace
   * `refetch()`, que vuelve a poner `isLoading`: sin esto el tablero entero
   * parpadeaba a spinner tras cada arrastre, y un refresco caído lo borraba.
   */
  const [yaSeMostro, setYaSeMostro] = useState(false);
  useEffect(() => {
    if (!isLoading && !errorCrudo) setYaSeMostro(true);
  }, [isLoading, errorCrudo]);
  const cargandoPorPrimeraVez = isLoading && !yaSeMostro;
  const falloSinDatos = yaSeMostro ? null : errorCrudo;

  const [creandoLead, setCreandoLead] = useState(false);

  // Calculate stats from all items
  const stats = useMemo(() => {
    const total = items.length;
    const inProcess = items.filter(
      (i) => !['completed', 'lost'].includes(i.stage)
    ).length;
    const completedThisMonth = items.filter((i) => {
      if (i.stage !== 'completed') return false;
      // Cuándo ENTRÓ a «Cerrado», no la última edición: `updatedAt` cambia con
      // cualquier nota, y un cierre de agosto con una nota de hoy contaba
      // como cerrado este mes.
      const date = new Date(i.enteredStageAt);
      const now = new Date();
      return (
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()
      );
    }).length;

    /*
     * Conversión = cerrados / (cerrados + perdidos). Sin un solo caso
     * resuelto la cuenta no existe: `null`, no 0. Un tablero recién abierto
     * mostraba «0%» de conversión, que se lee como «perdiste todo» cuando en
     * realidad todavía no cerró ni se cayó nada.
     */
    const completed = items.filter((i) => i.stage === 'completed').length;
    const lost = items.filter((i) => i.stage === 'lost').length;
    const conversionRate = tasaMedida(completed, completed + lost);

    return { total, inProcess, completedThisMonth, conversionRate };
  }, [items]);

  // Filter items based on current filters
  const filteredItems = useMemo(() => {
    let result = [...items];

    // Filter by agente
    if (filters.agenteId) {
      result = result.filter((i) => i.agenteId === filters.agenteId);
    }

    // Filter by consignacion (property)
    if (filters.consignacionId) {
      result = result.filter((i) => i.consignacionId === filters.consignacionId);
    }

    // Filter by date range (createdAt)
    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom);
      result = result.filter((i) => new Date(i.createdAt) >= from);
    }
    if (filters.dateTo) {
      const to = new Date(filters.dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter((i) => new Date(i.createdAt) <= to);
    }

    // Filter by search (candidate name, email, property title)
    if (filters.search) {
      const query = filters.search.toLowerCase();
      result = result.filter(
        (i) =>
          i.candidateName.toLowerCase().includes(query) ||
          i.candidateEmail.toLowerCase().includes(query) ||
          i.propertyTitle.toLowerCase().includes(query)
      );
    }

    return result;
  }, [items, filters]);

  // Handle card click - open detail modal
  const handleCardClick = useCallback((item: PipelineItem) => {
    setSelectedItem(item);
    setIsDetailOpen(true);
  }, []);

  /**
   * Mover un lead de etapa — y decir la verdad sobre si se movió.
   *
   * 🔴 Antes: la tarjeta se pintaba en la etapa nueva, el tablero cantaba
   * «Etapa actualizada» sin esperar a nadie, y si el PUT fallaba el único
   * rastro era un `console.error` + un `refetch()`. La tarjeta volvía sola a
   * su columna varios segundos después, sin una palabra: quien la arrastró se
   * quedaba creyendo que el lead había avanzado.
   *
   * Ahora: se guarda la foto de la tarjeta ANTES de tocarla, se espera al
   * back, y si falla se restaura esa foto en el acto (no se delega en el
   * refetch, que además puede traer datos viejos de una caché). El error se
   * dice UNA vez, acá, porque el mensaje es el mismo lo hayan disparado el
   * arrastre o el cajón; y se relanza para que quien llamó no festeje.
   */
  const handleStageChange = useCallback(async (
    itemId: string,
    newStage: PipelineStage,
    lostReason?: string,
  ) => {
    // La foto de antes: es lo que se restaura si el back dice que no.
    let anterior: PipelineItem | undefined;
    setItems((prev) => {
      anterior = prev.find((i) => i.id === itemId);
      return prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              stage: newStage,
              ...(lostReason ? { lostReason } : {}),
              enteredStageAt: new Date().toISOString(),
              daysInStage: 0,
              updatedAt: new Date().toISOString(),
            }
          : item
      );
    });

    // Also update selected item if it's the one being changed
    setSelectedItem((prev) =>
      prev?.id === itemId
        ? {
            ...prev,
            stage: newStage,
            ...(lostReason ? { lostReason } : {}),
            enteredStageAt: new Date().toISOString(),
            daysInStage: 0,
            updatedAt: new Date().toISOString(),
          }
        : prev
    );

    try {
      await pipelineApi.moveStage(itemId, newStage, lostReason);
      refetch();
    } catch (error) {
      // Deshacer en el acto, con la foto guardada.
      if (anterior) {
        const previa = anterior;
        setItems((prev) => prev.map((item) => (item.id === itemId ? previa : item)));
        setSelectedItem((prev) => (prev?.id === itemId ? previa : prev));
      }
      toast.error('No se pudo mover el lead', {
        description:
          error instanceof Error
            ? error.message
            : 'La tarjeta volvió a su etapa anterior. Prueba de nuevo.',
      });
      // Relanzar: el tablero y el cajón NO deben cantar éxito.
      throw error;
    }
  }, [refetch]);

  // Handle filter change
  const handleFilterChange = useCallback((newFilters: PipelineFiltersState) => {
    setFilters(newFilters);
  }, []);

  // Handle detail modal close
  const handleDetailClose = useCallback(() => {
    setIsDetailOpen(false);
    // Delay clearing selected item for smooth animation
    setTimeout(() => setSelectedItem(null), 300);
  }, []);

  /*
   * Los dos vacíos (`SinDatos`): «nunca entró un lead» invita a cargar uno;
   * «ningún lead coincide» ofrece quitar los filtros. Antes los dos eran seis
   * columnas «Arrastra aquí» sin salida.
   */
  const hayFiltros = Boolean(
    filters.agenteId ||
      filters.consignacionId ||
      filters.dateFrom ||
      filters.dateTo ||
      filters.search,
  );
  const limpiarFiltros = useCallback(() => {
    setFilters({
      agenteId: undefined,
      consignacionId: undefined,
      dateFrom: undefined,
      dateTo: undefined,
      search: undefined,
    });
  }, []);

  /*
   * El número de cada tile con los cuatro estados adentro: mientras carga, un
   * hueco; si la carga falló, «—» con «No se pudo traer». Antes, con el back
   * caído, los tiles afirmaban «0 leads · 0 en proceso».
   *
   * `KpiCard` tipa `value` como string pero lo pinta como hijo
   * (`children: value` en @leasefy/cadence): el nodo se ve igual que el texto.
   */
  const valorDeTile = (valor: string) =>
    (
      <KpiValor cargando={cargandoPorPrimeraVez} fallo={falloSinDatos}>
        {valor}
      </KpiValor>
    ) as unknown as string;

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-h2 text-fg">
          {t('inmobiliaria.pipeline.title')}
        </h1>
        <p className="text-sm text-muted-foreground max-w-2xl line-clamp-2">
          {t('inmobiliaria.pipeline.subtitle')}
        </p>
      </div>

      {/* Stats Row */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
      >
        <KpiCard
          label={t('inmobiliaria.pipeline.stats.totalLeads')}
          value={valorDeTile(String(stats.total))}
          icon={<Users />}
        />
        <KpiCard
          label={t('inmobiliaria.pipeline.stats.inProcess')}
          value={valorDeTile(String(stats.inProcess))}
          icon={<Funnel />}
        />
        <KpiCard
          label={t('inmobiliaria.pipeline.stats.closedThisMonth')}
          value={valorDeTile(String(stats.completedThisMonth))}
          icon={<CheckCircle />}
        />
        <KpiCard
          label={t('inmobiliaria.pipeline.stats.conversionRate')}
          value={valorDeTile(textoDeTasa(stats.conversionRate, 0))}
          icon={<ChartLineUp />}
        />
      </motion.div>

      {/* Unified Data Card - Filters + Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="rounded-lg border border-border bg-card overflow-hidden"
      >
        {/* Header with count */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3 bg-muted/20">
          <span className="text-sm font-medium text-foreground">
            {t('inmobiliaria.pipeline.board.title')}
          </span>
          <div className="flex items-center gap-3">
            {/* «0 de 0 leads» mientras no se sabe también es un cero inventado. */}
            {yaSeMostro && (
              <span className="text-sm text-muted-foreground tabular-nums">
                {t('inmobiliaria.pipeline.board.count', { filtered: filteredItems.length, total: items.length })}
              </span>
            )}
            <PermissionGate module="pipeline" action="create" fallback={null}>
              <Button
                size="sm"
                hideArrow
                onClick={() => setCreandoLead(true)}
                data-testid="pipeline-nuevo-lead"
              >
                <Plus className="w-4 h-4" />
                Nuevo lead
              </Button>
            </PermissionGate>
          </div>
        </div>

        {/* Filters */}
        <PipelineFilters
          agentes={agentes}
          consignaciones={consignaciones}
          filters={filters}
          onFilterChange={handleFilterChange}
        />

        {/* Pipeline Board — con los cuatro estados */}
        <EstadoDeDatos
          principal
          cargando={cargandoPorPrimeraVez}
          error={errorCrudo}
          conservarContenido={yaSeMostro}
          vacio={filteredItems.length === 0}
          queEs="el pipeline"
          onReintentar={refetch}
          cuandoVacio={
            <SinDatos
              hayFiltros={hayFiltros}
              queSon="leads"
              icono={Funnel}
              titulo="Todavía no hay leads en el pipeline"
              descripcion="Entran solos cuando alguien pide una visita o se postula a uno de tus inmuebles. El que te llega por teléfono lo puedes cargar a mano."
              crear={
                puedeCrear
                  ? { label: 'Nuevo lead', onClick: () => setCreandoLead(true) }
                  : undefined
              }
              onLimpiarFiltros={limpiarFiltros}
            />
          }
        >
          <div className="p-4">
            <PipelineBoard
              items={filteredItems}
              onItemClick={handleCardClick}
              onStageChange={handleStageChange}
              puedeMover={puedeMover}
            />
          </div>
        </EstadoDeDatos>
      </motion.div>

      {/* Detail Modal */}
      <PipelineDetail
        isOpen={isDetailOpen}
        onClose={handleDetailClose}
        item={selectedItem}
        onStageChange={handleStageChange}
        puedeEditar={puedeMover}
      />

      {puedeCrear && (
        <NuevoLeadDialog
          abierto={creandoLead}
          consignaciones={consignaciones}
          onCerrar={() => setCreandoLead(false)}
          onCreado={() => {
            setCreandoLead(false);
            void refetch();
          }}
        />
      )}
    </div>
  );
}

export default function PipelinePage() {
  return (
    <PageGuard module="pipeline">
      <PipelineContent />
    </PageGuard>
  );
}
