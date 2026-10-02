'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle, ArrowRight } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const AGENCY_PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 'Gratis',
    priceDetail: '$0 COP/mes',
    evalPrice: '$42.000 COP/eval',
    description: 'Solo scoring basico',
    features: [
      'Scoring basico con IA',
      '$42.000 COP por evaluacion AI',
      'CRM de candidatos',
      'Publicacion en portales',
    ],
    cta: 'Empezar gratis',
    ctaHref: '/auth',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$149.000',
    priceDetail: 'COP/mes',
    evalPrice: '$21.000 COP/eval (50% off)',
    description: 'Scoring + Matching + Reportes',
    popular: true,
    features: [
      'Evaluaciones AI al 50% descuento',
      'Hasta 30 evaluaciones/mes',
      'Scoring + Matching + Reportes',
      'Contratos digitales',
      'Hasta 100 propiedades, 10 usuarios',
    ],
    cta: 'Empezar con Pro',
    ctaHref: '/auth',
  },
  {
    id: 'flex',
    name: 'Flex',
    price: '1%',
    priceDetail: 'del canon administrado',
    evalPrice: 'Ilimitadas y gratis',
    description: 'Todo incluido, sin limites',
    isFlex: true,
    features: [
      'Evaluaciones ilimitadas y gratis',
      'Los 19 agentes AI completos',
      'Propiedades y usuarios ilimitados',
      'API REST + Webhooks',
      'Soporte prioritario dedicado',
    ],
    cta: 'Contactar ventas',
    ctaHref: 'mailto:ventas@leasefy.co',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Personalizado',
    priceDetail: '',
    evalPrice: 'Incluido',
    description: 'Infraestructura dedicada',
    features: [
      'Todo en Flex',
      'White-label completo',
      'SLA garantizado 99.9%',
      'Onboarding personalizado',
    ],
    cta: 'Contactar',
    ctaHref: 'mailto:ventas@leasefy.co',
  },
];

export function AgencyPricingModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  /*
   * El `Dialog` de la plataforma (DESIGN.md §17), ancho `xl` para las cuatro
   * columnas. Era una capa a mano (`fixed inset-0`, ✕ propia, sin Esc ni foco
   * atrapado). El contenido de los planes —precios, textos y CTAs— es del
   * modelo de negocio y NO se toca acá; sólo el fondo de las tarjetas pasó de
   * `surface-muted` (amarillento en oscuro) a `surface-hover`.
   */
  return (
    <Dialog
      open={open}
      onOpenChange={(abierto) => {
        if (!abierto) onClose();
      }}
    >
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle>Planes para inmobiliarias</DialogTitle>
          <DialogDescription>Empieza gratis, escala sin limites</DialogDescription>
        </DialogHeader>

        {/* Plans Grid — `pt-3`: la etiqueta de arriba de la tarjeta sobresale
            y el borde del cuerpo con scroll la cortaría. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-3">
          {AGENCY_PLANS.map((plan) => (
            <div
              key={plan.id}
              className={cn(
                'relative rounded-lg p-5 flex flex-col transition-all duration-200 cursor-pointer',
                selectedPlan === plan.id
                  ? 'ring-2 ring-primary bg-primary-soft/50 dark:bg-primary/20'
                  : 'bg-surface-hover',
                'border',
                plan.isFlex ? 'border-warning/30' : 'border-border dark:border-border-strong'
              )}
              onClick={() => setSelectedPlan(plan.id)}
            >
              {plan.popular && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-fg uppercase tracking-wide font-mono text-[10px] font-semibold px-3 py-1 rounded-full">
                  Mas popular
                </span>
              )}
              {plan.isFlex && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-warning to-warning text-white text-[10px] font-semibold px-3 py-1 rounded-full">
                  Todo incluido
                </span>
              )}

              <h3 className="text-[15px] font-semibold text-fg dark:text-white mt-1">{plan.name}</h3>
              <p className="text-[11px] text-fg-muted dark:text-fg-subtle mb-3">{plan.description}</p>

              <div className="mb-3">
                <span className="text-[22px] font-bold text-fg dark:text-white">{plan.price}</span>
                {plan.priceDetail && (
                  <span className="text-[12px] text-fg-muted dark:text-fg-subtle ml-1">{plan.priceDetail}</span>
                )}
              </div>

              <div className="px-2.5 py-1.5 bg-surface border border-border-faint rounded-md mb-3 text-center">
                <span className="text-[11px] text-fg-muted dark:text-fg-subtle">Eval AI: </span>
                <span className={cn("text-[11px] font-semibold", plan.isFlex ? 'text-success' : 'text-fg dark:text-white')}>
                  {plan.evalPrice}
                </span>
              </div>

              <ul className="space-y-2 flex-1 mb-4">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
                    <span className="text-[11px] text-fg-muted dark:text-fg-subtle">{feature}</span>
                  </li>
                ))}
              </ul>

              {plan.ctaHref?.startsWith('mailto') ? (
                <a href={plan.ctaHref}>
                  <Button
                    size="sm"
                    variant={plan.popular || plan.isFlex ? 'default' : 'outline'}
                    className="w-full rounded-md text-[12px]"
                  >
                    {plan.cta}
                  </Button>
                </a>
              ) : (
                <Link href={plan.ctaHref}>
                  <Button
                    size="sm"
                    variant={plan.popular || plan.isFlex ? 'default' : 'outline'}
                    className="w-full rounded-md text-[12px]"
                  >
                    {plan.cta}
                  </Button>
                </Link>
              )}
            </div>
          ))}
        </div>

        {/* Footer link */}
        <div className="text-center">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1.5 text-[13px] text-fg-muted hover:text-fg dark:text-fg-subtle dark:hover:text-white transition-colors"
          >
            Ver detalles completos de cada plan
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
