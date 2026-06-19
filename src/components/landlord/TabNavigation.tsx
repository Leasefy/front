'use client';

import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
 * Navegación horizontal de página — DS Tabs variant "underline".
 * Conserva su indicador animado propio (scale-x) en lugar del estático del
 * DS, pero con la piel del contrato: hairline, Satoshi (activo medium ink),
 * hover de fondo, counts mono.
 */
export function TabNavigation({
  tabs,
  activeTab,
  onTabChange,
  className,
}: TabNavigationProps) {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className={className}>
      <TabsList variant="underline" className="w-full justify-start gap-1">
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.id}
            value={tab.id}
            disabled={tab.disabled}
            className={cn(
              'group relative h-auto px-4 py-3.5',
              'rounded-t-md hover:bg-surface-hover',
              // El indicador animado propio reemplaza al estático del DS.
              'data-[state=active]:border-transparent'
            )}
          >
            <span className="flex items-center gap-2.5">
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 font-mono text-[11px] tabular-nums transition-colors',
                    activeTab === tab.id
                      ? 'bg-accent-soft text-primary'
                      : 'bg-surface-muted text-fg-muted'
                  )}
                >
                  {tab.count}
                </span>
              )}
            </span>

            {/* Indicador animado (piel DS: 2px primary, sin pill) */}
            <span
              className={cn(
                'absolute inset-x-0 bottom-0 h-0.5 bg-primary',
                'transition-all duration-300 ease-out',
                activeTab === tab.id
                  ? 'scale-x-100 opacity-100'
                  : 'scale-x-0 opacity-0'
              )}
            />
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

export { TabNavigation as default };
