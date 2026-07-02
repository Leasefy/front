'use client';

import { FileText, PaperPlaneTilt, CheckCircle, MagnifyingGlass, Clock, XCircle, SignOut } from '@phosphor-icons/react';

import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/format';
import type { ApplicationEvent, ApplicationEventType } from '@/lib/types/tenant-application';

export interface ApplicationTimelineProps {
  events: ApplicationEvent[];
  className?: string;
}

/**
 * Icon mapping for each event type
 */
const EVENT_ICONS: Record<ApplicationEventType, React.ElementType> = {
  created: FileText,
  submitted: PaperPlaneTilt,
  documents_verified: CheckCircle,
  under_review: MagnifyingGlass,
  pre_approved: Clock,
  approved: CheckCircle,
  rejected: XCircle,
  withdrawn: SignOut,
};

/**
 * Color classes for each event type
 */
const EVENT_COLORS: Record<ApplicationEventType, string> = {
  created: 'text-fg-muted bg-surface-muted',
  submitted: 'text-[#1A40FF] bg-[#EEF1FF]',
  documents_verified: 'text-[#1A40FF] bg-[#EEF1FF]',
  under_review: 'text-[#1A40FF] bg-[#EEF1FF]',
  pre_approved: 'text-[#B7791F] bg-[#F8F0E0]',
  approved: 'text-[#2C7A53] bg-[#E8F3EC]',
  rejected: 'text-[#C4503B] bg-[#F8EAE7]',
  withdrawn: 'text-fg-muted bg-surface-muted',
};

/**
 * Line color for connecting timeline items
 */
const EVENT_LINE_COLORS: Record<ApplicationEventType, string> = {
  created: 'bg-surface-muted',
  submitted: 'bg-[#EEF1FF]',
  documents_verified: 'bg-[#EEF1FF]',
  under_review: 'bg-[#EEF1FF]',
  pre_approved: 'bg-[#F8F0E0]',
  approved: 'bg-[#E8F3EC]',
  rejected: 'bg-[#F8EAE7]',
  withdrawn: 'bg-surface-muted',
};

/**
 * Timeline visualization of application events
 * Shows events chronologically with appropriate icons and colors
 *
 * Layout:
 * [Icon] | [Title]
 * [Line] | [Description, timestamp]
 * [Icon] | [Title]
 * ...
 */
export function ApplicationTimeline({
  events,
  className,
}: ApplicationTimelineProps) {
  // Sort events chronologically (oldest first for top-to-bottom flow)
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return (
    <div className={cn('relative', className)}>
      {sortedEvents.map((event, index) => {
        const Icon = EVENT_ICONS[event.type];
        const colorClass = EVENT_COLORS[event.type];
        const lineColor = EVENT_LINE_COLORS[event.type];
        const isLast = index === sortedEvents.length - 1;
        const isFirst = index === 0;

        return (
          <div key={event.id} className="relative flex gap-4">
            {/* Icon column with connecting line */}
            <div className="flex flex-col items-center">
              {/* Icon container */}
              <div
                className={cn(
                  'flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0',
                  colorClass
                )}
              >
                <Icon className="w-4 h-4" />
              </div>

              {/* Connecting line (not shown after last item) */}
              {!isLast && (
                <div
                  className={cn(
                    'w-0.5 flex-1 min-h-6',
                    lineColor
                  )}
                />
              )}
            </div>

            {/* Content column */}
            <div className={cn('flex-1 pb-6', isLast && 'pb-0')}>
              {/* Event title */}
              <p className="text-sm font-medium text-fg">
                {event.description}
              </p>

              {/* Timestamp */}
              <p className="text-xs text-fg-muted mt-0.5">
                {formatDateTime(event.timestamp)}
              </p>
            </div>
          </div>
        );
      })}

      {/* Empty state */}
      {events.length === 0 && (
        <p className="text-sm text-fg-muted text-center py-4">
          No hay eventos para mostrar
        </p>
      )}
    </div>
  );
}
