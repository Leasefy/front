'use client';

import { useEffect } from 'react';
import { redirect } from 'next/navigation';
import { AVALUO_WIZARD_URL } from '@/lib/avaluo/wizard-url';

/**
 * /panel/inmobiliaria/avaluos/nuevo — RETIRED in-app wizard.
 *
 * The avalúo solicitud flow now runs on the micro's own front
 * (AVALUO_WIZARD_URL). This route forwards there so old links/bookmarks still
 * land on the flow. The former authenticated wizard (email pre-fill via
 * AuthContext + AvaluoWizardShell) is no longer mounted — the micro front owns
 * the intake now.
 *
 * Revisora r25: sin `AVALUO_WIZARD_URL` (falta `NEXT_PUBLIC_AVALUO_API_URL`)
 * era una frase suelta en el centro, sin encabezado ni porqué. Ahora va a
 * Avalúos, que ya explica el estado con su encabezado y su salida.
 */
export default function PanelNuevoAvaluoRedirectPage() {
  if (!AVALUO_WIZARD_URL) redirect('/panel/inmobiliaria/inmuebles/avaluos');

  useEffect(() => {
    if (AVALUO_WIZARD_URL) window.location.replace(AVALUO_WIZARD_URL);
  }, []);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-8 text-center">
      <p className="text-body-sm text-fg-muted">Abriendo la solicitud de avalúo…</p>
    </div>
  );
}
