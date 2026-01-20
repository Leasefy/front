'use client';

import { Bell } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { useTimeGreeting } from '@/lib/hooks/use-time-greeting';
import { Button } from '@/components/ui/button';

interface DashboardHeaderProps {
  className?: string;
}

/**
 * Dashboard Header
 * Displays personalized greeting based on time of day
 */
export function DashboardHeader({ className }: DashboardHeaderProps) {
  const { user } = useAuth();
  const { greeting } = useTimeGreeting();

  // Get first name only
  const firstName = user?.name?.split(' ')[0] || 'Usuario';

  return (
    <header
      className={cn(
        'flex items-center justify-between py-6',
        className
      )}
    >
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">
          {greeting}, {firstName}
        </h1>
        <p className="text-slate-500 mt-1">
          Revisa el estado de tus propiedades y candidatos
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="relative text-slate-500 hover:text-slate-900"
        >
          <Bell className="w-5 h-5" />
          {/* Notification badge */}
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
          <span className="sr-only">Notificaciones</span>
        </Button>
      </div>
    </header>
  );
}

export { DashboardHeader as default };
