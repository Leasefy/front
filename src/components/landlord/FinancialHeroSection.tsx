'use client';

import { AnimatedCounter } from '@/components/ui/animated-counter';
import { SectionLabel } from '@/components/ui/section-label';
import { cn } from '@/lib/utils';
import type { FinancialStats } from '@/lib/data/mock-dashboard';

interface FinancialHeroSectionProps {
  stats: FinancialStats;
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
      label: 'Ingresos mensuales'
    },
    {
      value: activeLeases,
      suffix: '',
      label: 'Arriendos activos'
    },
    {
      value: collectionRate,
      suffix: '%',
      label: 'Tasa de cobranza'
    },
    {
      value: pendingPayments,
      suffix: '',
      label: 'Pagos pendientes'
    },
  ];

  return (
    <section className={cn('bg-white py-6 md:py-8', className)}>
      {/* Black container with rounded corners - matches home exactly */}
      <div className="bg-[#0f0f0f] rounded-[2px] py-12 md:py-16 px-8 md:px-12 lg:px-16">
        {/* Header - Centered */}
        <div className="text-center mb-12 md:mb-14">
          <SectionLabel className="text-gray-500 mb-4 justify-center">
            Tu portafolio
          </SectionLabel>
          <h2 className="text-[1.5rem] md:text-[2rem] font-light text-white leading-[1.2] tracking-[-0.02em] italic">
            Resumen de tus propiedades
          </h2>
        </div>

        {/* Stats Grid - Left aligned, like Luxterra */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-10 gap-x-8 md:gap-x-12">
          {dashboardStats.map((stat, index) => (
            <div key={index} className="text-left">
              <div className="text-[2.5rem] md:text-[3.5rem] font-light text-white leading-none tracking-[-0.02em] mb-2">
                {stat.prefix}
                <AnimatedCounter
                  end={stat.value}
                  suffix={stat.suffix}
                  duration={2000}
                />
              </div>
              <p className="text-gray-500 text-[13px] md:text-sm tracking-[-0.01em]">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default FinancialHeroSection;
