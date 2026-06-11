'use client';

import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Calendar, ChatCircle, FileText, CreditCard, User, Phone, Envelope } from '@phosphor-icons/react';
import type { Lease } from '@/lib/types/lease';

interface LeaseCardProps {
  lease: Lease;
  view: 'landlord' | 'tenant';
  onSelect?: () => void;
  isSelected?: boolean;
  className?: string;
}

const statusConfig: Record<
  Lease['status'],
  { label: string; variant: 'success' | 'warning' | 'secondary' | 'destructive' }
> = {
  active: {
    label: 'Activo',
    variant: 'success',
  },
  ending_soon: {
    label: 'Próximo a vencer',
    variant: 'warning',
  },
  ended: {
    label: 'Finalizado',
    variant: 'secondary',
  },
  terminated: {
    label: 'Terminado',
    variant: 'destructive',
  },
};

/**
 * LeaseCard - Displays lease information for landlord or tenant view
 * Shows property info, contact details, and quick actions
 */
export function LeaseCard({
  lease,
  view,
  onSelect,
  isSelected = false,
  className,
}: LeaseCardProps) {
  const status = statusConfig[lease.status];
  const contactName =
    view === 'landlord' ? lease.tenantName : lease.landlordName;
  const contactEmail =
    view === 'landlord' ? lease.tenantEmail : lease.landlordEmail;
  const contactPhone =
    view === 'landlord' ? lease.tenantPhone : lease.landlordPhone;
  const contactLabel = view === 'landlord' ? 'Arrendatario' : 'Propietario';

  const daysRemaining = Math.ceil(
    (new Date(lease.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div
      onClick={onSelect}
      className={cn(
        'overflow-hidden',
        'rounded-sm',
        'transition-all duration-300 ease-out',
        onSelect && 'cursor-pointer',
        isSelected
          ? 'bg-card text-card-foreground border border-primary rounded-sm shadow-elevated ring-2 ring-primary/20'
          : 'bg-card text-card-foreground border border-border rounded-sm shadow-subtle hover:-translate-y-0.5 hover:shadow-elevated',
        className
      )}
    >
      <div className="flex flex-col sm:flex-row">
        {/* Property thumbnail */}
        <div className="relative w-full sm:w-48 h-36 sm:h-auto shrink-0">
          <Image
            src={lease.propertyThumbnail}
            alt={lease.propertyTitle}
            fill
            className="object-cover"
          />
          <Badge
            variant={status.variant}
            className="absolute top-3 left-3"
          >
            {status.label}
          </Badge>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 sm:p-5">
          {/* Header with title and rent */}
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="min-w-0">
              <h3 className={cn('font-semibold truncate', 'text-foreground')}>
                {lease.propertyTitle}
              </h3>
              <div className={cn('flex items-center gap-1.5 text-sm mt-1', 'text-muted-foreground')}>
                <MapPin className="w-4 h-4 shrink-0" />
                <span className="truncate">{lease.propertyAddress}</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className={cn('text-lg font-bold', 'text-foreground')}>
                {formatCurrency(lease.monthlyRent)}
              </p>
              <p className={cn('text-xs', 'text-muted-foreground')}>/mes</p>
            </div>
          </div>

          {/* Contact info */}
          <div className={cn('p-3 mb-4', 'rounded-sm', 'bg-muted/50')}>
            <p className={cn('text-xs font-medium font-mono uppercase tracking-wider mb-2', 'text-muted-foreground')}>
              {contactLabel}
            </p>
            <div className="flex items-center gap-3">
              <div className={cn('w-10 h-10', 'rounded-full', 'bg-muted flex items-center justify-center shrink-0')}>
                <User className={cn('w-5 h-5', 'text-muted-foreground')} />
              </div>
              <div className="min-w-0 flex-1">
                <p className={cn('font-medium truncate', 'text-foreground')}>
                  {contactName}
                </p>
                <div className={cn('flex flex-wrap gap-x-3 gap-y-1 text-xs', 'text-muted-foreground')}>
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {contactPhone}
                  </span>
                  <span className="flex items-center gap-1 truncate">
                    <Envelope className="w-3 h-3" />
                    {contactEmail}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Dates and time remaining */}
          <div className={cn('flex flex-wrap items-center gap-x-4 gap-y-2 text-sm mb-4', 'text-foreground')}>
            <div className="flex items-center gap-1.5">
              <Calendar className={cn('w-4 h-4', 'text-muted-foreground')} />
              <span>
                {formatDate(lease.startDate)} - {formatDate(lease.endDate)}
              </span>
            </div>
            {lease.status === 'active' && daysRemaining > 0 && (
              <span className={cn('text-xs px-2 py-0.5', 'rounded-sm', 'bg-muted text-foreground')}>
                {daysRemaining} días restantes
              </span>
            )}
            {lease.status === 'ending_soon' && (
              <span className={cn('text-xs px-2 py-0.5', 'rounded-sm', 'bg-[#F8F0E0] text-[#B7791F] dark:bg-[#B7791F]/15 dark:text-[#D2992F]')}>
                Vence pronto
              </span>
            )}
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <ChatCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Mensaje</span>
            </Button>
            {lease.contractUrl && (
              <Button variant="outline" size="sm" className="gap-2">
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Contrato</span>
              </Button>
            )}
            {view === 'tenant' && lease.status === 'active' && (
              <Link href={`/inquilino/pagos`}>
                <Button size="sm" className="gap-2">
                  <CreditCard className="w-4 h-4" />
                  Pagar renta
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
