"use client";

import { AnimatedCounter } from "@/components/ui/animated-counter";
import { SectionLabel } from "@/components/ui/section-label";

const stats = [
  { value: 320, suffix: "+", label: "Arriendos exitosos" },
  { value: 3, suffix: "k", label: "Clientes atendidos" },
  { value: 78, suffix: "+", label: "Propiedades evaluadas" },
  { value: 95, suffix: "%", label: "Satisfaccion del cliente" },
];

/**
 * StatsSection - Luxterra exact pixel perfect
 * Contained black box with rounded corners, left-aligned stats
 */
export function StatsSection() {
  return (
    <section className="bg-white py-6 md:py-8">
      {/* Container with padding - matches Luxterra */}
      <div className="mx-auto max-w-[1400px] px-6 md:px-12">
        {/* Black container with rounded corners */}
        <div className="bg-foreground rounded-sm py-16 md:py-24 px-8 md:px-16 lg:px-20">
          {/* Header - Centered */}
          <div className="text-center mb-16 md:mb-20">
            <SectionLabel className="text-muted-foreground mb-4 justify-center">
              De un vistazo
            </SectionLabel>
            <h2 className="text-[1.75rem] md:text-[2.5rem] font-light text-white leading-[1.2] tracking-[-0.02em] italic">
              Brindando claridad, en cada paso
            </h2>
          </div>

          {/* Stats Grid - Left aligned, no dividers, like Luxterra */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-12 gap-x-8 md:gap-x-16">
            {stats.map((stat, index) => (
              <div key={index} className="text-left">
                <div className="text-[3rem] md:text-[4.5rem] font-light text-white leading-none tracking-[-0.02em] mb-2">
                  <AnimatedCounter
                    end={stat.value}
                    suffix={stat.suffix}
                    duration={2000}
                  />
                </div>
                <p className="text-muted-foreground text-[13px] md:text-sm tracking-[-0.01em]">
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
