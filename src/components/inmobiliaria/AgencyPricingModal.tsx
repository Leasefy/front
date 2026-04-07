'use client';

import { useState } from 'react';
import Link from 'next/link';
import { X, Check, CheckCircle, Buildings, Users, Lightning, Cpu, ArrowRight } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
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
          className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100 dark:border-white/10">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                Planes para inmobiliarias
              </h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                Empieza gratis, escala sin limites
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5 text-neutral-600 dark:text-neutral-300" />
            </button>
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
                      ? 'ring-2 ring-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/20'
                      : plan.isFlex
                        ? 'bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                        : 'bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100 dark:hover:bg-neutral-800',
                    'border',
                    plan.isFlex ? 'border-amber-300 dark:border-amber-700' : 'border-neutral-200 dark:border-neutral-700'
                  )}
                  onClick={() => setSelectedPlan(plan.id)}
                >
                  {plan.popular && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-indigo-600 text-white uppercase tracking-wide font-mono text-[10px] font-semibold px-3 py-1 rounded-full">
                      Mas popular
                    </span>
                  )}
                  {plan.isFlex && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-semibold px-3 py-1 rounded-full">
                      Todo incluido
                    </span>
                  )}

                  <h3 className="text-[15px] font-semibold text-neutral-900 dark:text-white mt-1">{plan.name}</h3>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mb-3">{plan.description}</p>

                  <div className="mb-3">
                    <span className="text-[22px] font-bold text-neutral-900 dark:text-white">{plan.price}</span>
                    {plan.priceDetail && (
                      <span className="text-[12px] text-neutral-500 dark:text-neutral-400 ml-1">{plan.priceDetail}</span>
                    )}
                  </div>

                  <div className="px-2.5 py-1.5 bg-white dark:bg-neutral-800 rounded-lg mb-3 text-center" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
                    <span className="text-[11px] text-neutral-500 dark:text-neutral-400">Eval AI: </span>
                    <span className={cn("text-[11px] font-semibold", plan.isFlex ? 'text-emerald-600' : 'text-neutral-900 dark:text-white')}>
                      {plan.evalPrice}
                    </span>
                  </div>

                  <ul className="space-y-2 flex-1 mb-4">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span className="text-[11px] text-neutral-600 dark:text-neutral-300">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {plan.ctaHref?.startsWith('mailto') ? (
                    <a href={plan.ctaHref}>
                      <Button
                        size="sm"
                        variant={plan.popular || plan.isFlex ? 'default' : 'outline'}
                        className="w-full rounded-lg text-[12px]"
                      >
                        {plan.cta}
                      </Button>
                    </a>
                  ) : (
                    <Link href={plan.ctaHref}>
                      <Button
                        size="sm"
                        variant={plan.popular || plan.isFlex ? 'default' : 'outline'}
                        className="w-full rounded-lg text-[12px]"
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
                className="inline-flex items-center gap-1.5 text-[13px] text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors"
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
