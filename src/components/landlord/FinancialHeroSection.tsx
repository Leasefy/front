'use client';

import { AnimatedCounter } from '@/components/ui/animated-counter';
import { SectionLabel } from '@/components/ui/section-label';
import { cn } from '@/lib/utils';
import type { DashboardFinancialStats } from '@/lib/api/landlord.types';

interface FinancialHeroSectionProps {
  stats: DashboardFinancialStats;
  className?: string;
}

/**
 * FinancialHeroSection - Luxterra style (matches home StatsSection exactly)
 * Contained black box with rounded corners, left-aligned stats
 */
export function FinancialHeroSection({ stats, className }: FinancialHeroSectionProps) {
  const { monthlyIncome, activeLeases, collectionRate, pendingPayments } = stats;

  // Convert to display values
  const incomeInMillions = monthlyIncome / 1000000;

  const dashboardStats = [
    {
      value: Math.round(incomeInMillions * 10) / 10,
      prefix: '$',
      suffix: 'M',
      label: 'Ingresos mensuales',
      highlight: true,
    },
    {
      value: activeLeases,
      suffix: '',
      label: 'Arriendos activos',
    },
    {
      value: collectionRate,
      suffix: '%',
      label: 'Tasa de cobranza',
    },
    {
      value: pendingPayments,
      suffix: '',
      label: 'Pagos pendientes',
      alert: pendingPayments > 0,
    },
  ];

  return (
    <section className={cn('py-2', className)}>
      {/* Premium dark container with gradient and glow */}
      <div className="relative overflow-hidden bg-gradient-to-br from-foreground via-foreground to-foreground rounded-sm py-12 md:py-16 px-8 md:px-12 lg:px-16">
        {/* Decorative gradient orbs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[black]/10 rounded-full blur-[100px] -mr-48 -mt-48" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[black]/5 rounded-full blur-[80px] -ml-32 -mb-32" />

        {/* Subtle grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <div className="relative">
          {/* Header - Centered */}
          <div className="text-center mb-12 md:mb-14">
            <SectionLabel className="text-[black]/80 mb-4 justify-center">
              Tu portafolio
            </SectionLabel>
            <h2 className="text-[1.5rem] md:text-[2rem] font-light text-white leading-[1.2] tracking-[-0.02em]">
              Resumen de tus propiedades
            </h2>
          </div>

          {/* Stats Grid - with stagger animation feel */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-10 gap-x-8 md:gap-x-12">
            {dashboardStats.map((stat, index) => (
              <div key={index} className="text-left group">
                <div className={cn(
                  'text-[2.5rem] md:text-[3.5rem] font-light leading-none tracking-[-0.03em] mb-3',
                  stat.highlight ? 'text-gradient-accent' : 'text-white',
                  stat.alert && 'text-amber-400'
                )}>
                  <span className="text-white/50">{stat.prefix}</span>
                  <AnimatedCounter
                    end={stat.value}
                    suffix={stat.suffix}
                    duration={2000}
                  />
                </div>
                <p className="text-muted-foreground text-[13px] md:text-sm tracking-[-0.01em] group-hover:text-muted-foreground transition-colors">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default FinancialHeroSection;
