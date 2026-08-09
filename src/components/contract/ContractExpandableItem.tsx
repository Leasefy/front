'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { formatCurrency, formatDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { FileText, CaretDown, CheckCircle, Clock, PencilLine, Download, PaperPlaneTilt, Phone, Envelope } from '@phosphor-icons/react';
import type { Contract, ContractStatus } from '@/lib/types/contract';
import { getContractTypeLabel } from '@/lib/types/contract';
import { contractsApi } from '@/lib/api/contracts.service';

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
          'w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0',
          isSigned
            ? 'bg-success-soft text-success'
            : 'bg-surface-muted text-fg-muted'
        )}
      >
        {isSigned ? (
          <CheckCircle className="w-4 h-4" />
        ) : (
          <Clock className="w-3.5 h-3.5" />
        )}
      </div>
      <div>
        <p className="text-sm font-medium text-fg">{label}</p>
        {isSigned && signedAt && (
          <p className="text-xs text-fg-muted">
            Firmado {formatDate(signedAt)}
          </p>
        )}
        {!isSigned && (
          <p className="text-xs text-fg-muted">Pendiente</p>
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
  const [isPaperPlaneTiltingReminder, setIsPaperPlaneTiltingReminder] = useState(false);
  const [reminderCooldown, setReminderCooldown] = useState(false);

  const handlePaperPlaneTiltReminder = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPaperPlaneTiltingReminder || reminderCooldown) return;

    setIsPaperPlaneTiltingReminder(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1200));

    setIsPaperPlaneTiltingReminder(false);
    setReminderCooldown(true);

    toast.success('Recordatorio enviado', {
      description: `Se envió un recordatorio a ${contract.tenantName} (${contract.tenantEmail}) para firmar el contrato.`,
    });

    // 60s cooldown
    setTimeout(() => setReminderCooldown(false), 60_000);
  }, [isPaperPlaneTiltingReminder, reminderCooldown, contract.tenantName, contract.tenantEmail]);

  const needsLandlordAction = contract.status === 'pending_landlord';
  const needsTenantAction = contract.status === 'pending_tenant';
  const isActive = contract.status === 'active';
  const contractUrl = `/panel/inmobiliaria/contratos/${contract.id}`;

  // Status badge config
  const statusConfig: Record<ContractStatus, { text: string; className: string }> = {
    draft: { text: 'Borrador', className: 'bg-surface-muted text-fg-muted' },
    pending_landlord: { text: 'Tu firma', className: 'bg-primary text-primary-foreground' },
    pending_tenant: { text: 'Esperando', className: 'bg-warning-soft text-warning' },
    rejected_pending_modifications: { text: 'Cambios pedidos', className: 'bg-warning-soft text-warning' },
    signed: { text: 'Firmado', className: 'bg-primary-soft text-primary' },
    active: { text: 'Activo', className: 'bg-success-soft text-success' },
    expired: { text: 'Expirado', className: 'bg-surface-muted text-fg-muted' },
    cancelled: { text: 'Cancelado', className: 'bg-danger-soft text-danger' },
  };

  const status = statusConfig[contract.status];

  return (
    <div
      className={cn(
        'border-b border-border-faint dark:border-border-strong last:border-0',
        isExpanded && 'bg-surface-muted'
      )}
    >
      {/* Main row - clickable */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left px-6 py-5 hover:bg-surface-muted dark:hover:bg-ink transition-colors"
      >
        <div className="flex items-center gap-4">
          {/* Document icon */}
          <div className="w-11 h-11 rounded-xl bg-surface-muted flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-fg-muted" />
          </div>

          {/* Main info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5">
              <h3 className="text-base font-medium text-fg truncate">
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
            <p className="text-sm text-fg-muted mt-0.5">
              {contract.tenantName} · {contract.propertyCity}
            </p>
          </div>

          {/* Signature status indicators */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="flex items-center gap-1.5">
              <div
                className={cn(
                  'w-2.5 h-2.5 rounded-full',
                  contract.landlordSignature
                    ? 'bg-success'
                    : 'bg-surface-muted dark:bg-surface-muted'
                )}
              />
              <span className="text-xs text-fg-muted">Arr.</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div
                className={cn(
                  'w-2.5 h-2.5 rounded-full',
                  contract.tenantSignature
                    ? 'bg-success'
                    : 'bg-surface-muted dark:bg-surface-muted'
                )}
              />
              <span className="text-xs text-fg-muted">Inq.</span>
            </div>
          </div>

          {/* Rent amount */}
          <div className="text-right flex-shrink-0 mr-2">
            <p className="text-lg font-semibold text-fg">
              {formatCurrency(contract.monthlyRent)}
            </p>
            <p className="text-xs text-fg-muted">/mes</p>
          </div>

          {/* Expand indicator */}
          <CaretDown
            className={cn(
              'w-5 h-5 text-fg-muted transition-transform flex-shrink-0',
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
            <div className="bg-surface border border-border rounded-xl p-5">
              <p className="text-xs font-medium text-fg-muted uppercase tracking-wider mb-4">
                Detalles del contrato
              </p>
              <div className="space-y-3.5">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-fg-muted">Tipo</span>
                  <span className="text-sm text-fg font-medium">
                    {getContractTypeLabel(contract)}
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-fg-muted">Vigencia</span>
                  <span className="text-sm text-fg">
                    {formatDate(contract.startDate)} – {formatDate(contract.endDate)}
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-fg-muted">Administración</span>
                  <span className="text-sm text-fg font-medium">
                    {formatCurrency(contract.adminFee)}
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-sm text-fg-muted">Garantía</span>
                  <span className="text-sm text-fg capitalize">{contract.guaranteeType}</span>
                </div>
              </div>
            </div>

            {/* Card 2: Signatures */}
            <div className="bg-surface border border-border rounded-xl p-5">
              <p className="text-xs font-medium text-fg-muted uppercase tracking-wider mb-4">
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
            <div className="bg-surface border border-border rounded-xl p-5">
              <p className="text-xs font-medium text-fg-muted uppercase tracking-wider mb-4">
                Contacto arrendatario
              </p>
              <div className="space-y-2.5 mb-5">
                <a
                  href={`tel:${contract.tenantPhone}`}
                  className="flex items-center gap-2.5 text-sm text-fg-muted hover:text-fg transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  {contract.tenantPhone}
                </a>
                <a
                  href={`mailto:${contract.tenantEmail}`}
                  className="flex items-center gap-2.5 text-sm text-fg-muted hover:text-fg transition-colors"
                >
                  <Envelope className="w-4 h-4" />
                  {contract.tenantEmail}
                </a>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-4 border-t border-border-faint dark:border-border-strong">
                {needsLandlordAction && (
                  <Link href={contractUrl} className="flex-1">
                    <Button className="w-full gap-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl">
                      <PencilLine className="w-4 h-4" />
                      Firmar
                    </Button>
                  </Link>
                )}
                {needsTenantAction && (
                  <Button
                    variant="outline"
                    className="flex-1 gap-2 rounded-xl border-border"
                    disabled={isPaperPlaneTiltingReminder || reminderCooldown}
                    onClick={handlePaperPlaneTiltReminder}
                  >
                    <PaperPlaneTilt className={cn('w-4 h-4', isPaperPlaneTiltingReminder && 'animate-pulse')} />
                    {isPaperPlaneTiltingReminder ? 'Enviando…' : reminderCooldown ? 'Enviado' : 'Recordar'}
                  </Button>
                )}
                <Link href={contractUrl} className={needsLandlordAction || needsTenantAction ? '' : 'flex-1'}>
                  <Button
                    variant="outline"
                    className="w-full gap-2 rounded-xl border-border"
                  >
                    <FileText className="w-4 h-4" />
                    Ver contrato
                  </Button>
                </Link>
                {isActive && (
                  <Button
                    variant="outline"
                    className="gap-2 rounded-xl border-border"
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        const { url } = await contractsApi.getSignedPdfUrl(contract.id);
                        window.open(url, '_blank', 'noopener,noreferrer');
                      } catch {
                        toast.error('No se pudo obtener el PDF del contrato');
                      }
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
