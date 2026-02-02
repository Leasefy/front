'use client';

import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import { Building2, User, Calendar } from 'lucide-react';
import type { Lease } from '@/lib/types/lease';

interface LeaseListItemProps {
  lease: Lease;
  onSelect?: () => void;
  isSelected?: boolean;
}

/**
 * LeaseListItem - Compact, clean lease display for Luxterra style
 * Minimal information, easy to scan
 */
export function LeaseListItem({ lease, onSelect, isSelected }: LeaseListItemProps) {
  const daysRemaining = Math.ceil(
    (new Date(lease.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  const isEndingSoon = lease.status === 'ending_soon' || daysRemaining <= 60;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full text-left p-4 border-b border-slate-50 last:border-0',
        'hover:bg-slate-50/50 transition-colors',
        isSelected && 'bg-slate-50'
      )}
    >
      <div className="flex items-center gap-4">
        {/* Property icon */}
        <div className={cn(
          'w-10 h-10 rounded-sm flex items-center justify-center flex-shrink-0',
          isSelected ? 'bg-slate-900' : 'bg-slate-100'
        )}>
          <Building2 className={cn(
            'w-5 h-5',
            isSelected ? 'text-white' : 'text-slate-400'
          )} />
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className={cn(
              'text-sm font-medium truncate',
              isSelected ? 'text-slate-900' : 'text-slate-700'
            )}>
              {lease.propertyTitle}
            </h3>
            {isEndingSoon && (
              <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-sm flex-shrink-0">
                Vence pronto
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5 truncate">
            {lease.tenantName}
          </p>
        </div>

        {/* Rent amount */}
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-medium text-slate-900">
            {formatCurrency(lease.monthlyRent)}
          </p>
          <p className="text-[10px] text-slate-400">/mes</p>
        </div>
      </div>
    </button>
  );
}
