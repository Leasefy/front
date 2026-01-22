'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { UrgentAction } from '@/lib/data/mock-dashboard';

interface UrgentActionsBannerProps {
  actions: UrgentAction[];
  className?: string;
}

/**
 * UrgentActionsBanner - Luxterra style
 * Subtle, elegant notification - just text links, no colorful badges
 */
export function UrgentActionsBanner({ actions, className }: UrgentActionsBannerProps) {
  if (actions.length === 0) {
    return null;
  }

  // Group actions by priority for display
  const highPriority = actions.filter(a => a.priority === 'high');
  const otherActions = actions.filter(a => a.priority !== 'high');

  return (
    <div className={cn('text-sm text-slate-500', className)}>
      {highPriority.length > 0 && (
        <p className="mb-1">
          <span className="text-slate-400">Requiere atencion: </span>
          {highPriority.map((action, index) => (
            <span key={action.id}>
              <Link
                href={action.href}
                className="text-slate-700 hover:text-slate-900 underline underline-offset-2"
              >
                {action.count} {action.title.toLowerCase()}
              </Link>
              {index < highPriority.length - 1 && (
                <span className="text-slate-300 mx-2">·</span>
              )}
            </span>
          ))}
        </p>
      )}
      {otherActions.length > 0 && (
        <p>
          <span className="text-slate-400">Pendiente: </span>
          {otherActions.map((action, index) => (
            <span key={action.id}>
              <Link
                href={action.href}
                className="text-slate-600 hover:text-slate-800 underline underline-offset-2"
              >
                {action.count} {action.title.toLowerCase()}
              </Link>
              {index < otherActions.length - 1 && (
                <span className="text-slate-300 mx-2">·</span>
              )}
            </span>
          ))}
        </p>
      )}
    </div>
  );
}

export default UrgentActionsBanner;
