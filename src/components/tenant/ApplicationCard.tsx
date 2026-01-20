'use client';

import Image from 'next/image';
import { Calendar, MapPin, Hash } from 'lucide-react';

import { cn } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/lib/format';
import { ApplicationStatusBadge } from './ApplicationStatusBadge';
import { MOCK_PROPERTIES } from '@/lib/data/mock-properties';
import type { TenantApplication } from '@/lib/types/tenant-application';
import type { Property } from '@/lib/types/property';

export interface ApplicationCardProps {
  application: TenantApplication;
  onClick?: () => void;
  className?: string;
}

/**
 * Card component for tenant application list
 * Shows property thumbnail, status badge, tracking code, and submission date
 *
 * Layout:
 * +--------------------------------------------------+
 * | [Property Image] | [Title, Location]   [Status] |
 * |                  | [Submitted date]             |
 * |                  | [Tracking code]     [Rent]   |
 * +--------------------------------------------------+
 */
export function ApplicationCard({
  application,
  onClick,
  className,
}: ApplicationCardProps) {
  const { propertyId, status, submittedAt, trackingCode } = application;

  // Find the property from mock data
  const property = MOCK_PROPERTIES.find((p) => p.id === propertyId) as Property | undefined;

  if (!property) {
    return null;
  }

  const {
    title,
    thumbnailUrl,
    neighborhood,
    city,
    monthlyRent,
  } = property;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left bg-white border border-slate-200 rounded-sm overflow-hidden',
        'hover:border-slate-300 hover:shadow-sm transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
        className
      )}
    >
      <div className="flex">
        {/* Property Image */}
        <div className="relative w-24 h-24 sm:w-32 sm:h-32 flex-shrink-0">
          <Image
            src={thumbnailUrl}
            alt={title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 96px, 128px"
          />
        </div>

        {/* Content */}
        <div className="flex-1 p-3 sm:p-4 min-w-0 flex flex-col justify-between">
          {/* Top row: Title and Status */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="text-sm sm:text-base font-medium text-slate-900 truncate">
                {title}
              </h3>
              <p className="flex items-center gap-1 text-xs sm:text-sm text-slate-500 mt-0.5">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{neighborhood}, {city}</span>
              </p>
            </div>
            <ApplicationStatusBadge status={status} size="sm" />
          </div>

          {/* Bottom row: Date, Tracking code, Rent */}
          <div className="flex items-end justify-between gap-2 mt-2">
            <div className="space-y-1">
              {/* Submission date */}
              <p className="flex items-center gap-1 text-xs text-slate-500">
                <Calendar className="w-3 h-3 flex-shrink-0" />
                <span>{formatDate(submittedAt)}</span>
              </p>
              {/* Tracking code */}
              <p className="flex items-center gap-1 text-xs text-slate-400 font-mono">
                <Hash className="w-3 h-3 flex-shrink-0" />
                <span>{trackingCode}</span>
              </p>
            </div>
            {/* Monthly rent */}
            <p className="text-sm sm:text-base font-medium text-slate-900 whitespace-nowrap">
              {formatCurrency(monthlyRent)}
              <span className="text-slate-400 text-xs sm:text-sm font-normal">/mes</span>
            </p>
          </div>
        </div>
      </div>
    </button>
  );
}
