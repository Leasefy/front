'use client';

import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/format';
import { Buildings, User, Calendar } from '@phosphor-icons/react';
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
        'w-full text-left p-4 border-b border-border last:border-0',
        'hover:bg-surface-hover transition-colors',
        isSelected && 'bg-surface-muted'
      )}
    >
      <div className="flex items-center gap-4">
        {/* Property icon */}
        <div className={cn(
          'w-10 h-10 rounded-[14px] flex items-center justify-center flex-shrink-0',
          isSelected ? 'bg-primary' : 'bg-surface-muted'
        )}>
          <Buildings className={cn(
            'w-5 h-5',
            isSelected ? 'text-primary-fg' : 'text-fg-muted'
          )} />
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium truncate text-fg">
              {lease.propertyTitle}
            </h3>
            {isEndingSoon && (
              <span className="text-[10px] px-1.5 py-0.5 bg-surface-muted text-fg-muted rounded-full flex-shrink-0">
                Vence pronto
              </span>
            )}
          </div>
          <p className="text-xs text-fg-muted mt-0.5 truncate">
            {lease.tenantName}
          </p>
        </div>

        {/* Rent amount */}
        <div className="text-right flex-shrink-0">
          <p className="text-sm font-medium text-fg font-mono tabular-nums">
            {formatCurrency(lease.monthlyRent)}
          </p>
          <p className="text-[10px] text-fg-muted">/mes</p>
        </div>
      </div>
    </button>
  );
}
