'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { toast } from '@/components/ui/toast';
import {
  CaretDown,
  CaretUp,
  DotsSixVertical,
  ArrowsOutSimple,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui';
import { Collapse, CrossFade, IconButton, Presence } from '@leasefy/cadence';
import { Sheet, SheetBody, SheetContent, SheetHeader } from '@/components/ui/sheet';
import { useI18n } from '@/lib/i18n';
import type { PipelineItem, PipelineStage } from '@/lib/types/inmobiliaria';
import { PIPELINE_STAGES, getPipelineStageInfo } from '@/lib/types/inmobiliaria';
import { PipelineCard, NombresDeAgentesContext } from './PipelineCard';
import {
  MotivoDialog,
  mensajeDelRechazoDelMotivo,
} from '@/components/inmobiliaria/agenda/MotivoDialog';
import {
  AYUDA_DEL_MOTIVO_DE_PERDIDA,
  EJEMPLO_DEL_MOTIVO_DE_PERDIDA,
  MAX_LARGO_MOTIVO_DE_PERDIDA,
  revisarMotivoDePerdida,
} from '@/lib/pipeline/limites-del-pipeline';

// ============================================================================
// Types
// ============================================================================

interface PipelineBoardProps {
  items: PipelineItem[];
  /** El equipo, para poner nombre al agente de cada tarjeta. */
  agentes?: ReadonlyArray<{ id: string; userId?: string; name: string }>;
  onItemClick: (item: PipelineItem) => void;
  /**
   * Devuelve una promesa que se RESUELVE cuando el back confirmó, y se
   * RECHAZA cuando no. El tablero espera esa promesa antes de decir nada:
   * ver `handleDragEnd`.
   */
  onStageChange: (
    itemId: string,
    newStage: PipelineStage,
    lostReason?: string,
  ) => void | Promise<void>;
  /**
   * ¿Puede arrastrar? Mover es `pipeline:edit` en el back. Sin el permiso las
   * tarjetas se abren pero no se arrastran. Por defecto `true`; la página pasa
   * el permiso real.
   */
  puedeMover?: boolean;
}

/** Cerrado y Perdido no se mueven: el back responde 409 LEAD_TERMINADO. */
function esTerminal(stage: PipelineStage): boolean {
  return stage === 'completed' || stage === 'lost';
}

// ============================================================================
// Draggable Card Wrapper
// ============================================================================

interface DraggableCardProps {
  item: PipelineItem;
  onClick: (item: PipelineItem) => void;
  /** Por qué no se puede arrastrar; `undefined` = se puede. */
  motivoBloqueo?: string;
}

function DraggableCard({ item, onClick, motivoBloqueo }: DraggableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: item.id,
    data: { item },
    disabled: Boolean(motivoBloqueo),
  });

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
        zIndex: isDragging ? 999 : undefined,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'transition-opacity duration-base',
        isDragging && 'opacity-40'
      )}
      title={motivoBloqueo}
      data-arrastrable={motivoBloqueo ? 'no' : 'si'}
      {...attributes}
      {...listeners}
    >
      <PipelineCard
        item={item}
        onClick={onClick}
        isDragging={isDragging}
      />
    </div>
  );
}

// ============================================================================
// Droppable Column
// ============================================================================

interface DroppableColumnProps {
  stage: PipelineStage;
  items: PipelineItem[];
  onCardClick: (item: PipelineItem) => void;
  isOver: boolean;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  maxVisibleCards?: number;
  puedeMover?: boolean;
}

function DroppableColumn({
  stage,
  items,
  onCardClick,
  isOver,
  collapsible = true,
  defaultCollapsed = false,
  maxVisibleCards = 3,
  puedeMover = true,
}: DroppableColumnProps) {
  const { t } = useI18n();
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  // «Ver todo»: el cajón con todos los leads de la columna. Portal, foco, Esc,
  // bloqueo del scroll y Lenis los ponen el `Sheet` y `SmoothScroll`.
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { setNodeRef } = useDroppable({
    id: stage,
    data: { stage },
  });

  const stageInfo = getPipelineStageInfo(stage);

  // Extract background and text color classes from stageInfo
  const bgColorClass = stageInfo?.color?.split(' ')[0] || 'bg-surface-muted';
  const textColorClass = stageInfo?.color?.split(' ')[1] || 'text-fg';

  // Calculate if we need to show "Ver todo" button (show when 3+ items)
  const showExpandButton = items.length >= maxVisibleCards;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col h-full rounded-lg border bg-muted/40 transition-[border-color,box-shadow] duration-base',
        isOver
          ? 'border-primary/30 border-dashed ring-2 ring-primary/20'
          : 'border-border'
      )}
      style={{ width: '280px', minWidth: '280px' }}
    >
      {/* Column Header */}
      <div
        className={cn(
          'flex items-center justify-between p-3 rounded-t-xl border-b',
          'bg-card border-border'
        )}
      >
        {/* Left side: color indicator + label + count */}
        <div className="flex items-center gap-2.5">
          {/* Stage color indicator */}
          <div
            className={cn(
              'w-2.5 h-2.5 rounded-full',
              bgColorClass.replace('-100', '-500')
            )}
          />

          {/* Stage label */}
          <h3 className="font-semibold text-sm text-foreground">
            {stageInfo?.labelEs || stage}
          </h3>

          {/* Count badge */}
          <span
            className={cn(
              'px-2 py-0.5 rounded-full text-xs font-medium',
              bgColorClass,
              textColorClass
            )}
          >
            {items.length}
          </span>
        </div>

        {/* Right side: collapse toggle */}
        {collapsible && (
          <IconButton
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label={isCollapsed ? t('inmobiliaria.pipeline.expandColumn') : t('inmobiliaria.pipeline.collapseColumn')}
            icon={isCollapsed ? <CaretDown className="w-4 h-4" /> : <CaretUp className="w-4 h-4" />}
          />
        )}
      </div>

      {/* Column Body - Scrollable card container. Se pliega y se despliega
          con su altura (`Collapse`: la única primitiva que anima la altura). */}
      <Collapse open={!isCollapsed}>
            <div
              className={cn(
                'relative flex flex-col gap-2.5 p-2.5 overflow-y-auto',
                'max-h-[calc(100vh-280px)]'
              )}
            >
              {/* Vacía ⇄ con leads: al soltar el primero o sacar el último, lo
                  nuevo entra ya y lo viejo se funde encima (`popLayout`). Lo que
                  ya estaba al cargar no se anima. */}
              <CrossFade
                swapKey={items.length === 0 ? 'vacia' : 'con-leads'}
                mode="popLayout"
                className="flex flex-col gap-2.5"
              >
              {items.length === 0 ? (
                /* Empty State */
                <div
                  className={cn(
                    'flex flex-col items-center justify-center py-8 px-4 rounded-md border-2 border-dashed',
                    isOver
                      ? 'border-primary/30 bg-primary-soft/50'
                      : 'border-border bg-muted/40'
                  )}
                >
                  <DotsSixVertical className="w-6 h-6 text-muted-foreground/60 mb-2" />
                  <p className="text-xs text-muted-foreground text-center">
                    {t('inmobiliaria.pipeline.noLeads')}
                  </p>
                  <p className="text-[10px] text-muted-foreground/70 text-center mt-1">
                    {t('inmobiliaria.pipeline.dragHere')}
                  </p>
                </div>
              ) : (
                /* Cards */
                items.map((item) => (
                  <DraggableCard
                    key={item.id}
                    item={item}
                    onClick={onCardClick}
                    motivoBloqueo={
                      esTerminal(item.stage)
                        ? 'Este lead ya terminó: no se mueve de etapa.'
                        : !puedeMover
                          ? 'No tienes permiso para mover leads.'
                          : undefined
                    }
                  />
                ))
              )}
              </CrossFade>

              {/* Drop zone at bottom when not empty and dragging over: abre su
                  lugar con la altura y se cierra al soltar o salir. */}
              <Collapse
                open={items.length > 0 && isOver}
                className={cn(
                  'flex items-center justify-center py-4 rounded-md border-2 border-dashed',
                  'border-primary/30 bg-primary-soft/50'
                )}
              >
                <p className="text-xs text-primary">
                  {t('inmobiliaria.pipeline.dropHere')}
                </p>
              </Collapse>
            </div>

            {/* Ver todo button */}
            {showExpandButton && (
              <div className="px-2.5 pb-2.5">
                <Button
                  variant="secondary"
                  size="sm"
                  hideArrow
                  onClick={() => setIsSidebarOpen(true)}
                  className="w-full"
                >
                  <ArrowsOutSimple className="w-4 h-4" />
                  {t('inmobiliaria.pipeline.viewAll')} ({items.length})
                </Button>
              </div>
            )}
      </Collapse>

      {/* Collapsed footer showing count */}
      <Presence show={isCollapsed} initial={false} className="p-3 text-center">
        <p className="text-xs text-muted-foreground">
          {items.length} {items.length === 1 ? t('inmobiliaria.pipeline.leadSingular') : t('inmobiliaria.pipeline.leadPlural')}
        </p>
      </Presence>

      {/* Ver Todo — el cajón flotante de la casa */}
      <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
        <SheetContent side="right" size="sm" aria-describedby={undefined}>
          <SheetHeader
            leading={
              <div
                className={cn(
                  'w-3 h-3 rounded-full',
                  bgColorClass.replace('-100', '-500')
                )}
              />
            }
            title={stageInfo?.labelEs || stage}
            description={`${items.length} ${items.length === 1 ? t('inmobiliaria.pipeline.leadSingular') : t('inmobiliaria.pipeline.leadPlural')}`}
          />

          {/* Sin `px-4`: las tarjetas van con el padding del cajón, en la línea
              del título (DESIGN.md §Drawers, «Contenido alineado al padding»). */}
          <SheetBody className="space-y-3 py-4">
            {items.map((item) => (
              <PipelineCard
                key={item.id}
                item={item}
                onClick={(clickedItem) => {
                  setIsSidebarOpen(false);
                  onCardClick(clickedItem);
                }}
              />
            ))}
          </SheetBody>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ============================================================================
// Pipeline Board
// ============================================================================

/**
 * PipelineBoard - Full Kanban board with drag-and-drop between columns
 * Uses @dnd-kit for accessible drag-and-drop functionality
 */
export function PipelineBoard({
  items,
  onItemClick,
  onStageChange,
  puedeMover = true,
  agentes,
}: PipelineBoardProps) {
  const nombresDeAgentes = useMemo(() => {
    const m: Record<string, string> = {};
    for (const a of agentes ?? []) {
      if (!a.name) continue;
      m[a.id] = a.name;
      if (a.userId) m[a.userId] = a.name;
    }
    return m;
  }, [agentes]);
  const { t } = useI18n();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  // El lead que se soltó en «Perdido» y espera su motivo.
  const [perdiendo, setPerdiendo] = useState<PipelineItem | null>(null);
  const [enviandoMotivo, setEnviandoMotivo] = useState(false);
  /** Lo que el back dijo del motivo (o del movimiento): va bajo el campo del diálogo. */
  const [errorDelMotivo, setErrorDelMotivo] = useState<string | null>(null);

  // Get the item being dragged
  const activeItem = useMemo(() => {
    if (!activeId) return null;
    return items.find((item) => item.id === activeId) || null;
  }, [activeId, items]);

  // Configure sensors for pointer and keyboard
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement to start drag
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Group items by stage
  const itemsByStage = useMemo(() => {
    const grouped: Record<PipelineStage, PipelineItem[]> = {
      lead: [],
      visit_scheduled: [],
      visit_done: [],
      application: [],
      evaluation: [],
      approved: [],
      contract: [],
      handover: [],
      completed: [],
      lost: [],
    };

    items.forEach((item) => {
      if (grouped[item.stage]) {
        grouped[item.stage].push(item);
      }
    });

    return grouped;
  }, [items]);

  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  // Handle drag over (for visual feedback)
  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event;
    setOverId(over?.id as string | null);
  }, []);

  /**
   * Soltar la tarjeta en otra columna.
   *
   * 🔴 «Etapa actualizada» se dice DESPUÉS de que el back lo confirma, no
   * antes. El código anterior llamaba a `onStageChange` sin esperarla y
   * cantaba éxito en la línea siguiente: con el PUT caído, el cartel verde
   * salía igual y la tarjeta volvía sola a su columna un rato después.
   *
   * El error lo avisa quien persiste (la página, que además revierte la
   * tarjeta): acá sólo hay que NO festejar.
   */
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      setActiveId(null);
      setOverId(null);

      if (!over) return;

      const itemId = active.id as string;
      const newStage = over.id as PipelineStage;

      // Find the item
      const item = items.find((i) => i.id === itemId);
      if (!item) return;

      // Check if stage actually changed
      if (item.stage === newStage) return;

      // La tarjeta ya viene bloqueada; esto cubre un arrastre por teclado.
      // Cerrado y Perdido el back los rechaza con 409 LEAD_TERMINADO.
      if (esTerminal(item.stage) || !puedeMover) return;

      /*
       * «Perdido» pide el motivo, igual que el cajón. Antes el arrastre se lo
       * saltaba y la columna se llenaba de perdidos sin explicación. La
       * tarjeta no se mueve hasta que se confirma.
       */
      if (newStage === 'lost') {
        setErrorDelMotivo(null);
        setPerdiendo(item);
        return;
      }

      // Get stage info for toast
      const oldStageInfo = getPipelineStageInfo(item.stage);
      const newStageInfo = getPipelineStageInfo(newStage);

      try {
        await onStageChange(itemId, newStage);
      } catch {
        // Ya lo dijo quien intentó guardarlo, con el motivo real.
        return;
      }

      toast.success(t('inmobiliaria.pipeline.stageUpdated'), {
        description: `${item.candidateName}: ${oldStageInfo?.labelEs || item.stage} → ${newStageInfo?.labelEs || newStage}`,
      });
    },
    [items, onStageChange, t, puedeMover]
  );

  /**
   * Confirmar el motivo del arrastre a «Perdido».
   *
   * Si el back dice que no, la página devuelve la tarjeta (y, con motivo, NO
   * avisa en un toast): el porqué va bajo el campo del diálogo, que queda
   * abierto con lo escrito para corregir o cancelar, como en el cajón.
   */
  const confirmarPerdido = useCallback(
    async (motivo: string) => {
      if (!perdiendo) return;
      // El mismo tope que el back (`MoveStageDto.lostReason`, VarChar(500)):
      // el diálogo ya lo dice bajo el campo; ésta es la segunda guarda.
      const largo = revisarMotivoDePerdida(motivo);
      if (largo) {
        setErrorDelMotivo(largo);
        return;
      }
      setErrorDelMotivo(null);
      setEnviandoMotivo(true);
      try {
        await onStageChange(perdiendo.id, 'lost', motivo);
      } catch (error) {
        setErrorDelMotivo(
          mensajeDelRechazoDelMotivo(error, {
            campo: 'lostReason',
            porDefecto: 'No se pudo marcar como perdido. Prueba de nuevo en un momento.',
            accion: 'marcar el lead como perdido',
          }),
        );
        setEnviandoMotivo(false);
        return;
      }
      toast.info(t('inmobiliaria.pipeline.markedAsLost'), {
        description: t('inmobiliaria.pipeline.markedAsLostDesc', { name: perdiendo.candidateName }),
      });
      setEnviandoMotivo(false);
      setPerdiendo(null);
    },
    [perdiendo, onStageChange, t]
  );

  // Get stages to display (all except lost at the end).
  // Columns holding cards come first (funnel order preserved within each
  // group) so real activity is visible without horizontal scrolling.
  const mainStages = useMemo(() => {
    const ordered = PIPELINE_STAGES.filter((s) => s.stage !== 'lost').map((s) => s.stage);
    return [
      ...ordered.filter((stage) => itemsByStage[stage].length > 0),
      ...ordered.filter((stage) => itemsByStage[stage].length === 0),
    ];
  }, [itemsByStage]);

  return (
    <NombresDeAgentesContext.Provider value={nombresDeAgentes}>
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="w-full overflow-x-auto pb-4">
        <div className="inline-flex gap-4 p-1">
          {/* Main Stages */}
          {mainStages.map((stage) => (
            <DroppableColumn
              key={stage}
              stage={stage}
              items={itemsByStage[stage]}
              onCardClick={onItemClick}
              isOver={overId === stage}
              puedeMover={puedeMover}
            />
          ))}

          {/* Lost Column (with different default collapsed state) */}
          <DroppableColumn
            stage="lost"
            items={itemsByStage.lost}
            onCardClick={onItemClick}
            isOver={overId === 'lost'}
            defaultCollapsed={true}
            puedeMover={puedeMover}
          />
        </div>
      </div>

      {/* El mismo diálogo y el mismo mínimo que «Marcar perdido» en el cajón. */}
      <MotivoDialog
        abierto={perdiendo !== null}
        titulo={`¿Marcar a ${perdiendo?.candidateName ?? ''} como perdido?`}
        descripcion="Sale del embudo. Cuenta por qué se cayó: es lo que se lee después para saber qué falló."
        etiquetaConfirmar="Marcar como perdido"
        enviando={enviandoMotivo}
        ayuda={AYUDA_DEL_MOTIVO_DE_PERDIDA}
        ejemplo={EJEMPLO_DEL_MOTIVO_DE_PERDIDA}
        maximo={MAX_LARGO_MOTIVO_DE_PERDIDA}
        error={errorDelMotivo}
        onCerrar={() => {
          setPerdiendo(null);
          setErrorDelMotivo(null);
        }}
        onConfirmar={(motivo) => void confirmarPerdido(motivo)}
      />

      {/* Drag Overlay - Shows the card being dragged */}
      <DragOverlay dropAnimation={null}>
        {activeItem && (
          <div className="rotate-2 scale-105">
            <PipelineCard
              item={activeItem}
              isDragging={true}
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
    </NombresDeAgentesContext.Provider>
  );
}

export default PipelineBoard;
