'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

export interface PlanTab {
  id: string;
  label: string;
  count?: number;
  disabled?: boolean;
}

export interface PlanTabsProps {
  tabs: PlanTab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: 'default' | 'pills' | 'underline';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: 'text-xs px-3 py-1.5',
  md: 'text-sm px-4 py-2',
  lg: 'text-base px-5 py-2.5',
};

export function PlanTabs({
  tabs,
  activeTab,
  onChange,
  variant = 'default',
  size = 'md',
  fullWidth = false,
  className,
}: PlanTabsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState<{
    left: number;
    width: number;
  }>({ left: 0, width: 0 });

  // Update indicator position
  useEffect(() => {
    if (variant !== 'underline' || !containerRef.current) return;

    const container = containerRef.current;
    const activeButton = container.querySelector(`[data-tab-id="${activeTab}"]`) as HTMLElement;

    if (activeButton) {
      const containerRect = container.getBoundingClientRect();
      const buttonRect = activeButton.getBoundingClientRect();

      setIndicatorStyle({
        left: buttonRect.left - containerRect.left,
        width: buttonRect.width,
      });
    }
  }, [activeTab, variant, tabs]);

  if (variant === 'pills') {
    return (
      <div className={cn(
        'inline-flex items-center gap-1 p-1 rounded-sm bg-[#F3F4F6]',
        fullWidth && 'w-full',
        className
      )}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && onChange(tab.id)}
            disabled={tab.disabled}
            className={cn(
              'rounded-sm font-medium transition-all duration-200',
              sizeClasses[size],
              fullWidth && 'flex-1',
              activeTab === tab.id
                ? 'bg-white text-[#111827] shadow-sm'
                : 'text-[#6B7280] hover:text-[#111827]',
              tab.disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <span className="flex items-center justify-center gap-2">
              {tab.label}
              {tab.count !== undefined && (
                <span className={cn(
                  'px-1.5 py-0.5 rounded-full text-xs font-semibold',
                  activeTab === tab.id
                    ? 'bg-[#111827] text-white'
                    : 'bg-[#E5E7EB] text-[#6B7280]'
                )}>
                  {tab.count}
                </span>
              )}
            </span>
          </button>
        ))}
      </div>
    );
  }

  if (variant === 'underline') {
    return (
      <div
        ref={containerRef}
        className={cn(
          'relative inline-flex items-center border-b border-[#E5E7EB]',
          fullWidth && 'w-full',
          className
        )}
      >
        {tabs.map(tab => (
          <button
            key={tab.id}
            data-tab-id={tab.id}
            onClick={() => !tab.disabled && onChange(tab.id)}
            disabled={tab.disabled}
            className={cn(
              'relative font-medium transition-colors duration-200 -mb-px',
              sizeClasses[size],
              fullWidth && 'flex-1',
              activeTab === tab.id
                ? 'text-[#111827]'
                : 'text-[#6B7280] hover:text-[#111827]',
              tab.disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <span className="flex items-center justify-center gap-2">
              {tab.label}
              {tab.count !== undefined && (
                <span className={cn(
                  'px-1.5 py-0.5 rounded-sm text-[10px] font-semibold',
                  activeTab === tab.id
                    ? 'bg-[#111827] text-white'
                    : 'bg-[#F3F4F6] text-[#6B7280]'
                )}>
                  {tab.count}
                </span>
              )}
            </span>
          </button>
        ))}
        {/* Animated underline indicator */}
        <div
          className="absolute bottom-0 h-0.5 bg-[#111827] transition-all duration-200 ease-out"
          style={{
            left: indicatorStyle.left,
            width: indicatorStyle.width,
          }}
        />
      </div>
    );
  }

  // Default variant
  return (
    <div className={cn(
      'inline-flex items-center gap-1',
      fullWidth && 'w-full',
      className
    )}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => !tab.disabled && onChange(tab.id)}
          disabled={tab.disabled}
          className={cn(
            'rounded-sm font-medium transition-all duration-200',
            sizeClasses[size],
            fullWidth && 'flex-1',
            activeTab === tab.id
              ? 'bg-[#111827] text-white'
              : 'text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827]',
            tab.disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <span className="flex items-center justify-center gap-2">
            {tab.label}
            {tab.count !== undefined && (
              <span className={cn(
                'px-1.5 py-0.5 rounded-full text-xs font-semibold',
                activeTab === tab.id
                  ? 'bg-white/20 text-white'
                  : 'bg-[#E5E7EB] text-[#6B7280]'
              )}>
                {tab.count}
              </span>
            )}
          </span>
        </button>
      ))}
    </div>
  );
}

// Panel wrapper for tab content
export interface PlanTabPanelProps {
  children: React.ReactNode;
  value: string;
  activeTab: string;
  className?: string;
}

export function PlanTabPanel({
  children,
  value,
  activeTab,
  className,
}: PlanTabPanelProps) {
  if (value !== activeTab) return null;

  return (
    <div
      className={cn('animate-fade-in', className)}
      role="tabpanel"
    >
      {children}
    </div>
  );
}
