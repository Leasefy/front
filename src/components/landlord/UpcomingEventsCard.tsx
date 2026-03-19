'use client';

import Link from 'next/link';
import { Calendar, CreditCard, ArrowsClockwise, ClipboardText } from '@phosphor-icons/react';

import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import type { DashboardUpcomingEvent } from '@/lib/api/landlord.types';

interface UpcomingEventsCardProps {
  events: DashboardUpcomingEvent[];
  className?: string;
  maxEvents?: number;
}

const eventIcons = {
  lease_ending: Calendar,
  payment_due: CreditCard,
  contract_renewal: ArrowsClockwise,
  inspection: ClipboardText,
};

function formatDaysUntil(days: number): string {
  if (days < 0) {
    const absDays = Math.abs(days);
    return `hace ${absDays}d`;
  }
  if (days === 0) return 'Hoy';
  if (days === 1) return 'Mañana';
  if (days <= 7) return `${days}d`;
  if (days <= 30) {
    const weeks = Math.round(days / 7);
    return `${weeks}sem`;
  }
  const months = Math.round(days / 30);
  return `${months}mes`;
}

function formatDate(dateStr: string, locale = 'es'): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(locale === 'es' ? 'es-CL' : 'en-US', {
    day: 'numeric',
    month: 'short',
  });
}

interface EventItemProps {
  event: DashboardUpcomingEvent;
}

function EventItem({ event }: EventItemProps) {
  const { locale } = useI18n();
  const Icon = eventIcons[event.type];
  const isOverdue = event.daysUntil < 0;

  const content = (
    <div className={cn(
      'flex items-start gap-3 py-3 border-b border-border last:border-0 hover:bg-muted/50 transition-colors -mx-2 px-2 rounded-sm',
      isOverdue && 'bg-red-50/50'
    )}>
      {/* Icon */}
      <div className={cn(
        'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
        isOverdue ? 'bg-red-100' : 'bg-muted'
      )}>
        <Icon className={cn(
          'w-4 h-4',
          isOverdue ? 'text-red-400' : 'text-muted-foreground'
        )} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-sm font-medium',
          isOverdue ? 'text-red-700' : 'text-foreground'
        )}>
          {event.title}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">
          {event.description}
        </p>
      </div>

      {/* Time */}
      <div className="text-right flex-shrink-0">
        <p className={cn(
          'text-xs font-medium',
          isOverdue ? 'text-red-500' : 'text-muted-foreground'
        )}>
          {formatDaysUntil(event.daysUntil)}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {formatDate(event.date, locale)}
        </p>
      </div>
    </div>
  );

  if (event.href) {
    return (
      <Link href={event.href} className="block">
        {content}
      </Link>
    );
  }

  return content;
}

/**
 * UpcomingEventsCard - Luxterra style
 * Clean, minimal list without heavy borders
 */
export function UpcomingEventsCard({ events, className, maxEvents = 5 }: UpcomingEventsCardProps) {
  const displayEvents = events.slice(0, maxEvents);

  if (events.length === 0) {
    return (
      <div className={cn('text-sm text-muted-foreground text-center py-8', className)}>
        No hay eventos próximos
      </div>
    );
  }

  return (
    <div className={className}>
      {displayEvents.map((event) => (
        <EventItem key={event.id} event={event} />
      ))}
    </div>
  );
}

export default UpcomingEventsCard;
