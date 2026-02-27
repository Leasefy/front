'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Buildings, Users, CheckCircle, Check } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AgencyTierCardProps {
  name: string;
  price: string;
  period?: string;
  description: string;
  properties?: number;
  users?: number;
  features: string[];
  popular?: boolean;
  isEnterprise?: boolean;
  selected?: boolean;
  onSelect?: () => void;
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
  popular,
  isEnterprise,
  selected,
  onSelect,
  ctaLabel,
  ctaHref,
  noCurrencySymbol,
}: AgencyTierCardProps) {
  const showLimits = properties != null && users != null && !isEnterprise;
  const defaultCtaLabel = isEnterprise
    ? (selected ? 'Contactar ventas' : 'Solicitar cotización')
    : (selected ? 'Continuar' : 'Seleccionar plan');
  const label = ctaLabel || defaultCtaLabel;

  const buttonEl = (
    <Button
      variant={selected ? 'default' : popular ? 'default' : 'outline'}
      className="w-full rounded-xl"
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
        'relative rounded-2xl border bg-card p-6 flex flex-col transition-all duration-300',
        selected
          ? 'border-indigo-600 ring-2 ring-indigo-600/20 shadow-xl shadow-indigo-600/10'
          : popular
            ? 'border-indigo-600/50 shadow-lg shadow-indigo-600/5'
            : 'border-border hover:border-indigo-600/30 hover:shadow-lg'
      )}
    >
      {popular && !selected && (
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
      <ul className="space-y-3 flex-1 mb-6">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <span className="text-[13px] text-muted-foreground">{feature}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      {ctaHref ? (
        <Link href={ctaHref}>{buttonEl}</Link>
      ) : isEnterprise ? (
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
