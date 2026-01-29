'use client';

import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PlanStatsCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'accent' | 'muted';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
}

const variantClasses = {
  default: 'bg-white border-[#E5E7EB]',
  accent: 'bg-[#D4F934]/10 border-[#D4F934]/30',
  muted: 'bg-[#F9FAFB] border-[#E5E7EB]',
};

const sizeClasses = {
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
};

const valueSizeClasses = {
  sm: 'text-2xl',
  md: 'text-3xl',
  lg: 'text-4xl',
};

export function PlanStatsCard({
  label,
  value,
  sublabel,
  icon: Icon,
  trend,
  variant = 'default',
  size = 'md',
  className,
  onClick,
}: PlanStatsCardProps) {
  return (
    <div
      className={cn(
        'border transition-colors duration-100',
        variantClasses[variant],
        sizeClasses[size],
        onClick && 'cursor-pointer hover:bg-[#FAFAFA]',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-[12px] font-medium text-[#9CA3AF] uppercase tracking-wide mb-1">{label}</p>
          <p className={cn(
            'font-semibold text-[#111827] tracking-tight',
            valueSizeClasses[size]
          )}>
            {value}
          </p>
          {sublabel && (
            <p className="text-[11px] text-[#9CA3AF] mt-1">{sublabel}</p>
          )}
          {trend && (
            <div className={cn(
              'flex items-center gap-1 mt-2 text-[11px] font-medium',
              trend.isPositive ? 'text-[#22C55E]' : 'text-[#EF4444]'
            )}>
              <span>{trend.isPositive ? '+' : ''}{trend.value}%</span>
              <span className="text-[#9CA3AF]">vs last month</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className="p-2 bg-[#F3F4F6]">
            <Icon className="w-5 h-5 text-[#9CA3AF] stroke-[1.5px]" />
          </div>
        )}
      </div>
    </div>
  );
}

// Grid container for stats
export interface PlanStatsGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}

export function PlanStatsGrid({
  children,
  columns = 4,
  className,
}: PlanStatsGridProps) {
  const gridClasses = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={cn(
      'grid gap-4',
      gridClasses[columns],
      className
    )}>
      {children}
    </div>
  );
}

// Compact stats variant for inline display
export interface PlanStatsInlineProps {
  stats: Array<{
    label: string;
    value: string | number;
  }>;
  className?: string;
}

export function PlanStatsInline({ stats, className }: PlanStatsInlineProps) {
  return (
    <div className={cn('flex items-center gap-6', className)}>
      {stats.map((stat, index) => (
        <div key={index} className="flex items-center gap-2">
          <span className="text-sm text-[#6B7280]">{stat.label}:</span>
          <span className="text-sm font-semibold text-[#111827]">{stat.value}</span>
        </div>
      ))}
    </div>
  );
}
