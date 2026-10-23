'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AVALUO_WIZARD_URL } from '@/lib/avaluo/wizard-url';
import { CargaDeMarca } from '@/components/ui/carga-de-marca';

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
    <main className="flex min-h-screen items-center justify-center bg-bg p-8 text-center">
      {AVALUO_WIZARD_URL ? (
        <CargaDeMarca tamano="md" disposicion="apilada" texto="Abriendo la solicitud de avalúo…" className="flex" />
      ) : (
        // Sin la solicitud disponible, una salida: la portada de avalúos.
        <div className="space-y-3">
          <p className="text-body-sm text-fg-muted">La solicitud de avalúo no está disponible por ahora.</p>
          <Link href="/avaluo" className="text-body-sm text-fg underline underline-offset-4">
            Volver a Avalúos
          </Link>
        </div>
      )}
    </main>
  );
}
