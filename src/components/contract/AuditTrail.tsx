'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import { formatDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { FileText, PaperPlaneTilt, PenNib, CheckCircle, Clock, CaretDown, CaretUp, Globe, Monitor, Shield } from '@phosphor-icons/react';
import type { Contract, ContractAuditEvent, ContractAuditEventType } from '@/lib/types/contract';

// ============================================================================
// Types
// ============================================================================

export interface AuditTrailProps {
  /** Contract with audit trail */
  contract: Contract;
  /** Whether to show expanded details by default */
  expanded?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Event Configuration
// ============================================================================

interface EventConfig {
  icon: typeof FileText;
  label: string;
  description: string;
  color: string;
  bgColor: string;
}

const EVENT_CONFIG: Record<ContractAuditEventType, EventConfig> = {
  created: {
    icon: FileText,
    label: 'Contrato creado',
    description: 'El contrato fue generado en la plataforma',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  sent_to_landlord: {
    icon: PaperPlaneTilt,
    label: 'Enviado al arrendador',
    description: 'El contrato fue enviado al arrendador para revisión',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
  },
  landlord_signed: {
    icon: PenNib,
    label: 'Firma del arrendador',
    description: 'El arrendador firmó electrónicamente el contrato',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
  },
  sent_to_tenant: {
    icon: PaperPlaneTilt,
    label: 'Enviado al arrendatario',
    description: 'El contrato fue enviado al arrendatario para firma',
    color: 'text-violet-600',
    bgColor: 'bg-violet-100',
  },
  tenant_signed: {
    icon: PenNib,
    label: 'Firma del arrendatario',
    description: 'El arrendatario firmó electrónicamente el contrato',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
  },
  activated: {
    icon: CheckCircle,
    label: 'Contrato activo',
    description: 'Ambas partes firmaron. El contrato está vigente.',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
  },
};

// ============================================================================
// Helper: Mask IP Address
// ============================================================================

function maskIpAddress(ip: string): string {
  const parts = ip.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.***.***`;
  }
  return '***.***.***';
}

// ============================================================================
// Single Event Component
// ============================================================================

interface AuditEventItemProps {
  event: ContractAuditEvent;
  isLast: boolean;
  showDetails: boolean;
}

function AuditEventItem({ event, isLast, showDetails }: AuditEventItemProps) {
  const { locale } = useTranslation();
  const config = EVENT_CONFIG[event.type];
  const Icon = config.icon;

  const isSignatureEvent = event.type === 'landlord_signed' || event.type === 'tenant_signed';

  return (
    <div className="relative flex gap-4">
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-[15px] top-10 bottom-0 w-0.5 bg-border" />
      )}

      {/* Icon */}
      <div className={cn(
        'relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
        config.bgColor
      )}>
        <Icon className={cn('h-4 w-4', config.color)} />
      </div>

      {/* Content */}
      <div className="flex-1 pb-6">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="font-medium text-foreground text-sm">{config.label}</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              {config.description}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-muted-foreground">
              {formatDate(event.timestamp)}
            </p>
            <p className="text-[10px] text-muted-foreground font-mono">
              {new Date(event.timestamp).toLocaleTimeString(locale === 'es' ? 'es-CL' : 'en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>

        {/* Metadata (expanded view) */}
        {showDetails && event.metadata && (
          <div className="mt-3 rounded-sm bg-muted p-3 space-y-2">
            {event.metadata.userName && (
              <div className="flex items-center gap-2 text-xs">
                <PenNib className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Por:</span>
                <span className="text-foreground font-medium">{event.metadata.userName}</span>
              </div>
            )}
            {event.metadata.ipAddress && (
              <div className="flex items-center gap-2 text-xs">
                <Globe className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">IP:</span>
                <span className="text-foreground font-mono">{maskIpAddress(event.metadata.ipAddress)}</span>
              </div>
            )}
            {event.metadata.userAgent && (
              <div className="flex items-center gap-2 text-xs">
                <Monitor className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Dispositivo:</span>
                <span className="text-foreground truncate max-w-[200px]">
                  {parseUserAgent(event.metadata.userAgent)}
                </span>
              </div>
            )}
            {isSignatureEvent && event.metadata.otpVerified && (
              <div className="flex items-center gap-2 text-xs">
                <Shield className="h-3 w-3 text-emerald-500" />
                <span className="text-emerald-600 font-medium">Identidad verificada por OTP</span>
              </div>
            )}
          </div>
        )}

        {/* Verification badge for signatures */}
        {isSignatureEvent && !showDetails && event.metadata?.otpVerified && (
          <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-emerald-600">
            <Shield className="h-3 w-3" />
            <span>Verificado</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Helper: Parse User Agent
// ============================================================================

function parseUserAgent(userAgent: string): string {
  // Simple parsing for common browsers/devices
  if (userAgent.includes('iPhone')) return 'iPhone (Safari)';
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('Mac OS')) return 'Mac (Chrome/Safari)';
  if (userAgent.includes('Windows')) return 'Windows (Chrome/Edge)';
  if (userAgent.includes('Linux')) return 'Linux';
  return 'Navegador web';
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * AuditTrail - Timeline of contract events
 *
 * Events shown:
 * 1. Contract created
 * 2. Sent to landlord
 * 3. Landlord signed
 * 4. Sent to tenant
 * 5. Tenant signed
 * 6. Contract activated
 *
 * Features:
 * - Vertical timeline with icons
 * - Each event shows date/time, action, metadata
 * - Expandable for technical details (IP, user agent)
 * - Verification badges for completed steps
 */
export function AuditTrail({ contract, expanded = false, className }: AuditTrailProps) {
  const [showDetails, setShowDetails] = useState(expanded);

  // Use audit trail from contract or generate empty array
  const auditEvents = contract.auditTrail || [];

  if (auditEvents.length === 0) {
    return (
      <div className={cn('rounded-sm border border-border bg-card p-6', className)}>
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold text-foreground">Historial de Auditoria</h3>
        </div>
        <p className="text-sm text-muted-foreground text-center py-4">
          No hay eventos registrados aun.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('rounded-sm border border-border bg-card', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold text-foreground">Historial de Auditoria</h3>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {auditEvents.length} eventos
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowDetails(!showDetails)}
          className="text-xs"
        >
          {showDetails ? (
            <>
              <CaretUp className="mr-1 h-3 w-3" />
              Ocultar detalles
            </>
          ) : (
            <>
              <CaretDown className="mr-1 h-3 w-3" />
              Ver detalles tecnicos
            </>
          )}
        </Button>
      </div>

      {/* Timeline */}
      <div className="p-4 pt-6">
        {auditEvents.map((event, index) => (
          <AuditEventItem
            key={event.id}
            event={event}
            isLast={index === auditEvents.length - 1}
            showDetails={showDetails}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-muted/50 border-t border-border text-xs text-muted-foreground text-center">
        <p>
          Todos los eventos son registrados automáticamente con marca de tiempo inmutable.
        </p>
      </div>
    </div>
  );
}
