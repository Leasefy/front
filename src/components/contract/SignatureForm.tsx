'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { FileSignature, Info, Check, Loader2 } from 'lucide-react';

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
 * - Compact legal notice
 * - Required checkboxes with clear labels
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
      <div className={cn('space-y-3', className)}>
        <h3 className="font-semibold text-slate-900">Firma electrónica</h3>
        <div className="rounded-sm border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500">
              <Check className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="font-medium text-emerald-800">Contrato firmado</p>
              <p className="text-xs text-emerald-600">
                {signerName ? `Por ${signerName}` : 'Firma completada'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">Firma electrónica</h3>
        <span className="text-xs text-slate-500">Como {role}</span>
      </div>

      {/* Legal Notice - Compact */}
      <div className="flex items-start gap-2 rounded-sm bg-slate-50 p-3 text-xs text-slate-600">
        <Info className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" />
        <p>
          Firma válida según Ley 527/1999 sobre comercio electrónico en Colombia.
        </p>
      </div>

      {/* Checkboxes - Compact */}
      <div className="space-y-3">
        <label className="flex cursor-pointer items-start gap-2.5 group">
          <Checkbox
            checked={acceptedTerms}
            onCheckedChange={(checked) => setAcceptedTerms(!!checked)}
            disabled={isLoading}
            className="mt-0.5"
          />
          <span className="text-xs text-slate-600 group-hover:text-slate-800 transition-colors">
            Acepto los términos del contrato incluyendo obligaciones, pagos y terminación.
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-2.5 group">
          <Checkbox
            checked={acceptedLegal}
            onCheckedChange={(checked) => setAcceptedLegal(!!checked)}
            disabled={isLoading}
            className="mt-0.5"
          />
          <span className="text-xs text-slate-600 group-hover:text-slate-800 transition-colors">
            Entiendo que esta firma es legalmente vinculante.
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-2.5 group">
          <Checkbox
            checked={acceptedData}
            onCheckedChange={(checked) => setAcceptedData(!!checked)}
            disabled={isLoading}
            className="mt-0.5"
          />
          <span className="text-xs text-slate-600 group-hover:text-slate-800 transition-colors">
            Autorizo el tratamiento de datos personales (Ley 1581/2012).
          </span>
        </label>
      </div>

      {/* Sign Button */}
      <Button
        onClick={onSign}
        disabled={!canSign || isLoading}
        className="w-full mt-1"
        size="default"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Firmando...
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
        <p className="text-center text-[11px] text-slate-400">
          Acepta todos los términos para continuar
        </p>
      )}
    </div>
  );
}
