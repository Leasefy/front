'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { SpinnerGap, CheckCircle, WarningCircle, DeviceMobile, ArrowsClockwise } from '@phosphor-icons/react';

// ============================================================================
// TextTs
// ============================================================================

export interface OTPVerificationProps {
  /** Whether the OTP modal is open */
  isOpen: boolean;
  /** Phone number to verify (partially masked: ***-***-4567) */
  phone: string;
  /** Callback when OTP is verified successfully */
  onVerified: () => void;
  /** Callback to resend OTP code */
  onResend: () => void;
  /** Callback to cancel verification */
  onCancel: () => void;
  /** Additional CSS classes */
  className?: string;
}

type OTPStatus = 'idle' | 'sending' | 'verifying' | 'verified' | 'error';

// Mock OTP code for development
const MOCK_OTP_CODE = '123456';
const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60; // seconds

// ============================================================================
// Helper: Mask phone number
// ============================================================================

function maskPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // Show only last 4 digits
  if (digits.length >= 4) {
    const lastFour = digits.slice(-4);
    return `***-***-${lastFour}`;
  }

  return '***-***-****';
}

// ============================================================================
// Component
// ============================================================================

/**
 * OTPVerification - Modal component for phone verification via OTP
 *
 * Features:
 * - 6-digit OTP input with auto-focus
 * - 60-second countdown for resend
 * - States: idle, sending, verifying, verified, error
 * - Mock validation (123456 always valid)
 */
export function OTPVerification({
  isOpen,
  phone,
  onVerified,
  onResend,
  onCancel,
  className,
}: OTPVerificationProps) {
  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [status, setStatus] = useState<OTPStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(RESEND_COOLDOWN);
  const [canResend, setCanResend] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const maskedPhone = maskPhoneNumber(phone);

  // Countdown timer for resend
  useEffect(() => {
    if (!isOpen) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setOtp(Array(OTP_LENGTH).fill(''));
      setStatus('idle');
      setError(null);
      setCountdown(RESEND_COOLDOWN);
      setCanResend(false);
      // Focus first input after a short delay
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [isOpen]);

  // Verify OTP - defined first to be used in callbacks
  const verifyOTP = useCallback(async (code: string) => {
    setStatus('verifying');
    setError(null);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (code === MOCK_OTP_CODE) {
      setStatus('verified');
      // Brief delay to show success state
      setTimeout(() => {
        onVerified();
      }, 800);
    } else {
      setStatus('error');
      setError('Código incorrecto. Intenta de nuevo.');
      // Clear OTP and focus first input
      setOtp(Array(OTP_LENGTH).fill(''));
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [onVerified]);

  // Handle input change
  const handleChange = useCallback((index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    setOtp((prevOtp) => {
      const newOtp = [...prevOtp];
      newOtp[index] = value;

      // Auto-focus next input
      if (value && index < OTP_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }

      // Auto-verify when all digits are entered
      if (value && index === OTP_LENGTH - 1) {
        const fullCode = newOtp.join('');
        if (fullCode.length === OTP_LENGTH) {
          verifyOTP(fullCode);
        }
      }

      return newOtp;
    });
    setError(null);
  }, [verifyOTP]);

  // Handle paste
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);

    if (pastedData) {
      const newOtp = Array(OTP_LENGTH).fill('');
      pastedData.split('').forEach((digit, i) => {
        newOtp[i] = digit;
      });
      setOtp(newOtp);
      setError(null);

      // Focus last filled input or verify if complete
      if (pastedData.length === OTP_LENGTH) {
        verifyOTP(pastedData);
      } else {
        inputRefs.current[pastedData.length]?.focus();
      }
    }
  }, [verifyOTP]);

  // Handle keydown for backspace navigation
  const handleKeyDown = useCallback((index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }, [otp]);

  // Handle resend
  const handleResend = () => {
    if (!canResend) return;

    setStatus('sending');
    setOtp(Array(OTP_LENGTH).fill(''));
    setError(null);

    // Simulate sending
    setTimeout(() => {
      setStatus('idle');
      setCountdown(RESEND_COOLDOWN);
      setCanResend(false);
      onResend();
      inputRefs.current[0]?.focus();
    }, 1000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className={cn('sm:max-w-md', className)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DeviceMobile className="h-5 w-5 text-primary" />
            Verificación de identidad
          </DialogTitle>
          <DialogDescription>
            Enviamos un código de 6 dígitos a tu teléfono {maskedPhone}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* OTP Input */}
          <div className="flex justify-center gap-2" onPaste={handlePaste}>
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => { inputRefs.current[index] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                disabled={status === 'verifying' || status === 'verified'}
                className={cn(
                  'h-14 w-12 rounded-sm border-2 bg-background text-center text-2xl font-semibold transition-all',
                  'focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20',
                  digit ? 'border-foreground/30' : 'border-border',
                  status === 'error' && 'border-destructive animate-shake',
                  status === 'verified' && 'border-emerald-500 bg-emerald-50',
                  (status === 'verifying' || status === 'verified') && 'opacity-70'
                )}
              />
            ))}
          </div>

          {/* Status messages */}
          {status === 'verifying' && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <SpinnerGap className="h-4 w-4 animate-spin" />
              Verificando...
            </div>
          )}

          {status === 'verified' && (
            <div className="flex items-center justify-center gap-2 text-sm text-emerald-600">
              <CheckCircle className="h-4 w-4" />
              Verificación exitosa
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center gap-2 text-sm text-destructive">
              <WarningCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {/* Resend section */}
          {status !== 'verified' && (
            <div className="text-center">
              {canResend ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResend}
                  disabled={status === 'sending'}
                  className="text-primary"
                >
                  {status === 'sending' ? (
                    <>
                      <SpinnerGap className="mr-2 h-3 w-3 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <ArrowsClockwise className="mr-2 h-3 w-3" />
                      Reenviar código
                    </>
                  )}
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Puedes reenviar el código en{' '}
                  <span className="font-medium text-foreground">{countdown}s</span>
                </p>
              )}
            </div>
          )}

          {/* Help text */}
          <div className="rounded-sm bg-muted p-3 text-xs text-muted-foreground">
            <p>
              <strong>Nota:</strong> La verificación por código SMS garantiza que solo tú puedes
              firmar este contrato. Este proceso cumple con la Ley 527/1999 sobre firmas electrónicas.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={status === 'verifying' || status === 'verified'}
          >
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
