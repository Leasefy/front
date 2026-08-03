'use client';

import { BrandSplash } from '@/components/brand';
import { EmptyState } from '@/components/data-display/EmptyState';
import { FolderOpen } from '@phosphor-icons/react';

/** Client-only demos for the brand reference page (EmptyState takes a component prop). */
export function StatesDemo() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="relative h-64">
          <BrandSplash text="Cargando" fixed={false} />
        </div>
        <div className="px-4 py-2.5 border-t border-border">
          <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-fg-subtle">Splash / loading</span>
        </div>
      </div>
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="h-64 flex items-center justify-center p-6 bg-surface">
          <EmptyState
            icon={FolderOpen}
            title="Aún no hay datos"
            description="Cuando registres movimientos aparecerán acá."
            primaryCta={{ label: 'Crear el primero', href: '#' }}
          />
        </div>
        <div className="px-4 py-2.5 border-t border-border">
          <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-fg-subtle">Empty state</span>
        </div>
      </div>
    </div>
  );
}
