'use client';

import { useState } from 'react';
import { Download, SpinnerGap } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { contractsApi } from '@/lib/api/contracts.service';
import type { ContractStatus } from '@/lib/types/contract';
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
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      blobUrl = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `contrato-${contractId.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo descargar el PDF';
      toast.error(msg);
    } finally {
      // Liberamos el blob URL después de un tick — el click ya disparó la descarga.
      if (blobUrl) setTimeout(() => URL.revokeObjectURL(blobUrl!), 1000);
      setIsLoading(false);
    }
  };

  const tooltip = tooltipForStatus(contractStatus);

  const base = 'inline-flex items-center gap-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const variantClasses = {
    primary: 'px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white',
    secondary: 'px-3 py-2 rounded-xl border border-border bg-background text-foreground hover:bg-muted',
    ghost: 'text-muted-foreground hover:text-foreground underline-offset-2 hover:underline',
  }[variant];

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      title={tooltip}
      className={cn(base, variantClasses, className)}
    >
      {isLoading ? (
        <SpinnerGap className="w-4 h-4 animate-spin" />
      ) : (
        <Download className="w-4 h-4" />
      )}
      {label ?? 'Descargar PDF'}
    </button>
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
