'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Check, ArrowRight, SealCheck, FileText } from '@phosphor-icons/react';
import { Spinner } from '@/components/ui/spinner';
import { OTPVerification } from './OTPVerification';
import { SignaturePad } from './SignaturePad';
import { Button } from '@/components/ui/button';

// ============================================================================
// TextTs
// ============================================================================

export interface SignaturePayload {
  /** true si el OTP fue verificado en este flow */
  otpVerified: boolean;
  /** Base64 PNG de la firma dibujada (data URL con prefix data:image/png;base64,) */
  signatureData: string;
  /** Token one-use devuelto por /otp/verify — incluirlo en el DTO de firma. */
  otpVerificationToken?: string;
}

export interface SignatureFormProps {
  /** Callback when user signs the contract */
  onSign: (payload: SignaturePayload) => void;
  /** Contract ID — used to send/verify OTP against the backend */
  contractId: string;
  /** Whether this is the landlord or tenant signing */
  isLandlord: boolean;
  /** Loading state during signing */
  isLoading?: boolean;
  /** Whether signature is already completed */
  isSigned?: boolean;
  /** Name of the signer for display */
  signerName?: string;
  /** @deprecated The email mask now comes from the backend in /otp/send response */
  signerEmail?: string;
  /** Whether OTP verification is required */
  requireOTP?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * SignatureForm - Legal compliance form for e-signature with OTP verification
 *
 * Features:
 * - Compact legal notice
 * - Required checkboxes with clear labels
 * - OTP verification modal before signing
 * - Disabled state until all checkboxes checked
 * - Loading state during signature process
 * - Success state after signature
 */
export function SignatureForm({
  onSign,
  contractId,
  isLandlord,
  isLoading = false,
  isSigned = false,
  signerName,
  requireOTP = true,
  className,
}: SignatureFormProps) {
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [acceptedData, setAcceptedData] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  const [otpToken, setOtpToken] = useState<string | null>(null);

  const canSign = !!signatureData && acceptedTerms && acceptedLegal && acceptedData;
  const role = isLandlord ? 'Arrendador' : 'Arrendatario';
  const otpRole = isLandlord ? 'landlord' : 'tenant';

  // Handle sign button click
  const handleSignClick = () => {
    if (!signatureData) return;
    if (requireOTP && !otpToken) {
      setShowOTP(true);
    } else {
      onSign({
        otpVerified: !!otpToken,
        signatureData,
        otpVerificationToken: otpToken ?? undefined,
      });
    }
  };

  // Handle OTP verification success — backend devuelve el token one-use que viaja en el DTO
  const handleOTPVerified = (verificationToken: string) => {
    if (!signatureData) return;
    setOtpToken(verificationToken);
    setShowOTP(false);
    const data = signatureData;
    setTimeout(() => {
      onSign({
        otpVerified: true,
        signatureData: data,
        otpVerificationToken: verificationToken,
      });
    }, 300);
  };

  // Handle OTP cancel
  const handleOTPCancel = () => {
    setShowOTP(false);
  };

  // Calculate progress: firma + 3 checkboxes
  const completedSteps = [!!signatureData, acceptedTerms, acceptedLegal, acceptedData].filter(Boolean).length;
  const progress = (completedSteps / 4) * 100;
  void progress;

  // Already signed state
  if (isSigned) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-success-soft flex items-center justify-center">
            <SealCheck className="w-5 h-5 text-success" />
          </div>
          <div>
            <h3 className="font-semibold text-fg">Firma electrónica</h3>
            <p className="text-xs text-fg-muted">Como {role}</p>
          </div>
        </div>
        <div className="rounded-lg border border-success/30 bg-success-soft p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success">
              <Check className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-success">Contrato firmado</p>
              <p className="text-sm text-success">
                {signerName ? `Por ${signerName}` : 'Firma completada exitosamente'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={cn('space-y-4', className)}>
        {/* Header - Simplified */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-fg">Firma electrónica</h3>
          <span className="px-2.5 py-1 rounded-md bg-primary-soft text-xs font-medium text-primary">
            {role}
          </span>
        </div>

        {/* Signature canvas */}
        <SignaturePad
          onChange={setSignatureData}
          signerName={signerName}
          disabled={isLoading}
        />

        {/* Checkboxes - Single card with dividers */}
        <div className="rounded-lg border border-border bg-surface overflow-hidden">
          {/* Terms checkbox */}
          <label className={cn(
            'flex cursor-pointer items-start gap-3 p-4 transition-all',
            acceptedTerms
              ? 'bg-primary-soft/50'
              : 'hover:bg-surface-muted dark:hover:bg-ink'
          )}>
            <div className={cn(
              'w-5 h-5 rounded-[6px] border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all',
              acceptedTerms
                ? 'bg-primary border-primary/30'
                : 'border-border dark:border-border-strong'
            )}>
              {acceptedTerms && <Check className="w-3 h-3 text-white" />}
            </div>
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              disabled={isLoading}
              className="sr-only"
            />
            <span className={cn(
              'text-sm transition-colors',
              acceptedTerms
                ? 'text-fg'
                : 'text-fg-muted'
            )}>
              Acepto los terminos del contrato incluyendo obligaciones, pagos y terminacion.
            </span>
          </label>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Legal checkbox */}
          <label className={cn(
            'flex cursor-pointer items-start gap-3 p-4 transition-all',
            acceptedLegal
              ? 'bg-primary-soft/50'
              : 'hover:bg-surface-muted dark:hover:bg-ink'
          )}>
            <div className={cn(
              'w-5 h-5 rounded-[6px] border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all',
              acceptedLegal
                ? 'bg-primary border-primary/30'
                : 'border-border dark:border-border-strong'
            )}>
              {acceptedLegal && <Check className="w-3 h-3 text-white" />}
            </div>
            <input
              type="checkbox"
              checked={acceptedLegal}
              onChange={(e) => setAcceptedLegal(e.target.checked)}
              disabled={isLoading}
              className="sr-only"
            />
            <span className={cn(
              'text-sm transition-colors',
              acceptedLegal
                ? 'text-fg'
                : 'text-fg-muted'
            )}>
              Entiendo que esta firma es legalmente vinculante.
            </span>
          </label>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Data checkbox */}
          <label className={cn(
            'flex cursor-pointer items-start gap-3 p-4 transition-all',
            acceptedData
              ? 'bg-primary-soft/50'
              : 'hover:bg-surface-muted dark:hover:bg-ink'
          )}>
            <div className={cn(
              'w-5 h-5 rounded-[6px] border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all',
              acceptedData
                ? 'bg-primary border-primary/30'
                : 'border-border dark:border-border-strong'
            )}>
              {acceptedData && <Check className="w-3 h-3 text-white" />}
            </div>
            <input
              type="checkbox"
              checked={acceptedData}
              onChange={(e) => setAcceptedData(e.target.checked)}
              disabled={isLoading}
              className="sr-only"
            />
            <span className={cn(
              'text-sm transition-colors',
              acceptedData
                ? 'text-fg'
                : 'text-fg-muted'
            )}>
              Autorizo el tratamiento de datos personales (Ley 1581/2012).
            </span>
          </label>
        </div>

        {/* Sign Button */}
        <Button
          onClick={handleSignClick}
          disabled={!canSign || isLoading}
          hideArrow
          className="w-full gap-2"
        >
          {isLoading ? (
            <>
              <Spinner size="sm" variant="current" />
              Procesando...
            </>
          ) : !signatureData ? (
            <>
              <FileText className="w-4 h-4" />
              Dibujá tu firma para continuar
            </>
          ) : (
            <>
              <FileText className="w-4 h-4" />
              Firmar contrato
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>

        {/* Legal footnote */}
        <p className="text-center text-[11px] text-fg-muted">
          Firma válida según Ley 527/1999 · Verificación por correo requerida
        </p>
      </div>

      {/* OTP Verification Modal */}
      <OTPVerification
        isOpen={showOTP}
        contractId={contractId}
        role={otpRole}
        onVerified={handleOTPVerified}
        onCancel={handleOTPCancel}
      />
    </>
  );
}
