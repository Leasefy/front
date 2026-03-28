'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Buildings, Users, CheckCircle, Check, CaretDown } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface PlanAddon {
  label: string;
  price: string;
}

interface AgencyTierCardProps {
  name: string;
  price: string;
  period?: string;
  description: string;
  properties?: number;
  users?: number;
  features: string[];
  addons?: PlanAddon[];
  popular?: boolean;
  isFlex?: boolean;
  isEnterprise?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  onViewDetails?: () => void;
  ctaLabel?: string;
  ctaHref?: string;
  noCurrencySymbol?: boolean;
}

/**
 * Agency tier pricing card - Premium style with motion
 */
export function AgencyTierCard({
  name,
  price,
  period,
  description,
  properties,
  users,
  features,
  addons,
  popular,
  isFlex,
  isEnterprise,
  selected,
  onSelect,
  onViewDetails,
  ctaLabel,
  ctaHref,
  noCurrencySymbol,
}: AgencyTierCardProps) {
  const [showAddons, setShowAddons] = useState(false);
  const showLimits = properties != null && users != null && !isEnterprise && properties > 0 && users > 0;
  const defaultCtaLabel = isEnterprise
    ? (selected ? 'Contactar ventas' : 'Solicitar cotización')
    : (selected ? 'Continuar' : 'Seleccionar plan');
  const label = ctaLabel || defaultCtaLabel;

  const buttonEl = (
    <Button
      variant={selected ? 'default' : (popular || isFlex) ? 'default' : 'outline'}
      className={cn("w-full rounded-xl", isFlex && !selected && "bg-amber-500 hover:bg-amber-600 text-white")}
      onClick={onSelect}
    >
      {label}
    </Button>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'relative rounded-2xl bg-card p-6 flex flex-col transition-all duration-300',
        selected
          ? 'border-2 border-indigo-600 ring-2 ring-indigo-600/20 shadow-xl shadow-indigo-600/10'
          : isFlex
            ? 'border-2 border-amber-400 shadow-lg shadow-amber-500/10'
            : popular
              ? 'border border-indigo-600/50 shadow-lg shadow-indigo-600/5'
              : 'border border-border hover:border-indigo-600/30 hover:shadow-lg'
      )}
    >
      {isFlex && !selected && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[11px] font-semibold px-4 py-1.5 rounded-full shadow-lg shadow-amber-500/25">
            Todo incluido
          </span>
        </div>
      )}

      {popular && !selected && !isFlex && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-indigo-600 text-white text-[11px] font-semibold px-4 py-1.5 rounded-full shadow-lg shadow-indigo-600/25">
            Más popular
          </span>
        </div>
      )}

      {selected && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-indigo-600 text-white text-[11px] font-semibold px-4 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg shadow-indigo-600/25">
            <Check className="w-3 h-3" />
            Seleccionado
          </span>
        </div>
      )}

      <div className="mb-5">
        <h3 className="text-[17px] font-mono uppercase font-normal text-foreground">{name}</h3>
        <p className="text-[13px] text-muted-foreground mt-1">{description}</p>
      </div>

      <div className="mb-5">
        {isEnterprise ? (
          <span className="text-[28px] font-heading font-bold text-foreground">{price}</span>
        ) : (
          <>
            <span className="text-[32px] font-heading font-bold text-foreground">{noCurrencySymbol ? '' : '$'}{price}</span>
            {period && <span className="text-muted-foreground text-[13px] ml-1">{period}</span>}
          </>
        )}
      </div>

      {/* Limits - only shown when properties/users are provided */}
      {showLimits && (
        <div className="flex gap-4 mb-5 pb-5 border-b border-border">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 rounded-lg">
            <Buildings className="w-4 h-4 text-primary" />
            <span className="text-[13px] text-foreground font-semibold">{properties}</span>
            <span className="text-[11px] text-muted-foreground">propiedades</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/50 rounded-lg">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-[13px] text-foreground font-semibold">{users}</span>
            <span className="text-[11px] text-muted-foreground">usuarios</span>
          </div>
        </div>
      )}

      {/* Features */}
      <ul className="space-y-3 flex-1 mb-4">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <span className="text-[13px] text-muted-foreground">{feature}</span>
          </li>
        ))}
      </ul>

      {/* View details link */}
      {onViewDetails && (
        <button
          type="button"
          onClick={onViewDetails}
          className="text-[13px] font-medium text-primary hover:text-primary/80 transition-colors text-left mb-4"
        >
          Conocer más →
        </button>
      )}

      {/* Add-ons toggle */}
      {addons && addons.length > 0 && (
        <div className="mb-6">
          <button
            type="button"
            onClick={() => setShowAddons(!showAddons)}
            className="flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <CaretDown className={cn('w-3.5 h-3.5 transition-transform duration-200', showAddons && 'rotate-180')} />
            {showAddons ? 'Ocultar extras' : 'Ver extras disponibles'}
          </button>
          <AnimatePresence>
            {showAddons && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-3 pt-3 border-t border-border space-y-2">
                  {addons.map((addon, i) => (
                    <div key={i} className="flex items-center justify-between text-[12px]">
                      <span className="text-muted-foreground">{addon.label}</span>
                      <span className="font-semibold text-foreground">{addon.price}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* CTA */}
      {ctaHref ? (
        <Link href={ctaHref}>{buttonEl}</Link>
      ) : (isEnterprise || isFlex) ? (
        <a href="mailto:ventas@leasefy.co">{buttonEl}</a>
      ) : (
        buttonEl
      )}
    </motion.div>
  );
}

/**
 * Benefit card for agency section - Premium style
 */
export function BenefitCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="rounded-2xl border border-border bg-card p-6 hover:shadow-lg transition-shadow"
    >
      <h4 className="text-[15px] font-semibold text-foreground">{title}</h4>
      <p className="mt-2 text-[13px] text-muted-foreground leading-relaxed">{description}</p>
    </motion.div>
  );
}
