'use client';

import { Check } from 'lucide-react';
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
    icon: '✨',
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
    icon: '🏢',
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
        <h3 className="text-lg font-semibold text-foreground">
          Elige el plan ideal para ti
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
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
                'relative w-full text-left p-5 rounded-[1px] border transition-all duration-200',
                plan.highlighted && !isSelected && 'border-primary/25 bg-primary/[0.03] hover:border-primary/40 scale-[1.01]',
                plan.highlighted && isSelected && 'border-primary/40 bg-primary/[0.06] shadow-[0_0_0_1px_rgba(91,95,239,0.15),0_0_24px_rgba(91,95,239,0.08)] scale-[1.01]',
                !plan.highlighted && isSelected && 'border-primary/40 bg-primary/[0.06] shadow-[0_0_0_1px_rgba(91,95,239,0.15)]',
                !plan.highlighted && !isSelected && 'border-border hover:border-border bg-card hover:shadow-sm'
              )}
            >
              {/* Badge */}
              {plan.badge && (
                <span className="absolute -top-3 right-4 px-3 py-1 text-[11px] font-semibold rounded-full bg-primary text-white shadow-sm">
                  {plan.badge}
                </span>
              )}

              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={cn(
                  'w-12 h-12 rounded-[1px] flex items-center justify-center flex-shrink-0 transition-all duration-200',
                  plan.highlighted
                    ? 'bg-primary text-white'
                    : isSelected
                    ? 'bg-primary/10'
                    : 'bg-black/[0.03]'
                )}>
                  <span className="text-2xl">{plan.icon}</span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <h4 className={cn(
                      'text-base font-semibold',
                      isSelected ? 'text-foreground' : 'text-foreground/80'
                    )}>
                      {plan.name}
                    </h4>
                    <div className="flex items-baseline gap-1">
                      <span className={cn(
                        'text-lg font-bold',
                        isSelected ? 'text-foreground' : 'text-foreground/70'
                      )}>
                        {plan.price}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {plan.priceNote}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {plan.description}
                  </p>

                  {/* Features */}
                  <div className={cn(
                    'mt-3 pt-3 border-t border-border grid grid-cols-2 gap-x-4 gap-y-1.5 transition-opacity',
                    !isSelected && 'opacity-50'
                  )}>
                    {plan.features.map((feature, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Check className={cn(
                          'w-3.5 h-3.5 flex-shrink-0',
                          isSelected || plan.highlighted ? 'text-primary' : 'text-muted-foreground'
                        )} />
                        <span className="text-xs text-muted-foreground truncate">
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Selection indicator */}
                <div className={cn(
                  'w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center flex-shrink-0 transition-all duration-200',
                  isSelected
                    ? 'border-primary bg-primary'
                    : plan.highlighted
                    ? 'border-primary/40'
                    : 'border-border'
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
      <div className="flex items-center justify-center gap-6 pt-4 text-xs text-muted-foreground">
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
