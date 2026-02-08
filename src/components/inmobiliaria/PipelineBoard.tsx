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
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  CaretDown,
  CaretUp,
  DotsSixVertical,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
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
}

function DroppableColumn({
  stage,
  items,
  onCardClick,
  isOver,
  collapsible = true,
  defaultCollapsed = false,
}: DroppableColumnProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const { setNodeRef } = useDroppable({
    id: stage,
    data: { stage },
  });

  const stageInfo = getPipelineStageInfo(stage);

  // Extract background and text color classes from stageInfo
  const bgColorClass = stageInfo?.color?.split(' ')[0] || 'bg-neutral-100';
  const textColorClass = stageInfo?.color?.split(' ')[1] || 'text-neutral-700';

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col h-full rounded-xl border bg-neutral-50 dark:bg-neutral-900/50 transition-all duration-200',
        isOver
          ? 'border-indigo-400 dark:border-indigo-500 border-dashed ring-2 ring-indigo-500/20'
          : 'border-neutral-200 dark:border-neutral-800'
      )}
      style={{ width: '280px', minWidth: '280px' }}
    >
      {/* Column Header */}
      <div
        className={cn(
          'flex items-center justify-between p-3 rounded-t-xl border-b',
          'bg-white dark:bg-[#1a1a1c]',
          'border-neutral-200 dark:border-neutral-800'
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
          <h3 className="font-semibold text-sm text-neutral-900 dark:text-white">
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
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded-md text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            aria-label={isCollapsed ? 'Expandir columna' : 'Colapsar columna'}
          >
            {isCollapsed ? (
              <CaretDown className="w-4 h-4" />
            ) : (
              <CaretUp className="w-4 h-4" />
            )}
          </button>
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
                    'flex flex-col items-center justify-center py-8 px-4 rounded-lg border-2 border-dashed',
                    isOver
                      ? 'border-indigo-300 dark:border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20'
                      : 'border-neutral-200 dark:border-neutral-700 bg-neutral-100/50 dark:bg-neutral-800/30'
                  )}
                >
                  <DotsSixVertical className="w-6 h-6 text-neutral-300 dark:text-neutral-600 mb-2" />
                  <p className="text-xs text-neutral-400 dark:text-neutral-500 text-center">
                    Sin leads
                  </p>
                  <p className="text-[10px] text-neutral-300 dark:text-neutral-600 text-center mt-1">
                    Arrastra aqui
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
                    'flex items-center justify-center py-4 rounded-lg border-2 border-dashed',
                    'border-indigo-300 dark:border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20'
                  )}
                >
                  <p className="text-xs text-indigo-500 dark:text-indigo-400">
                    Soltar aqui
                  </p>
                </motion.div>
              )}
            </div>
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
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {items.length} {items.length === 1 ? 'lead' : 'leads'}
          </p>
        </motion.div>
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
      toast.success('Etapa actualizada', {
        description: `${item.candidateName}: ${oldStageInfo?.labelEs || item.stage} → ${newStageInfo?.labelEs || newStage}`,
      });
    },
    [items, onStageChange]
  );

  // Get stages to display (all except lost at the end)
  const mainStages = useMemo(() => {
    return PIPELINE_STAGES.filter((s) => s.stage !== 'lost').map((s) => s.stage);
  }, []);

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
