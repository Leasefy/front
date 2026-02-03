'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
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
} from 'lucide-react';
import type { Contract } from '@/lib/types/contract';
import { CONTRACT_TYPE_LABELS } from '@/lib/types/contract';
import { getTemplateById } from '@/lib/data/mock-contracts';
import { generateContractPdf } from '@/lib/utils/generate-contract-pdf';

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
          'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0',
          isSigned
            ? 'bg-emerald-100 text-emerald-600'
            : 'bg-muted text-muted-foreground'
        )}
      >
        {isSigned ? (
          <CheckCircle2 className="w-4 h-4" />
        ) : (
          <Clock className="w-3.5 h-3.5" />
        )}
      </div>
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {isSigned && signedAt && (
          <p className="text-xs text-muted-foreground">
            Firmado {formatDate(signedAt)}
          </p>
        )}
        {!isSigned && (
          <p className="text-xs text-muted-foreground">Pendiente</p>
        )}
      </div>
    </div>
  );
}

/**
 * ContractExpandableItem - Expandable contract row with actions
 */
export function ContractExpandableItem({ contract }: ContractExpandableItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSendingReminder, setIsSendingReminder] = useState(false);
  const [reminderCooldown, setReminderCooldown] = useState(false);

  const handleSendReminder = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSendingReminder || reminderCooldown) return;

    setIsSendingReminder(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1200));

    setIsSendingReminder(false);
    setReminderCooldown(true);

    toast.success('Recordatorio enviado', {
      description: `Se envió un recordatorio a ${contract.tenantName} (${contract.tenantEmail}) para firmar el contrato.`,
    });

    // 60s cooldown
    setTimeout(() => setReminderCooldown(false), 60_000);
  }, [isSendingReminder, reminderCooldown, contract.tenantName, contract.tenantEmail]);

  const needsLandlordAction = contract.status === 'pending_landlord';
  const needsTenantAction = contract.status === 'pending_tenant';
  const isActive = contract.status === 'active';
  const contractUrl = `/panel/${contract.propertyId}/contract/${contract.tenantId}`;

  // Status badge config
  const statusConfig = {
    draft: { text: 'Borrador', className: 'bg-muted text-muted-foreground' },
    pending_landlord: { text: 'Tu firma', className: 'bg-indigo-950 text-white' },
    pending_tenant: { text: 'Esperando', className: 'bg-amber-100 text-amber-800' },
    active: { text: 'Activo', className: 'bg-emerald-100 text-emerald-800' },
    expired: { text: 'Expirado', className: 'bg-muted text-muted-foreground' },
    cancelled: { text: 'Cancelado', className: 'bg-red-100 text-red-800' },
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
        className="w-full text-left px-6 py-5 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-4">
          {/* Document icon */}
          <div className="w-11 h-11 rounded-sm bg-muted flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-muted-foreground" />
          </div>

          {/* Main info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5">
              <h3 className="text-base font-medium text-foreground truncate">
                {contract.propertyAddress}
              </h3>
              <span
                className={cn(
                  'text-xs px-2 py-0.5 rounded-sm flex-shrink-0 font-medium',
                  status.className
                )}
              >
                {status.text}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {contract.tenantName} · {contract.propertyCity}
            </p>
          </div>

          {/* Signature status indicators */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="flex items-center gap-1.5">
              <div
                className={cn(
                  'w-2 h-2 rounded-full',
                  contract.landlordSignature ? 'bg-emerald-500' : 'bg-muted-foreground/30'
                )}
              />
              <span className="text-xs text-muted-foreground">Arr.</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div
                className={cn(
                  'w-2 h-2 rounded-full',
                  contract.tenantSignature ? 'bg-emerald-500' : 'bg-muted-foreground/30'
                )}
              />
              <span className="text-xs text-muted-foreground">Inq.</span>
            </div>
          </div>

          {/* Rent amount */}
          <div className="text-right flex-shrink-0 mr-2">
            <p className="text-lg font-semibold text-foreground">
              {formatCurrency(contract.monthlyRent)}
            </p>
            <p className="text-xs text-muted-foreground">/mes</p>
          </div>

          {/* Expand indicator */}
          <ChevronDown
            className={cn(
              'w-5 h-5 text-muted-foreground transition-transform flex-shrink-0',
              isExpanded && 'rotate-180'
            )}
          />
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-6 pb-6">
          <div className="ml-[60px] grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Card 1: Contract Details */}
            <div className="bg-card border border-border rounded-sm p-5">
              <p className="text-xs font-medium text-muted-foreground font-mono uppercase tracking-wider mb-4">
                Detalles del contrato
              </p>
              <div className="space-y-3.5">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-muted-foreground">Tipo</span>
                  <span className="text-sm text-foreground font-medium">
                    {CONTRACT_TYPE_LABELS[contract.type]}
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-muted-foreground">Vigencia</span>
                  <span className="text-sm text-foreground">
                    {formatDate(contract.startDate)} – {formatDate(contract.endDate)}
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-muted-foreground">Administración</span>
                  <span className="text-sm text-foreground font-medium">
                    {formatCurrency(contract.adminFee)}
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-muted-foreground">Garantía</span>
                  <span className="text-sm text-foreground capitalize">{contract.guaranteeType}</span>
                </div>
              </div>
            </div>

            {/* Card 2: Signatures */}
            <div className="bg-card border border-border rounded-sm p-5">
              <p className="text-xs font-medium text-muted-foreground font-mono uppercase tracking-wider mb-4">
                Estado de firmas
              </p>
              <div className="space-y-4">
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
            <div className="bg-card border border-border rounded-sm p-5">
              <p className="text-xs font-medium text-muted-foreground font-mono uppercase tracking-wider mb-4">
                Contacto arrendatario
              </p>
              <div className="space-y-2.5 mb-5">
                <a
                  href={`tel:${contract.tenantPhone}`}
                  className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  {contract.tenantPhone}
                </a>
                <a
                  href={`mailto:${contract.tenantEmail}`}
                  className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  {contract.tenantEmail}
                </a>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
                {needsLandlordAction && (
                  <Link href={contractUrl} className="flex-1">
                    <Button variant="default" size="sm" className="w-full gap-2">
                      <PenLine className="w-4 h-4" />
                      Firmar
                    </Button>
                  </Link>
                )}
                {needsTenantAction && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-2"
                    disabled={isSendingReminder || reminderCooldown}
                    onClick={handleSendReminder}
                  >
                    <Send className={cn('w-4 h-4', isSendingReminder && 'animate-pulse')} />
                    {isSendingReminder ? 'Enviando…' : reminderCooldown ? 'Enviado' : 'Recordar'}
                  </Button>
                )}
                <Link href={contractUrl} className={needsLandlordAction || needsTenantAction ? '' : 'flex-1'}>
                  <Button variant="outline" size="sm" className="w-full gap-2">
                    <FileText className="w-4 h-4" />
                    Ver contrato
                  </Button>
                </Link>
                {isActive && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      const tpl = getTemplateById(contract.templateId);
                      if (tpl) generateContractPdf(contract, tpl);
                    }}
                  >
                    <Download className="w-4 h-4" />
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
