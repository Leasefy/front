'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { LeasefyLogotype } from '@/components/brand';
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
        // Sin la solicitud disponible: la marca, el porqué y dos salidas (el
        // correo y la portada); antes, una frase gris suelta (revisora r25).
        <div className="w-full max-w-md space-y-4 rounded-lg border border-border bg-surface p-6 sm:p-8" data-testid="avaluo-nuevo-en-pausa">
          <Link href="/" aria-label="Leasefy, ir al inicio" className="mx-auto inline-block">
            <LeasefyLogotype className="h-5 w-auto text-fg" title="Leasefy" />
          </Link>
          <h1 className="text-balance text-h3 text-fg">La solicitud de avalúo está en pausa</h1>
          <p className="text-body-sm text-fg-muted">
            Mientras, escríbenos a{" "}
            <a href="mailto:avaluos@leasefy.co" className="text-fg underline underline-offset-4">
              avaluos@leasefy.co
            </a>{" "}
            y te ayudamos con tu avalúo.
          </p>
          <Link href="/avaluo" className="inline-block text-body-sm text-fg-muted underline underline-offset-4 hover:text-fg">
            Volver a Avalúos
          </Link>
        </div>
      )}
    </main>
  );
}
