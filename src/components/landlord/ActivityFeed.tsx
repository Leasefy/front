'use client';

import Link from 'next/link';
import {
  UserPlus,
  CheckCircle2,
  MessageSquare,
  FileText,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import type { Activity, ActivityType } from '@/lib/data/mock-activity';

// Format relative time
function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 60) {
    return `${diffMins}m`;
  }
  if (diffHours < 24) {
    return `${diffHours}h`;
  }
  if (diffDays < 7) {
    return `${diffDays}d`;
  }
  return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

// Icon by activity type
const activityIcons: Record<ActivityType, typeof UserPlus> = {
  application: UserPlus,
  status_change: CheckCircle2,
  message: MessageSquare,
  document: FileText,
};

interface ActivityItemProps {
  activity: Activity;
}

function ActivityItem({ activity }: ActivityItemProps) {
  const Icon = activityIcons[activity.type];

  // Map activity types to accent colors
  const typeColors: Record<ActivityType, string> = {
    application: 'bg-[#7f51ff]/10 text-[#7f51ff]',
    status_change: 'bg-emerald-50 text-emerald-600',
    message: 'bg-blue-50 text-blue-600',
    document: 'bg-amber-50 text-amber-600',
  };

  const content = (
    <div className="group flex items-start gap-4 py-4 px-3 -mx-3 rounded-xl hover:bg-slate-50/80 transition-all duration-300 cursor-pointer">
      {/* Icon with colored background */}
      <div className={cn(
        'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
        'transition-transform duration-300 group-hover:scale-110',
        typeColors[activity.type]
      )}>
        <Icon className="w-4 h-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-800 font-medium group-hover:text-slate-900 transition-colors">
          {activity.title}
        </p>
        <p className="text-xs text-slate-500 mt-1 truncate">
          {activity.description}
        </p>
      </div>

      {/* Time badge */}
      <span className="text-xs text-slate-400 bg-slate-100/80 px-2 py-1 rounded-md flex-shrink-0 font-medium">
        {formatRelativeTime(activity.timestamp)}
      </span>
    </div>
  );

  if (activity.propertyId) {
    return (
      <Link href={`/panel/${activity.propertyId}`} className="block">
        {content}
      </Link>
    );
  }

  return content;
}

interface ActivityFeedProps {
  activities: Activity[];
  className?: string;
  showViewAll?: boolean;
}

/**
 * Activity Feed - Luxterra style
 * Clean, minimal list without heavy borders
 */
export function ActivityFeed({
  activities,
  className,
  showViewAll = true,
}: ActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <div className={cn('text-sm text-slate-400 text-center py-8', className)}>
        No hay actividad reciente
      </div>
    );
  }

  return (
    <div className={className}>
      {activities.map((activity) => (
        <ActivityItem key={activity.id} activity={activity} />
      ))}
    </div>
  );
}

export { ActivityFeed as default };
