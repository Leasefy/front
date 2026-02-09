'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CaretDown,
  CaretUp,
  DotsSixVertical,
  ArrowsOutSimple,
  X,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import type { PipelineItem, PipelineStage } from '@/lib/types/inmobiliaria';
import { getPipelineStageInfo } from '@/lib/types/inmobiliaria';
import { PipelineCard } from './PipelineCard';

interface PipelineColumnProps {
  stage: PipelineStage;
  items: PipelineItem[];
  onCardClick?: (item: PipelineItem) => void;
  isDropTarget?: boolean;
  onDrop?: (item: PipelineItem, newStage: PipelineStage) => void;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  maxVisibleCards?: number;
}

/**
 * PipelineColumn - Kanban column for a specific pipeline stage
 * Shows header with count, scrollable card container, and drop zone
 */
export function PipelineColumn({
  stage,
  items,
  onCardClick,
  isDropTarget = false,
  onDrop,
  collapsible = true,
  defaultCollapsed = false,
  maxVisibleCards = 3,
}: PipelineColumnProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const stageInfo = getPipelineStageInfo(stage);

  // Extract background and text color classes from stageInfo
  const bgColorClass = stageInfo?.color?.split(' ')[0] || 'bg-neutral-100';
  const textColorClass = stageInfo?.color?.split(' ')[1] || 'text-neutral-700';

  // Check if content overflows
  useEffect(() => {
    const checkOverflow = () => {
      if (scrollContainerRef.current) {
        const { scrollHeight, clientHeight } = scrollContainerRef.current;
        setHasOverflow(scrollHeight > clientHeight);
      }
    };
    checkOverflow();
    // Recheck on items change
    const timer = setTimeout(checkOverflow, 100);
    return () => clearTimeout(timer);
  }, [items]);

  // Close sidebar on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isSidebarOpen]);

  // Prevent body scroll when sidebar is open
  useEffect(() => {
    if (isSidebarOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.overflow = 'hidden';
    } else {
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.overflow = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0', 10) * -1);
      }
    }
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.overflow = '';
    };
  }, [isSidebarOpen]);

  // Calculate if we need to show "Ver todo" button
  const showExpandButton = items.length > maxVisibleCards;

  return (
    <div
      className={cn(
        'flex flex-col h-full rounded-xl border bg-neutral-50 dark:bg-neutral-900/50 transition-all duration-200',
        isDropTarget
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
          <span className={cn(
            'px-2 py-0.5 rounded-full text-xs font-medium',
            bgColorClass,
            textColorClass
          )}>
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
            className="flex-1 flex flex-col overflow-hidden"
          >
            <div
              ref={scrollContainerRef}
              className="flex flex-col gap-2.5 p-2.5 overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-300 dark:scrollbar-thumb-neutral-600 scrollbar-track-transparent max-h-[420px]"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(156, 163, 175, 0.5) transparent',
              }}
            >
              {items.length === 0 ? (
                /* Empty State */
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={cn(
                    'flex flex-col items-center justify-center py-8 px-4 rounded-lg border-2 border-dashed',
                    isDropTarget
                      ? 'border-indigo-300 dark:border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20'
                      : 'border-neutral-200 dark:border-neutral-700 bg-neutral-100/50 dark:bg-neutral-800/30'
                  )}
                >
                  <DotsSixVertical className="w-6 h-6 text-neutral-300 dark:text-neutral-600 mb-2" />
                  <p className="text-xs text-neutral-400 dark:text-neutral-500 text-center">
                    Sin leads
                  </p>
                  <p className="text-[10px] text-neutral-300 dark:text-neutral-600 text-center mt-1">
                    Arrastra aquí
                  </p>
                </motion.div>
              ) : (
                /* Cards */
                items.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <PipelineCard
                      item={item}
                      onClick={onCardClick}
                    />
                  </motion.div>
                ))
              )}

              {/* Drop zone at bottom when not empty */}
              {items.length > 0 && isDropTarget && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={cn(
                    'flex items-center justify-center py-4 rounded-lg border-2 border-dashed',
                    'border-indigo-300 dark:border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/20'
                  )}
                >
                  <p className="text-xs text-indigo-500 dark:text-indigo-400">
                    Soltar aquí
                  </p>
                </motion.div>
              )}
            </div>

            {/* Ver todo button */}
            {showExpandButton && (
              <div className="px-2.5 pb-2.5">
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all',
                    'border border-neutral-200 dark:border-neutral-700',
                    'text-neutral-600 dark:text-neutral-400',
                    'hover:bg-neutral-100 dark:hover:bg-neutral-800',
                    'hover:text-neutral-900 dark:hover:text-white'
                  )}
                >
                  <ArrowsOutSimple className="w-4 h-4" />
                  Ver todo ({items.length})
                </button>
              </div>
            )}

            {/* Scroll indicator when there's overflow */}
            {hasOverflow && !showExpandButton && (
              <div className="px-2.5 pb-2">
                <div className="flex items-center justify-center gap-1 py-1">
                  <div className="w-1 h-1 rounded-full bg-neutral-300 dark:bg-neutral-600 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1 h-1 rounded-full bg-neutral-300 dark:bg-neutral-600 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1 h-1 rounded-full bg-neutral-300 dark:bg-neutral-600 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
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
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {items.length} {items.length === 1 ? 'lead' : 'leads'}
          </p>
        </motion.div>
      )}

      {/* Sidebar Portal */}
      {typeof window !== 'undefined' && createPortal(
        <AnimatePresence>
          {isSidebarOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-black/60 z-[200] touch-none"
                onClick={() => setIsSidebarOpen(false)}
                onWheel={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.preventDefault()}
              />

              {/* Sidebar */}
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="fixed right-0 top-0 bottom-0 w-full sm:w-[420px] bg-white dark:bg-[#1a1a1c] shadow-2xl z-[201] flex flex-col"
                style={{ height: '100dvh' }}
              >
                {/* Sidebar Header */}
                <div className="shrink-0 flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
                  <div className="flex items-center gap-3">
                    {/* Stage color indicator */}
                    <div
                      className={cn(
                        'w-3 h-3 rounded-full',
                        bgColorClass.replace('-100', '-500')
                      )}
                    />
                    <div>
                      <h2 className="font-semibold text-lg text-neutral-900 dark:text-white">
                        {stageInfo?.labelEs || stage}
                      </h2>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        {items.length} {items.length === 1 ? 'lead' : 'leads'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsSidebarOpen(false)}
                    className="p-2 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                    aria-label="Cerrar"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Sidebar Content - Scrollable */}
                <div
                  className="flex-1 overflow-y-auto p-4 space-y-3"
                  style={{
                    minHeight: 0,
                    WebkitOverflowScrolling: 'touch',
                  }}
                >
                  {items.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <PipelineCard
                        item={item}
                        onClick={(clickedItem) => {
                          setIsSidebarOpen(false);
                          onCardClick?.(clickedItem);
                        }}
                      />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}

export default PipelineColumn;
