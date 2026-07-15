'use client';

import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/lib/format';
import { MonoLabel } from '@leasefy/cadence';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
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
    <Card
      onClick={onSelect}
      className={cn(
        'overflow-hidden',
        'rounded-[22px]',
        'transition-all duration-300 ease-out',
        onSelect && 'cursor-pointer',
        isSelected
          ? 'border-primary shadow-elevated ring-2 ring-primary/20'
          : 'shadow-subtle hover:-translate-y-0.5 hover:shadow-elevated',
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
              <h3 className="font-semibold truncate text-fg">
                {lease.propertyTitle}
              </h3>
              <div className="flex items-center gap-1.5 text-sm mt-1 text-fg-muted">
                <MapPin className="w-4 h-4 shrink-0" />
                <span className="truncate">{lease.propertyAddress}</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-lg font-bold text-fg font-mono tabular-nums">
                {formatCurrency(lease.monthlyRent)}
              </p>
              <p className="text-xs text-fg-muted">/mes</p>
            </div>
          </div>

          {/* Contact info */}
          <div className="p-3 mb-4 rounded-[14px] bg-surface-muted">
            <MonoLabel className="block text-xs font-medium tracking-wider mb-2 text-fg-muted">
              {contactLabel}
            </MonoLabel>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-fg-muted" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate text-fg">
                  {contactName}
                </p>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-fg-muted">
                  <span className="flex items-center gap-1 font-mono tabular-nums">
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
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm mb-4 text-fg">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-fg-muted" />
              <span className="font-mono tabular-nums">
                {formatDate(lease.startDate)} - {formatDate(lease.endDate)}
              </span>
            </div>
            {lease.status === 'active' && daysRemaining > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-surface-muted text-fg font-mono tabular-nums">
                {daysRemaining} días restantes
              </span>
            )}
            {lease.status === 'ending_soon' && (
              <Badge variant="warning">
                Vence pronto
              </Badge>
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
    </Card>
  );
}
