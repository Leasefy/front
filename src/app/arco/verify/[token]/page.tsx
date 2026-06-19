'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CheckCircle } from '@phosphor-icons/react';
import { ForceLightMode } from '@/components/providers/ForceLightMode';
import { I18nProvider, useI18n } from '@/lib/i18n';

function ArcoVerifyInner() {
  const { t } = useI18n();
  const { token } = useParams<{ token: string }>();

  // Fire-and-forget: call the verify endpoint on mount.
  // T-36-09-02 enumeration defense: the UI always shows success regardless of
  // token validity — valid, expired, and invalid tokens all produce identical output.
  useEffect(() => {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL;
    if (!agentUrl || !token) return;

    (async () => {
      try {
        await fetch(`${agentUrl}/api/arco/verify/${token}`, {
          method: 'GET',
        });
      } catch {
        // Silently ignore — UI always shows success (enumeration defense).
      }
    })();
  }, [token]);

  return (
    <main
      id="main-content"
      className="min-h-screen flex flex-col items-center justify-center py-16 px-4 bg-background"
    >
      <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white p-8 text-center">
        <CheckCircle
          weight="duotone"
          className="h-12 w-12 text-[#2C7A53] mx-auto mb-4"
        />
        <h1 className="text-xl font-semibold font-heading text-neutral-900">
          {t('inmobiliaria.ai.arco.verify.confirmed')}
        </h1>
        <p className="text-sm text-neutral-500 mt-2">
          {t('inmobiliaria.ai.arco.verify.sla')}
        </p>
        <Link
          href="/"
          className="text-xs text-[#1A40FF] hover:text-[#1A40FF] transition-colors mt-6 block"
        >
          Volver al inicio
        </Link>
        <p className="text-xs text-neutral-400 mt-4">
          ¿Tienes dudas? Consulta nuestra{' '}
          <Link
            href="/privacidad"
            className="text-[#1A40FF] hover:text-[#1A40FF] transition-colors"
          >
            política de privacidad
          </Link>
          .
        </p>
      </div>
    </main>
  );
}

export default function ArcoVerifyPage() {
  return (
    <ForceLightMode>
      <I18nProvider>
        <ArcoVerifyInner />
      </I18nProvider>
    </ForceLightMode>
  );
}
