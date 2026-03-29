'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Check,
  Lightning,
  Crown,
  Buildings,
  Users,
  ChartLineUp,
  Sparkle,
  ArrowRight,
  Star,
  CurrencyDollar,
  Handshake,
  Rocket,
  ShieldCheck,
  Target,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';

type PricingModel = 'subscription' | 'per-lease';

interface AgencyPricingModalProps {
  open: boolean;
  onClose: () => void;
}

const SUBSCRIPTION_PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 149000,
    priceUsd: 35,
    users: 3,
    properties: 20,
    features: ['CRM de candidatos', 'Publicación en portales', 'Contratos digitales', 'Pipeline de arrendamiento', 'Soporte por email'],
  },
  {
    id: 'growth',
    name: 'Growth',
    price: 399000,
    priceUsd: 95,
    users: 10,
    properties: 100,
    popular: true,
    features: ['Todo en Starter', 'Reportes avanzados', 'Recordatorios automáticos', 'Dispersiones a propietarios', 'Soporte prioritario'],
  },
  {
    id: 'business',
    name: 'Business',
    price: 899000,
    priceUsd: 215,
    users: 25,
    properties: 300,
    features: ['Todo en Growth', 'Multi-sucursal', 'Reportes ejecutivos', 'Webhooks', 'Gerente de cuenta'],
  },
];

const PER_LEASE_PLANS = [
  {
    id: 'flex-starter',
    name: 'Starter Flex',
    monthlyBase: 49000,
    monthlyBaseUsd: 12,
    perLease: 40000,
    perLeaseUsd: 10,
    users: 3,
    properties: 20,
    features: ['CRM de candidatos', 'Publicación en portales', 'Contratos digitales', 'Pipeline de arrendamiento', '2 Agentes AI incluidos', 'Scoring AI + Matching AI', 'Soporte por email'],
  },
  {
    id: 'flex-growth',
    name: 'Growth Flex',
    monthlyBase: 59000,
    monthlyBaseUsd: 14,
    perLease: 40000,
    perLeaseUsd: 10,
    users: 10,
    properties: 100,
    popular: true,
    features: ['Todo en Starter Flex', 'Reportes avanzados', 'Recordatorios automáticos', 'Dispersiones a propietarios', 'Agentes AI avanzados', 'Soporte prioritario'],
  },
  {
    id: 'flex-business',
    name: 'Business Flex',
    monthlyBase: 99000,
    monthlyBaseUsd: 24,
    perLease: 40000,
    perLeaseUsd: 10,
    users: 25,
    properties: 300,
    features: ['Todo en Growth Flex', 'Multi-sucursal', 'Reportes ejecutivos', 'Todos los Agentes AI', 'Webhooks', 'Gerente de cuenta'],
  },
];

function formatCOP(amount: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount);
}

export function AgencyPricingModal({ open, onClose }: AgencyPricingModalProps) {
  const { locale } = useI18n();
  const [model, setModel] = useState<PricingModel>('per-lease');
  const [leasesPerMonth, setLeasesPerMonth] = useState(10);

  useEffect(() => {
    if (!open) return;
    const scrollY = window.scrollY;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [open, onClose]);

  if (!open) return null;

  const plans = model === 'subscription' ? SUBSCRIPTION_PLANS : PER_LEASE_PLANS;

  // Calculate savings for the "per-lease" model comparison
  const growthSub = SUBSCRIPTION_PLANS[1].price;
  const growthFlex = PER_LEASE_PLANS[1].monthlyBase + (leasesPerMonth * PER_LEASE_PLANS[1].perLease);
  const savings = growthSub - growthFlex;
  const savingsPercent = Math.round((savings / growthSub) * 100);

  const content = (
    <div
      className="fixed inset-0 overflow-hidden"
      style={{ zIndex: 9999 }}
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="absolute inset-4 md:inset-8 lg:inset-12 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900">
              {locale === 'es' ? 'Planes para Inmobiliarias' : 'Agency Plans'}
            </h2>
            <p className="text-sm text-neutral-500 mt-0.5">
              {locale === 'es' ? 'Elige el modelo que mejor se adapte a tu operación' : 'Choose the model that best fits your operation'}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-neutral-100 transition-colors">
            <X weight="bold" className="h-4 w-4 text-neutral-500" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overscroll-none px-6 py-6" style={{ WebkitOverflowScrolling: 'touch' }}>

          {/* Model toggle */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center rounded-xl bg-neutral-100 p-1" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
              <button
                onClick={() => setModel('per-lease')}
                className={cn(
                  'relative flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13px] font-medium transition-all',
                  model === 'per-lease'
                    ? 'bg-white text-neutral-900 shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-700',
                )}
              >
                <Handshake weight="duotone" className="h-4 w-4" />
                {locale === 'es' ? 'Pago por Adjudicación' : 'Pay per Lease'}
                <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-600">
                  {locale === 'es' ? 'Recomendado' : 'Recommended'}
                </span>
              </button>
              <button
                onClick={() => setModel('subscription')}
                className={cn(
                  'flex items-center gap-2 px-5 py-2.5 rounded-lg text-[13px] font-medium transition-all',
                  model === 'subscription'
                    ? 'bg-white text-neutral-900 shadow-sm'
                    : 'text-neutral-500 hover:text-neutral-700',
                )}
              >
                <CurrencyDollar weight="duotone" className="h-4 w-4" />
                {locale === 'es' ? 'Suscripción Mensual' : 'Monthly Subscription'}
              </button>
            </div>
          </div>

          {/* Value proposition for per-lease */}
          {model === 'per-lease' && (
            <div className="mb-8 rounded-xl bg-indigo-50 px-5 py-4 flex items-start gap-4" style={{ border: '1px solid rgba(99,102,241,0.15)' }}>
              <div className="rounded-lg p-2 bg-white shadow-sm flex-shrink-0">
                <Rocket weight="duotone" className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-[14px] font-semibold text-neutral-900">
                  {locale === 'es' ? 'Solo pagas cuando cierras' : 'Only pay when you close'}
                </p>
                <p className="text-[13px] text-neutral-600 mt-1 leading-relaxed">
                  {locale === 'es'
                    ? 'Base mensual desde $49.000 + $40.000 (~$10 USD) por cada inmueble arrendado. Si en un mes no arriendas nada, solo pagas la base. Tu éxito es nuestro éxito.'
                    : 'Monthly base from $49,000 + $40,000 (~$10 USD) per leased property. If you don\'t lease anything in a month, you only pay the base. Your success is our success.'}
                </p>
              </div>
            </div>
          )}

          {/* Plans grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {model === 'subscription'
              ? SUBSCRIPTION_PLANS.map((plan) => (
                  <div
                    key={plan.id}
                    className={cn(
                      'rounded-xl p-5 flex flex-col',
                      plan.popular
                        ? 'ring-2 ring-indigo-500 bg-white'
                        : 'bg-white',
                    )}
                    style={{ border: plan.popular ? undefined : '1px solid rgba(0,0,0,0.08)' }}
                  >
                    {plan.popular && (
                      <span className="self-start mb-3 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-600 text-white">
                        Popular
                      </span>
                    )}
                    <h3 className="text-[16px] font-semibold text-neutral-900">{plan.name}</h3>
                    <div className="mt-3">
                      <span className="text-[28px] font-bold text-neutral-900">{formatCOP(plan.price)}</span>
                      <span className="text-[13px] text-neutral-500">/mes</span>
                    </div>
                    <p className="text-[12px] text-neutral-400 mt-1">~${plan.priceUsd} USD · {plan.properties} propiedades · {plan.users} usuarios</p>

                    <div className="mt-5 pt-4 border-t border-neutral-100 space-y-2.5 flex-1">
                      {plan.features.map((f) => (
                        <div key={f} className="flex items-start gap-2">
                          <Check weight="bold" className="h-3.5 w-3.5 text-neutral-400 mt-0.5 flex-shrink-0" />
                          <span className="text-[13px] text-neutral-600">{f}</span>
                        </div>
                      ))}
                    </div>

                    <button className={cn(
                      'mt-5 w-full py-2.5 rounded-xl text-[13px] font-medium transition-colors',
                      plan.popular
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700',
                    )}>
                      {locale === 'es' ? 'Seleccionar' : 'Select'}
                    </button>
                  </div>
                ))
              : PER_LEASE_PLANS.map((plan) => (
                  <div
                    key={plan.id}
                    className={cn(
                      'rounded-xl p-5 flex flex-col',
                      plan.popular
                        ? 'ring-2 ring-indigo-500 bg-white'
                        : 'bg-white',
                    )}
                    style={{ border: plan.popular ? undefined : '1px solid rgba(0,0,0,0.08)' }}
                  >
                    {plan.popular && (
                      <span className="self-start mb-3 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-600 text-white">
                        {locale === 'es' ? 'Más elegido' : 'Most chosen'}
                      </span>
                    )}
                    <h3 className="text-[16px] font-semibold text-neutral-900">{plan.name}</h3>
                    <div className="mt-3">
                      <span className="text-[28px] font-bold text-neutral-900">{formatCOP(plan.monthlyBase)}</span>
                      <span className="text-[13px] text-neutral-500">/mes base</span>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="text-[14px] font-semibold text-indigo-600">+ {formatCOP(plan.perLease)}</span>
                      <span className="text-[12px] text-neutral-500">por adjudicación (~${plan.perLeaseUsd} USD)</span>
                    </div>
                    <p className="text-[12px] text-neutral-400 mt-1">{plan.properties} propiedades · {plan.users} usuarios</p>

                    <div className="mt-5 pt-4 border-t border-neutral-100 space-y-2.5 flex-1">
                      {plan.features.map((f) => {
                        const isAI = f.toLowerCase().includes('agente') || f.toLowerCase().includes('scoring ai') || f.toLowerCase().includes('matching ai');
                        return (
                          <div key={f} className="flex items-start gap-2">
                            {isAI ? (
                              <Sparkle weight="fill" className="h-3.5 w-3.5 text-indigo-500 mt-0.5 flex-shrink-0" />
                            ) : (
                              <Check weight="bold" className="h-3.5 w-3.5 text-neutral-400 mt-0.5 flex-shrink-0" />
                            )}
                            <span className={cn('text-[13px]', isAI ? 'text-indigo-700 font-medium' : 'text-neutral-600')}>{f}</span>
                          </div>
                        );
                      })}
                    </div>

                    <button className={cn(
                      'mt-5 w-full py-2.5 rounded-xl text-[13px] font-medium transition-colors',
                      plan.popular
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700',
                    )}>
                      {locale === 'es' ? 'Seleccionar' : 'Select'}
                    </button>
                  </div>
                ))
            }
          </div>

          {/* Calculator — only for per-lease */}
          {model === 'per-lease' && (
            <div className="mt-8 rounded-xl bg-neutral-50 p-5" style={{ border: '1px solid rgba(0,0,0,0.06)' }}>
              <div className="flex items-center gap-2 mb-4">
                <Target weight="duotone" className="h-4 w-4 text-neutral-500" />
                <h4 className="text-[13px] font-semibold text-neutral-900">
                  {locale === 'es' ? 'Calcula tu costo mensual' : 'Calculate your monthly cost'}
                </h4>
              </div>

              <div className="flex items-center gap-4 mb-4">
                <label className="text-[13px] text-neutral-600 flex-shrink-0">
                  {locale === 'es' ? 'Adjudicaciones por mes:' : 'Leases per month:'}
                </label>
                <input
                  type="range"
                  min={0}
                  max={50}
                  value={leasesPerMonth}
                  onChange={(e) => setLeasesPerMonth(Number(e.target.value))}
                  className="flex-1 accent-indigo-600"
                />
                <span className="text-[16px] font-bold text-neutral-900 w-8 text-center tabular-nums">{leasesPerMonth}</span>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {PER_LEASE_PLANS.map((plan) => {
                  const total = plan.monthlyBase + (leasesPerMonth * plan.perLease);
                  const subEquivalent = SUBSCRIPTION_PLANS.find(s => s.name.replace(' ', '') === plan.name.replace(' Flex', ''))?.price || SUBSCRIPTION_PLANS[0].price;
                  const diff = subEquivalent - total;
                  return (
                    <div key={plan.id} className="text-center">
                      <p className="text-[11px] text-neutral-400 uppercase tracking-wider">{plan.name}</p>
                      <p className="text-[18px] font-bold text-neutral-900 mt-1">{formatCOP(total)}</p>
                      <p className="text-[11px] text-neutral-500">/mes con {leasesPerMonth} adjud.</p>
                      {diff > 0 && (
                        <p className="text-[11px] font-medium text-emerald-600 mt-1">
                          {locale === 'es' ? `Ahorras ${formatCOP(diff)} vs suscripción` : `Save ${formatCOP(diff)} vs subscription`}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Why per-lease */}
          {model === 'per-lease' && (
            <div className="mt-6 grid grid-cols-3 gap-4">
              {[
                { icon: ShieldCheck, titleEs: 'Sin riesgo', titleEn: 'No risk', descEs: 'Base mínima, solo pagas más cuando generas ingresos', descEn: 'Minimal base, only pay more when you generate income' },
                { icon: ChartLineUp, titleEs: 'Escala contigo', titleEn: 'Scales with you', descEs: 'En meses flojos pagas menos, en meses buenos invertís en crecer', descEn: 'In slow months pay less, in good months invest in growth' },
                { icon: Handshake, titleEs: 'Alineados', titleEn: 'Aligned', descEs: 'Nuestro éxito depende del tuyo — estamos del mismo lado', descEn: 'Our success depends on yours — we\'re on the same side' },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.titleEs} className="text-center">
                    <div className="mx-auto w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center mb-2">
                      <Icon weight="duotone" className="h-5 w-5 text-neutral-600" />
                    </div>
                    <p className="text-[13px] font-semibold text-neutral-900">{locale === 'es' ? item.titleEs : item.titleEn}</p>
                    <p className="text-[11px] text-neutral-500 mt-0.5 leading-relaxed">{locale === 'es' ? item.descEs : item.descEn}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (typeof window === 'undefined') return null;
  return createPortal(content, document.body);
}
