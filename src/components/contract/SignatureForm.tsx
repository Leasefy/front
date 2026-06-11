'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Check, SpinnerGap, ArrowRight, SealCheck, FileText } from '@phosphor-icons/react';
import { OTPVerification } from './OTPVerification';
import { SignaturePad } from './SignaturePad';

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
          <div className="w-10 h-10 rounded-xl bg-[#E8F3EC] dark:bg-[#2C7A53]/15 flex items-center justify-center">
            <SealCheck className="w-5 h-5 text-[#2C7A53] dark:text-[#3EAE70]" />
          </div>
          <div>
            <h3 className="font-semibold text-neutral-900 dark:text-white">Firma electrónica</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Como {role}</p>
          </div>
        </div>
        <div className="rounded-xl border border-[#2C7A53]/30 dark:border-[#2C7A53]/40 bg-[#E8F3EC] dark:bg-[#2C7A53]/15 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2C7A53]">
              <Check className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-[#2C7A53] dark:text-[#3EAE70]">Contrato firmado</p>
              <p className="text-sm text-[#2C7A53] dark:text-[#3EAE70]">
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
          <h3 className="font-semibold text-neutral-900 dark:text-white">Firma electrónica</h3>
          <span className="px-2.5 py-1 rounded-md bg-[#EEF1FF] dark:bg-[#1A40FF]/15 text-xs font-medium text-[#1A40FF] dark:text-[#5570FF]">
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
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#222224] overflow-hidden">
          {/* Terms checkbox */}
          <label className={cn(
            'flex cursor-pointer items-start gap-3 p-4 transition-all',
            acceptedTerms
              ? 'bg-[#EEF1FF]/50 dark:bg-[#1A40FF]/10'
              : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
          )}>
            <div className={cn(
              'w-5 h-5 rounded-sm border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all',
              acceptedTerms
                ? 'bg-[#1A40FF] border-[#1A40FF]/30'
                : 'border-neutral-300 dark:border-neutral-600'
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
                ? 'text-neutral-900 dark:text-white'
                : 'text-neutral-600 dark:text-neutral-400'
            )}>
              Acepto los terminos del contrato incluyendo obligaciones, pagos y terminacion.
            </span>
          </label>

          {/* Divider */}
          <div className="border-t border-neutral-200 dark:border-neutral-700" />

          {/* Legal checkbox */}
          <label className={cn(
            'flex cursor-pointer items-start gap-3 p-4 transition-all',
            acceptedLegal
              ? 'bg-[#EEF1FF]/50 dark:bg-[#1A40FF]/10'
              : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
          )}>
            <div className={cn(
              'w-5 h-5 rounded-sm border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all',
              acceptedLegal
                ? 'bg-[#1A40FF] border-[#1A40FF]/30'
                : 'border-neutral-300 dark:border-neutral-600'
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
                ? 'text-neutral-900 dark:text-white'
                : 'text-neutral-600 dark:text-neutral-400'
            )}>
              Entiendo que esta firma es legalmente vinculante.
            </span>
          </label>

          {/* Divider */}
          <div className="border-t border-neutral-200 dark:border-neutral-700" />

          {/* Data checkbox */}
          <label className={cn(
            'flex cursor-pointer items-start gap-3 p-4 transition-all',
            acceptedData
              ? 'bg-[#EEF1FF]/50 dark:bg-[#1A40FF]/10'
              : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
          )}>
            <div className={cn(
              'w-5 h-5 rounded-sm border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all',
              acceptedData
                ? 'bg-[#1A40FF] border-[#1A40FF]/30'
                : 'border-neutral-300 dark:border-neutral-600'
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
                ? 'text-neutral-900 dark:text-white'
                : 'text-neutral-600 dark:text-neutral-400'
            )}>
              Autorizo el tratamiento de datos personales (Ley 1581/2012).
            </span>
          </label>
        </div>

        {/* Sign Button */}
        <button
          onClick={handleSignClick}
          disabled={!canSign || isLoading}
          className={cn(
            'w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-semibold text-sm transition-all',
            canSign && !isLoading
              ? 'bg-[#1A40FF] hover:opacity-90 text-white'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 cursor-not-allowed'
          )}
        >
          {isLoading ? (
            <>
              <SpinnerGap className="w-4 h-4 animate-spin" />
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
        </button>

        {/* Legal footnote */}
        <p className="text-center text-[11px] text-neutral-400 dark:text-neutral-500">
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
