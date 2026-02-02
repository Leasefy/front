'use client';

import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import {
  FileText,
  ChevronDown,
  CheckCircle2,
  Clock,
  PenLine,
  Download,
  Send,
  Phone,
  Mail,
  Calendar,
  Shield,
} from 'lucide-react';
import type { Contract } from '@/lib/types/contract';
import { CONTRACT_TYPE_LABELS } from '@/lib/types/contract';

interface ContractExpandableItemProps {
  contract: Contract;
}

/**
 * Signature indicator - shows signed/pending status
 */
function SignatureIndicator({
  label,
  isSigned,
  signedAt,
}: {
  label: string;
  isSigned: boolean;
  signedAt?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          'w-2 h-2 rounded-full',
          isSigned ? 'bg-foreground' : 'bg-muted'
        )}
      />
      <div>
        <p className="text-sm text-foreground">{label}</p>
        {isSigned && signedAt && (
          <p className="text-[10px] text-muted-foreground">
            Firmado {formatDate(signedAt)}
          </p>
        )}
        {!isSigned && (
          <p className="text-[10px] text-muted-foreground">Pendiente</p>
        )}
      </div>
    </div>
  );
}

/**
 * ContractExpandableItem - Expandable contract row with actions
 * Click to expand and see full details, signature status, and actions
 */
export function ContractExpandableItem({ contract }: ContractExpandableItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const needsLandlordAction = contract.status === 'pending_landlord';
  const needsTenantAction = contract.status === 'pending_tenant';
  const isActive = contract.status === 'active';
  const contractUrl = `/panel/${contract.propertyId}/contract/${contract.tenantId}`;

  // Status badge config
  const statusConfig = {
    draft: { text: 'Borrador', className: 'bg-muted text-muted-foreground' },
    pending_landlord: { text: 'Tu firma', className: 'bg-foreground text-white' },
    pending_tenant: { text: 'Esperando', className: 'bg-muted text-muted-foreground' },
    active: { text: 'Activo', className: 'bg-muted text-muted-foreground' },
    expired: { text: 'Expirado', className: 'bg-muted text-muted-foreground' },
    cancelled: { text: 'Cancelado', className: 'bg-muted text-muted-foreground' },
  };

  const status = statusConfig[contract.status];

  return (
    <div
      className={cn(
        'border-b border-border last:border-0',
        isExpanded && 'bg-muted/30'
      )}
    >
      {/* Main row - clickable */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left p-5 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-4">
          {/* Document icon */}
          <div className="w-10 h-10 rounded-sm bg-muted flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-muted-foreground" />
          </div>

          {/* Main info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-medium text-foreground truncate">
                {contract.propertyAddress}
              </h3>
              <span
                className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded-sm flex-shrink-0',
                  status.className
                )}
              >
                {status.text}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {contract.tenantName} · {contract.propertyCity}
            </p>
          </div>

          {/* Signature status mini indicators */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex items-center gap-1">
              <div
                className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  contract.landlordSignature ? 'bg-foreground' : 'bg-muted'
                )}
              />
              <span className="text-[10px] text-muted-foreground">Arr.</span>
            </div>
            <div className="flex items-center gap-1">
              <div
                className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  contract.tenantSignature ? 'bg-foreground' : 'bg-muted'
                )}
              />
              <span className="text-[10px] text-muted-foreground">Inq.</span>
            </div>
          </div>

          {/* Rent amount */}
          <div className="text-right flex-shrink-0 mr-2">
            <p className="text-sm font-medium text-foreground">
              {formatCurrency(contract.monthlyRent)}
            </p>
            <p className="text-[10px] text-muted-foreground">/mes</p>
          </div>

          {/* Expand indicator */}
          <ChevronDown
            className={cn(
              'w-4 h-4 text-muted-foreground transition-transform flex-shrink-0',
              isExpanded && 'rotate-180'
            )}
          />
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-5 pb-5">
          <div className="ml-14 grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Card 1: Contract Details */}
            <div className="bg-muted/50 border border-border rounded-sm p-4">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-3">
                Detalles del contrato
              </p>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Tipo</span>
                  <span className="text-xs text-foreground font-medium">
                    {CONTRACT_TYPE_LABELS[contract.type]}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Vigencia</span>
                  <span className="text-xs text-foreground">
                    {formatDate(contract.startDate)} - {formatDate(contract.endDate)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Administracion</span>
                  <span className="text-xs text-foreground">{formatCurrency(contract.adminFee)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-muted-foreground">Garantia</span>
                  <span className="text-xs text-foreground capitalize">{contract.guaranteeType}</span>
                </div>
              </div>
            </div>

            {/* Card 2: Signatures */}
            <div className="bg-muted/50 border border-border rounded-sm p-4">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-3">
                Estado de firmas
              </p>
              <div className="space-y-3">
                <SignatureIndicator
                  label="Arrendador"
                  isSigned={!!contract.landlordSignature}
                  signedAt={contract.landlordSignature?.signedAt}
                />
                <SignatureIndicator
                  label="Arrendatario"
                  isSigned={!!contract.tenantSignature}
                  signedAt={contract.tenantSignature?.signedAt}
                />
              </div>
            </div>

            {/* Card 3: Contact & Actions */}
            <div className="bg-muted/50 border border-border rounded-sm p-4">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-3">
                Contacto arrendatario
              </p>
              <div className="space-y-2 mb-4">
                <a
                  href={`tel:${contract.tenantPhone}`}
                  className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                  {contract.tenantPhone}
                </a>
                <a
                  href={`mailto:${contract.tenantEmail}`}
                  className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                  {contract.tenantEmail}
                </a>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-3 border-t border-border">
                {needsLandlordAction && (
                  <Link href={contractUrl} className="flex-1">
                    <Button variant="default" size="sm" className="w-full h-8 text-xs gap-1.5">
                      <PenLine className="w-3.5 h-3.5" />
                      Firmar
                    </Button>
                  </Link>
                )}
                {needsTenantAction && (
                  <Button variant="outline" size="sm" className="flex-1 h-8 text-xs gap-1.5">
                    <Send className="w-3.5 h-3.5" />
                    Recordar
                  </Button>
                )}
                <Link href={contractUrl} className={needsLandlordAction || needsTenantAction ? '' : 'flex-1'}>
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 w-full">
                    <FileText className="w-3.5 h-3.5" />
                    Ver
                  </Button>
                </Link>
                {isActive && (
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                    <Download className="w-3.5 h-3.5" />
                    PDF
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
