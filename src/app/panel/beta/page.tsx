'use client';

import { Sparkle } from '@phosphor-icons/react';

/**
 * Beta entry page for propietarios.
 * Placeholder that will be replaced by the full Beta layout in Plan 02.
 */
export default function BetaPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center">
        <Sparkle className="w-6 h-6 text-indigo-500" weight="fill" />
      </div>
      <div className="text-center">
        <h1 className="text-lg font-semibold text-foreground">AI Beta</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Cargando tu centro de control...
        </p>
      </div>
    </div>
  );
}
