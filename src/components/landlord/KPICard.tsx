'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

import { cn } from '@/lib/utils';

// Animated counter hook
function useAnimatedCounter(end: number, duration: number = 1000) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (end === 0) {
      setCount(0);
      return;
    }

    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);

      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(easeOutQuart * end));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [end, duration]);

  return count;
}

export interface KPICardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  variant?: 'default' | 'primary' | 'warning' | 'success' | 'info';
  trend?: {
    value: number;
    isPositive: boolean;
    label?: string;
  };
  href?: string;
  className?: string;
}

/**
 * KPI Card - Prominent metric display with optional trend
 */
export function KPICard({
  title,
  value,
  icon: Icon,
  variant = 'default',
  trend,
  href,
  className,
}: KPICardProps) {
  const animatedValue = useAnimatedCounter(value);

  const variantStyles = {
    default: {
      bg: 'bg-white',
      icon: 'bg-muted text-muted-foreground',
      value: 'text-foreground',
    },
    primary: {
      bg: 'bg-white',
      icon: 'bg-primary/10 text-primary',
      value: 'text-primary',
    },
    warning: {
      bg: 'bg-white',
      icon: 'bg-amber-50 text-amber-600',
      value: 'text-amber-600',
    },
    success: {
      bg: 'bg-white',
      icon: 'bg-emerald-50 text-emerald-600',
      value: 'text-emerald-600',
    },
    info: {
      bg: 'bg-white',
      icon: 'bg-blue-50 text-blue-600',
      value: 'text-blue-600',
    },
  };

  const styles = variantStyles[variant];

  const content = (
    <div
      className={cn(
        'relative p-5 rounded-sm border border-border shadow-sm',
        'transition-all duration-200 ease-out',
        href && 'hover:shadow-md hover:border-border cursor-pointer',
        styles.bg,
        className
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'w-10 h-10 rounded-sm flex items-center justify-center mb-4',
          styles.icon
        )}
      >
        <Icon className="w-5 h-5" />
      </div>

      {/* Value */}
      <p
        className={cn(
          'text-3xl font-bold tabular-nums tracking-tight',
          styles.value
        )}
      >
        {animatedValue}
      </p>

      {/* Title */}
      <p className="text-sm text-muted-foreground mt-1">{title}</p>

      {/* Trend indicator */}
      {trend && (
        <div
          className={cn(
            'absolute top-5 right-5 flex items-center gap-1 text-xs font-medium',
            trend.isPositive ? 'text-emerald-600' : 'text-red-500'
          )}
        >
          {trend.isPositive ? (
            <TrendingUp className="w-3.5 h-3.5" />
          ) : (
            <TrendingDown className="w-3.5 h-3.5" />
          )}
          <span>{trend.value}%</span>
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }

  return content;
}

export { KPICard as default };
