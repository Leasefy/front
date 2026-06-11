'use client';

import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { useTimeGreeting } from '@/lib/hooks/use-time-greeting';
import { useI18n } from '@/lib/i18n';

interface DashboardHeaderProps {
  className?: string;
  propertyCount?: number;
  monthlyIncome?: number;
}

/**
 * Dashboard Header - Premium Luxterra style
 * Large, elegant typography with accent highlights
 */
export function DashboardHeader({ className, propertyCount, monthlyIncome }: DashboardHeaderProps) {
  const { user } = useAuth();
  const { greeting } = useTimeGreeting();
  const { formatCurrency } = useI18n();

  // Get first name only
  const firstName = user?.name?.split(' ')[0] || 'Usuario';

  return (
    <header className={cn('py-6', className)}>
      {/* Main greeting with gradient accent on name */}
      <h1 className="text-[2rem] md:text-[2.75rem] font-light text-foreground tracking-[-0.03em] leading-tight">
        {greeting},{' '}
        <span className="font-normal bg-gradient-to-r from-black to-[#6B6B6B] bg-clip-text text-transparent">
          {firstName}
        </span>
      </h1>

      {/* Summary stats as pills */}
      {(propertyCount !== undefined || monthlyIncome !== undefined) && (
        <div className="flex items-center gap-3 mt-4">
          {propertyCount !== undefined && (
            <div className="inline-flex items-center gap-2 bg-muted/80 text-foreground px-4 py-2 rounded-full text-sm font-medium">
              <div className="w-2 h-2 rounded-full bg-[black]" />
              {propertyCount} propiedad{propertyCount !== 1 ? 'es' : ''}
            </div>
          )}
          {monthlyIncome !== undefined && monthlyIncome > 0 && (
            <div className="inline-flex items-center gap-2 bg-[#E8F3EC] text-[#2C7A53] px-4 py-2 rounded-full text-sm font-medium">
              <div className="w-2 h-2 rounded-full bg-[#2C7A53]" />
              {formatCurrency(monthlyIncome)}/mes
            </div>
          )}
        </div>
      )}
    </header>
  );
}

export { DashboardHeader as default };
