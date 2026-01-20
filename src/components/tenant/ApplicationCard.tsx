'use client';

import Image from 'next/image';
import { MapPin, Calendar, Hash, ChevronRight, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { formatDate, formatCurrency } from '@/lib/format';
import { mockProperties } from '@/lib/data/mock-properties';
import { Button } from '@/components/ui/button';
import { ApplicationStatusBadge } from './ApplicationStatusBadge';
import type { TenantApplication } from '@/lib/types/tenant-application';
import { canWithdraw } from '@/lib/types/tenant-application';

export interface ApplicationCardProps {
  /** Application to display */
  application: TenantApplication;
  /** Callback when card is clicked */
  onClick?: () => void;
  /** Callback when user wants to withdraw */
  onWithdraw?: (id: string) => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * ApplicationCard - Card component for tenant application list
 *
 * Layout:
 * +--------------------------------------------------+
 * | [Property Thumbnail] | Title              [Badge] |
 * |                      | Location                   |
 * |                      | $ 2.500.000/mes            |
 * +--------------------------------------------------+
 * | Enviada: 18 ene 2026 | Codigo: AF-K7N3P2   [>]   |
 * +--------------------------------------------------+
 */
export function ApplicationCard({
  application,
  onClick,
  onWithdraw,
  className,
}: ApplicationCardProps) {
  const { id, propertyId, status, submittedAt, trackingCode } = application;

  // Find the property for this application
  const property = mockProperties.find((p) => p.id === propertyId);

  if (!property) {
    return null;
  }

  const { title, thumbnailUrl, monthlyRent, neighborhood, city } = property;

  const handleWithdraw = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onWithdraw?.(id);
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left bg-white border border-slate-200 rounded-sm overflow-hidden',
        'hover:border-slate-300 hover:shadow-sm transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
        'group',
        className
      )}
    >
      {/* Main content row */}
      <div className="flex">
        {/* Property thumbnail */}
        <div className="relative w-28 sm:w-36 flex-shrink-0">
          <div className="aspect-square relative">
            <Image
              src={thumbnailUrl}
              alt={title}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 112px, 144px"
            />
          </div>
        </div>

        {/* Property details */}
        <div className="flex-1 p-3 sm:p-4 min-w-0">
          {/* Title and badge row */}
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <h3 className="text-sm sm:text-base font-medium text-slate-900 truncate group-hover:text-primary transition-colors">
              {title}
            </h3>
            <ApplicationStatusBadge status={status} size="sm" className="flex-shrink-0" />
          </div>

          {/* Location */}
          <div className="flex items-center gap-1 text-xs sm:text-sm text-slate-500 mb-1">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">{neighborhood}, {city}</span>
          </div>

          {/* Price */}
          <p className="text-sm font-medium text-slate-900">
            {formatCurrency(monthlyRent)}
            <span className="text-slate-400 text-xs font-normal">/mes</span>
          </p>
        </div>
      </div>

      {/* Footer row - dates and tracking code */}
      <div className="px-3 sm:px-4 py-2.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 sm:gap-4 text-xs text-slate-500 min-w-0">
          {/* Submitted date */}
          <div className="flex items-center gap-1.5 min-w-0">
            <Calendar className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
            <span className="truncate">
              <span className="hidden sm:inline">Enviada: </span>
              {formatDate(submittedAt)}
            </span>
          </div>

          {/* Tracking code */}
          <div className="flex items-center gap-1.5 min-w-0">
            <Hash className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
            <span className="font-mono truncate">{trackingCode}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Withdraw button - only show if application can be withdrawn */}
          {canWithdraw(status) && onWithdraw && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleWithdraw}
              className="h-7 w-7 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
              title="Retirar solicitud"
            >
              <X className="w-4 h-4" />
            </Button>
          )}

          {/* Navigate indicator */}
          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-400 transition-colors" />
        </div>
      </div>
    </button>
  );
}
