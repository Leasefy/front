'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Bank,
  CheckCircle,
  WarningCircle,
  Clock,
  ArrowRight,
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
import { psePaymentsApi } from '@/lib/api/pse-payments.service';
import type { BackendPaymentInfo } from '@/lib/api/leases.types';
import type {
  PseBank,
  PseProcessDto,
  PseProcessResponse,
  PseDocumentType,
  PsePersonType,
} from '@/lib/api/pse-payments.types';

interface PayRentModalProps {
  open: boolean;
  leaseId: string;
  /** Callback cuando se cierra el modal (éxito o cancelación). */
  onClose: () => void;
  /** Callback cuando un pago se procesó con éxito o queda PENDING — para refrescar historial. */
  onPaid?: (result: PseProcessResponse) => void;
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
  | 'processing'
  | 'result';

const DOCUMENT_TYPES: { value: PseDocumentType; label: string }[] = [
  { value: 'CC', label: 'Cédula de ciudadanía' },
  { value: 'CE', label: 'Cédula de extranjería' },
  { value: 'NIT', label: 'NIT' },
  { value: 'PASAPORTE', label: 'Pasaporte' },
];

/**
 * Modal de pago de arriendo via PSE (mock). Flujo:
 *  1. loading → carga /leases/:id/payment-info + /pse-mock/banks
 *  2. confirm → muestra monto + período, CTA "Continuar"
 *  3. form → select banco + datos del pagador
 *  4. processing → spinner mientras /pse-mock/process responde
 *  5. result → SUCCESS / FAILURE / PENDING con copy del backend
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

  const [step, setStep] = useState<Step>('loading');
  const [paymentInfo, setPaymentInfo] = useState<BackendPaymentInfo | null>(null);
  const [banks, setBanks] = useState<PseBank[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Form state
  const [personType, setPersonType] = useState<PsePersonType>('NATURAL');
  const [documentType, setDocumentType] = useState<PseDocumentType>('CC');
  const [documentNumber, setDocumentNumber] = useState('');
  const [fullName, setFullName] = useState(prefill?.fullName ?? '');
  const [email, setEmail] = useState(prefill?.email ?? '');
  const [bankCode, setBankCode] = useState<string>('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [result, setResult] = useState<PseProcessResponse | null>(null);

  // Cargar /payment-info + /banks al abrir
  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setStep('loading');
    setLoadError(null);

    Promise.all([leasesApi.getPaymentInfo(leaseId), psePaymentsApi.getBanks()])
      .then(([info, banksList]) => {
        if (cancelled) return;
        setPaymentInfo(info);
        setBanks(banksList);
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

  // Reset form al cerrar
  useEffect(() => {
    if (!open) {
      setStep('loading');
      setPaymentInfo(null);
      setBanks([]);
      setLoadError(null);
      setPersonType('NATURAL');
      setDocumentType('CC');
      setDocumentNumber('');
      setFullName(prefill?.fullName ?? '');
      setEmail(prefill?.email ?? '');
      setBankCode('');
      setFormErrors({});
      setResult(null);
    }
  }, [open, prefill?.fullName, prefill?.email]);

  // Validación form
  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    if (!/^\d{6,15}$/.test(documentNumber.trim())) errors.documentNumber = 'Entre 6 y 15 dígitos.';
    if (fullName.trim().length < 3) errors.fullName = 'Requerido (mínimo 3 caracteres).';
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) errors.email = 'Email inválido.';
    if (!bankCode) errors.bankCode = 'Seleccioná un banco.';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [documentNumber, fullName, email, bankCode]);

  const handleProcess = useCallback(async () => {
    if (!paymentInfo) return;
    if (!validateForm()) return;
    setStep('processing');
    try {
      const dto: PseProcessDto = {
        leaseId,
        amount: paymentInfo.monthlyRent,
        periodMonth: paymentInfo.currentPeriod.month,
        periodYear: paymentInfo.currentPeriod.year,
        personType,
        documentType,
        documentNumber: documentNumber.trim(),
        fullName: fullName.trim(),
        email: email.trim(),
        bankCode,
      };
      const res = await psePaymentsApi.processPayment(dto);
      setResult(res);
      setStep('result');
      if (res.status === 'SUCCESS' || res.status === 'PENDING') {
        onPaid?.(res);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al procesar el pago.';
      // Backend tira 409 Conflict si el período ya fue pagado → mostrar como fallido inline.
      setResult({
        transactionId: '',
        status: 'FAILURE',
        message: msg,
        bankName: banks.find((b) => b.code === bankCode)?.name ?? '',
        timestamp: new Date().toISOString(),
      });
      setStep('result');
    }
  }, [
    paymentInfo, validateForm, leaseId, personType, documentType, documentNumber,
    fullName, email, bankCode, banks, onPaid,
  ]);

  const monthName = paymentInfo
    ? new Date(paymentInfo.currentPeriod.year, paymentInfo.currentPeriod.month - 1, 1)
        .toLocaleDateString(locale === 'es' ? 'es-CO' : 'en-US', { month: 'long', year: 'numeric' })
    : '';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={step === 'processing' ? undefined : onClose}
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
                disabled={step === 'processing'}
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
                  <Field label="Banco" error={formErrors.bankCode}>
                    <Select value={bankCode} onValueChange={setBankCode}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Seleccioná tu banco" />
                      </SelectTrigger>
                      <SelectContent>
                        {banks.map((b) => (
                          <SelectItem key={b.code} value={b.code}>{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>

                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Tipo de persona">
                      <Select
                        value={personType}
                        onValueChange={(v) => setPersonType(v as PsePersonType)}
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
                        value={documentType}
                        onValueChange={(v) => setDocumentType(v as PseDocumentType)}
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

                  <Field label="Número de documento" error={formErrors.documentNumber}>
                    <Input
                      inputMode="numeric"
                      value={documentNumber}
                      onChange={(e) => setDocumentNumber(e.target.value.replace(/\D/g, ''))}
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

              {/* Step: processing */}
              {step === 'processing' && (
                <div className="py-10 flex flex-col items-center justify-center gap-3 text-center">
                  <Spinner size="xl" variant="current" className="text-primary" />
                  <p className="text-sm font-medium text-fg">Procesando pago...</p>
                  <p className="text-xs text-fg-muted">No cierres esta ventana.</p>
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

              {step === 'result' && (
                <Button
                  type="button"
                  onClick={onClose}
                  hideArrow
                  className="ml-auto"
                >
                  Cerrar
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
  result: PseProcessResponse;
  amount: number;
  formatCurrency: (n: number) => string;
}) {
  if (result.status === 'SUCCESS') {
    return (
      <div className="py-6 flex flex-col items-center text-center space-y-3">
        <div className="w-14 h-14 rounded-full bg-success-soft flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-success" />
        </div>
        <div>
          <p className="text-lg font-semibold text-fg">¡Pago procesado!</p>
          <p className="text-sm text-fg-muted mt-1">{result.message}</p>
        </div>
        <div className="rounded-[14px] border border-border bg-surface-muted p-3 w-full space-y-1 text-xs">
          <Row label="Monto" value={formatCurrency(amount)} mono />
          <Row label="Banco" value={result.bankName} />
          <Row label="Transacción" value={result.transactionId} mono />
        </div>
        <p className="text-xs text-fg-muted">
          Tu pago quedó registrado. Lo vas a ver en tu historial.
        </p>
      </div>
    );
  }

  if (result.status === 'PENDING') {
    return (
      <div className="py-6 flex flex-col items-center text-center space-y-3">
        <div className="w-14 h-14 rounded-full bg-warning-soft flex items-center justify-center">
          <Clock className="w-8 h-8 text-warning" />
        </div>
        <div>
          <p className="text-lg font-semibold text-fg">En verificación bancaria</p>
          <p className="text-sm text-fg-muted mt-1">{result.message}</p>
        </div>
        <div className="rounded-[14px] border border-border bg-surface-muted p-3 w-full space-y-1 text-xs">
          <Row label="Banco" value={result.bankName} />
          <Row label="Transacción" value={result.transactionId} mono />
        </div>
      </div>
    );
  }

  // FAILURE
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

  // PENDING_VALIDATION — viene del caso PSE PENDING (verificación bancaria)
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

