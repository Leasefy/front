'use client';

/**
 * AcuerdoAcceptPanel — v7-07-05 (ACUE-02, T-323 / SIC 001) the tenant surface to
 * ACCEPT an already-agency-approved acuerdo de pago by SIGNING.
 *
 * Composition mirrors the shipped contract `SignatureForm`: a generic `SignaturePad`
 * (reused as-is) + three required consent checkboxes + a `canSign` gate + the
 * OTP-then-accept lifecycle. The OTP step reuses the GENERALIZED `OTPVerification`
 * (v7-07-02) driven by an INJECTED acuerdo transport (an `OtpAdapter`), so there is
 * one Ley 527/1999 flow, not a fork. Money/terms are NEVER rendered or edited here —
 * the panel only captures a signature + consent and forwards them.
 *
 * ── The legal crux (T-323/2024 + SIC 001/2025) ──────────────────────────────
 * The tenant ACCEPTS; it never approves and never sets terms. There is NO approval
 * button, NO condition/cuota editor, and NO decline affordance. The banner states the
 * acuerdo was already aprobado by the agency. Everything off the policy matrix routes
 * through the agent's requiresHumanReview() — never decided in the client.
 *
 * ── Honest degrade (frontend-first) ─────────────────────────────────────────
 * The acuerdo OTP send/verify endpoints and the accept route do not exist yet. The
 * injected adapter maps not-live errors (404/403/0) to an honest "estará disponible
 * pronto" state inside the OTP modal (it NEVER fabricates a verificationToken); and
 * `acuerdosApi.accept` throwing `AcuerdoUnavailableError` surfaces an honest
 * "Próximamente" toast — never a fake "aceptado". The accepted status comes from the
 * AGENT response, so it is NEVER set optimistically. Buttons/labels sentence case
 * (DESIGN §4); es-CO copy via useI18n().
 */

import { useMemo, useState } from 'react';
import { toast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { Check, FileText, ArrowRight, SealCheck } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { SignaturePad } from '@/components/contract/SignaturePad';
import { OTPVerification, type OtpAdapter } from '@/components/contract/OTPVerification';
import { acuerdosApi, AcuerdoUnavailableError } from '@/lib/api/tenant-acuerdos.service';
import { apiClient, ApiError } from '@/lib/api/client';
import { useI18n } from '@/lib/i18n';

export interface AcuerdoAcceptPanelProps {
  /** The own plan id being accepted (resolved own-only upstream, anti-IDOR). */
  planId: string;
  /** Called after the agent confirms the acceptance (parent re-pulls the record). */
  onAccepted?: () => void;
  className?: string;
}

/**
 * True when an OTP transport failure means "endpoint not live yet" (404/403/0),
 * mirroring the service's isEndpointUnavailable gate. On this shape the adapter
 * surfaces an honest unavailable message — it NEVER returns a fabricated token.
 */
function isOtpEndpointUnavailable(err: unknown): boolean {
  return err instanceof ApiError && (err.status === 404 || err.status === 403 || err.status === 0);
}

export function AcuerdoAcceptPanel({ planId, onAccepted, className }: AcuerdoAcceptPanelProps) {
  const { locale } = useI18n();
  const es = locale === 'es';

  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [acceptedConditions, setAcceptedConditions] = useState(false);
  const [acceptedBinding, setAcceptedBinding] = useState(false);
  const [acceptedData, setAcceptedData] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);

  const canSign = !!signatureData && acceptedConditions && acceptedBinding && acceptedData;

  // Honest message shown inside the OTP modal when the acuerdo OTP endpoints are not
  // live — never a fabricated code/token.
  const otpUnavailableMsg = es
    ? 'La verificación para aceptar acuerdos estará disponible pronto.'
    : 'Verification to accept agreements will be available soon.';

  // The INJECTED acuerdo OTP transport. Reuses the generalized OTPVerification's
  // Ley 527/1999 flow; send/verify go through the BFF (apiClient) with the tenant JWT.
  const otpAdapter = useMemo<OtpAdapter>(
    () => ({
      send: async () => {
        try {
          const r = await apiClient.post<{ sentTo: string; cooldownSeconds?: number }>(
            `/cartera/payment-plans/${planId}/otp/send`,
            {},
          );
          return { sentTo: r.sentTo, cooldownSeconds: r.cooldownSeconds ?? 60 };
        } catch (err) {
          if (isOtpEndpointUnavailable(err)) throw new Error(otpUnavailableMsg);
          throw err;
        }
      },
      verify: async (code: string) => {
        try {
          const r = await apiClient.post<{ verificationToken: string }>(
            `/cartera/payment-plans/${planId}/otp/verify`,
            { code },
          );
          return { verificationToken: r.verificationToken };
        } catch (err) {
          if (isOtpEndpointUnavailable(err)) throw new Error(otpUnavailableMsg);
          throw err;
        }
      },
    }),
    [planId, otpUnavailableMsg],
  );

  // Signature + all consents present → open the OTP modal (never sign without OTP).
  const handleSignClick = () => {
    if (!canSign) return;
    setShowOTP(true);
  };

  // OTP verified → forward the signature + one-use token to the agent. The status
  // comes from the agent response; it is NEVER assumed optimistically here.
  const handleOTPVerified = async (verificationToken: string) => {
    if (!signatureData) return;
    setShowOTP(false);
    setIsAccepting(true);
    try {
      await acuerdosApi.accept(planId, { signatureData, otpVerificationToken: verificationToken });
      toast.success(es ? 'Acuerdo aceptado' : 'Agreement accepted');
      onAccepted?.();
    } catch (err) {
      if (err instanceof AcuerdoUnavailableError) {
        toast.info(
          es
            ? 'La aceptación de acuerdos estará disponible pronto.'
            : 'Agreement acceptance will be available soon.',
        );
      } else {
        const msg =
          err instanceof Error
            ? err.message
            : es
              ? 'No pudimos registrar tu aceptación. Intentá de nuevo.'
              : 'We could not register your acceptance. Try again.';
        toast.error(msg);
      }
    } finally {
      setIsAccepting(false);
    }
  };

  const handleOTPCancel = () => setShowOTP(false);

  const consents: { checked: boolean; set: (v: boolean) => void; label: string }[] = [
    {
      checked: acceptedConditions,
      set: setAcceptedConditions,
      label: es
        ? 'Acepto las condiciones del acuerdo de pago.'
        : 'I accept the payment agreement conditions.',
    },
    {
      checked: acceptedBinding,
      set: setAcceptedBinding,
      label: es
        ? 'Entiendo que mi firma es legalmente vinculante.'
        : 'I understand my signature is legally binding.',
    },
    {
      checked: acceptedData,
      set: setAcceptedData,
      label: es
        ? 'Autorizo el tratamiento de datos personales (Ley 1581/2012).'
        : 'I authorize the processing of personal data (Law 1581/2012).',
    },
  ];

  return (
    <>
      <div className={cn('space-y-4', className)}>
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-soft flex items-center justify-center flex-shrink-0">
            <SealCheck className="w-5 h-5 text-primary" aria-hidden="true" />
          </div>
          <div>
            <h3 className="font-semibold text-fg dark:text-white">
              {es ? 'Firmar para aceptar' : 'Sign to accept'}
            </h3>
            <p className="text-xs text-fg-muted dark:text-fg-subtle">
              {es ? 'Firma electrónica del acuerdo' : 'Electronic signature of the agreement'}
            </p>
          </div>
        </div>

        {/* Factual "lo aprobó tu inmobiliaria" banner — the tenant only accepts. */}
        <div className="rounded-xl border border-primary/20 bg-primary-soft p-4">
          <p className="text-sm text-fg dark:text-white">
            {es
              ? 'Este acuerdo ya fue aprobado por tu inmobiliaria. Al firmar, confirmás que lo aceptás.'
              : 'This agreement was already approved by your agency. By signing, you confirm that you accept it.'}
          </p>
        </div>

        {/* Signature canvas — reused as-is */}
        <SignaturePad onChange={setSignatureData} disabled={isAccepting} />

        {/* Consent checkboxes — single card with dividers (mirrors SignatureForm) */}
        <div className="rounded-xl border border-border dark:border-border-strong bg-surface overflow-hidden">
          {consents.map((c, i) => (
            <div key={i}>
              {i > 0 && <div className="border-t border-border dark:border-border-strong" />}
              <label
                className={cn(
                  'flex cursor-pointer items-start gap-3 p-4 transition-all',
                  c.checked ? 'bg-primary-soft/50' : 'hover:bg-surface-muted dark:hover:bg-ink/50',
                )}
              >
                <div
                  className={cn(
                    'w-5 h-5 rounded-[6px] border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all',
                    c.checked ? 'bg-primary border-primary/30' : 'border-border dark:border-border-strong',
                  )}
                >
                  {c.checked && <Check className="w-3 h-3 text-white" aria-hidden="true" />}
                </div>
                <input
                  type="checkbox"
                  checked={c.checked}
                  onChange={(e) => c.set(e.target.checked)}
                  disabled={isAccepting}
                  className="sr-only"
                />
                <span className={cn('text-sm transition-colors', c.checked ? 'text-fg dark:text-white' : 'text-fg-muted dark:text-fg-subtle')}>
                  {c.label}
                </span>
              </label>
            </div>
          ))}
        </div>

        {/* Accept button — sign only; no approval, no editor, no decline */}
        <Button onClick={handleSignClick} disabled={!canSign || isAccepting} hideArrow className="w-full gap-2">
          {isAccepting ? (
            <>
              <Spinner size="sm" variant="current" />
              {es ? 'Procesando...' : 'Processing...'}
            </>
          ) : !signatureData ? (
            <>
              <FileText className="w-4 h-4" aria-hidden="true" />
              {es ? 'Dibujá tu firma para continuar' : 'Draw your signature to continue'}
            </>
          ) : (
            <>
              <FileText className="w-4 h-4" aria-hidden="true" />
              {es ? 'Firmar y aceptar' : 'Sign and accept'}
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </>
          )}
        </Button>

        {/* Legal footnote (Ley 527/1999 e-signature) */}
        <p className="text-center text-[11px] text-fg-muted dark:text-fg-subtle">
          {es
            ? 'Firma válida según Ley 527/1999 · Verificación por correo requerida'
            : 'Signature valid under Law 527/1999 · Email verification required'}
        </p>
      </div>

      {/* OTP verification modal — generalized flow driven by the acuerdo adapter */}
      <OTPVerification
        isOpen={showOTP}
        adapter={otpAdapter}
        onVerified={handleOTPVerified}
        onCancel={handleOTPCancel}
      />
    </>
  );
}
