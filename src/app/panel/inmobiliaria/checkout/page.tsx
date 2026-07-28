'use client';
import { PageGuard } from '@/components/auth/PageGuard';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  CreditCard,
  Lock,
  Check,
  Buildings,
  WarningCircle,
  Bank,
  ArrowSquareOut,
  CheckCircle,
} from '@phosphor-icons/react';
import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getAgencyPlanById } from '@/lib/constants/subscription-plans';
import { pseCheckoutApi } from '@/lib/api/pse-checkout.service';
import { agencySubscriptionApi } from '@/lib/api/agency-subscription.service';
import { useAuth } from '@/lib/auth/use-auth';
import { formatCurrency } from '@/lib/format';
import type { AgencyPlanId } from '@/lib/types/subscription';
import type {
  AgencyPlanTier,
  ChargePseCheckoutDto,
} from '@/lib/api/agency-subscription.types';
import type {
  PseFinancialInstitution,
  PseLegalIdType,
  PseUserType,
} from '@/lib/api/pse-checkout.types';

type CheckoutState = 'idle' | 'processing' | 'awaiting' | 'success' | 'error';

const DOCUMENT_TYPES: { value: PseLegalIdType; label: string }[] = [
  { value: 'CC', label: 'Cédula de ciudadanía' },
  { value: 'CE', label: 'Cédula de extranjería' },
  { value: 'NIT', label: 'NIT' },
  { value: 'PP', label: 'Pasaporte' },
];

const POLL_INTERVAL_MS = 5_000;

function AgencyCheckoutInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  const planTier = (searchParams.get('plan') || 'starter') as AgencyPlanId;
  const plan = getAgencyPlanById(planTier);

  const isPercentage = plan.pricingModel === 'percentage';
  const isCustom = plan.pricingModel === 'custom' || plan.price.monthly === null;
  const isFree = plan.price.monthly === 0 && !isPercentage && !isCustom;
  const isPaid = !isFree && !isPercentage && !isCustom; // PRO

  // starter → STARTER (free), flex → FLEX (postpaid), pro → PRO (PSE). enterprise → custom quote.
  const planTierEnum: AgencyPlanTier | null = isFree
    ? 'STARTER'
    : isPercentage
      ? 'FLEX'
      : isPaid
        ? 'PRO'
        : null;

  const priceDisplay = isPercentage
    ? `${plan.canonPercentage ?? 1}% del canon`
    : isCustom
      ? 'A la medida'
      : formatCurrency(plan.price.monthly ?? 0);

  const [state, setState] = useState<CheckoutState>('idle');
  const [error, setError] = useState<string | null>(null);

  // PSE payer form (PRO only)
  const [institutions, setInstitutions] = useState<PseFinancialInstitution[]>([]);
  const [userType, setUserType] = useState<PseUserType>('NATURAL');
  const [legalIdType, setLegalIdType] = useState<PseLegalIdType>('CC');
  const [legalId, setLegalId] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [institutionCode, setInstitutionCode] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Polling / redirect
  const [asyncUrl, setAsyncUrl] = useState<string | null>(null);
  const [popupBlocked, setPopupBlocked] = useState(false);
  const [pollError, setPollError] = useState<string | null>(null);

  // Prefill payer identity from the logged-in admin.
  useEffect(() => {
    if (user) {
      setFullName((prev) => prev || user.name || '');
      setEmail((prev) => prev || user.email || '');
    }
  }, [user]);

  // Load the real PSE bank catalog (only needed for the paid PRO flow).
  useEffect(() => {
    if (!isPaid) return;
    let cancelled = false;
    pseCheckoutApi
      .getFinancialInstitutions()
      .then((list) => { if (!cancelled) setInstitutions(list); })
      .catch(() => { if (!cancelled) setInstitutions([]); });
    return () => { cancelled = true; };
  }, [isPaid]);

  // Resolve the current payment outcome from the agency subscription state.
  // active → paid; failed → declined/no charge; pending → keep waiting; error → GET failed.
  const checkStatus = useCallback(async (): Promise<'active' | 'failed' | 'pending' | 'error'> => {
    try {
      // verify() reconciles the open charge against Wompi (self-heals a missing
      // webhook) and returns fresh state — so awaiting resolves without the webhook.
      const s = await agencySubscriptionApi.verify();
      if (!s) return 'pending';
      const gw = (s.openCharge?.gatewayStatus ?? '').toUpperCase();
      if (s.status === 'ACTIVE') return 'active';
      if (!s.openCharge || gw === 'DECLINED' || gw === 'ERROR' || gw === 'VOIDED') return 'failed';
      return 'pending';
    } catch {
      return 'error';
    }
  }, []);

  const applyStatus = useCallback(
    (r: 'active' | 'failed' | 'pending' | 'error') => {
      if (r === 'active') {
        setState('success');
        setTimeout(() => router.push('/panel/inmobiliaria'), 2500);
      } else if (r === 'failed') {
        setError('El pago fue rechazado o no se completó. Podés intentar de nuevo.');
        setState('error');
      } else if (r === 'error') {
        setPollError('No pudimos verificar el estado. Reintentando…');
      } else {
        setPollError(null);
      }
    },
    [router],
  );

  // Poll the agency subscription until the charge resolves (paid → ACTIVE).
  useEffect(() => {
    if (state !== 'awaiting') return;
    let cancelled = false;
    const run = async () => {
      const r = await checkStatus();
      if (!cancelled) applyStatus(r);
    };
    run();
    const id = setInterval(run, POLL_INTERVAL_MS);
    // Background tabs throttle setInterval — re-check immediately when the user
    // returns from the Wompi payment tab.
    window.addEventListener('focus', run);
    return () => {
      cancelled = true;
      clearInterval(id);
      window.removeEventListener('focus', run);
    };
  }, [state, checkStatus, applyStatus]);

  // Manual fallback if the webhook is slow or a poll hiccuped.
  const handleVerify = useCallback(async () => {
    setPollError('Verificando…');
    const r = await checkStatus();
    if (r === 'pending') {
      setPollError('Todavía no vemos la confirmación. Esperá unos segundos y reintentá.');
    } else {
      applyStatus(r);
    }
  }, [checkStatus, applyStatus]);

  const clearErr = (k: string) =>
    setFormErrors((prev) => (prev[k] ? { ...prev, [k]: '' } : prev));

  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    if (!/^\d{6,15}$/.test(legalId.trim())) errors.legalId = 'Entre 6 y 15 dígitos.';
    if (fullName.trim().length < 3) errors.fullName = 'Requerido (mínimo 3 caracteres).';
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) errors.email = 'Email inválido.';
    if (!institutionCode) errors.institutionCode = 'Seleccioná un banco.';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [legalId, fullName, email, institutionCode]);

  // STARTER / FLEX — activate without payment.
  const handleActivate = useCallback(async () => {
    if (!planTierEnum) return;
    setState('processing');
    setError(null);
    try {
      await agencySubscriptionApi.selectPlan(planTierEnum);
      setState('success');
      setTimeout(() => router.push('/panel/inmobiliaria'), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo activar el plan.');
      setState('error');
    }
  }, [planTierEnum, router]);

  // PRO — select plan (→ PENDING charge) then start the PSE checkout.
  const handlePayPro = useCallback(async () => {
    if (!validateForm()) return;
    setState('processing');
    setError(null);
    setPopupBlocked(false);
    try {
      const { charge } = await agencySubscriptionApi.selectPlan('PRO');
      if (!charge) {
        setError('No se generó un cobro para este plan. Contactá a soporte.');
        setState('error');
        return;
      }
      const dto: ChargePseCheckoutDto = {
        userType,
        legalIdType,
        legalId: legalId.trim(),
        financialInstitutionCode: institutionCode,
        email: email.trim(),
        fullName: fullName.trim(),
      };
      const res = await agencySubscriptionApi.chargePseCheckout(charge.id, dto);
      setAsyncUrl(res.asyncPaymentUrl);
      if (res.asyncPaymentUrl) {
        const win = window.open(res.asyncPaymentUrl, '_blank', 'noopener,noreferrer');
        if (!win) setPopupBlocked(true);
      }
      setState('awaiting');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar el pago.');
      setState('error');
    }
  }, [validateForm, userType, legalIdType, legalId, institutionCode, email, fullName]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <BackButton href="/panel/inmobiliaria/upgrade" label="Volver a los planes" />
        </div>

        <div className="mb-8 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-fg">
            {isCustom ? 'Solicitar cotización' : 'Confirmar suscripción'}
          </h1>
          <p className="text-sm text-fg-muted">
            Suscribirse al plan <span className="font-medium text-fg">{plan.name}</span>
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Left — plan summary */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-card rounded-xl border border-border p-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-surface-muted flex items-center justify-center shrink-0">
                  <Buildings className="w-6 h-6 text-fg-muted" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-foreground">Plan {plan.name}</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">{plan.description}</p>
                  <ul className="mt-3 space-y-1.5">
                    {plan.features.slice(0, 6).map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="w-3.5 h-3.5 text-success shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-xl border border-border p-5">
              <p className="text-sm font-medium text-foreground mb-3">Límites del plan</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-md bg-muted/50 text-center">
                  <p className="text-2xl font-bold text-foreground">
                    {plan.limits.properties === null ? '∞' : plan.limits.properties}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">Propiedades</p>
                </div>
                <div className="p-3 rounded-md bg-muted/50 text-center">
                  <p className="text-2xl font-bold text-foreground">
                    {plan.limits.users === null ? '∞' : plan.limits.users}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">Usuarios</p>
                </div>
              </div>
            </div>

            {/* PRO — PSE payer form */}
            {isPaid && state === 'idle' && (
              <div className="bg-card rounded-xl border border-border p-5 space-y-4">
                <p className="text-sm font-medium text-foreground">Datos del pagador (PSE)</p>

                <Field label="Banco" error={formErrors.institutionCode}>
                  <Select
                    value={institutionCode}
                    onValueChange={(v) => { setInstitutionCode(v); clearErr('institutionCode'); }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleccioná tu banco" />
                    </SelectTrigger>
                    <SelectContent>
                      {institutions.map((b) => (
                        <SelectItem key={b.financial_institution_code} value={b.financial_institution_code}>
                          {b.financial_institution_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Tipo de persona">
                    <Select value={userType} onValueChange={(v) => setUserType(v as PseUserType)}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NATURAL">Natural</SelectItem>
                        <SelectItem value="JURIDICA">Jurídica</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Tipo doc.">
                    <Select value={legalIdType} onValueChange={(v) => setLegalIdType(v as PseLegalIdType)}>
                      <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
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
                    onChange={(e) => { setLegalId(e.target.value.replace(/\D/g, '')); clearErr('legalId'); }}
                    className="font-mono tabular-nums"
                    placeholder="1234567890"
                  />
                </Field>
                <Field label="Nombre completo" error={formErrors.fullName}>
                  <Input value={fullName} onChange={(e) => { setFullName(e.target.value); clearErr('fullName'); }} />
                </Field>
                <Field label="Email" error={formErrors.email}>
                  <Input type="email" value={email} onChange={(e) => { setEmail(e.target.value); clearErr('email'); }} />
                </Field>
              </div>
            )}
          </div>

          {/* Right — price + CTA / states */}
          <div className="lg:col-span-2">
            <div className="lg:sticky lg:top-8 space-y-4">
              <div className="bg-card rounded-xl border border-border p-5">
                <p className="text-sm font-medium text-foreground mb-4">Resumen</p>
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Plan {plan.name}</span>
                  <span className="font-semibold text-foreground">{priceDisplay}</span>
                </div>
                {isPaid && (
                  <div className="flex items-baseline justify-between pt-3 border-t border-border">
                    <span className="text-sm font-semibold text-foreground">Total / mes</span>
                    <span className="text-lg font-bold text-foreground">{priceDisplay}</span>
                  </div>
                )}
                {isPercentage && (
                  <p className="text-xs text-muted-foreground pt-2 border-t border-border">
                    Se calcula sobre el canon mensual total administrado. Se cobra al cierre del mes.
                  </p>
                )}
                {isFree && (
                  <p className="text-xs text-muted-foreground pt-2 border-t border-border">
                    Plan gratuito — se activa sin pago.
                  </p>
                )}
                {isCustom && (
                  <p className="text-xs text-muted-foreground pt-2 border-t border-border">
                    Un asesor te contactará para definir el precio.
                  </p>
                )}
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20">
                  <WarningCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-[13px] text-destructive">{error}</p>
                </div>
              )}

              {/* Success */}
              {state === 'success' && (
                <div className="bg-card rounded-xl border border-border p-5 flex flex-col items-center text-center gap-2">
                  <CheckCircle className="w-10 h-10 text-success" />
                  <p className="font-semibold text-foreground">
                    {isPaid ? '¡Pago confirmado!' : 'Plan activado'}
                  </p>
                  <p className="text-xs text-muted-foreground">Te llevamos al panel…</p>
                </div>
              )}

              {/* Awaiting payment (PRO) */}
              {state === 'awaiting' && (
                <div className="bg-card rounded-xl border border-border p-5 flex flex-col items-center text-center gap-3">
                  <Spinner size="lg" variant="current" className="text-primary" />
                  <p className="text-sm font-medium text-foreground">Esperando la confirmación de tu pago…</p>
                  <p className="text-xs text-muted-foreground">
                    {asyncUrl
                      ? 'Completá el pago en la pestaña que abrimos con tu banco. Esta pantalla se actualiza sola.'
                      : 'Estamos generando el enlace de pago con tu banco.'}
                  </p>
                  {asyncUrl && (
                    <a
                      href={asyncUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-primary underline underline-offset-2"
                    >
                      <ArrowSquareOut className="w-3.5 h-3.5" />
                      {popupBlocked ? 'No se abrió la pestaña — abrí el pago acá' : '¿No ves la pestaña? Abrila de nuevo'}
                    </a>
                  )}
                  {pollError && (
                    <p className="text-xs text-muted-foreground">{pollError}</p>
                  )}
                  <Button variant="ghost" size="sm" hideArrow onClick={handleVerify} className="mt-1">
                    Ya pagué — Verificar estado
                  </Button>
                </div>
              )}

              {/* CTA */}
              {(state === 'idle' || state === 'processing' || state === 'error') && (
                <>
                  {isCustom ? (
                    <Button
                      className="w-full"
                      size="lg"
                      hideArrow
                      onClick={() => router.push('/panel/inmobiliaria')}
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Solicitar cotización
                    </Button>
                  ) : isPaid ? (
                    <Button
                      className="w-full"
                      size="lg"
                      hideArrow
                      onClick={handlePayPro}
                      disabled={state === 'processing'}
                    >
                      {state === 'processing' ? (
                        <><Spinner size="sm" variant="current" className="mr-2" />Conectando con PSE…</>
                      ) : (
                        <><Bank className="w-4 h-4 mr-2" />Pagar con PSE</>
                      )}
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      size="lg"
                      hideArrow
                      onClick={handleActivate}
                      disabled={state === 'processing'}
                    >
                      {state === 'processing' ? (
                        <><Spinner size="sm" variant="current" className="mr-2" />Activando…</>
                      ) : (
                        <>Activar plan {plan.name}</>
                      )}
                    </Button>
                  )}

                  {isPaid && (
                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                      <Lock className="w-3 h-3" />
                      <span>Pago seguro vía PSE</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">Sin contratos. Cancela cuando quieras.</p>
        </div>
      </div>
    </div>
  );
}

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

function AgencyCheckoutContent() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner size="md" variant="muted" />
      </div>
    }>
      <AgencyCheckoutInner />
    </Suspense>
  );
}

export default function AgencyCheckoutPage() {
  return (
    <PageGuard adminOnly>
      <AgencyCheckoutContent />
    </PageGuard>
  );
}
