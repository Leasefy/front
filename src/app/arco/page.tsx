import type { Metadata } from 'next';
import { I18nProvider } from '@/lib/i18n';
import { ElegirInmobiliaria } from './ElegirInmobiliaria';
import { listarLasInmobiliarias } from './inmobiliaria-del-formulario';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  // La plantilla del layout raíz ya agrega «| Leasefy».
  title: 'Tus datos personales',
  description: 'Pide ver, corregir o borrar tus datos personales (Habeas Data, Ley 1581 de 2012).',
};

/**
 * `/arco` sin inmobiliaria (ARCO-1, Nico 19-10-2026: «formulario por
 * inmobiliaria»). Antes era el formulario y el micro adivinaba la inmobiliaria
 * por la dirección web: siempre terminaba en «no habilitado». Ahora se elige
 * primero a cuál, y su formulario vive en `/arco/<inmobiliaria>`.
 */
export default async function ArcoPage() {
  const inmobiliarias = await listarLasInmobiliarias();
  return (
    <I18nProvider>
      <main
        id="main-content"
        className="min-h-screen flex flex-col items-center justify-start py-16 px-4 bg-background"
      >
        <ElegirInmobiliaria inmobiliarias={inmobiliarias} />
      </main>
    </I18nProvider>
  );
}
