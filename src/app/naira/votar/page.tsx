import type { Metadata } from 'next';
import { I18nProvider } from '@/lib/i18n';
import { VotoPorEnlaceClient } from './VotoPorEnlaceClient';

export const metadata: Metadata = {
  title: 'Tu respuesta a Naira | Leasefy',
  description: 'Responde desde el correo si una señal de Naira te sirvió.',
  robots: { index: false, follow: false },
};

/**
 * P12 (16-10-2026): la página a la que llevan los enlaces «Útil · No útil · Ya
 * lo sabía» del correo del briefing de Naira. Es pública (quien abre el correo
 * puede no tener sesión en ese navegador): la autenticación es el sobre del
 * enlace, que viaja en el fragmento y lo abre el micro.
 */
export default function VotarPage() {
  return (
    <I18nProvider>
      <main
        id="main-content"
        className="min-h-screen flex flex-col items-center justify-start py-16 px-4 bg-background"
      >
        <VotoPorEnlaceClient />
      </main>
    </I18nProvider>
  );
}
