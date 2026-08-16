'use client';
import { PageGuard } from '@/components/auth/PageGuard';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  CreditCard,
  Lock,
  Check,
  Buildings,
  WarningCircle,
  ArrowSquareOut,
  CheckCircle,
} from '@phosphor-icons/react';
import { BackButton } from '@/components/ui/back-button';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui';
import { useAgencyPlans } from '@/lib/hooks/useSubscription';
import { useAgencyCheckout } from '@/lib/hooks/useAgencyCheckout';
import { formatCurrency } from '@/lib/format';

function AgencyCheckoutInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Resolve the selected plan from the LIVE AGENCY catalog by its real slug —
  // NOT from a hardcoded tier name. This admits admin-created plans (contrato 29
  // · planes dinámicos): what we send to `selectPlan` is the plan's own slug, so
  // the backend charges the right plan (it validates the slug against the catalog).
  const { plans, isLoading: plansLoading } = useAgencyPlans();
  const slug = (searchParams.get('plan') || 'starter').toLowerCase();
  const plan = plans.find((p) => String(p.id).toLowerCase() === slug);

  // Billing behaviour comes from the plan's own pricingModel (derived from the
  // backend `billingMode`/price columns in useAgencyPlans), never a tier name.
  const isPercentage = plan?.pricingModel === 'percentage'; // USAGE_CANON (price.monthly is null)
  const isCustom = plan?.pricingModel === 'custom'; // no dynamic plan is 'custom'; kept for safety
  const isFree = plan?.price.monthly === 0 && !isPercentage && !isCustom;
  const isPaid = !!plan && !isFree && !isPercentage && !isCustom; // FLAT, monthlyPrice > 0

  const priceDisplay = !plan
    ? ''
    : isPercentage
      ? `${plan.canonPercentage ?? 1}% del canon`
      : isCustom
        ? 'A la medida'
        : formatCurrency(plan.price.monthly ?? 0);

  // Single source of the checkout orchestration (shared with /upgrade's direct
  // flow). This page is the deep-link fallback: same hook, no duplicated logic.
  const { state, error, paymentUrl, popupBlocked, pollError, activate, pay, verifyNow } =
    useAgencyCheckout(() => router.push('/panel/inmobiliaria'));

  // Free / percentage (USAGE_CANON) — activate without an upfront charge.
  const handleActivate = () => {
    if (plan) void activate(plan.id);
  };

  // Paid FLAT plan — open the hosted Wompi payment link (avaluo-style).
  const handlePay = () => {
    if (plan) void pay(plan.id);
  };

  // Catalog still loading — hold the render until we can resolve the plan.
  if (plansLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner size="md" variant="muted" />
      </div>
    );
  }

  // Unknown/inactive slug — never silently fall back to another plan.
  if (!plan) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-3">
          <WarningCircle className="w-10 h-10 text-danger mx-auto" />
          <h1 className="text-lg font-semibold text-fg">No encontramos ese plan</h1>
          <p className="text-sm text-fg-muted">
            El plan que buscás no está disponible. Volvé a elegir uno.
          </p>
          <div className="pt-2 flex justify-center">
            <BackButton href="/panel/inmobiliaria/upgrade" label="Volver a los planes" />
          </div>
        </div>
      </div>
    );
  }

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

              {/* Awaiting payment — hosted Wompi tab */}
              {state === 'awaiting' && (
                <div className="bg-card rounded-xl border border-border p-5 flex flex-col items-center text-center gap-3">
                  <Spinner size="lg" variant="current" className="text-primary" />
                  <p className="text-sm font-medium text-foreground">Esperando la confirmación de tu pago…</p>
                  <p className="text-xs text-muted-foreground">
                    {paymentUrl
                      ? 'Completá el pago en la pestaña que abrimos. Esta pantalla se actualiza sola.'
                      : 'Estamos generando el enlace de pago.'}
                  </p>
                  {paymentUrl && (
                    <a
                      href={paymentUrl}
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
                  <Button variant="ghost" size="sm" hideArrow onClick={verifyNow} className="mt-1">
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
                      onClick={handlePay}
                      disabled={state === 'processing'}
                    >
                      {state === 'processing' ? (
                        <><Spinner size="sm" variant="current" className="mr-2" />Generando el pago…</>
                      ) : (
                        <><CreditCard className="w-4 h-4 mr-2" />Ir a pagar</>
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
                      <span>Pago seguro vía Wompi</span>
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
