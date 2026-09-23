'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CreditCard, Lock, Check, Buildings, WarningCircle } from '@phosphor-icons/react';
import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { Input, Spinner } from '@/components/ui';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioCard, RadioCardGroup } from '@leasefy/cadence';
import { CouponInput, PriceSummary } from '@/components/pricing';
import { getPlanById, getYearlySavings } from '@/lib/constants/subscription-plans';
import { conPrecioDelBack, precioLegible } from '@/lib/planes/precio-del-plan-del-propietario';
import { ResultadoDelPagoPse } from './ResultadoDelPagoPse';
import { subscriptionsApi } from '@/lib/api/subscriptions.service';
import { pseCheckoutApi } from '@/lib/api/pse-checkout.service';
import type { PseFinancialInstitution } from '@/lib/api/pse-checkout.types';
import type { BackendSubscriptionPlan, PSEDocumentType, PuedePagarElPlan } from '@/lib/api/subscriptions.types';
import { useAuth } from '@/lib/auth';
import type { PlanId, BillingCycle } from '@/lib/types/subscription';
import type { AppliedCoupon } from '@/lib/types/coupon';
import { useI18n } from '@/lib/i18n';

const TIPOS_DE_DOCUMENTO: PSEDocumentType[] = ['CC', 'CE', 'NIT', 'PP'];

/** La misma regla que el back (`PseSubscriptionCheckoutDto.legalId`). */
const DOCUMENTO_VALIDO = /^\d{6,15}$/;

/**
 * Inner checkout component that uses search params
 */
function CheckoutContent() {
  const { t } = useI18n();
  const { user } = useAuth();
  const searchParams = useSearchParams();

  // Get plan from URL or default to pro
  const planId = (searchParams.get('plan') || 'pro') as PlanId;
  const initialBilling = (searchParams.get('billing') || 'monthly') as BillingCycle;

  // 🔴 El PRECIO lo dice el back (QA 23-09): esta pantalla mostraba
  // $149.900/$1.439.000 de `PLANS` mientras el back cobraba $149.000/$1.430.000.
  // Del catálogo del front queda el nombre y los rasgos; las cifras, del plan
  // que devuelve `GET /subscription-plans`, el mismo con el que se cobra.
  const [planesDelBack, setPlanesDelBack] = useState<BackendSubscriptionPlan[]>([]);
  const plan = conPrecioDelBack(getPlanById(planId), planesDelBack);

  const [billingCycle, setBillingCycle] = useState<BillingCycle>(initialBilling);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [backendPlanId, setBackendPlanId] = useState<string | null>(null);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [planError, setPlanError] = useState<string | null>(null);

  // Datos del pagador para el PSE real (Wompi). Antes esto se pedía en
  // `/pse-mock`, una página pública que simulaba el banco; se borró el 23-09.
  const [bancos, setBancos] = useState<PseFinancialInstitution[]>([]);
  const [bancosError, setBancosError] = useState(false);
  const [banco, setBanco] = useState('');
  const [tipoDePersona, setTipoDePersona] = useState<'NATURAL' | 'JURIDICA'>('NATURAL');
  const [tipoDeDocumento, setTipoDeDocumento] = useState<PSEDocumentType>('CC');
  const [documento, setDocumento] = useState('');
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [pagoError, setPagoError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.email) setCorreo((actual) => actual || user.email);
  }, [user?.email]);

  useEffect(() => {
    pseCheckoutApi
      .getFinancialInstitutions()
      .then(setBancos)
      .catch(() => setBancosError(true));
  }, []);

  // Get price based on billing cycle (`null` mientras no llegue del back).
  const price = billingCycle === 'monthly' ? plan.price.monthly : plan.price.yearly;
  const ahorroAnual = getYearlySavings(plan);

  /*
   * 🔴 ¿Puede pagar? (QA 23-09) Con el panel del propietario independiente EN
   * PAUSA el back rechaza el checkout (409): no se ofrece un botón que termina
   * en error — se dice el porqué y el botón queda apagado. `null` = todavía no
   * se sabe (el botón espera); si la pregunta falla, no se bloquea: el back
   * vuelve a mirar al cobrar y su 409 se muestra igual.
   */
  const [puedePagar, setPuedePagar] = useState<PuedePagarElPlan | null>(null);
  useEffect(() => {
    let vivo = true;
    subscriptionsApi
      .puedePagarElPlanDelPropietario()
      .then((r) => {
        if (vivo) setPuedePagar(r);
      })
      .catch(() => {
        if (vivo) setPuedePagar({ puede: true, code: null, motivo: null });
      });
    return () => {
      vivo = false;
    };
  }, []);
  const enPausa = puedePagar?.puede === false;

  // Resolve the backend plan UUID for this landlord tier — the real PSE flow
  // needs the id, not the marketing slug. (Previously "Pagar" was a fake
  // setTimeout + alert() that never subscribed.)
  useEffect(() => {
    subscriptionsApi
      .getPlans('LANDLORD')
      .then((plans) => {
        setPlanesDelBack(plans);
        const match = plans.find((p) => p.tier?.toLowerCase() === planId.toLowerCase());
        if (match) setBackendPlanId(match.id);
        else setPlanError(t('landlord.checkout.planNotFound'));
      })
      .catch(() => setPlanError(t('landlord.checkout.planLoadError')))
      .finally(() => setLoadingPlan(false));
  }, [planId, t]);

  const datosCompletos =
    !!banco &&
    DOCUMENTO_VALIDO.test(documento.trim()) &&
    nombre.trim().length > 0 &&
    /.+@.+\..+/.test(correo.trim());

  // El pago real: el back crea la suscripción pendiente y la transacción PSE
  // en Wompi, y nos devuelve la URL del banco. El monto NO sale de acá: lo
  // calcula el back con el plan, el ciclo y el cupón. (Antes se mandaba a
  // `/pse-mock?amount=…`, que simulaba el banco; en producción el back rechaza
  // ese riel, así que el propietario nunca lograba pagar.)
  const handleSubmit = async () => {
    if (!backendPlanId || !datosCompletos || enPausa) return;
    setIsProcessing(true);
    setPagoError(null);
    try {
      const res = await subscriptionsApi.startPseCheckout({
        planId: backendPlanId,
        cycle: billingCycle === 'yearly' ? 'ANNUAL' : 'MONTHLY',
        ...(appliedCoupon ? { couponCode: appliedCoupon.code } : {}),
        userType: tipoDePersona,
        legalIdType: tipoDeDocumento,
        legalId: documento.trim(),
        financialInstitutionCode: banco,
        email: correo.trim(),
        fullName: nombre.trim(),
      });
      if (res.asyncPaymentUrl) {
        window.location.assign(res.asyncPaymentUrl);
        return;
      }
      setPagoError(t('landlord.checkout.bankLinkMissing'));
    } catch (err) {
      setPagoError(err instanceof Error ? err.message : t('landlord.checkout.paymentStartError'));
    }
    setIsProcessing(false);
  };

  // Plan features to display
  const includedFeatures = plan.features
    .filter((f) => f.included)
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Back link */}
        <div className="mb-6">
          <BackButton href="/panel/upgrade" label={t('landlord.checkout.backToPlans')} />
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {t('landlord.checkout.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('landlord.checkout.subscribingTo')}{' '}
            <span className="font-medium text-foreground">{plan.name}</span>
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          {/* Main form column */}
          <div className="lg:col-span-3 space-y-6">
            {/* Plan summary card */}
            <div className="bg-card rounded-sm border border-border p-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-sm bg-primary/10 flex items-center justify-center shrink-0">
                  <Buildings className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-foreground">
                    {t('landlord.checkout.planLabel', { name: plan.name })}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {plan.description}
                  </p>
                  <ul className="mt-3 space-y-1.5">
                    {includedFeatures.map((feature) => (
                      <li
                        key={feature.id}
                        className="flex items-center gap-2 text-sm text-muted-foreground"
                      >
                        <Check className="w-3.5 h-3.5 text-success shrink-0" />
                        <span>{feature.name}</span>
                        {feature.limit && feature.limit !== 'unlimited' && (
                          <span className="text-muted-foreground">
                            ({t('landlord.checkout.upTo', { limit: feature.limit })})
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Billing cycle selector */}
            <div className="bg-card rounded-sm border border-border p-5">
              <label className="text-sm font-medium text-foreground mb-3 block">
                {t('landlord.checkout.billingCycle')}
              </label>
              <RadioCardGroup
                value={billingCycle}
                onValueChange={(value) => setBillingCycle(value as BillingCycle)}
                aria-label={t('landlord.checkout.billingCycle')}
              >
                <RadioCard
                  value="monthly"
                  className="flex-1"
                  label={
                    <span className="block">
                      <span className="block">{t('landlord.checkout.monthly')}</span>
                      <span className="block mt-1 text-lg font-bold text-foreground">
                        {precioLegible(plan.price.monthly)}
                        <span className="text-sm font-normal text-muted-foreground">{t('landlord.checkout.perMonth')}</span>
                      </span>
                    </span>
                  }
                />
                <RadioCard
                  value="yearly"
                  className="flex-1"
                  badge={
                    ahorroAnual > 0 ? (
                      <span className="px-2 py-0.5 text-xs font-medium bg-success text-white rounded-sm">
                        {t('landlord.checkout.yearlySaving', { percent: ahorroAnual })}
                      </span>
                    ) : undefined
                  }
                  label={
                    <span className="block">
                      <span className="block">{t('landlord.checkout.yearly')}</span>
                      <span className="block mt-1 text-lg font-bold text-foreground">
                        {precioLegible(plan.price.yearly)}
                        <span className="text-sm font-normal text-muted-foreground">{t('landlord.checkout.perYear')}</span>
                      </span>
                    </span>
                  }
                />
              </RadioCardGroup>
            </div>

            {/* Coupon input */}
            <div className="bg-card rounded-sm border border-border p-5">
              {price !== null ? (
                <CouponInput
                  planId={planId}
                  price={price}
                  appliedCoupon={appliedCoupon}
                  onApplyCoupon={setAppliedCoupon}
                />
              ) : (
                <p className="text-sm text-muted-foreground">{t('landlord.checkout.priceLoading')}</p>
              )}
            </div>

            {/* Datos del pago por PSE (Wompi) */}
            <div className="bg-card rounded-sm border border-border p-5 space-y-4">
              <div>
                <h2 className="text-sm font-medium text-foreground">
                  {t('landlord.checkout.pseTitle')}
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {t('landlord.checkout.pseHint')}
                </p>
              </div>

              <div>
                <label htmlFor="pse-banco" className="text-sm font-medium text-foreground mb-1 block">
                  {t('landlord.checkout.bank')}
                </label>
                <Select value={banco} onValueChange={setBanco} disabled={bancosError || bancos.length === 0}>
                  <SelectTrigger id="pse-banco">
                    <SelectValue placeholder={t('landlord.checkout.bankPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {bancos.map((b) => (
                      <SelectItem key={b.financial_institution_code} value={b.financial_institution_code}>
                        {b.financial_institution_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {bancosError && (
                  <p className="text-sm text-destructive mt-1">{t('landlord.checkout.banksError')}</p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="pse-persona" className="text-sm font-medium text-foreground mb-1 block">
                    {t('landlord.checkout.personType')}
                  </label>
                  <Select value={tipoDePersona} onValueChange={(v) => setTipoDePersona(v as 'NATURAL' | 'JURIDICA')}>
                    <SelectTrigger id="pse-persona">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NATURAL">{t('landlord.checkout.personNatural')}</SelectItem>
                      <SelectItem value="JURIDICA">{t('landlord.checkout.personJuridica')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label htmlFor="pse-tipo-doc" className="text-sm font-medium text-foreground mb-1 block">
                    {t('landlord.checkout.documentType')}
                  </label>
                  <Select value={tipoDeDocumento} onValueChange={(v) => setTipoDeDocumento(v as PSEDocumentType)}>
                    <SelectTrigger id="pse-tipo-doc">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_DE_DOCUMENTO.map((tipo) => (
                        <SelectItem key={tipo} value={tipo}>
                          {t(`landlord.checkout.documentTypes.${tipo}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="pse-documento" className="text-sm font-medium text-foreground mb-1 block">
                    {t('landlord.checkout.documentNumber')}
                  </label>
                  <Input
                    id="pse-documento"
                    inputMode="numeric"
                    autoComplete="off"
                    className="font-mono"
                    value={documento}
                    onChange={(e) => setDocumento(e.target.value.replace(/\D/g, '').slice(0, 15))}
                  />
                </div>
                <div>
                  <label htmlFor="pse-nombre" className="text-sm font-medium text-foreground mb-1 block">
                    {t('landlord.checkout.fullName')}
                  </label>
                  <Input
                    id="pse-nombre"
                    autoComplete="name"
                    maxLength={200}
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="pse-correo" className="text-sm font-medium text-foreground mb-1 block">
                  {t('landlord.checkout.email')}
                </label>
                <Input
                  id="pse-correo"
                  type="email"
                  autoComplete="email"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Summary column */}
          <div className="lg:col-span-2">
            <div className="lg:sticky lg:top-8 space-y-4">
              {/* Price summary */}
              <PriceSummary
                plan={plan}
                billingCycle={billingCycle}
                appliedCoupon={appliedCoupon}
              />

              {/* Plan resolution error — surface the real failure instead of
                  letting the user fake-buy. */}
              {planError && (
                <div className="flex items-center gap-2 rounded-sm bg-destructive/10 p-3 text-sm text-destructive">
                  <WarningCircle className="w-4 h-4 shrink-0" />
                  <span>{planError}</span>
                </div>
              )}

              {enPausa && (
                <div
                  role="alert"
                  data-testid="checkout-en-pausa"
                  className="rounded-sm bg-warning-soft p-3 text-sm text-warning"
                >
                  <p className="font-medium">{t('landlord.checkout.noPuedePagar')}</p>
                  <p className="mt-1">{puedePagar?.motivo}</p>
                </div>
              )}

              {pagoError && (
                <div role="alert" className="flex items-center gap-2 rounded-sm bg-destructive/10 p-3 text-sm text-destructive">
                  <WarningCircle className="w-4 h-4 shrink-0" />
                  <span>{pagoError}</span>
                </div>
              )}

              {/* Payment button */}
              <Button
                className="w-full"
                size="lg"
                onClick={handleSubmit}
                disabled={
                  isProcessing ||
                  loadingPlan ||
                  !backendPlanId ||
                  !datosCompletos ||
                  puedePagar === null ||
                  enPausa ||
                  price === null
                }
                title={
                  enPausa
                    ? (puedePagar?.motivo ?? undefined)
                    : !datosCompletos
                      ? t('landlord.checkout.completePayerData')
                      : undefined
                }
                data-testid="checkout-pagar"
              >
                {isProcessing ? (
                  <>
                    <Spinner size="sm" variant="white" className="mr-2" />
                    {t('landlord.checkout.processing')}
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    {t('landlord.checkout.payNow')}
                  </>
                )}
              </Button>

              {/* Security note */}
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Lock className="w-3 h-3" />
                <span>{t('landlord.checkout.securePayment')}</span>
              </div>

            </div>
          </div>
        </div>

        {/* Robottom trust message */}
        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            {t('landlord.checkout.cancelAnytime')}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * El regreso del banco: el PSE del plan vuelve a
 * `/panel/checkout?resultado=pse&pago=<id>` (QA 23-09: antes no volvía).
 */
function CheckoutORegreso() {
  const searchParams = useSearchParams();
  const pagoId = searchParams.get('pago');
  if (searchParams.get('resultado') === 'pse' && pagoId) {
    return <ResultadoDelPagoPse pagoId={pagoId} plan={searchParams.get('plan')} />;
  }
  return <CheckoutContent />;
}

/**
 * Checkout page with coupon integration
 * Wrapped in Suspense for Next.js 14 useSearchParams requirement
 */
export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner size="md" />
      </div>
    }>
      <CheckoutORegreso />
    </Suspense>
  );
}
