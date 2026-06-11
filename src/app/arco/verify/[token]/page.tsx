'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CheckCircle } from '@phosphor-icons/react';
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
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm text-center">
        <CheckCircle
          weight="duotone"
          className="h-12 w-12 text-emerald-500 mx-auto mb-4"
        />
        <h1 className="text-xl font-semibold font-[Manrope,sans-serif] text-foreground">
          {t('inmobiliaria.ai.arco.verify.confirmed')}
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          {t('inmobiliaria.ai.arco.verify.sla')}
        </p>
        <Link
          href="/"
          className="text-xs text-indigo-500 hover:text-indigo-600 transition-colors mt-6 block"
        >
          Volver al inicio
        </Link>
        <p className="text-xs text-muted-foreground/70 mt-4">
          ¿Tienes dudas? Consulta nuestra{' '}
          <Link
            href="/privacidad"
            className="text-indigo-500 hover:text-indigo-600 transition-colors"
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
    <I18nProvider>
      <ArcoVerifyInner />
    </I18nProvider>
  );
}
