'use client';

import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

export interface Tab {
  id: string;
  label: string;
  count?: number;
  disabled?: boolean;
}

interface TabNavigationProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  className?: string;
}

/**
 * Tab Navigation - Premium horizontal tabs with animated indicator
 * Used in property detail page
 */
export function TabNavigation({
  tabs,
  activeTab,
  onTabChange,
  className,
}: TabNavigationProps) {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className={className}>
      <TabsList className="w-full justify-start border-b border-slate-200/80 rounded-none bg-transparent h-auto p-0 gap-1">
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.id}
            value={tab.id}
            disabled={tab.disabled}
            className={cn(
              'relative py-4 px-4 rounded-none transition-all duration-300',
              'data-[state=active]:shadow-none data-[state=active]:bg-transparent',
              'data-[state=inactive]:text-slate-500 data-[state=inactive]:hover:text-slate-800',
              'data-[state=active]:text-black',
              'data-[disabled]:opacity-40 data-[disabled]:cursor-not-allowed',
              'group'
            )}
          >
            <span className="flex items-center gap-2.5 font-medium">
              {tab.label}
              {tab.count !== undefined && (
                <Badge
                  variant="secondary"
                  className={cn(
                    'text-xs font-semibold px-2.5 py-0.5 rounded-full transition-all duration-300',
                    activeTab === tab.id
                      ? 'bg-black text-white'
                      : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                  )}
                >
                  {tab.count}
                </Badge>
              )}
            </span>

            {/* Animated bottom indicator */}
            <span
              className={cn(
                'absolute bottom-0 left-0 right-0 h-[3px] rounded-t-full',
                'bg-black',
                'transition-all duration-300 ease-out',
                activeTab === tab.id
                  ? 'opacity-100 scale-x-100'
                  : 'opacity-0 scale-x-0'
              )}
            />
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

export { TabNavigation as default };
