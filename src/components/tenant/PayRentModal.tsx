'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Bank,
  CheckCircle,
  WarningCircle,
  Clock,
  ArrowRight,
  ArrowSquareOut,
  CaretLeft,
  Receipt,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { MonoLabel } from '@leasefy/cadence';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useI18n } from '@/lib/i18n';
import { useLenis } from '@/components/providers/SmoothScroll';
import { leasesApi } from '@/lib/api/leases.service';
import { pseCheckoutApi } from '@/lib/api/pse-checkout.service';
import type { BackendPaymentInfo } from '@/lib/api/leases.types';
import type {
  PseCheckoutDto,
  PseFinancialInstitution,
  PseLegalIdType,
  PseUserType,
} from '@/lib/api/pse-checkout.types';

interface PayRentModalProps {
  open: boolean;
  leaseId: string;
  /** Callback cuando se cierra el modal (éxito o cancelación). */
  onClose: () => void;
  /** Callback cuando el pago se confirmó / cambió de estado — para refrescar historial. */
  onPaid?: () => void;
  /** Valores iniciales sugeridos (ej. para pre-rellenar el form). */
  prefill?: {
    fullName?: string;
    email?: string;
  };
}

type Step =
  | 'loading'
  | 'period-blocked' // currentPeriodStatus === PENDING_VALIDATION | APPROVED
  | 'confirm'
  | 'form'
  | 'redirecting' // POST /checkout en curso
  | 'awaiting' // pago abierto en pestaña nueva — polleando confirmación del webhook
  | 'result';

type PayResultKind = 'success' | 'failure' | 'cancelled';
interface PayResult {
  kind: PayResultKind;
  message: string;
}

const DOCUMENT_TYPES: { value: PseLegalIdType; label: string }[] = [
  { value: 'CC', label: 'Cédula de ciudadanía' },
  { value: 'CE', label: 'Cédula de extranjería' },
  { value: 'NIT', label: 'NIT' },
  { value: 'PP', label: 'Pasaporte' },
];

const POLL_INTERVAL_MS = 5_000;

/**
 * Modal de pago de arriendo via PSE real (Wompi recaudo). Flujo:
 *  1. loading      → carga /leases/:id/payment-info + /leases/pse/financial-institutions
 *  2. confirm      → muestra monto + período, CTA "Continuar"
 *  3. form         → select banco (códigos PSE reales) + datos del pagador
 *  4. redirecting  → POST /leases/:id/pse/checkout
 *  5. awaiting     → abre el pago en una PESTAÑA NUEVA y pollea el estado del request
 *                    hasta que el webhook de Wompi lo confirme (APPROVED/REJECTED/CANCELLED)
 *  6. result       → éxito / rechazo / cancelado
 */
export function PayRentModal({ open, leaseId, onClose, onPaid, prefill }: PayRentModalProps) {
  const { formatCurrency, locale } = useI18n();
  const lenis = useLenis();

  // Pause Lenis smooth scroll while the modal is open (DESIGN.md §8).
  useEffect(() => {
    if (open) lenis.stop();
    else lenis.start();
    return () => lenis.start();
  }, [open, lenis]);

  // onPaid can be an inline function that changes every parent render — keep it in
  // a ref so the polling effect doesn't resubscribe on each render.
  const onPaidRef = useRef(onPaid);
  useEffect(() => {
    onPaidRef.current = onPaid;
  }, [onPaid]);

  const [step, setStep] = useState<Step>('loading');
  const [paymentInfo, setPaymentInfo] = useState<BackendPaymentInfo | null>(null);
  const [institutions, setInstitutions] = useState<PseFinancialInstitution[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Form state
  const [userType, setUserType] = useState<PseUserType>('NATURAL');
  const [legalIdType, setLegalIdType] = useState<PseLegalIdType>('CC');
  const [legalId, setLegalId] = useState('');
  const [fullName, setFullName] = useState(prefill?.fullName ?? '');
  const [email, setEmail] = useState(prefill?.email ?? '');
  const [institutionCode, setInstitutionCode] = useState<string>('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Checkout / polling state
  const [requestId, setRequestId] = useState<string | null>(null);
  const [asyncUrl, setAsyncUrl] = useState<string | null>(null);
  const [popupBlocked, setPopupBlocked] = useState(false);
  const [pollError, setPollError] = useState<string | null>(null);
  const [result, setResult] = useState<PayResult | null>(null);

  // Cargar /payment-info + bancos PSE reales al abrir
  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setStep('loading');
    setLoadError(null);

    Promise.all([
      leasesApi.getPaymentInfo(leaseId),
      pseCheckoutApi.getFinancialInstitutions(),
    ])
      .then(([info, banksList]) => {
        if (cancelled) return;
        setPaymentInfo(info);
        setInstitutions(banksList);
        // Pre-flight: si ya hay request en validación o pago aprobado, bloquear.
        // REJECTED y NONE caen al confirm (REJECTED muestra el motivo en el confirm).
        if (
          info.currentPeriodStatus === 'PENDING_VALIDATION' ||
          info.currentPeriodStatus === 'APPROVED'
        ) {
          setStep('period-blocked');
        } else {
          setStep('confirm');
        }
      })
      .catch((err) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : 'No se pudo cargar la información de pago.';
        setLoadError(msg);
      });

    return () => { cancelled = true; };
  }, [open, leaseId]);

  // Reset al cerrar
  useEffect(() => {
    if (!open) {
      setStep('loading');
      setPaymentInfo(null);
      setInstitutions([]);
      setLoadError(null);
      setUserType('NATURAL');
      setLegalIdType('CC');
      setLegalId('');
      setFullName(prefill?.fullName ?? '');
      setEmail(prefill?.email ?? '');
      setInstitutionCode('');
      setFormErrors({});
      setRequestId(null);
      setAsyncUrl(null);
      setPopupBlocked(false);
      setPollError(null);
      setResult(null);
    }
  }, [open, prefill?.fullName, prefill?.email]);

  // Polling: mientras estemos en 'awaiting', consultar el estado del request cada
  // POLL_INTERVAL_MS hasta llegar a un estado terminal. El webhook de Wompi es quien
  // confirma — este endpoint nunca auto-aprueba.
  useEffect(() => {
    if (step !== 'awaiting' || !requestId) return;

    let cancelled = false;

    const poll = async () => {
      try {
        const st = await pseCheckoutApi.verifyRequest(leaseId, requestId);
        if (cancelled) return;
        setPollError(null);

        if (st.status === 'APPROVED') {
          setResult({ kind: 'success', message: 'Tu pago fue confirmado.' });
          setStep('result');
          onPaidRef.current?.();
        } else if (st.status === 'REJECTED' || st.status === 'DISPUTED') {
          setResult({
            kind: 'failure',
            message: st.rejectionReason ?? 'El pago fue rechazado por la pasarela.',
          });
          setStep('result');
          onPaidRef.current?.();
        } else if (st.status === 'CANCELLED') {
          setResult({ kind: 'cancelled', message: 'El pago fue cancelado.' });
          setStep('result');
          onPaidRef.current?.();
        }
        // PROCESSING / PENDING_VALIDATION → seguir polleando
      } catch (err) {
        if (cancelled) return;
        // No cortamos el polling: los errores transitorios de red se auto-curan.
        setPollError(err instanceof Error ? err.message : 'Error consultando el estado.');
      }
    };

    poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);
    // Background tabs throttle setInterval — re-check on return from the Wompi tab.
    window.addEventListener('focus', poll);
    return () => {
      cancelled = true;
      clearInterval(id);
      window.removeEventListener('focus', poll);
    };
  }, [step, requestId, leaseId]);

  // Validación form
  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    if (!/^\d{6,15}$/.test(legalId.trim())) errors.legalId = 'Entre 6 y 15 dígitos.';
    if (fullName.trim().length < 3) errors.fullName = 'Requerido (mínimo 3 caracteres).';
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) errors.email = 'Email inválido.';
    if (!institutionCode) errors.institutionCode = 'Seleccioná un banco.';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [legalId, fullName, email, institutionCode]);

  const handleProcess = useCallback(async () => {
    if (!paymentInfo) return;
    if (!validateForm()) return;
    setStep('redirecting');
    setPopupBlocked(false);
    setPollError(null);
    try {
      const dto: PseCheckoutDto = {
        amount: paymentInfo.monthlyRent,
        periodMonth: paymentInfo.currentPeriod.month,
        periodYear: paymentInfo.currentPeriod.year,
        userType,
        legalIdType,
        legalId: legalId.trim(),
        financialInstitutionCode: institutionCode,
        email: email.trim(),
        fullName: fullName.trim(),
      };
      const res = await pseCheckoutApi.checkout(leaseId, dto);
      setRequestId(res.paymentRequestId);
      setAsyncUrl(res.asyncPaymentUrl);

      // Abrir el pago en una PESTAÑA NUEVA — nuestra pestaña se queda polleando.
      if (res.asyncPaymentUrl) {
        const win = window.open(res.asyncPaymentUrl, '_blank', 'noopener,noreferrer');
        if (!win) setPopupBlocked(true);
      }
      setStep('awaiting');
    } catch (err) {
      // 409 (período ya pagado), 403, 503, etc. → mostrar como fallido.
      const msg = err instanceof Error ? err.message : 'No se pudo iniciar el pago.';
      setResult({ kind: 'failure', message: msg });
      setStep('result');
    }
  }, [paymentInfo, validateForm, leaseId, userType, legalIdType, legalId, institutionCode, email, fullName]);

  const monthName = paymentInfo
    ? new Date(paymentInfo.currentPeriod.year, paymentInfo.currentPeriod.month - 1, 1)
        .toLocaleDateString(locale === 'es' ? 'es-CO' : 'en-US', { month: 'long', year: 'numeric' })
    : '';

  const blockClose = step === 'redirecting';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={blockClose ? undefined : onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-surface rounded-[22px] w-full max-w-lg border border-border shadow-lg"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 p-5 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[14px] bg-primary-soft flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-fg">
                    Pagar arriendo
                  </h2>
                  <p className="text-xs text-fg-muted mt-0.5">
                    {step === 'form' ? 'Datos del pagador' : 'Método: PSE'}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={onClose}
                disabled={blockClose}
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Body */}
            <div
              className="p-5 max-h-[70vh] overflow-y-auto"
              data-lenis-prevent
              style={{ overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}
            >
              {/* Loading */}
              {step === 'loading' && !loadError && (
                <div className="py-10 flex flex-col items-center justify-center gap-3 text-sm text-fg-muted">
                  <Spinner size="lg" variant="current" />
                  Cargando información de pago...
                </div>
              )}

              {loadError && (
                <div className="py-6 flex items-start gap-3 rounded-[14px] border border-danger/30 bg-danger-soft p-4">
                  <WarningCircle className="w-5 h-5 text-danger flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-danger">{loadError}</p>
                </div>
              )}

              {/* Step: period-blocked (PENDING_VALIDATION | APPROVED) */}
              {step === 'period-blocked' &&
                paymentInfo &&
                (paymentInfo.currentPeriodStatus === 'PENDING_VALIDATION' ||
                  paymentInfo.currentPeriodStatus === 'APPROVED') && (
                  <PeriodBlockedPanel
                    status={paymentInfo.currentPeriodStatus}
                    monthName={monthName}
                    amount={paymentInfo.monthlyRent}
                    formatCurrency={formatCurrency}
                  />
                )}

              {/* Step: confirm */}
              {step === 'confirm' && paymentInfo && (
                <div className="space-y-4">
                  {paymentInfo.currentPeriodStatus === 'REJECTED' && (
                    <div className="rounded-[14px] border border-danger/30 bg-danger-soft p-3 flex items-start gap-2">
                      <WarningCircle className="w-4 h-4 text-danger flex-shrink-0 mt-0.5" />
                      <div className="text-xs text-danger">
                        <p className="font-medium mb-0.5">Tu pago anterior fue rechazado.</p>
                        {paymentInfo.currentPeriodRejectionReason && (
                          <p className="opacity-90">{paymentInfo.currentPeriodRejectionReason}</p>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="rounded-[18px] border border-border bg-surface-muted p-4">
                    <MonoLabel className="block tracking-wider mb-1 text-fg-muted">Período</MonoLabel>
                    <p className="text-sm font-medium text-fg capitalize">{monthName}</p>
                    <div className="border-t border-border-faint my-3" />
                    <MonoLabel className="block tracking-wider mb-1 text-fg-muted">Monto a pagar</MonoLabel>
                    <p className="text-3xl font-bold text-fg font-mono tabular-nums">
                      {formatCurrency(paymentInfo.monthlyRent)}
                    </p>
                  </div>
                  <p className="text-xs text-fg-muted">
                    El pago se procesa a través de <strong>PSE</strong>. Vas a completar los datos de
                    tu cuenta en el siguiente paso.
                  </p>
                </div>
              )}

              {/* Step: form */}
              {step === 'form' && paymentInfo && (
                <div className="space-y-4">
                  {/* Resumen */}
                  <div className="rounded-[14px] border border-border bg-surface-muted px-3 py-2 flex items-center justify-between text-xs">
                    <span className="text-fg-muted capitalize">{monthName}</span>
                    <span className="font-semibold text-fg font-mono tabular-nums">
                      {formatCurrency(paymentInfo.monthlyRent)}
                    </span>
                  </div>

                  {/* Banco */}
                  <Field label="Banco" error={formErrors.institutionCode}>
                    <Select value={institutionCode} onValueChange={setInstitutionCode}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccioná tu banco" />
                      </SelectTrigger>
                      <SelectContent>
                        {institutions.map((b) => (
                          <SelectItem
                            key={b.financial_institution_code}
                            value={b.financial_institution_code}
                          >
                            {b.financial_institution_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Tipo de persona">
                      <Select
                        value={userType}
                        onValueChange={(v) => setUserType(v as PseUserType)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NATURAL">Natural</SelectItem>
                          <SelectItem value="JURIDICA">Jurídica</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="Tipo doc.">
                      <Select
                        value={legalIdType}
                        onValueChange={(v) => setLegalIdType(v as PseLegalIdType)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DOCUMENT_TYPES.map((d) => (
                            <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>

                  <Field label="Número de documento" error={formErrors.legalId}>
                    <Input
                      inputMode="numeric"
                      value={legalId}
                      onChange={(e) => setLegalId(e.target.value.replace(/\D/g, ''))}
                      className="font-mono tabular-nums"
                      placeholder="1234567890"
                    />
                  </Field>

                  <Field label="Nombre completo" error={formErrors.fullName}>
                    <Input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </Field>

                  <Field label="Email" error={formErrors.email}>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </Field>
                </div>
              )}

              {/* Step: redirecting */}
              {step === 'redirecting' && (
                <div className="py-10 flex flex-col items-center justify-center gap-3 text-center">
                  <Spinner size="xl" variant="current" className="text-primary" />
                  <p className="text-sm font-medium text-fg">Conectando con PSE...</p>
                  <p className="text-xs text-fg-muted">No cierres esta ventana.</p>
                </div>
              )}

              {/* Step: awaiting — pago abierto en pestaña nueva, polleando */}
              {step === 'awaiting' && (
                <div className="py-8 flex flex-col items-center justify-center gap-4 text-center">
                  <Spinner size="xl" variant="current" className="text-primary" />
                  <div>
                    <p className="text-sm font-medium text-fg">
                      Esperando la confirmación de tu pago…
                    </p>
                    <p className="text-xs text-fg-muted mt-1 max-w-xs">
                      {asyncUrl
                        ? 'Completá el pago en la pestaña que abrimos con tu banco. Esta ventana se actualiza sola cuando el pago se confirme.'
                        : 'Estamos generando el enlace de pago con tu banco. No cierres esta ventana.'}
                    </p>
                  </div>
                  {asyncUrl && (
                    <a
                      href={asyncUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-primary underline underline-offset-2"
                    >
                      <ArrowSquareOut className="w-3.5 h-3.5" />
                      {popupBlocked
                        ? 'No se abrió la pestaña — abrí el pago acá'
                        : '¿No ves la pestaña? Abrila de nuevo'}
                    </a>
                  )}
                  <p className="text-[11px] text-fg-muted">
                    Podés cerrar esta ventana — vas a ver la confirmación en tu historial.
                  </p>
                </div>
              )}

              {/* Step: result */}
              {step === 'result' && result && (
                <ResultPanel
                  result={result}
                  amount={paymentInfo?.monthlyRent ?? 0}
                  formatCurrency={formatCurrency}
                />
              )}
            </div>

            {/* Footer */}
            <div className="p-5 border-t border-border flex items-center justify-between gap-2">
              {step === 'period-blocked' && (
                <Button
                  type="button"
                  onClick={onClose}
                  hideArrow
                  className="ml-auto"
                >
                  Cerrar
                </Button>
              )}

              {step === 'confirm' && (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={onClose}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setStep('form')}
                    disabled={!paymentInfo}
                    hideArrow
                  >
                    {paymentInfo?.currentPeriodStatus === 'REJECTED' ? 'Reintentar pago' : 'Continuar'}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </>
              )}

              {step === 'form' && (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setStep('confirm')}
                  >
                    <CaretLeft className="w-4 h-4" />
                    Atrás
                  </Button>
                  <Button
                    type="button"
                    onClick={handleProcess}
                    hideArrow
                  >
                    <Bank className="w-4 h-4" />
                    Pagar con PSE
                  </Button>
                </>
              )}

              {step === 'awaiting' && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onClose}
                  hideArrow
                  className="ml-auto"
                >
                  Cerrar
                </Button>
              )}

              {step === 'result' && (
                <Button
                  type="button"
                  onClick={onClose}
                  hideArrow
                  className="ml-auto"
                >
                  {result?.kind === 'success' ? 'Volver a pagos' : 'Cerrar'}
                </Button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Subcomponents ──────────────────────────────────────────────────────────

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-fg">{label}</label>
      {children}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

function ResultPanel({
  result,
  amount,
  formatCurrency,
}: {
  result: PayResult;
  amount: number;
  formatCurrency: (n: number) => string;
}) {
  if (result.kind === 'success') {
    return (
      <div className="py-6 flex flex-col items-center text-center space-y-3">
        <div className="w-14 h-14 rounded-full bg-success-soft flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-success" />
        </div>
        <div>
          <p className="text-lg font-semibold text-fg">¡Pago confirmado!</p>
          <p className="text-sm text-fg-muted mt-1">{result.message}</p>
        </div>
        <div className="rounded-[14px] border border-border bg-surface-muted p-3 w-full space-y-1 text-xs">
          <Row label="Monto" value={formatCurrency(amount)} mono />
        </div>
        <p className="text-xs text-fg-muted">
          Tu pago quedó registrado. Lo vas a ver en tu historial.
        </p>
      </div>
    );
  }

  if (result.kind === 'cancelled') {
    return (
      <div className="py-6 flex flex-col items-center text-center space-y-3">
        <div className="w-14 h-14 rounded-full bg-surface-muted flex items-center justify-center">
          <Clock className="w-8 h-8 text-fg-muted" />
        </div>
        <div>
          <p className="text-lg font-semibold text-fg">Pago cancelado</p>
          <p className="text-sm text-fg-muted mt-1">{result.message}</p>
        </div>
        <p className="text-xs text-fg-muted">
          Podés volver a intentarlo cuando quieras.
        </p>
      </div>
    );
  }

  // failure
  return (
    <div className="py-6 flex flex-col items-center text-center space-y-3">
      <div className="w-14 h-14 rounded-full bg-danger-soft flex items-center justify-center">
        <WarningCircle className="w-8 h-8 text-danger" />
      </div>
      <div>
        <p className="text-lg font-semibold text-fg">Pago no procesado</p>
        <p className="text-sm text-danger mt-1">{result.message}</p>
      </div>
      <p className="text-xs text-fg-muted">
        Podés intentar con otro banco o revisar los datos ingresados.
      </p>
    </div>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-fg-muted">{label}</span>
      <span
        className={cn(
          'text-fg font-medium text-right break-all',
          mono && 'font-mono tabular-nums text-[11px]'
        )}
      >
        {value || '—'}
      </span>
    </div>
  );
}

function PeriodBlockedPanel({
  status,
  monthName,
  amount,
  formatCurrency,
}: {
  status: 'PENDING_VALIDATION' | 'APPROVED';
  monthName: string;
  amount: number;
  formatCurrency: (n: number) => string;
}) {
  if (status === 'APPROVED') {
    return (
      <div className="py-6 flex flex-col items-center text-center space-y-3">
        <div className="w-14 h-14 rounded-full bg-success-soft flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-success" />
        </div>
        <div>
          <p className="text-lg font-semibold text-fg">Pago confirmado</p>
          <p className="text-sm text-fg-muted mt-1 capitalize">
            {monthName}
          </p>
        </div>
        <div className="rounded-[14px] border border-border bg-surface-muted p-3 w-full text-xs">
          <Row label="Monto" value={formatCurrency(amount)} mono />
        </div>
        <p className="text-xs text-fg-muted">
          Tu pago de este mes ya fue confirmado por el propietario.
        </p>
      </div>
    );
  }

  // PENDING_VALIDATION
  return (
    <div className="py-6 flex flex-col items-center text-center space-y-3">
      <div className="w-14 h-14 rounded-full bg-warning-soft flex items-center justify-center">
        <Clock className="w-8 h-8 text-warning" />
      </div>
      <div>
        <p className="text-lg font-semibold text-fg">Pago en verificación</p>
        <p className="text-sm text-fg-muted mt-1 capitalize">
          {monthName}
        </p>
      </div>
      <div className="rounded-[14px] border border-border bg-surface-muted p-3 w-full text-xs">
        <Row label="Monto" value={formatCurrency(amount)} mono />
      </div>
      <p className="text-xs text-fg-muted">
        Tu banco está verificando el pago. No hace falta volver a pagar — vas a
        ver la confirmación en tu historial cuando termine.
      </p>
    </div>
  );
}
