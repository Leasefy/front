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
 * Tab Compass - Premium horizontal tabs with animated indicator
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
      <TabsList className="w-full justify-start border-b border-border/80 rounded-none bg-transparent h-auto p-0 gap-1">
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.id}
            value={tab.id}
            disabled={tab.disabled}
            className={cn(
              'relative py-4 px-4 rounded-none transition-all duration-300',
              'data-[state=active]:shadow-none data-[state=active]:bg-transparent',
              'data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground',
              'data-[state=active]:text-foreground',
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
                      ? 'bg-primary text-white'
                      : 'bg-muted text-muted-foreground group-hover:bg-muted'
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
                'bg-primary',
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
