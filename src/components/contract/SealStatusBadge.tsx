'use client';

import { useState } from 'react';
import { ArrowsClockwise } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import { contractsApi } from '@/lib/api/contracts.service';
import { motivoDelFalloDelContrato } from '@/lib/contratos/errores-del-contrato';
import { describirEstadoDeSello } from '@/lib/contratos/estado-del-sello';
import type { DocumentoFirmado } from '@/lib/types/contract';

export interface SealStatusBadgeProps {
  contractId: string;
  documentoFirmado: DocumentoFirmado | null | undefined;
  /** `contratos:edit` — sólo con permiso se ofrece el botón de reintentar (B3). */
  canEdit: boolean;
  /** Se llama tras un reintento exitoso, para refrescar el contrato (el sello queda PENDING). */
  onReintentado?: () => void;
  className?: string;
}

/**
 * T-0109 contract.md §3.1.B / §3.2 — badge del estado de sello (PAdES) del
 * PDF final, con el botón de reintentar (B3) cuando falló. Ausente/null/
 * parcial → no renderiza nada (nunca un badge vacío ni "sin dato" gritado).
 */
export function SealStatusBadge({
  contractId,
  documentoFirmado,
  canEdit,
  onReintentado,
  className,
}: SealStatusBadgeProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const estado = describirEstadoDeSello(documentoFirmado);
  if (!estado) return null;

  const handleRetry = async () => {
    if (isRetrying) return;
    setIsRetrying(true);
    try {
      await contractsApi.reintentarSello(contractId);
      toast.success('Reintentando el sello del documento.');
      onReintentado?.();
    } catch (err) {
      toast.error('No se pudo reintentar el sello.', {
        description: motivoDelFalloDelContrato(err, {
          porDefecto: 'Prueba de nuevo en un momento.',
          accion: 'reintentar el sello',
        }),
      });
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className={className}>
      <Badge
        variant={estado.tono === 'success' ? 'success' : estado.tono === 'warning' ? 'warning' : 'destructive'}
        data-testid="seal-status-badge"
      >
        {estado.etiqueta}
      </Badge>
      {estado.puedeReintentar && canEdit && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          hideArrow
          onClick={handleRetry}
          isLoading={isRetrying}
          disabled={isRetrying}
          className="gap-1.5 ml-1"
          data-testid="seal-retry-button"
        >
          <ArrowsClockwise className="w-3.5 h-3.5" />
          Reintentar sello
        </Button>
      )}
    </div>
  );
}
