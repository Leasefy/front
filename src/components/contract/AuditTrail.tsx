'use client';

import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { formatDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import {
  FileText,
  PaperPlaneTilt,
  PenNib,
  CheckCircle,
  Clock,
  CaretDown,
  CaretUp,
  Globe,
  Monitor,
  Shield,
  XCircle,
  PencilSimple,
} from '@phosphor-icons/react';
import type { Contract, ContractRejection } from '@/lib/types/contract';

// ============================================================================
// Types
// ============================================================================

export interface AuditTrailProps {
  /** Contract with signatures + timestamps */
  contract: Contract;
  /**
   * Historial de rechazos a mergear en el timeline. Opcional — si no viene,
   * el timeline no incluye eventos de rejection. Usar `useContractRejections(id)`.
   */
  rejections?: ContractRejection[];
  /** Whether to show expanded technical details by default */
  expanded?: boolean;
  className?: string;
}

type TimelineEventType =
  | 'created'
  | 'sent_for_signing'
  | 'tenant_signed'
  | 'landlord_signed'
  | 'rejection_modifications'
  | 'rejection_definitive'
  | 'fully_signed'
  | 'activated';

interface TimelineEvent {
  key: string;
  type: TimelineEventType;
  timestamp: string;
  title: string;
  description?: string;
  actor?: string;
  ipAddress?: string;
  userAgent?: string;
  otpVerified?: boolean;
  reason?: string;
}

// ============================================================================
// Event visual config
// ============================================================================

const EVENT_VISUAL: Record<TimelineEventType, { icon: typeof FileText; color: string; bgColor: string }> = {
  created:                  { icon: FileText,      color: 'text-blue-600 dark:text-blue-400',       bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  sent_for_signing:         { icon: PaperPlaneTilt, color: 'text-indigo-600 dark:text-indigo-400',  bgColor: 'bg-indigo-100 dark:bg-indigo-900/30' },
  tenant_signed:            { icon: PenNib,         color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' },
  landlord_signed:          { icon: PenNib,         color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' },
  rejection_modifications:  { icon: PencilSimple,   color: 'text-amber-600 dark:text-amber-400',    bgColor: 'bg-amber-100 dark:bg-amber-900/30' },
  rejection_definitive:     { icon: XCircle,        color: 'text-rose-600 dark:text-rose-400',      bgColor: 'bg-rose-100 dark:bg-rose-900/30' },
  fully_signed:             { icon: CheckCircle,    color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' },
  activated:                { icon: CheckCircle,    color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' },
};

// ============================================================================
// Derivación del timeline desde el contract
// ============================================================================

function buildTimelineEvents(
  contract: Contract,
  rejections: ContractRejection[],
): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  // 1. Creación del contrato
  events.push({
    key: 'created',
    type: 'created',
    timestamp: contract.createdAt,
    title: 'Contrato creado',
    description: 'El contrato fue generado en la plataforma.',
  });

  // 2. Rechazos (cada uno es un evento con reason + tipo)
  for (const r of rejections) {
    events.push({
      key: `rejection-${r.id}`,
      type: r.type === 'DEFINITIVE' ? 'rejection_definitive' : 'rejection_modifications',
      timestamp: r.createdAt,
      title: r.type === 'DEFINITIVE' ? 'Rechazo definitivo del inquilino' : 'Inquilino pidió cambios',
      description: r.reason,
      actor: `${r.rejectedBy.firstName} ${r.rejectedBy.lastName}`.trim(),
    });
  }

  // 3. Firma del tenant
  if (contract.tenantSignature?.signedAt) {
    events.push({
      key: 'tenant-signed',
      type: 'tenant_signed',
      timestamp: contract.tenantSignature.signedAt,
      title: `Firmado por el inquilino`,
      description: `${contract.tenantSignature.signedBy || contract.tenantName}`,
      actor: contract.tenantSignature.signedBy || contract.tenantName,
      ipAddress: contract.tenantSignature.ipAddress,
      userAgent: contract.tenantSignature.userAgent,
      otpVerified: contract.tenantSignature.otpVerified,
    });
  }

  // 4. Firma del landlord
  if (contract.landlordSignature?.signedAt) {
    events.push({
      key: 'landlord-signed',
      type: 'landlord_signed',
      timestamp: contract.landlordSignature.signedAt,
      title: `Firmado por el propietario`,
      description: `${contract.landlordSignature.signedBy || contract.landlordName}`,
      actor: contract.landlordSignature.signedBy || contract.landlordName,
      ipAddress: contract.landlordSignature.ipAddress,
      userAgent: contract.landlordSignature.userAgent,
      otpVerified: contract.landlordSignature.otpVerified,
    });
  }

  // 5. Contrato completamente firmado (ambas firmas completas)
  if (contract.signedAt) {
    events.push({
      key: 'fully-signed',
      type: 'fully_signed',
      timestamp: contract.signedAt,
      title: 'Contrato completamente firmado',
      description: 'Ambas partes completaron la firma electrónica.',
    });
  }

  // 6. Entró en vigencia
  if (contract.activatedAt) {
    events.push({
      key: 'activated',
      type: 'activated',
      timestamp: contract.activatedAt,
      title: 'Contrato en vigencia',
      description: 'El arrendamiento está activo.',
    });
  }

  // Orden cronológico ascendente (lo más viejo arriba)
  return events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

// ============================================================================
// Helpers
// ============================================================================

function maskIpAddress(ip: string): string {
  const parts = ip.split('.');
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.***.***`;
  return '***.***.***';
}

function parseUserAgent(userAgent: string): string {
  if (userAgent.includes('iPhone')) return 'iPhone (Safari)';
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('Mac OS')) return 'Mac (Chrome/Safari)';
  if (userAgent.includes('Windows')) return 'Windows (Chrome/Edge)';
  if (userAgent.includes('Linux')) return 'Linux';
  return 'Navegador web';
}

// ============================================================================
// Single event component
// ============================================================================

function TimelineEventItem({
  event,
  isLast,
  showDetails,
}: {
  event: TimelineEvent;
  isLast: boolean;
  showDetails: boolean;
}) {
  const { locale } = useI18n();
  const visual = EVENT_VISUAL[event.type];
  const Icon = visual.icon;

  const isSignature = event.type === 'tenant_signed' || event.type === 'landlord_signed';

  return (
    <div className="relative flex gap-4">
      {!isLast && <div className="absolute left-[15px] top-10 bottom-0 w-0.5 bg-border" />}

      <div className={cn('relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full', visual.bgColor)}>
        <Icon className={cn('h-4 w-4', visual.color)} />
      </div>

      <div className="flex-1 pb-6">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className="font-medium text-foreground text-sm">{event.title}</h4>
            {event.description && (
              <p className="text-xs text-muted-foreground mt-0.5 break-words whitespace-pre-wrap">
                {event.description}
              </p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs text-muted-foreground">{formatDate(event.timestamp)}</p>
            <p className="text-[10px] text-muted-foreground font-mono">
              {new Date(event.timestamp).toLocaleTimeString(locale === 'es' ? 'es-CO' : 'en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>

        {/* Detalle técnico expandible — solo para firmas */}
        {isSignature && showDetails && (
          <div className="mt-3 rounded-sm bg-muted p-3 space-y-2">
            {event.actor && (
              <div className="flex items-center gap-2 text-xs">
                <PenNib className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Firmante:</span>
                <span className="text-foreground font-medium">{event.actor}</span>
              </div>
            )}
            {event.ipAddress && (
              <div className="flex items-center gap-2 text-xs">
                <Globe className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">IP:</span>
                <span className="text-foreground font-mono">{maskIpAddress(event.ipAddress)}</span>
              </div>
            )}
            {event.userAgent && (
              <div className="flex items-center gap-2 text-xs">
                <Monitor className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground">Dispositivo:</span>
                <span className="text-foreground truncate max-w-[240px]">{parseUserAgent(event.userAgent)}</span>
              </div>
            )}
            {event.otpVerified && (
              <div className="flex items-center gap-2 text-xs">
                <Shield className="h-3 w-3 text-emerald-500" />
                <span className="text-emerald-600 font-medium">Identidad verificada por código de un solo uso</span>
              </div>
            )}
          </div>
        )}

        {/* Badge verificado en vista compacta */}
        {isSignature && !showDetails && event.otpVerified && (
          <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-emerald-600">
            <Shield className="h-3 w-3" />
            <span>Verificado</span>
          </div>
        )}

        {/* Para rechazos mostramos el actor fuera del detalle técnico */}
        {(event.type === 'rejection_modifications' || event.type === 'rejection_definitive') && event.actor && (
          <p className="mt-1 text-[11px] text-muted-foreground">— {event.actor}</p>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Main component
// ============================================================================

export function AuditTrail({ contract, rejections = [], expanded = false, className }: AuditTrailProps) {
  const [showDetails, setShowDetails] = useState(expanded);

  const events = useMemo(() => buildTimelineEvents(contract, rejections), [contract, rejections]);

  return (
    <div className={cn('rounded-sm border border-border bg-card', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold text-foreground">Historial del contrato</h3>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {events.length} {events.length === 1 ? 'evento' : 'eventos'}
          </span>
        </div>
        {events.some((e) => e.type === 'tenant_signed' || e.type === 'landlord_signed') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs"
          >
            {showDetails ? (
              <><CaretUp className="mr-1 h-3 w-3" />Ocultar detalles</>
            ) : (
              <><CaretDown className="mr-1 h-3 w-3" />Ver detalles técnicos</>
            )}
          </Button>
        )}
      </div>

      {/* Timeline */}
      <div className="p-4 pt-6">
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Sin eventos registrados todavía.
          </p>
        ) : (
          events.map((event, index) => (
            <TimelineEventItem
              key={event.key}
              event={event}
              isLast={index === events.length - 1}
              showDetails={showDetails}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-muted/50 border-t border-border text-xs text-muted-foreground text-center">
        <p>Los eventos se registran con marca de tiempo inmutable.</p>
      </div>
    </div>
  );
}
