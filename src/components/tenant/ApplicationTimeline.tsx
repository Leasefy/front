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
  created: 'text-muted-foreground bg-muted',
  submitted: 'text-blue-600 bg-blue-100',
  documents_verified: 'text-sky-600 bg-sky-100',
  under_review: 'text-blue-600 bg-blue-100',
  pre_approved: 'text-amber-600 bg-amber-100',
  approved: 'text-emerald-600 bg-emerald-100',
  rejected: 'text-red-600 bg-red-100',
  withdrawn: 'text-muted-foreground bg-muted',
};

/**
 * Line color for connecting timeline items
 */
const EVENT_LINE_COLORS: Record<ApplicationEventType, string> = {
  created: 'bg-muted',
  submitted: 'bg-blue-200',
  documents_verified: 'bg-sky-200',
  under_review: 'bg-blue-200',
  pre_approved: 'bg-amber-200',
  approved: 'bg-emerald-200',
  rejected: 'bg-red-200',
  withdrawn: 'bg-muted',
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
              <p className="text-sm font-medium text-foreground">
                {event.description}
              </p>

              {/* Timestamp */}
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatDateTime(event.timestamp)}
              </p>
            </div>
          </div>
        );
      })}

      {/* Empty state */}
      {events.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No hay eventos para mostrar
        </p>
      )}
    </div>
  );
}
