import type { Metadata } from 'next';
import { ForceLightMode } from '@/components/providers/ForceLightMode';
import { I18nProvider } from '@/lib/i18n';
import { ArcoFormClient } from './ArcoFormClient';

export const metadata: Metadata = {
  title: 'Solicitud de derechos ARCO | Leasefy',
  description:
    'Ejerza sus derechos de Acceso, Rectificación, Cancelación u Oposición sobre sus datos personales conforme a la Ley 1581 de 2012.',
};

export default function ArcoPage() {
  return (
    <ForceLightMode>
      <I18nProvider>
        <main
          id="main-content"
          className="min-h-screen flex flex-col items-center justify-start py-16 px-4 bg-background"
        >
          <ArcoFormClient />
        </main>
      </I18nProvider>
    </ForceLightMode>
  );
}
