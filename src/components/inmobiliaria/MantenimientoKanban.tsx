'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  KeyboardSensor,
  PointerSensor,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import {
  Wrench,
  Lightning,
  Snowflake,
  HouseLine,
  PaintBrush,
  Key,
  DotsThreeCircle,
  DotsSixVertical,
  Warning,
  Clock,
  CheckCircle,
  XCircle,
  CurrencyCircleDollar,
  Check,
  ListBullets,
  CalendarBlank,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { SinDatos } from '@/components/estado/SinDatos';
import type {
  SolicitudMantenimiento,
  MantenimientoType,
  MantenimientoPriority,
  MantenimientoStatus,
} from '@/lib/types/inmobiliaria';
import { formatCurrency, getMantenimientoTypeInfo } from '@/lib/types/inmobiliaria';
import { detectarColumnaDelPuntero } from './mantenimiento-kanban-colisiones';

// ============================================================================
// Types
// ============================================================================

interface MantenimientoKanbanProps {
  data: SolicitudMantenimiento[];
  onViewDetails?: (solicitud: SolicitudMantenimiento) => void;
  /**
   * Crear la primera. M6 de la auditoría del 13-09: con el tablero vacío se
   * veían cinco columnas en cero y ninguna salida — la lista hermana sí
   * ofrecía «Nueva solicitud» desde su `SinDatos`, el tablero no.
   */
  onCrear?: () => void;
  /** ¿Hay filtros puestos? Filtrado a cero no es «todavía no tienes». */
  hayFiltros?: boolean;
  onLimpiarFiltros?: () => void;
  /**
   * Mover la solicitud a la columna donde se soltó.
   *
   * Devuelve una promesa que se RESUELVE cuando el back confirmó y se RECHAZA
   * cuando no: el tablero espera esa promesa antes de decir nada (mismo
   * contrato que `PipelineBoard.onStageChange`). Sin `onStatusChange` las
   * tarjetas no se arrastran — un tablero que deja arrastrar y no guarda es
   * peor que uno que no deja.
   */
  onStatusChange?: (
    solicitudId: string,
    nuevoEstado: MantenimientoStatus,
  ) => void | Promise<void>;
}

// ============================================================================
// Constants
// ============================================================================

const PRIORITY_COLORS: Record<MantenimientoPriority, string> = {
  emergency: 'border-l-[#C0392B]',
  high: 'border-l-[#B7791F]',
  medium: 'border-l-[#1A40FF]',
  low: 'border-l-[#6B6B6B]',
};

const PRIORITY_LABEL_KEYS: Record<MantenimientoPriority, string> = {
  emergency: 'inmobiliaria.mantenimiento.priorityEmergency',
  high: 'inmobiliaria.mantenimiento.priorityHigh',
  medium: 'inmobiliaria.mantenimiento.priorityMedium',
  low: 'inmobiliaria.mantenimiento.priorityLow',
};

const TYPE_ICONS: Record<MantenimientoType, React.ElementType> = {
  plumbing: Wrench,
  electrical: Lightning,
  appliance: Snowflake,
  structural: HouseLine,
  painting: PaintBrush,
  locks: Key,
  other: DotsThreeCircle,
};

interface KanbanColumn {
  id: MantenimientoStatus;
  titleKey: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

const KANBAN_COLUMNS: KanbanColumn[] = [
  {
    id: 'reported',
    titleKey: 'inmobiliaria.mantenimiento.colReported',
    icon: ListBullets,
    color: 'text-fg-muted dark:text-fg-muted',
    bgColor: 'bg-surface-muted dark:bg-surface-muted',
  },
  {
    id: 'quoted',
    titleKey: 'inmobiliaria.mantenimiento.colQuoted',
    icon: CurrencyCircleDollar,
    color: 'text-primary',
    bgColor: 'bg-primary-soft',
  },
  {
    id: 'approved',
    titleKey: 'inmobiliaria.mantenimiento.colApproved',
    icon: Check,
    color: 'text-success',
    bgColor: 'bg-success-soft',
  },
  {
    id: 'in_progress',
    titleKey: 'inmobiliaria.mantenimiento.colInProgress',
    icon: Clock,
    color: 'text-warning',
    bgColor: 'bg-warning-soft',
  },
  {
    id: 'completed',
    titleKey: 'inmobiliaria.mantenimiento.colCompleted',
    icon: CheckCircle,
    color: 'text-success',
    bgColor: 'bg-success-soft',
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

function getDaysSinceCreated(createdAt: string): number {
  const created = new Date(createdAt);
  const now = new Date();
  const diffTime = now.getTime() - created.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// ============================================================================
// Kanban Card Component
// ============================================================================

interface KanbanCardProps {
  solicitud: SolicitudMantenimiento;
  onClick?: () => void;
  arrastrable?: boolean;
  arrastrando?: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
}

function KanbanCard({ solicitud, onClick, arrastrable, arrastrando, t }: KanbanCardProps) {
  const typeInfo = getMantenimientoTypeInfo(solicitud.type);
  const TypeIcon = TYPE_ICONS[solicitud.type];
  const daysSince = getDaysSinceCreated(solicitud.createdAt);

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              // El arrastre por teclado de dnd-kit ya usa Espacio para levantar
              // y soltar la tarjeta, así que abrir el detalle queda en Enter.
              if (e.key === 'Enter') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      data-testid={`mantenimiento-tarjeta-${solicitud.id}`}
      className={cn(
        'w-full text-left p-3 rounded-md border-l-4 bg-surface',
        'border border-border dark:border-border-strong',
        'hover:border-border dark:hover:border-border-strong',
        'transition-all group',
        onClick && 'cursor-pointer',
        arrastrable && 'cursor-grab active:cursor-grabbing',
        arrastrando && 'shadow-md',
        PRIORITY_COLORS[solicitud.priority]
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-2 mb-2">
        <div
          className={cn(
            'w-7 h-7 rounded-sm flex items-center justify-center flex-shrink-0',
            solicitud.priority === 'emergency'
              ? 'bg-danger-soft'
              : 'bg-primary-soft'
          )}
        >
          <TypeIcon
            className={cn(
              'w-4 h-4',
              solicitud.priority === 'emergency'
                ? 'text-danger'
                : 'text-primary'
            )}
          />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-medium text-fg dark:text-white line-clamp-2 group-hover:text-primary dark:group-hover:text-primary transition-colors">
            {solicitud.title}
          </h4>
          <p className="text-xs text-fg-muted dark:text-fg-subtle mt-0.5">
            {typeInfo?.labelEs}
          </p>
        </div>
        {/* La manija hace visible que la tarjeta se arrastra. No es el único
            punto de agarre —toda la tarjeta lo es— pero sin una señal nadie lo
            intenta: es exactamente lo que pasaba antes, cuando además no se
            podía. */}
        {arrastrable && (
          <DotsSixVertical
            className="w-4 h-4 flex-shrink-0 text-fg-subtle opacity-0 group-hover:opacity-100 transition-opacity"
            aria-hidden="true"
          />
        )}
      </div>

      {/* Property */}
      <div className="text-xs text-fg-muted dark:text-fg-subtle mb-2 line-clamp-1">
        <HouseLine className="w-3 h-3 inline mr-1" />
        {solicitud.propertyTitle}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-fg-subtle">
          <span className="flex items-center gap-1">
            <CalendarBlank className="w-3 h-3" />
            {daysSince}d
          </span>
          {solicitud.quotes.length > 0 && (
            <span className="flex items-center gap-1">
              <CurrencyCircleDollar className="w-3 h-3" />
              {solicitud.quotes.length}
            </span>
          )}
        </div>

        {/* Priority Badge for emergency/high */}
        {(solicitud.priority === 'emergency' || solicitud.priority === 'high') && (
          <span
            className={cn(
              'px-1.5 py-0.5 rounded text-xs font-medium',
              solicitud.priority === 'emergency'
                ? 'bg-danger-soft text-danger'
                : 'bg-warning-soft text-warning'
            )}
          >
            {solicitud.priority === 'emergency' && <Warning className="w-3 h-3 inline mr-0.5" weight="fill" />}
            {t(PRIORITY_LABEL_KEYS[solicitud.priority])}
          </span>
        )}

        {/* Approved Amount */}
        {solicitud.approvedAmount && (
          <span className="font-medium text-success">
            {formatCurrency(solicitud.approvedAmount)}
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Draggable Card Wrapper
// ============================================================================

/**
 * La envoltura arrastrable, con el MISMO patrón que `PipelineBoard`: los
 * `listeners` de dnd-kit van en un `div` que envuelve la tarjeta, no en la
 * tarjeta misma, y el sensor arranca recién a los 8 px de movimiento — así el
 * clic que abre el detalle sigue funcionando.
 */
function TarjetaArrastrable({
  solicitud,
  onClick,
  t,
}: {
  solicitud: SolicitudMantenimiento;
  onClick?: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: solicitud.id,
    data: { solicitud },
  });

  const style = transform
    ? { transform: CSS.Translate.toString(transform), zIndex: isDragging ? 999 : undefined }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn('transition-opacity duration-200', isDragging && 'opacity-40')}
      {...attributes}
      {...listeners}
    >
      <KanbanCard
        solicitud={solicitud}
        onClick={onClick}
        arrastrable
        arrastrando={isDragging}
        t={t}
      />
    </div>
  );
}

// ============================================================================
// Kanban Column Component
// ============================================================================

interface KanbanColumnProps {
  column: KanbanColumn;
  items: SolicitudMantenimiento[];
  onViewDetails?: (solicitud: SolicitudMantenimiento) => void;
  /** Con esto en `false` el tablero es sólo de lectura: nada se arrastra. */
  arrastrable: boolean;
  encima: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
}

function KanbanColumnComponent({
  column,
  items,
  onViewDetails,
  arrastrable,
  encima,
  t,
}: KanbanColumnProps) {
  const Icon = column.icon;
  const { setNodeRef } = useDroppable({ id: column.id, data: { estado: column.id } });

  return (
    <div className="flex flex-col min-w-[280px] max-w-[320px] flex-1" data-testid={`columna-${column.id}`}>
      {/* Column Header */}
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2.5 rounded-t-xl border border-b-0',
          'border-border dark:border-border-strong',
          column.bgColor
        )}
      >
        <Icon className={cn('w-4 h-4', column.color)} />
        <span className={cn('font-semibold text-sm', column.color)}>{t(column.titleKey)}</span>
        <span
          className={cn(
            'ml-auto px-2 py-0.5 rounded-full text-xs font-medium',
            'bg-surface-muted',
            column.color
          )}
        >
          {items.length}
        </span>
      </div>

      {/* Column Content */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 p-2 space-y-2 rounded-b-xl border overflow-y-auto transition-all duration-200',
          'bg-surface-muted',
          'min-h-[200px] max-h-[calc(100vh-400px)]',
          encima
            ? 'border-dashed border-primary/30 ring-2 ring-primary/20'
            : 'border-border dark:border-border-strong'
        )}
      >
        {/* Sin `AnimatePresence mode="popLayout"` alrededor de las tarjetas:
            ese modo mide a cada hijo con un `ref`, y una tarjeta arrastrable es
            un componente de función que no reenvía refs — React lo avisa en
            consola en cada render. `PipelineBoard`, que hace exactamente esto
            desde hace meses, tampoco lo usa. */}
        {items.length > 0 ? (
          items.map((item) =>
            arrastrable ? (
              <TarjetaArrastrable
                key={item.id}
                solicitud={item}
                onClick={() => onViewDetails?.(item)}
                t={t}
              />
            ) : (
              <KanbanCard
                key={item.id}
                solicitud={item}
                onClick={() => onViewDetails?.(item)}
                t={t}
              />
            )
          )
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={cn(
              'flex flex-col items-center justify-center h-full py-8 text-fg-subtle',
              encima && 'rounded-md border-2 border-dashed border-primary/30 bg-primary-soft/50'
            )}
          >
            <Icon className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-xs">{t('inmobiliaria.mantenimiento.noRequests')}</p>
            {arrastrable && (
              <p className="text-[10px] mt-1 opacity-70">{t('inmobiliaria.pipeline.dragHere')}</p>
            )}
          </motion.div>
        )}

        {/* Zona de soltar al final, cuando la columna ya tiene tarjetas */}
        {items.length > 0 && encima && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="flex items-center justify-center py-4 rounded-md border-2 border-dashed border-primary/30 bg-primary-soft/50"
          >
            <p className="text-xs text-primary">{t('inmobiliaria.pipeline.dropHere')}</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Main MantenimientoKanban Component
// ============================================================================

/**
 * El tablero de mantenimientos, con las tarjetas arrastrables entre columnas.
 *
 * 🔴 POR QUÉ CAMBIÓ: hasta el 2026-09-12 cada tarjeta era un `<motion.button>`
 * suelto con un `onClick` y nada más — ni `useDraggable`, ni `useDroppable`, ni
 * `DndContext`. No es que el arrastre estuviera mal cableado: **no existía**
 * (Nico: «no deja arrastrar un mantenimiento creado de un estado a otro. No
 * tiene la posibilidad de arrastrarlos»). El tablero de Prospectos ya lo hacía
 * con `@dnd-kit` desde hace meses (`PipelineBoard.tsx`), así que esto sigue ese
 * mismo patrón en vez de estrenar uno.
 *
 * Quién decide si el salto es legal es el BACK (`MantenimientoStateMachine`).
 * Acá no se replica esa tabla: duplicarla es cómo se llega a una tarjeta que la
 * pantalla deja mover y el servidor rechaza, o peor, a una que la pantalla
 * frena por una regla que el servidor ya no tiene. La página muestra el motivo
 * que vuelve del 400.
 *
 * 🔴 2026-09-13: la tarjeta se arrastra a CUALQUIERA de las cinco columnas,
 * hacia adelante y hacia atrás. La primera versión hacía las dos cosas mal a la
 * vez —el back exigía el camino en orden y `closestCorners` elegía la columna
 * equivocada—, así que Nico soltó su tarjeta al lado de «Reportadas» y leyó
 * «No se puede mover la solicitud de Reportada a Aprobada». Las dos mitades
 * están arregladas: la tabla del back ya no ordena el camino, y el destino lo
 * decide el puntero (`mantenimiento-kanban-colisiones.ts`).
 */
export function MantenimientoKanban({
  data,
  onViewDetails,
  onStatusChange,
  onCrear,
  hayFiltros = false,
  onLimpiarFiltros,
}: MantenimientoKanbanProps) {
  const { t } = useI18n();
  const [arrastrandoId, setArrastrandoId] = useState<string | null>(null);
  const [columnaEncima, setColumnaEncima] = useState<string | null>(null);

  const arrastrable = Boolean(onStatusChange);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // 8 px antes de levantar la tarjeta: por debajo de eso sigue siendo un
      // clic, y el clic abre el detalle.
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor)
  );

  // Group data by status
  const groupedData = useMemo(() => {
    const groups: Record<MantenimientoStatus, SolicitudMantenimiento[]> = {
      reported: [],
      quoted: [],
      approved: [],
      in_progress: [],
      completed: [],
      cancelled: [],
    };

    // Sort by priority within each group (emergency first)
    const priorityOrder: MantenimientoPriority[] = ['emergency', 'high', 'medium', 'low'];

    data.forEach((item) => {
      if (item.status in groups) {
        groups[item.status].push(item);
      }
    });

    // Sort each group by priority
    Object.keys(groups).forEach((status) => {
      groups[status as MantenimientoStatus].sort((a, b) => {
        return priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority);
      });
    });

    return groups;
  }, [data]);

  const solicitudArrastrada = useMemo(
    () => (arrastrandoId ? data.find((m) => m.id === arrastrandoId) ?? null : null),
    [arrastrandoId, data]
  );

  const alEmpezar = useCallback((event: DragStartEvent) => {
    setArrastrandoId(event.active.id as string);
  }, []);

  const alPasarPorEncima = useCallback((event: DragOverEvent) => {
    setColumnaEncima((event.over?.id as string | undefined) ?? null);
  }, []);

  /**
   * Soltar la tarjeta en otra columna.
   *
   * El aviso —el verde y el rojo— lo da la página, que es quien llama al back y
   * tiene el motivo real del rechazo. Acá sólo se limpia el estado del arrastre
   * y se deja que el error suba: festejar antes de que el back confirme es cómo
   * se llega a un cartel verde sobre una tarjeta que vuelve sola a su columna.
   */
  const alSoltar = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      setArrastrandoId(null);
      setColumnaEncima(null);

      if (!over || !onStatusChange) return;

      const solicitudId = active.id as string;
      const destino = over.id as MantenimientoStatus;

      const solicitud = data.find((m) => m.id === solicitudId);
      if (!solicitud || solicitud.status === destino) return;

      try {
        await onStatusChange(solicitudId, destino);
      } catch {
        // Ya lo dijo quien intentó guardarlo, con el motivo que vino del back.
      }
    },
    [data, onStatusChange]
  );

  // Tablero vacío: cinco columnas en cero no dicen nada y no ofrecen nada.
  // Mismo `SinDatos` que la vista de lista, con las mismas dos salidas.
  if (data.length === 0) {
    return (
      <SinDatos
        queSon="solicitudes de mantenimiento"
        icono={Wrench}
        hayFiltros={hayFiltros}
        {...(onLimpiarFiltros ? { onLimpiarFiltros } : {})}
        {...(onCrear ? { crear: { label: 'Nueva solicitud', onClick: onCrear } } : {})}
      />
    );
  }

  const tablero = (
    <>
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4">
        {KANBAN_COLUMNS.map((column) => (
          <KanbanColumnComponent
            key={column.id}
            column={column}
            items={groupedData[column.id]}
            onViewDetails={onViewDetails}
            arrastrable={arrastrable}
            encima={columnaEncima === column.id}
            t={t}
          />
        ))}
      </div>

      {/* Cancelled items notice */}
      {groupedData.cancelled.length > 0 && (
        <div className="mt-4 p-3 rounded-md bg-danger-soft border border-danger/30">
          <div className="flex items-center gap-2 text-sm text-danger">
            <XCircle className="w-4 h-4" />
            <span>
              {t('inmobiliaria.mantenimiento.cancelledNotice', { count: groupedData.cancelled.length })}
            </span>
          </div>
        </div>
      )}
    </>
  );

  if (!arrastrable) {
    return <div className="w-full">{tablero}</div>;
  }

  return (
    <DndContext
      sensors={sensors}
      // El destino lo decide el PUNTERO, no el rectángulo corrido de la
      // tarjeta: ver `mantenimiento-kanban-colisiones.ts`.
      collisionDetection={detectarColumnaDelPuntero}
      onDragStart={alEmpezar}
      onDragOver={alPasarPorEncima}
      onDragEnd={alSoltar}
    >
      <div className="w-full">{tablero}</div>

      {/* La tarjeta que viaja con el puntero */}
      <DragOverlay dropAnimation={null}>
        {solicitudArrastrada && (
          <div className="rotate-2 scale-105 w-[280px]">
            <KanbanCard solicitud={solicitudArrastrada} arrastrando t={t} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

export default MantenimientoKanban;
