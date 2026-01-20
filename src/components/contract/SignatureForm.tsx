'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { FileSignature, AlertCircle, Check, Loader2 } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface SignatureFormProps {
  /** Callback when user signs the contract */
  onSign: () => void;
  /** Whether this is the landlord or tenant signing */
  isLandlord: boolean;
  /** Loading state during signing */
  isLoading?: boolean;
  /** Whether signature is already completed */
  isSigned?: boolean;
  /** Name of the signer for display */
  signerName?: string;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * SignatureForm - Legal compliance form for e-signature
 *
 * Features:
 * - Legal notice explaining binding nature
 * - Required checkboxes for terms and legal acceptance
 * - Disabled state until all checkboxes checked
 * - Loading state during signature process
 * - Success state after signature
 */
export function SignatureForm({
  onSign,
  isLandlord,
  isLoading = false,
  isSigned = false,
  signerName,
  className,
}: SignatureFormProps) {
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [acceptedData, setAcceptedData] = useState(false);

  const canSign = acceptedTerms && acceptedLegal && acceptedData;
  const role = isLandlord ? 'Arrendador' : 'Arrendatario';

  // Already signed state
  if (isSigned) {
    return (
      <div className={cn('rounded-sm border border-emerald-200 bg-emerald-50 p-6', className)}>
        <div className="flex items-center gap-3 text-emerald-700">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white">
            <Check className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold">Contrato firmado</h3>
            <p className="text-sm text-emerald-600">
              {signerName ? `Firmado por ${signerName}` : 'Firma completada'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('rounded-sm border border-slate-200 bg-white p-6', className)}>
      {/* Header */}
      <h3 className="flex items-center gap-2 font-semibold text-slate-900">
        <FileSignature className="h-5 w-5 text-primary" />
        Firmar como {role}
      </h3>

      {/* Legal Notice */}
      <div className="mt-4 rounded-sm border border-amber-200 bg-amber-50 p-4">
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
          <div className="text-sm text-amber-800">
            <p className="font-medium">Aviso legal importante</p>
            <p className="mt-1">
              Al firmar este contrato, usted acepta los terminos y condiciones establecidos. Esta
              firma electronica tiene validez legal segun la Ley 527 de 1999 sobre comercio
              electronico y firmas digitales en Colombia.
            </p>
          </div>
        </div>
      </div>

      {/* Checkboxes */}
      <div className="mt-6 space-y-4">
        {/* Terms acceptance */}
        <label className="flex cursor-pointer items-start gap-3">
          <Checkbox
            id="terms"
            checked={acceptedTerms}
            onCheckedChange={(checked) => setAcceptedTerms(!!checked)}
            disabled={isLoading}
            className="mt-0.5"
          />
          <span className="text-sm text-slate-600">
            He leido y acepto todos los terminos y condiciones del contrato de arrendamiento,
            incluyendo las clausulas sobre obligaciones, pagos y terminacion.
          </span>
        </label>

        {/* Legal binding acceptance */}
        <label className="flex cursor-pointer items-start gap-3">
          <Checkbox
            id="legal"
            checked={acceptedLegal}
            onCheckedChange={(checked) => setAcceptedLegal(!!checked)}
            disabled={isLoading}
            className="mt-0.5"
          />
          <span className="text-sm text-slate-600">
            Entiendo que esta firma electronica tiene la misma validez legal que una firma
            manuscrita y es legalmente vinculante.
          </span>
        </label>

        {/* Data processing acceptance */}
        <label className="flex cursor-pointer items-start gap-3">
          <Checkbox
            id="data"
            checked={acceptedData}
            onCheckedChange={(checked) => setAcceptedData(!!checked)}
            disabled={isLoading}
            className="mt-0.5"
          />
          <span className="text-sm text-slate-600">
            Autorizo el tratamiento de mis datos personales conforme a la Ley 1581 de 2012 de
            proteccion de datos personales.
          </span>
        </label>
      </div>

      {/* Sign Button */}
      <Button
        onClick={onSign}
        disabled={!canSign || isLoading}
        className="mt-6 w-full"
        size="lg"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Firmando contrato...
          </>
        ) : (
          <>
            <FileSignature className="mr-2 h-4 w-4" />
            Firmar contrato
          </>
        )}
      </Button>

      {/* Help text */}
      {!canSign && !isLoading && (
        <p className="mt-3 text-center text-xs text-slate-400">
          Debe aceptar todos los terminos para continuar
        </p>
      )}
    </div>
  );
}
