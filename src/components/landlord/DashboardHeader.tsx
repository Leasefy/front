'use client';

import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { useTimeGreeting } from '@/lib/hooks/use-time-greeting';
import { formatCurrency } from '@/lib/data/mock-dashboard';

interface DashboardHeaderProps {
  className?: string;
  propertyCount?: number;
  monthlyIncome?: number;
}

/**
 * Dashboard Header - Luxterra style
 * Large, light typography with subtle details
 */
export function DashboardHeader({ className, propertyCount, monthlyIncome }: DashboardHeaderProps) {
  const { user } = useAuth();
  const { greeting } = useTimeGreeting();

  // Get first name only
  const firstName = user?.name?.split(' ')[0] || 'Usuario';

  // Build subtitle with summary
  const summaryParts: string[] = [];
  if (propertyCount !== undefined) {
    summaryParts.push(`${propertyCount} propiedad${propertyCount !== 1 ? 'es' : ''}`);
  }
  if (monthlyIncome !== undefined && monthlyIncome > 0) {
    summaryParts.push(`${formatCurrency(monthlyIncome)}/mes`);
  }

  return (
    <header className={cn('py-4', className)}>
      <h1 className="text-[2rem] md:text-[2.5rem] font-light text-slate-900 tracking-[-0.02em]">
        {greeting}, {firstName}
      </h1>
      {summaryParts.length > 0 && (
        <p className="text-slate-400 mt-1 text-sm tracking-[-0.01em]">
          {summaryParts.join(' · ')}
        </p>
      )}
    </header>
  );
}

export { DashboardHeader as default };
