'use client';

import { useState } from 'react';
import Link from 'next/link';
import { X, Check, CheckCircle, Buildings, Users, Lightning, Cpu, ArrowRight } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { IconButton } from '@leasefy/cadence';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

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

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="bg-surface dark:bg-ink rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-faint dark:border-white/10">
            <div>
              <h2 className="text-lg font-semibold text-fg dark:text-white">
                Planes para inmobiliarias
              </h2>
              <p className="text-sm text-fg-muted dark:text-fg-subtle mt-0.5">
                Empieza gratis, escala sin limites
              </p>
            </div>
            <IconButton
              variant="ghost"
              size="lg"
              onClick={onClose}
              aria-label="Cerrar"
              icon={<X className="w-5 h-5 text-fg-muted dark:text-fg-subtle" />}
            />
          </div>

          {/* Plans Grid */}
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {AGENCY_PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className={cn(
                    'relative rounded-xl p-5 flex flex-col transition-all duration-200 cursor-pointer',
                    selectedPlan === plan.id
                      ? 'ring-2 ring-primary bg-primary-soft/50 dark:bg-primary/20'
                      : plan.isFlex
                        ? 'bg-surface-muted hover:bg-surface-muted dark:hover:bg-ink'
                        : 'bg-surface-muted hover:bg-surface-muted dark:hover:bg-ink',
                    'border',
                    plan.isFlex ? 'border-warning/30' : 'border-border dark:border-strong'
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

                  <div className="px-2.5 py-1.5 bg-surface dark:bg-ink rounded-md mb-3 text-center" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
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
            <div className="mt-6 text-center">
              <Link
                href="/pricing"
                className="inline-flex items-center gap-1.5 text-[13px] text-fg-muted hover:text-fg dark:text-fg-subtle dark:hover:text-white transition-colors"
              >
                Ver detalles completos de cada plan
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
