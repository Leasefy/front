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
      className="min-h-screen flex flex-col items-center justify-center py-16 px-4 bg-bg"
    >
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-6 text-center sm:p-8">
        <CheckCircle weight="fill" className="mx-auto mb-4 h-10 w-10 text-success" aria-hidden="true" />
        <h1 className="text-balance font-heading text-[24px] font-[420] leading-[1.15] tracking-[-0.02em] text-fg">
          {t('inmobiliaria.ai.arco.verify.confirmed')}
        </h1>
        <p className="mt-2 text-body-sm text-fg-muted">
          {t('inmobiliaria.ai.arco.verify.sla')}
        </p>
        <Link
          href="/"
          className="mt-6 block text-body-sm text-fg underline underline-offset-4 transition-colors hover:text-fg-muted"
        >
          Volver al inicio
        </Link>
        <p className="text-caption text-fg-subtle mt-4">
          ¿Tienes dudas? Consulta nuestra{' '}
          <Link
            href="/privacidad"
            className="text-fg underline underline-offset-2 transition-colors hover:text-fg-muted"
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
