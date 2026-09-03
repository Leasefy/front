'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { CheckCircle, WarningCircle, EnvelopeSimple, ArrowsClockwise } from '@phosphor-icons/react';
import { Spinner } from '@/components/ui/spinner';
import { contractsApi } from '@/lib/api/contracts.service';
import type { ContractOtpRole } from '@/lib/api/contracts.types';

// ============================================================================
// Transport seam (additive)
// ============================================================================

/**
 * OtpAdapter — the injectable send/verify transport for this OTP flow.
 * `send()` requests a fresh code; `verify(code)` exchanges it for a one-use token.
 * The default (contract) transport is built by `resolveOtpAdapter` from
 * contractId + role; a caller can inject a different transport to reuse the same
 * Ley 527/1999 flow for a non-contract entity (e.g. an acuerdo de pago).
 */
export interface OtpAdapter {
  send: () => Promise<{ sentTo: string; cooldownSeconds: number }>;
  verify: (code: string) => Promise<{ verificationToken: string }>;
}

/**
 * resolveOtpAdapter — pure, total selector for the OTP transport.
 *  - `adapter` present → returned verbatim (the entity drives its own transport).
 *  - else `contractId` + `role` present → the EXISTING contract transport
 *    (contractsApi.sendOtp/verifyOtp), so the shipped contract-signing flow is unchanged.
 *  - neither → throws (never a silent no-op that could bypass verification).
 */
export function resolveOtpAdapter(opts: {
  adapter?: OtpAdapter;
  contractId?: string;
  role?: ContractOtpRole;
}): OtpAdapter {
  if (opts.adapter) return opts.adapter;
  if (opts.contractId && opts.role) {
    const contractId = opts.contractId;
    const role = opts.role;
    return {
      send: async () => {
        const r = await contractsApi.sendOtp(contractId, { role });
        return { sentTo: r.sentTo, cooldownSeconds: r.cooldownSeconds ?? 60 };
      },
      verify: async (code: string) => {
        const r = await contractsApi.verifyOtp(contractId, { role, code });
        return { verificationToken: r.verificationToken };
      },
    };
  }
  throw new Error('OTPVerification requires an adapter or contractId+role');
}

// ============================================================================
// Props
// ============================================================================

export interface OTPVerificationProps {
  /** Whether the OTP modal is open */
  isOpen: boolean;
  /** Contract ID to send the OTP for (default contract transport). Optional when `adapter` is passed. */
  contractId?: string;
  /** Who is signing — determines which endpoint validates membership. Optional when `adapter` is passed. */
  role?: ContractOtpRole;
  /**
   * Optional injected send/verify transport. Inject it to reuse this Ley 527/1999
   * flow for a non-contract entity (e.g. an acuerdo de pago); when omitted,
   * `contractId` + `role` drive the default contract transport.
   */
  adapter?: OtpAdapter;
  /** Callback when OTP is verified successfully — recibe el verificationToken one-use */
  onVerified: (verificationToken: string) => void;
  /** Callback to cancel verification */
  onCancel: () => void;
  /** Additional CSS classes */
  className?: string;
}

type OTPStatus = 'idle' | 'sending' | 'verifying' | 'verified' | 'error';

const OTP_LENGTH = 6;

// ============================================================================
// Component
// ============================================================================

/**
 * OTPVerification - Modal de verificación de identidad por código enviado al email.
 *
 * Flow:
 *  1. Al abrir, llama POST /contracts/:id/otp/send → recibe { sentTo, expiresAt, cooldownSeconds }.
 *  2. Usuario ingresa el código → auto-submit al 6to dígito.
 *  3. POST /contracts/:id/otp/verify → recibe { verificationToken }.
 *  4. `onVerified(verificationToken)` — el caller pasa ese token al endpoint de firma.
 *
 * Backend: rate limit 1 send/60s, 5 intentos por código, TTL 10min (código) / 5min (token).
 */
export function OTPVerification({
  isOpen,
  contractId,
  role,
  adapter,
  onVerified,
  onCancel,
  className,
}: OTPVerificationProps) {
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [status, setStatus] = useState<OTPStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string>('');
  const [cooldown, setCooldown] = useState(0);
  const [sendError, setSendError] = useState<string | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const hasSentRef = useRef(false);

  // Resolve the OTP transport: an injected adapter, or the default contract
  // transport built from contractId + role. Pure + total (throws if neither).
  const otp = useMemo(
    () => resolveOtpAdapter({ adapter, contractId, role }),
    [adapter, contractId, role]
  );

  // Send OTP al abrir el modal
  const sendOtp = useCallback(async () => {
    setStatus('sending');
    setSendError(null);
    try {
      const { sentTo: maskedEmail, cooldownSeconds } = await otp.send();
      setSentTo(maskedEmail);
      setCooldown(cooldownSeconds || 60);
      setStatus('idle');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo enviar el código. Intentá de nuevo.';
      setSendError(msg);
      setStatus('error');
    }
  }, [otp]);

  // Trigger send cuando abre el modal — una sola vez por apertura
  useEffect(() => {
    if (isOpen && !hasSentRef.current) {
      hasSentRef.current = true;
      sendOtp();
    }
    if (!isOpen) {
      // Reset para el próximo open
      hasSentRef.current = false;
      setDigits(Array(OTP_LENGTH).fill(''));
      setStatus('idle');
      setError(null);
      setSentTo('');
      setCooldown(0);
      setSendError(null);
    }
  }, [isOpen, sendOtp]);

  // Focus primer input después de sentTo llega
  useEffect(() => {
    if (sentTo && status === 'idle') {
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [sentTo, status]);

  // Countdown para cooldown de reenvío
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Verificar el código contra el backend
  const verifyCode = useCallback(async (code: string) => {
    setStatus('verifying');
    setError(null);
    try {
      const { verificationToken } = await otp.verify(code);
      setStatus('verified');
      setTimeout(() => onVerified(verificationToken), 600);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Código incorrecto.';
      setStatus('error');
      setError(msg);
      setDigits(Array(OTP_LENGTH).fill(''));
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
  }, [otp, onVerified]);

  // Handle input change
  const handleChange = useCallback((index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;

    setDigits((prevOtp) => {
      const newOtp = [...prevOtp];
      newOtp[index] = value;

      if (value && index < OTP_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }

      if (value && index === OTP_LENGTH - 1) {
        const fullCode = newOtp.join('');
        if (fullCode.length === OTP_LENGTH) {
          verifyCode(fullCode);
        }
      }

      return newOtp;
    });
    setError(null);
  }, [verifyCode]);

  // Paste 6 dígitos
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;

    const newOtp = Array(OTP_LENGTH).fill('');
    pasted.split('').forEach((digit, i) => { newOtp[i] = digit; });
    setDigits(newOtp);
    setError(null);

    if (pasted.length === OTP_LENGTH) {
      verifyCode(pasted);
    } else {
      inputRefs.current[pasted.length]?.focus();
    }
  }, [verifyCode]);

  // Backspace salta al input previo
  const handleKeyDown = useCallback((index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }, [digits]);

  const handleResend = async () => {
    if (cooldown > 0) return;
    setDigits(Array(OTP_LENGTH).fill(''));
    setError(null);
    await sendOtp();
  };

  const canResend = cooldown === 0 && status !== 'sending' && status !== 'verifying';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className={cn('sm:max-w-md', className)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <EnvelopeSimple className="h-5 w-5 text-primary" />
            Verificación de identidad
          </DialogTitle>
          <DialogDescription>
            {sentTo
              ? <>Enviamos un código de 6 dígitos a <span className="font-medium text-fg">{sentTo}</span></>
              : 'Preparando el envío del código a tu correo...'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Error de envío (antes de poder ingresar código) */}
          {sendError && (
            <div className="flex items-start gap-2 rounded-[14px] border border-danger/30 bg-danger-soft p-3 text-sm text-danger">
              <WarningCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <span>{sendError}</span>
            </div>
          )}

          {/* OTP inputs — solo si ya se envió */}
          {sentTo && !sendError && (
            <div className="flex justify-center gap-2" onPaste={handlePaste}>
              {digits.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => { inputRefs.current[index] = el; }}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  aria-label={`Dígito ${index + 1} de ${OTP_LENGTH}`}
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  disabled={status === 'verifying' || status === 'verified'}
                  className={cn(
                    'h-[56px] w-[46px] rounded-[12px] bg-surface text-center font-mono text-[22px] font-semibold transition-all',
                    'focus:border-2 focus:border-primary focus:outline-none focus:ring-2 focus:ring-[rgba(26,64,255,0.14)]',
                    digit ? 'border-[1.5px] border-fg' : 'border border-border',
                    status === 'error' && 'border-danger bg-danger-soft animate-shake',
                    status === 'verified' && 'border-success bg-success-soft',
                    (status === 'verifying' || status === 'verified') && 'opacity-70'
                  )}
                />
              ))}
            </div>
          )}

          {/* Loader inicial */}
          {!sentTo && !sendError && (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-fg-muted">
              <Spinner size="sm" variant="current" />
              Enviando código a tu correo...
            </div>
          )}

          {/* Estado en vivo */}
          {status === 'verifying' && (
            <div className="flex items-center justify-center gap-2 text-sm text-fg-muted">
              <Spinner size="sm" variant="current" />
              Verificando...
            </div>
          )}

          {status === 'verified' && (
            <div className="flex items-center justify-center gap-2 text-sm text-success">
              <CheckCircle className="h-4 w-4" />
              Verificación exitosa
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center gap-2 text-sm text-danger">
              <WarningCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {/* Reenviar */}
          {status !== 'verified' && sentTo && (
            <div className="text-center">
              {canResend ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResend}
                  className="text-primary"
                >
                  <ArrowsClockwise className="mr-2 h-3 w-3" />
                  Reenviar código
                </Button>
              ) : (
                <p className="text-sm text-fg-muted">
                  Podés reenviar el código en{' '}
                  <span className="font-mono tabular-nums font-medium text-fg">{cooldown}s</span>
                </p>
              )}
            </div>
          )}

          {/* Help text */}
          <div className="rounded-[14px] bg-surface-muted p-3 text-xs text-fg-muted">
            <p>
              <strong>Nota:</strong> La verificación por código enviado a tu correo garantiza que
              solo vos podés firmar este contrato. Este proceso cumple con la Ley 527/1999 sobre
              firmas electrónicas.
            </p>
          </div>
        </div>

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
