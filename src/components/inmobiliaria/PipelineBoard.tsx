'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
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
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  CaretDown,
  CaretUp,
  DotsSixVertical,
  ArrowsOutSimple,
  X,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui';
import { IconButton } from '@leasefy/cadence';
import { useLenis } from '@/components/providers/SmoothScroll';
import { useI18n } from '@/lib/i18n';
import type { PipelineItem, PipelineStage } from '@/lib/types/inmobiliaria';
import { PIPELINE_STAGES, getPipelineStageInfo } from '@/lib/types/inmobiliaria';
import { PipelineCard } from './PipelineCard';

// ============================================================================
// Types
// ============================================================================

interface PipelineBoardProps {
  items: PipelineItem[];
  onItemClick: (item: PipelineItem) => void;
  onStageChange: (itemId: string, newStage: PipelineStage) => void;
}

// ============================================================================
// Draggable Card Wrapper
// ============================================================================

interface DraggableCardProps {
  item: PipelineItem;
  onClick: (item: PipelineItem) => void;
}

function DraggableCard({ item, onClick }: DraggableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: item.id,
    data: { item },
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
        'transition-opacity duration-200',
        isDragging && 'opacity-40'
      )}
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
}

function DroppableColumn({
  stage,
  items,
  onCardClick,
  isOver,
  collapsible = true,
  defaultCollapsed = false,
  maxVisibleCards = 3,
}: DroppableColumnProps) {
  const { t } = useI18n();
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { setNodeRef } = useDroppable({
    id: stage,
    data: { stage },
  });
  const { stop: stopLenis, start: startLenis } = useLenis();

  const stageInfo = getPipelineStageInfo(stage);

  // Track client-side mounting
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Stop Lenis and lock body scroll when sidebar is open
  useEffect(() => {
    if (isSidebarOpen) {
      // Stop Lenis smooth scroll to allow native scroll in sidebar
      stopLenis();

      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.overflow = 'hidden';

      return () => {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
        // Restart Lenis
        startLenis();
      };
    }
  }, [isSidebarOpen, stopLenis, startLenis]);

  // Extract background and text color classes from stageInfo
  const bgColorClass = stageInfo?.color?.split(' ')[0] || 'bg-surface-muted';
  const textColorClass = stageInfo?.color?.split(' ')[1] || 'text-fg';

  // Calculate if we need to show "Ver todo" button (show when 3+ items)
  const showExpandButton = items.length >= maxVisibleCards;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col h-full rounded-xl border bg-muted/40 transition-all duration-200',
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

      {/* Column Body - Scrollable card container */}
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="flex-1 overflow-hidden"
          >
            <div
              className={cn(
                'flex flex-col gap-2.5 p-2.5 overflow-y-auto',
                'max-h-[calc(100vh-280px)]'
              )}
            >
              {items.length === 0 ? (
                /* Empty State */
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
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
                </motion.div>
              ) : (
                /* Cards */
                items.map((item) => (
                  <DraggableCard
                    key={item.id}
                    item={item}
                    onClick={onCardClick}
                  />
                ))
              )}

              {/* Drop zone at bottom when not empty and dragging over */}
              {items.length > 0 && isOver && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className={cn(
                    'flex items-center justify-center py-4 rounded-md border-2 border-dashed',
                    'border-primary/30 bg-primary-soft/50'
                  )}
                >
                  <p className="text-xs text-primary">
                    {t('inmobiliaria.pipeline.dropHere')}
                  </p>
                </motion.div>
              )}
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
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsed footer showing count */}
      {isCollapsed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-3 text-center"
        >
          <p className="text-xs text-muted-foreground">
            {items.length} {items.length === 1 ? t('inmobiliaria.pipeline.leadSingular') : t('inmobiliaria.pipeline.leadPlural')}
          </p>
        </motion.div>
      )}

      {/* Ver Todo - Custom Portal Sidebar */}
      {isMounted && isSidebarOpen && createPortal(
        <>
          {/* Backdrop */}
          {/* Drawer layer = z-[300] (misma capa que <Sheet>/<Drawer>). Antes z-[9998/9999],
              que tapaba cualquier AlertDialog disparado desde adentro. Ver DESIGN.md §17. */}
          <div
            className="fixed inset-0 bg-black/60 z-[300]"
            onClick={() => setIsSidebarOpen(false)}
            style={{ touchAction: 'none' }}
          />

          {/* Sidebar */}
          <div
            className="fixed top-0 right-0 w-full sm:w-[420px] bg-card z-[300]"
            style={{ height: '100dvh' }}
          >
            {/* Header - Fixed height */}
            <div
              className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 border-b border-border bg-card"
              style={{ height: '73px' }}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'w-3 h-3 rounded-full',
                    bgColorClass.replace('-100', '-500')
                  )}
                />
                <div>
                  <h2 className="text-base font-semibold text-foreground">
                    {stageInfo?.labelEs || stage}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {items.length} {items.length === 1 ? t('inmobiliaria.pipeline.leadSingular') : t('inmobiliaria.pipeline.leadPlural')}
                  </p>
                </div>
              </div>
              <IconButton
                variant="ghost"
                size="sm"
                onClick={() => setIsSidebarOpen(false)}
                aria-label={t('inmobiliaria.pipeline.close')}
                icon={<X className="w-5 h-5" />}
              />
            </div>

            {/* Scrollable Content - Absolute positioned */}
            <div
              className="absolute left-0 right-0 p-4 space-y-3"
              style={{
                top: '73px',
                bottom: '0px',
                overflowY: 'scroll',
                WebkitOverflowScrolling: 'touch',
                overscrollBehavior: 'contain',
              }}
              onWheel={(e) => e.stopPropagation()}
            >
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
            </div>
          </div>
        </>,
        document.body
      )}
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
}: PipelineBoardProps) {
  const { t } = useI18n();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

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

  // Handle drag end
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
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

      // Get stage info for toast
      const oldStageInfo = getPipelineStageInfo(item.stage);
      const newStageInfo = getPipelineStageInfo(newStage);

      // Call the stage change handler
      onStageChange(itemId, newStage);

      // Show success toast
      toast.success(t('inmobiliaria.pipeline.stageUpdated'), {
        description: `${item.candidateName}: ${oldStageInfo?.labelEs || item.stage} → ${newStageInfo?.labelEs || newStage}`,
      });
    },
    [items, onStageChange]
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
            />
          ))}

          {/* Lost Column (with different default collapsed state) */}
          <DroppableColumn
            stage="lost"
            items={itemsByStage.lost}
            onCardClick={onItemClick}
            isOver={overId === 'lost'}
            defaultCollapsed={true}
          />
        </div>
      </div>

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
  );
}

export default PipelineBoard;
