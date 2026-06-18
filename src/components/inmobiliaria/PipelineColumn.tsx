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
import { useI18n } from '@/lib/i18n';
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
  const { t } = useI18n();
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
        'flex flex-col h-full rounded-xl border bg-muted/40 transition-all duration-200',
        isDropTarget
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
            className="p-1 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label={isCollapsed ? t('inmobiliaria.pipeline.expandColumn') : t('inmobiliaria.pipeline.collapseColumn')}
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
                    'flex flex-col items-center justify-center py-8 px-4 rounded-md border-2 border-dashed',
                    isDropTarget
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
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className={cn(
                    'w-full flex items-center justify-center gap-2 py-2 rounded-md text-xs font-medium transition-all',
                    'border border-border',
                    'text-muted-foreground',
                    'hover:bg-muted hover:text-foreground'
                  )}
                >
                  <ArrowsOutSimple className="w-4 h-4" />
                  {t('inmobiliaria.pipeline.viewAll')} ({items.length})
                </button>
              </div>
            )}

            {/* Scroll indicator when there's overflow */}
            {hasOverflow && !showExpandButton && (
              <div className="px-2.5 pb-2">
                <div className="flex items-center justify-center gap-1 py-1">
                  <div className="w-1 h-1 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1 h-1 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1 h-1 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '300ms' }} />
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
          <p className="text-xs text-muted-foreground">
            {items.length} {items.length === 1 ? t('inmobiliaria.pipeline.leadSingular') : t('inmobiliaria.pipeline.leadPlural')}
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
                className="fixed right-0 top-0 bottom-0 w-full sm:w-[420px] bg-card z-[201] flex flex-col"
                style={{ height: '100dvh' }}
              >
                {/* Sidebar Header */}
                <div className="shrink-0 flex items-center justify-between p-4 border-b border-border">
                  <div className="flex items-center gap-3">
                    {/* Stage color indicator */}
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
                  <button
                    onClick={() => setIsSidebarOpen(false)}
                    className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    aria-label={t('inmobiliaria.pipeline.close')}
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
