'use client';

import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  MapPin,
  Calendar,
  MessageCircle,
  FileText,
  CreditCard,
  User,
  Phone,
  Mail,
} from 'lucide-react';
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
  { label: string; className: string }
> = {
  active: {
    label: 'Activo',
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  ending_soon: {
    label: 'Proximo a vencer',
    className: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  ended: {
    label: 'Finalizado',
    className: 'bg-slate-100 text-slate-600 border-slate-200',
  },
  terminated: {
    label: 'Terminado',
    className: 'bg-red-100 text-red-700 border-red-200',
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
        'bg-white rounded-sm border overflow-hidden transition-all',
        onSelect && 'cursor-pointer hover:shadow-md',
        isSelected
          ? 'border-primary ring-2 ring-primary/20'
          : 'border-slate-100',
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
            className={cn(
              'absolute top-3 left-3 border',
              status.className
            )}
          >
            {status.label}
          </Badge>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 sm:p-5">
          {/* Header with title and rent */}
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="min-w-0">
              <h3 className="font-semibold text-slate-900 truncate">
                {lease.propertyTitle}
              </h3>
              <div className="flex items-center gap-1.5 text-sm text-slate-500 mt-1">
                <MapPin className="w-4 h-4 shrink-0" />
                <span className="truncate">{lease.propertyAddress}</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-lg font-bold text-slate-900">
                {formatCurrency(lease.monthlyRent)}
              </p>
              <p className="text-xs text-slate-400">/mes</p>
            </div>
          </div>

          {/* Contact info */}
          <div className="bg-slate-50 rounded-sm p-3 mb-4">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
              {contactLabel}
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                <User className="w-5 h-5 text-slate-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-900 truncate">
                  {contactName}
                </p>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {contactPhone}
                  </span>
                  <span className="flex items-center gap-1 truncate">
                    <Mail className="w-3 h-3" />
                    {contactEmail}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Dates and time remaining */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600 mb-4">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>
                {formatDate(lease.startDate)} - {formatDate(lease.endDate)}
              </span>
            </div>
            {lease.status === 'active' && daysRemaining > 0 && (
              <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                {daysRemaining} dias restantes
              </span>
            )}
            {lease.status === 'ending_soon' && (
              <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded">
                Vence pronto
              </span>
            )}
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="gap-2">
              <MessageCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Mensaje</span>
            </Button>
            {lease.contractUrl && (
              <Button variant="outline" size="sm" className="gap-2">
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Contrato</span>
              </Button>
            )}
            {view === 'tenant' && lease.status === 'active' && (
              <Link href={`/mi-arriendo/${lease.id}/pagar`}>
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
