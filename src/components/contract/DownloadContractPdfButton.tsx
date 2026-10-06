'use client';

import { useState } from 'react';
import { Download } from '@phosphor-icons/react';
import { toast } from '@/components/ui/toast';
import { contractsApi } from '@/lib/api/contracts.service';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import type { ContractStatus } from '@/lib/types/contract';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface DownloadContractPdfButtonProps {
  contractId: string;
  /** Estado actual del contrato — controla el copy del tooltip. */
  contractStatus: ContractStatus;
  /** Estilo visual: 'primary' (azul destacado) | 'secondary' (outline) | 'ghost' (link sutil). */
  variant?: 'primary' | 'secondary' | 'ghost';
  className?: string;
  /** Texto custom — default "Descargar PDF" / "Descargar contrato". */
  label?: string;
  /**
   * QA-CONT-95 (B-06): el número del contrato que ve la inmobiliaria («53»,
   * «1686»): el archivo se llama `contrato-53.pdf`, no `contrato-2dea8734.pdf`.
   */
  numero?: string | number | null;
}

/**
 * Botón que descarga el PDF actual del contrato vía GET /contracts/:id/pdf.
 * El backend resuelve el PDF correcto según el estado (original, parcial, o final con
 * certificado). Funciona en cualquier estado (DRAFT → CANCELLED).
 */
export function DownloadContractPdfButton({
  contractId,
  contractStatus,
  variant = 'secondary',
  className,
  label,
  numero,
}: DownloadContractPdfButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (isLoading) return;
    setIsLoading(true);
    let blobUrl: string | null = null;
    try {
      // Pedimos la signed URL al backend, traemos el PDF como blob y disparamos la descarga
      // con un blob:// URL local. Así el usuario NO ve la URL de Supabase en la barra.
      const { url } = await contractsApi.getSignedPdfUrl(contractId);
      const response = await fetch(url);
      // El status pelado: el traductor lo lee como tal (404 = no está, 5xx =
      // nuestro), en vez de pintar «HTTP 500» en la cara de la persona.
      if (!response.ok) throw new Error(String(response.status));
      const blob = await response.blob();
      blobUrl = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = nombreDelPdfDelContrato(contractId, numero);
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      // 02-10-2026: regla de oro — «conexión» sólo si no hubo respuesta; un
      // 5xx es nuestro, con la referencia; nunca el texto crudo del error.
      toast.error('No se pudo descargar el PDF.', {
        description: mensajeParaLaPersona(err, {
          porDefecto: 'Prueba de nuevo en un momento.',
          accion: 'descargar el PDF del contrato',
        }),
      });
    } finally {
      // Liberamos el blob URL después de un tick — el click ya disparó la descarga.
      if (blobUrl) setTimeout(() => URL.revokeObjectURL(blobUrl!), 1000);
      setIsLoading(false);
    }
  };

  const tooltip = tooltipForStatus(contractStatus);

  // Mapea la API local del botón al variant del DS (Cadence pill).
  const dsVariant = variant === 'primary' ? 'default' : variant === 'ghost' ? 'link' : 'secondary';
  const dsSize = variant === 'primary' ? 'default' : 'sm';

  return (
    <Button
      type="button"
      variant={dsVariant}
      size={variant === 'ghost' ? undefined : dsSize}
      hideArrow
      onClick={handleClick}
      isLoading={isLoading}
      disabled={isLoading}
      title={tooltip}
      className={cn('gap-2', className)}
    >
      <Download className="w-4 h-4" />
      {label ?? 'Descargar PDF'}
    </Button>
  );
}

function tooltipForStatus(status: ContractStatus): string {
  switch (status) {
    case 'draft':
    case 'pending_tenant':
      return 'PDF original sin firmas todavía.';
    case 'pending_landlord':
      return 'PDF con tu firma estampada y certificado parcial — esperando firma del propietario.';
    case 'rejected_pending_modifications':
      return 'PDF del momento del rechazo. Puede tener firmas parciales.';
    case 'signed':
    case 'active':
    case 'expired':
      return 'PDF final con ambas firmas, certificado completo y hash SHA-256.';
    case 'cancelled':
      return 'PDF del último estado antes de cancelarse (evidencia para auditoría).';
    default:
      return 'Descargar contrato en PDF.';
  }
}

/** QA-CONT-95 (B-06): `contrato-53.pdf`; sin número, los primeros 8 del id. */
export function nombreDelPdfDelContrato(contractId: string, numero?: string | number | null): string {
  const limpio = String(numero ?? '').replace(/^#/, '').trim().replace(/[^\p{L}\p{N}_-]+/gu, '-');
  return limpio ? `contrato-${limpio}.pdf` : `contrato-${contractId.slice(0, 8)}.pdf`;
}
