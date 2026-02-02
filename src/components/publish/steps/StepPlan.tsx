'use client';

import { Check, Sparkles, Building2, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePublish } from '@/lib/context/PublishContext';
import { motion } from 'framer-motion';

interface PlanOption {
  id: 'free' | 'pro' | 'business';
  name: string;
  price: string;
  priceNote: string;
  description: string;
  icon: React.ReactNode;
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
    icon: <Zap className="w-6 h-6" />,
    features: [
      '1 propiedad activa',
      'Publicacion basica',
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
    icon: <Sparkles className="w-6 h-6" />,
    features: [
      'Hasta 10 propiedades',
      'Analisis AI de candidatos',
      'Contratos ilimitados',
      'Verificacion de documentos',
      'Verificacion de antecedentes',
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
    icon: <Building2 className="w-6 h-6" />,
    features: [
      'Propiedades ilimitadas',
      'Todo lo de Propietario',
      'Acceso API completo',
      'Multi-usuarios',
      'Analiticas avanzadas',
      'Soporte 24/7',
    ],
  },
];

export function StepPlan() {
  const { draft, updateDraft } = usePublish();

  return (
    <div className="space-y-6">
      <div className="text-center pb-2">
        <h3 className="text-lg font-semibold text-black">
          Elige el plan ideal para ti
        </h3>
        <p className="text-sm text-black/50 mt-1">
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
                'relative w-full text-left p-5 rounded-sm border-2 transition-all',
                isSelected
                  ? 'border-black bg-black/[0.02] shadow-sm'
                  : plan.highlighted
                  ? 'border-black/20 hover:border-black/40 bg-white'
                  : 'border-black/10 hover:border-black/20 bg-white'
              )}
            >
              {/* Badge */}
              {plan.badge && (
                <span className={cn(
                  'absolute -top-3 right-4 px-3 py-1 text-xs font-semibold rounded-full',
                  isSelected
                    ? 'bg-black text-white'
                    : 'bg-plan-accent text-black'
                )}>
                  {plan.badge}
                </span>
              )}

              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={cn(
                  'w-12 h-12 rounded-sm flex items-center justify-center flex-shrink-0',
                  isSelected
                    ? 'bg-black text-white'
                    : plan.highlighted
                    ? 'bg-plan-accent text-black'
                    : 'bg-black/5 text-black/40'
                )}>
                  {plan.icon}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <h4 className={cn(
                      'text-base font-semibold',
                      isSelected ? 'text-black' : 'text-black/80'
                    )}>
                      {plan.name}
                    </h4>
                    <div className="flex items-baseline gap-1">
                      <span className={cn(
                        'text-lg font-bold',
                        isSelected ? 'text-black' : 'text-black/70'
                      )}>
                        {plan.price}
                      </span>
                      <span className="text-xs text-black/40">
                        {plan.priceNote}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-black/50 mt-0.5">
                    {plan.description}
                  </p>

                  {/* Features - Show when selected or on hover */}
                  <div className={cn(
                    'mt-3 pt-3 border-t border-black/5 grid grid-cols-2 gap-x-4 gap-y-1.5',
                    !isSelected && 'opacity-60'
                  )}>
                    {plan.features.map((feature, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Check className={cn(
                          'w-3.5 h-3.5 flex-shrink-0',
                          isSelected ? 'text-black' : 'text-black/30'
                        )} />
                        <span className="text-xs text-black/60 truncate">
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Selection indicator */}
                <div className={cn(
                  'w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                  isSelected
                    ? 'border-black bg-black'
                    : 'border-black/20'
                )}>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                  )}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Trust indicator */}
      <div className="flex items-center justify-center gap-6 pt-4 text-xs text-black/40">
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
