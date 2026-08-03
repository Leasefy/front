'use client';

import { useEffect } from 'react';
import { AVALUO_WIZARD_URL } from '@/lib/avaluo/wizard-url';

/**
 * /avaluo/nuevo — RETIRED in-app wizard.
 *
 * The avalúo solicitud flow now runs on the micro's own front
 * (AVALUO_WIZARD_URL). This route only forwards there so old links/bookmarks
 * still land on the flow. The former in-app wizard (AvaluoWizardShell + Step*)
 * is no longer mounted.
 */
export default function NuevoAvaluoRedirectPage() {
  useEffect(() => {
    if (AVALUO_WIZARD_URL) window.location.replace(AVALUO_WIZARD_URL);
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center p-8 text-center">
      <p className="text-sm text-fg-muted">
        {AVALUO_WIZARD_URL
          ? 'Redirigiendo a la solicitud de avalúo…'
          : 'La solicitud de avalúo no está disponible por ahora.'}
      </p>
    </main>
  );
}
