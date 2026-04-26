'use client';

import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/format';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Shield, CheckCircle, FileText, Download, QrCode, Lock, Clock, Hash, User } from '@phosphor-icons/react';
import type { Contract } from '@/lib/types/contract';

// ============================================================================
// TextTs
// ============================================================================

export interface AuthenticityCertificateProps {
  /** Contract to generate certificate for */
  contract: Contract;
  /** Display variant */
  variant: 'preview' | 'full';
  /** Whether modal is open (for full variant) */
  isOpen?: boolean;
  /** Callback to close modal */
  onClose?: () => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * El certificate ID es el mismo `contract.id` (UUID). Así lo modela el backend,
 * y el PDF estampado incluye ese mismo ID en la página de certificado para que el
 * endpoint de verificación (`/verify/:contractId`) matchee exacto.
 */
function generateCertificateId(contract: Contract): string {
  return contract.id;
}

/**
 * Generate a mock document hash (SHA-256 style)
 */
function generateDocumentHash(contract: Contract): string {
  if (contract.documentHash) return contract.documentHash;

  // Generate a mock SHA-256 hash based on contract ID
  const baseString = `${contract.id}-${contract.createdAt}-${contract.landlordId}-${contract.tenantId}`;
  let hash = '';
  for (let i = 0; i < 64; i++) {
    const charCode = baseString.charCodeAt(i % baseString.length);
    hash += ((charCode * (i + 1)) % 16).toString(16);
  }
  return hash.toLowerCase();
}

/**
 * Mask IP address for display
 */
function maskIpAddress(ip: string): string {
  const parts = ip.split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.***.***`;
  }
  return '***.***.***';
}

// ============================================================================
// Certificate Content Component
// ============================================================================

interface CertificateContentProps {
  contract: Contract;
  variant: 'preview' | 'full';
  className?: string;
}

function CertificateContent({ contract, variant, className }: CertificateContentProps) {
  const certificateId = generateCertificateId(contract);
  const documentHash = generateDocumentHash(contract);
  const isActive = contract.status === 'active';

  const landlordIp = contract.landlordSignature?.ipAddress
    ? maskIpAddress(contract.landlordSignature.ipAddress)
    : null;
  const tenantIp = contract.tenantSignature?.ipAddress
    ? maskIpAddress(contract.tenantSignature.ipAddress)
    : null;

  return (
    <div className={cn('bg-card rounded-sm', variant === 'full' ? 'p-0' : 'p-4 border border-border', className)}>
      {/* Header with seal */}
      <div className={cn(
        'flex items-center justify-between border-b border-border',
        variant === 'full' ? 'p-6 bg-muted/50' : 'pb-4'
      )}>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className={cn('font-semibold text-foreground', variant === 'full' ? 'text-lg' : 'text-base')}>
              Certificado de Autenticidad Digital
            </h3>
            <p className="text-xs text-muted-foreground font-mono">
              {certificateId}
            </p>
          </div>
        </div>
        {isActive && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700">
            <CheckCircle className="h-4 w-4" />
            <span className="text-xs font-semibold">VÁLIDO</span>
          </div>
        )}
      </div>

      {/* Document Info */}
      <div className={cn('border-b border-border', variant === 'full' ? 'p-6' : 'py-4')}>
        <h4 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">
          Documento Certificado
        </h4>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">
              Contrato de Arrendamiento - {contract.propertyAddress}
            </span>
          </div>
          <div className="flex items-start gap-2">
            <Hash className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-muted-foreground">Hash SHA-256</p>
              <p className="text-xs font-mono text-foreground break-all leading-relaxed">
                {variant === 'full' ? documentHash : `${documentHash.slice(0, 32)}...`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Parties */}
      <div className={cn('border-b border-border', variant === 'full' ? 'p-6' : 'py-4')}>
        <h4 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">
          Partes Firmantes
        </h4>
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Landlord */}
          <div className="rounded-sm border border-border p-3">
            <div className="flex items-center gap-2 mb-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">ARRENDADOR</span>
            </div>
            <p className="font-medium text-foreground text-sm">{contract.landlordName}</p>
            <p className="text-xs text-muted-foreground">CC: {contract.landlordDocument}</p>
            {contract.landlordSignature && (
              <div className="mt-2 pt-2 border-t border-border">
                <div className="flex items-center gap-1.5 text-emerald-600 text-xs">
                  <CheckCircle className="h-3 w-3" />
                  Firmado
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDate(contract.landlordSignature.signedAt)}
                </p>
                {variant === 'full' && landlordIp && (
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">
                    IP: {landlordIp}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Tenant */}
          <div className="rounded-sm border border-border p-3">
            <div className="flex items-center gap-2 mb-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">ARRENDATARIO</span>
            </div>
            <p className="font-medium text-foreground text-sm">{contract.tenantName}</p>
            <p className="text-xs text-muted-foreground">CC: {contract.tenantDocument}</p>
            {contract.tenantSignature && (
              <div className="mt-2 pt-2 border-t border-border">
                <div className="flex items-center gap-1.5 text-emerald-600 text-xs">
                  <CheckCircle className="h-3 w-3" />
                  Firmado
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDate(contract.tenantSignature.signedAt)}
                </p>
                {variant === 'full' && tenantIp && (
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">
                    IP: {tenantIp}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Timestamps */}
      <div className={cn('border-b border-border', variant === 'full' ? 'p-6' : 'py-4')}>
        <h4 className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-3">
          Cronología de Firmas
        </h4>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-foreground">
              Creación: {formatDate(contract.createdAt)}
            </span>
          </div>
          {contract.landlordSignature && (
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <span className="text-sm text-foreground">
                Firma arrendador: {formatDate(contract.landlordSignature.signedAt)}
              </span>
            </div>
          )}
          {contract.tenantSignature && (
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <span className="text-sm text-foreground">
                Firma arrendatario: {formatDate(contract.tenantSignature.signedAt)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* QR Code placeholder & Legal Reference */}
      <div className={cn(variant === 'full' ? 'p-6' : 'pt-4')}>
        <div className="flex items-start gap-4">
          {/* QR Placeholder */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex h-20 w-20 items-center justify-center rounded-sm border-2 border-dashed border-border bg-muted">
              <QrCode className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-[10px] text-muted-foreground text-center">
              Escanea para verificar
            </p>
          </div>

          {/* Legal Reference */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-semibold text-foreground">Validez Legal</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Este certificado acredita la autenticidad del documento digital firmado electrónicamente.
              Válido conforme a la <strong>Ley 527 de 1999</strong> sobre mensajes de datos y comercio electrónico,
              y el <strong>Decreto 2364 de 2012</strong> que reglamenta la firma electrónica en Colombia.
            </p>
            {variant === 'full' && (
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                Para verificar la autenticidad de este documento, escanee el código QR o visite
                <span className="font-mono text-primary ml-1">verify.leasefy.co/{certificateId}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className={cn(
        'text-center text-xs text-muted-foreground',
        variant === 'full' ? 'p-4 bg-muted/50 border-t border-border' : 'pt-4 mt-4 border-t border-border'
      )}>
        <p>
          Leasefy &middot; Certificado generado automáticamente &middot;{' '}
          {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * AuthenticityCertificate - Visual certificate for signed contracts
 *
 * Features:
 * - Certificate ID: CERT-{contractId}-{timestamp}
 * - Document hash (SHA-256 mock)
 * - Parties data with signatures
 * - Signature timestamps
 * - IP addresses (partially masked)
 * - QR code placeholder
 * - Legal reference (Ley 527/1999)
 */
export function AuthenticityCertificate({
  contract,
  variant,
  isOpen = false,
  onClose,
  className,
}: AuthenticityCertificateProps) {
  // Preview variant - inline display
  if (variant === 'preview') {
    return <CertificateContent contract={contract} variant="preview" className={className} />;
  }

  // Full variant - modal display
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose?.()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>Certificado de Autenticidad</DialogTitle>
        </DialogHeader>

        <CertificateContent contract={contract} variant="full" />

        {/* Action buttons */}
        <div className="flex justify-end gap-3 p-4 border-t border-border bg-muted/30">
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          <Button>
            <Download className="mr-2 h-4 w-4" />
            Descargar Certificado
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
