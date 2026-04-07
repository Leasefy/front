'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { PencilLine, Info, Check, SpinnerGap, Shield, DeviceMobile, ArrowRight, Scales, SealCheck, FileText } from '@phosphor-icons/react';
import { OTPVerification } from './OTPVerification';

// ============================================================================
// TextTs
// ============================================================================

export interface SignatureFormProps {
  /** Callback when user signs the contract (receives OTP verification status) */
  onSign: (otpVerified: boolean) => void;
  /** Whether this is the landlord or tenant signing */
  isLandlord: boolean;
  /** Loading state during signing */
  isLoading?: boolean;
  /** Whether signature is already completed */
  isSigned?: boolean;
  /** Name of the signer for display */
  signerName?: string;
  /** Phone number for OTP verification */
  signerPhone?: string;
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
  isLandlord,
  isLoading = false,
  isSigned = false,
  signerName,
  signerPhone = '+57 300 000 0000',
  requireOTP = true,
  className,
}: SignatureFormProps) {
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [acceptedData, setAcceptedData] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);

  const canSign = acceptedTerms && acceptedLegal && acceptedData;
  const role = isLandlord ? 'Arrendador' : 'Arrendatario';

  // Handle sign button click
  const handleSignClick = () => {
    if (requireOTP && !otpVerified) {
      setShowOTP(true);
    } else {
      onSign(otpVerified);
    }
  };

  // Handle OTP verification success
  const handleOTPVerified = () => {
    setOtpVerified(true);
    setShowOTP(false);
    // Proceed with signing after brief delay
    setTimeout(() => {
      onSign(true);
    }, 300);
  };

  // Handle OTP resend
  const handleOTPResend = () => {
    // In production, this would trigger a new OTP send via API
    console.log('Resending OTP to:', signerPhone);
  };

  // Handle OTP cancel
  const handleOTPCancel = () => {
    setShowOTP(false);
  };

  // Calculate progress
  const acceptedCount = [acceptedTerms, acceptedLegal, acceptedData].filter(Boolean).length;
  const progress = (acceptedCount / 3) * 100;

  // Already signed state
  if (isSigned) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <SealCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="font-semibold text-neutral-900 dark:text-white">Firma electrónica</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Como {role}</p>
          </div>
        </div>
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-900/20 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500">
              <Check className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-emerald-800 dark:text-emerald-200">Contrato firmado</p>
              <p className="text-sm text-emerald-600 dark:text-emerald-400">
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
          <span className="px-2.5 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 text-xs font-medium text-indigo-700 dark:text-indigo-300">
            {role}
          </span>
        </div>

        {/* Checkboxes - Single card with dividers */}
        <div className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#222224] overflow-hidden">
          {/* Terms checkbox */}
          <label className={cn(
            'flex cursor-pointer items-start gap-3 p-4 transition-all',
            acceptedTerms
              ? 'bg-indigo-50/50 dark:bg-indigo-900/10'
              : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
          )}>
            <div className={cn(
              'w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all',
              acceptedTerms
                ? 'bg-indigo-600 border-indigo-600'
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
              ? 'bg-indigo-50/50 dark:bg-indigo-900/10'
              : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
          )}>
            <div className={cn(
              'w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all',
              acceptedLegal
                ? 'bg-indigo-600 border-indigo-600'
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
              ? 'bg-indigo-50/50 dark:bg-indigo-900/10'
              : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
          )}>
            <div className={cn(
              'w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all',
              acceptedData
                ? 'bg-indigo-600 border-indigo-600'
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
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white uppercase tracking-wide font-mono'
              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 cursor-not-allowed'
          )}
        >
          {isLoading ? (
            <>
              <SpinnerGap className="w-4 h-4 animate-spin" />
              Procesando...
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
          Firma válida según Ley 527/1999 · Verificación SMS requerida
        </p>
      </div>

      {/* OTP Verification Modal */}
      <OTPVerification
        isOpen={showOTP}
        phone={signerPhone}
        onVerified={handleOTPVerified}
        onResend={handleOTPResend}
        onCancel={handleOTPCancel}
      />
    </>
  );
}
