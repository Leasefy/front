'use client';

import { useEffect } from 'react';
import { AVALUO_WIZARD_URL } from '@/lib/avaluo/wizard-url';

/**
 * /panel/inmobiliaria/avaluos/nuevo — RETIRED in-app wizard.
 *
 * The avalúo solicitud flow now runs on the micro's own front
 * (AVALUO_WIZARD_URL). This route forwards there so old links/bookmarks still
 * land on the flow. The former authenticated wizard (email pre-fill via
 * AuthContext + AvaluoWizardShell) is no longer mounted — the micro front owns
 * the intake now.
 */
export default function PanelNuevoAvaluoRedirectPage() {
  useEffect(() => {
    if (AVALUO_WIZARD_URL) window.location.replace(AVALUO_WIZARD_URL);
  }, []);

  return (
    <main className="flex min-h-[60vh] items-center justify-center p-8 text-center">
      <p className="text-sm text-muted-foreground">
        {AVALUO_WIZARD_URL
          ? 'Redirigiendo a la solicitud de avalúo…'
          : 'La solicitud de avalúo no está disponible por ahora.'}
      </p>
    </main>
  );
}
