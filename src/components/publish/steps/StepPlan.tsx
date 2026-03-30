'use client';

import { Check, Buildings, User, EnvelopeSimple } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { usePublish } from '@/lib/context/PublishContext';
import { motion, AnimatePresence } from 'framer-motion';
import { PLANS, AGENCY_PLANS } from '@/lib/constants/subscription-plans';
import { formatCurrency } from '@/lib/format';

const PLAN_ICONS: Record<string, string> = {
  free: '⚡', pro: '✨', business: '🏢',
  starter: '🚀', flex: '🔄', enterprise: '👑',
};

const PROPIETARIO_OPTIONS = PLANS.map((plan) => ({
  id: plan.id,
  name: plan.name,
  price: plan.price.monthly === 0 ? '$0' : formatCurrency(plan.price.monthly),
  priceNote: plan.price.monthly === 0 ? 'Para siempre' : '/mes',
  description: plan.description,
  icon: PLAN_ICONS[plan.id] ?? '📦',
  features: plan.features
    .filter((f) => f.included)
    .map((f) =>
      f.limit != null
        ? f.limit === 'unlimited'
          ? `${f.name} (ilimitado)`
          : `${f.name} (hasta ${f.limit})`
        : f.name,
    ),
  highlighted: plan.highlighted,
  badge: plan.badge,
  isEnterprise: false,
}));

const INMOBILIARIA_OPTIONS = AGENCY_PLANS.map((plan) => ({
  id: plan.id,
  name: plan.name,
  price: plan.price.monthly != null ? formatCurrency(plan.price.monthly) : null,
  priceNote: plan.price.monthly != null ? '/mes' : null,
  description: plan.description,
  icon: PLAN_ICONS[plan.id] ?? '📦',
  features: [
    ...(plan.limits.properties != null ? [`${plan.limits.properties} propiedades`] : []),
    ...(plan.limits.users != null ? [`${plan.limits.users} usuarios`] : []),
    ...plan.features,
  ],
  highlighted: plan.highlighted,
  badge: plan.badge,
  isEnterprise: plan.price.monthly == null,
}));

const OWNER_TYPES = [
  {
    id: 'propietario' as const,
    label: 'Propietario',
    description: 'Administro mis propios inmuebles',
    icon: User,
  },
  {
    id: 'inmobiliaria' as const,
    label: 'Inmobiliaria',
    description: 'Administro inmuebles de terceros',
    icon: Buildings,
  },
];

export function StepPlan() {
  const { draft, updateDraft } = usePublish();

  const planOptions = draft.ownerType === 'inmobiliaria' ? INMOBILIARIA_OPTIONS : PROPIETARIO_OPTIONS;

  return (
    <div className="space-y-6">
      {/* Owner type selector */}
      <div>
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white text-center">
          ¿Cómo publicarás?
        </h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1 text-center">
          Esto nos ayuda a mostrarte el plan ideal
        </p>

        <div className="grid grid-cols-2 gap-3 mt-4">
          {OWNER_TYPES.map((ownerType) => {
            const isSelected = draft.ownerType === ownerType.id;
            const Icon = ownerType.icon;

            return (
              <motion.button
                key={ownerType.id}
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() =>
                  updateDraft({ ownerType: ownerType.id, selectedPlan: '' })
                }
                className={cn(
                  'relative p-4 rounded-xl border text-left transition-all duration-200',
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-sm'
                    : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 bg-white dark:bg-[#2a2a2c]',
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors',
                      isSelected
                        ? 'bg-indigo-600 text-white uppercase tracking-wide font-mono'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400',
                    )}
                  >
                    <Icon className="w-5 h-5" weight={isSelected ? 'fill' : 'regular'} />
                  </div>
                  <div>
                    <span
                      className={cn(
                        'text-sm font-semibold block',
                        isSelected
                          ? 'text-neutral-900 dark:text-white'
                          : 'text-neutral-700 dark:text-neutral-300',
                      )}
                    >
                      {ownerType.label}
                    </span>
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">
                      {ownerType.description}
                    </span>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Plans - shown after owner type selection */}
      <AnimatePresence mode="wait">
        {draft.ownerType && (
          <motion.div
            key={draft.ownerType}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            <div className="text-center">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
                Elige tu plan
              </h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                Puedes cambiar o cancelar en cualquier momento
              </p>
            </div>

            <div className="space-y-4">
              {planOptions.map((plan, index) => {
                const isSelected = draft.selectedPlan === plan.id;

                // Enterprise plan — show contact CTA instead of selectable card
                if (plan.isEnterprise) {
                  return (
                    <motion.div
                      key={plan.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="relative w-full p-5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-[#2a2a2c]"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-neutral-100 dark:bg-neutral-800">
                          <span className="text-2xl">{plan.icon}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-base font-semibold text-neutral-700 dark:text-neutral-300">
                            {plan.name}
                          </h4>
                          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                            {plan.description}
                          </p>
                          <p className="text-lg font-bold text-neutral-700 dark:text-neutral-300 mt-1">
                            Precio personalizado
                          </p>
                          <a
                            href="mailto:ventas@leasefy.co?subject=Plan%20Enterprise"
                            className="inline-flex items-center gap-1.5 mt-3 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                          >
                            <EnvelopeSimple className="w-4 h-4" />
                            Contactar ventas
                          </a>
                        </div>
                      </div>
                    </motion.div>
                  );
                }

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
                      plan.highlighted &&
                        !isSelected &&
                        'border-indigo-300 dark:border-indigo-700 bg-indigo-50/50 dark:bg-indigo-900/10 hover:border-indigo-400 dark:hover:border-indigo-600 scale-[1.01]',
                      plan.highlighted &&
                        isSelected &&
                        'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-md scale-[1.01]',
                      !plan.highlighted &&
                        isSelected &&
                        'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-sm',
                      !plan.highlighted &&
                        !isSelected &&
                        'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 bg-white dark:bg-[#2a2a2c] hover:shadow-sm',
                    )}
                  >
                    {/* Badge */}
                    {plan.badge && (
                      <span className="absolute -top-3 right-4 px-3 py-1 text-[11px] font-semibold rounded-full bg-indigo-600 text-white uppercase tracking-wide font-mono">
                        {plan.badge}
                      </span>
                    )}

                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div
                        className={cn(
                          'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200',
                          plan.highlighted
                            ? 'bg-indigo-600 text-white uppercase tracking-wide font-mono'
                            : isSelected
                              ? 'bg-indigo-100 dark:bg-indigo-900/30'
                              : 'bg-neutral-100 dark:bg-neutral-800',
                        )}
                      >
                        <span className="text-2xl">{plan.icon}</span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <h4
                            className={cn(
                              'text-base font-semibold',
                              isSelected
                                ? 'text-neutral-900 dark:text-white'
                                : 'text-neutral-700 dark:text-neutral-300',
                            )}
                          >
                            {plan.name}
                          </h4>
                          <div className="flex items-baseline gap-1">
                            <span
                              className={cn(
                                'text-lg font-bold',
                                isSelected
                                  ? 'text-neutral-900 dark:text-white'
                                  : 'text-neutral-700 dark:text-neutral-300',
                              )}
                            >
                              {plan.price}
                            </span>
                            {plan.priceNote && (
                              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                                {plan.priceNote}
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                          {plan.description}
                        </p>

                        {/* Features */}
                        <div
                          className={cn(
                            'mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-700 grid grid-cols-2 gap-x-4 gap-y-1.5 transition-opacity',
                            !isSelected && 'opacity-50',
                          )}
                        >
                          {plan.features.map((feature, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <Check
                                className={cn(
                                  'w-3.5 h-3.5 flex-shrink-0',
                                  isSelected || plan.highlighted
                                    ? 'text-indigo-600 dark:text-indigo-400'
                                    : 'text-neutral-400 dark:text-neutral-500',
                                )}
                              />
                              <span className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                                {feature}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Selection indicator */}
                      <div
                        className={cn(
                          'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200',
                          isSelected
                            ? 'border-indigo-600 bg-indigo-600'
                            : plan.highlighted
                              ? 'border-indigo-400 dark:border-indigo-600'
                              : 'border-neutral-300 dark:border-neutral-600',
                        )}
                      >
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
