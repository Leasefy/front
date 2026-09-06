'use client';

import { useEffect } from 'react';
import Link from 'next/link';
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

  // Sin `AVALUO_WIZARD_URL` (falta `NEXT_PUBLIC_AVALUO_API_URL`) esto era un
  // callejón: una frase suelta, sin volver a ningún lado. Ahora tiene salida.
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="text-sm text-fg-muted">
        {AVALUO_WIZARD_URL
          ? 'Redirigiendo a la solicitud de avalúo…'
          : 'La solicitud de avalúo no está disponible por ahora.'}
      </p>
      {!AVALUO_WIZARD_URL && (
        <Link
          href="/panel/inmobiliaria/inmuebles/avaluos"
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Volver a Avalúos
        </Link>
      )}
    </main>
  );
}
