'use client';

import { useRef, type ReactNode } from 'react';
import { motion, useInView } from 'framer-motion';
import { Check } from '@phosphor-icons/react';

interface BentoCardProps {
  title: string;
  description: string;
  benefits?: string[];
  children: ReactNode;
  index: number;
  className?: string;
  dark?: boolean;
  outline?: boolean;
}

export function BentoCard({
  title,
  description,
  benefits,
  children,
  index,
  className = "",
  dark = false,
  outline = false,
}: BentoCardProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  const bg = dark
    ? "bg-indigo-950 hover:shadow-[0_8px_40px_rgba(91,95,239,0.15)]"
    : outline
      ? "bg-white hover:shadow-md"
      : "bg-neutral-50 hover:shadow-lg";

  const borderStyle = dark
    ? "1px solid rgba(255,255,255,0.06)"
    : "1px solid rgba(0,0,0,0.08)";

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`group flex flex-col overflow-hidden transition-shadow duration-500 ${bg} ${className}`}
      style={{ border: borderStyle }}
    >
      <div className="px-6 pt-5 pb-0">
        <h3 className={`text-[20px] sm:text-[24px] font-heading font-semibold tracking-tight leading-tight ${dark ? "text-white" : "text-foreground"}`}>
          {title}
        </h3>
        <p className={`text-[12px] leading-relaxed mt-1 max-w-[380px] ${dark ? "text-white/40" : "text-muted-foreground"}`}>
          {description}
        </p>
        {benefits && benefits.length > 0 && (
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
            {benefits.map((benefit) => (
              <div key={benefit} className="flex items-center gap-1.5">
                <Check className={`w-3 h-3 ${dark ? "text-emerald-400" : "text-foreground/40"}`} />
                <span className={`text-[11px] ${dark ? "text-white/50" : "text-foreground/60"}`}>{benefit}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="relative flex-1 min-h-0 overflow-hidden">
        {isInView && children}
      </div>
    </motion.div>
  );
}
