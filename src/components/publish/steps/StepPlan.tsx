'use client';

import { Check } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { usePublish } from '@/lib/context/PublishContext';
import { motion } from 'framer-motion';

interface PlanOption {
  id: 'free' | 'pro' | 'business';
  name: string;
  price: string;
  priceNote: string;
  description: string;
  icon: string;
  features: string[];
  highlighted?: boolean;
  badge?: string;
}

const PLAN_OPTIONS: PlanOption[] = [
  {
    id: 'free',
    name: 'Gratis',
    price: '$0',
    priceNote: 'Para siempre',
    description: 'Perfecto para probar la plataforma',
    icon: '⚡',
    features: [
      '1 propiedad activa',
      'Publicación básica',
      '1 contrato digital',
      'Soporte por email',
    ],
  },
  {
    id: 'pro',
    name: 'Propietario',
    price: '$149.900',
    priceNote: '/mes',
    description: 'Todo lo que necesitas para administrar',
    icon: '✨',
    features: [
      'Hasta 10 propiedades',
      'Análisis AI de candidatos',
      'Contratos ilimitados',
      'Verificación de documentos',
      'Verificación de antecedentes',
      'Soporte prioritario',
    ],
    highlighted: true,
    badge: 'Recomendado',
  },
  {
    id: 'business',
    name: 'Inmobiliaria',
    price: '$499.900',
    priceNote: '/mes',
    description: 'Para agencias y administradores',
    icon: '🏢',
    features: [
      'Propiedades ilimitadas',
      'Todo lo de Propietario',
      'Acceso API completo',
      'Multi-usuarios',
      'Analíticas avanzadas',
      'Soporte 24/7',
    ],
  },
];

export function StepPlan() {
  const { draft, updateDraft } = usePublish();

  return (
    <div className="space-y-6">
      <div className="text-center pb-2">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
          Elige el plan ideal para ti
        </h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Puedes cambiar o cancelar tu plan en cualquier momento
        </p>
      </div>

      <div className="space-y-4">
        {PLAN_OPTIONS.map((plan, index) => {
          const isSelected = draft.selectedPlan === plan.id;

          return (
            <motion.button
              key={plan.id}
              type="button"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => updateDraft({ selectedPlan: plan.id })}
              className={cn(
                'relative w-full text-left p-5 rounded-xl border transition-all duration-200',
                plan.highlighted && !isSelected && 'border-indigo-300 dark:border-indigo-700 bg-indigo-50/50 dark:bg-indigo-900/10 hover:border-indigo-400 dark:hover:border-indigo-600 scale-[1.01]',
                plan.highlighted && isSelected && 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-md scale-[1.01]',
                !plan.highlighted && isSelected && 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-sm',
                !plan.highlighted && !isSelected && 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 bg-white dark:bg-[#2a2a2c] hover:shadow-sm'
              )}
            >
              {/* Badge */}
              {plan.badge && (
                <span className="absolute -top-3 right-4 px-3 py-1 text-[11px] font-semibold rounded-full bg-indigo-600 text-white shadow-sm">
                  {plan.badge}
                </span>
              )}

              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={cn(
                  'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200',
                  plan.highlighted
                    ? 'bg-indigo-600 text-white'
                    : isSelected
                    ? 'bg-indigo-100 dark:bg-indigo-900/30'
                    : 'bg-neutral-100 dark:bg-neutral-800'
                )}>
                  <span className="text-2xl">{plan.icon}</span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <h4 className={cn(
                      'text-base font-semibold',
                      isSelected ? 'text-neutral-900 dark:text-white' : 'text-neutral-700 dark:text-neutral-300'
                    )}>
                      {plan.name}
                    </h4>
                    <div className="flex items-baseline gap-1">
                      <span className={cn(
                        'text-lg font-bold',
                        isSelected ? 'text-neutral-900 dark:text-white' : 'text-neutral-700 dark:text-neutral-300'
                      )}>
                        {plan.price}
                      </span>
                      <span className="text-xs text-neutral-500 dark:text-neutral-400">
                        {plan.priceNote}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                    {plan.description}
                  </p>

                  {/* Features */}
                  <div className={cn(
                    'mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-700 grid grid-cols-2 gap-x-4 gap-y-1.5 transition-opacity',
                    !isSelected && 'opacity-50'
                  )}>
                    {plan.features.map((feature, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Check className={cn(
                          'w-3.5 h-3.5 flex-shrink-0',
                          isSelected || plan.highlighted ? 'text-indigo-600 dark:text-indigo-400' : 'text-neutral-400 dark:text-neutral-500'
                        )} />
                        <span className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Selection indicator */}
                <div className={cn(
                  'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200',
                  isSelected
                    ? 'border-indigo-600 bg-indigo-600'
                    : plan.highlighted
                    ? 'border-indigo-400 dark:border-indigo-600'
                    : 'border-neutral-300 dark:border-neutral-600'
                )}>
                  {isSelected && (
                    <Check className="w-3 h-3 text-white" strokeWidth={3} />
                  )}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Trust indicator */}
      <div className="flex items-center justify-center gap-6 pt-4 text-xs text-neutral-500 dark:text-neutral-400">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Sin compromisos
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Cancela cuando quieras
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Pago seguro
        </span>
      </div>
    </div>
  );
}
