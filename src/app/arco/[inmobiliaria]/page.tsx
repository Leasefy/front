import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { I18nProvider } from '@/lib/i18n';
import { ArcoFormClient } from '../ArcoFormClient';
import { ArcoNoAbrio } from '../ArcoNoAbrio';
import { leerLaInmobiliaria } from '../inmobiliaria-del-formulario';

/**
 * `leasefy.co/arco/<inmobiliaria>` — el formulario de Habeas Data de UNA
 * inmobiliaria (ARCO-1, Nico 19-10-2026). Se enlaza desde su página del
 * marketplace y al pie de sus correos de cobranza. La inmobiliaria se lee con
 * su página pública del back (nombre corto o id); si el back dice que no
 * existe, es un 404 de verdad.
 */
type Params = { params: Promise<{ inmobiliaria: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { inmobiliaria } = await params;
  const lectura = await leerLaInmobiliaria(decodeURIComponent(inmobiliaria));
  const nombre = lectura.estado === 'ok' ? lectura.inmobiliaria.nombre : null;
  return {
    robots: { index: false, follow: false },
    // La plantilla del layout raíz ya agrega «| Leasefy».
    title: nombre ? `Tus datos personales · ${nombre}` : 'Tus datos personales',
    description: nombre
      ? `Pídele a ${nombre} ver, corregir o borrar tus datos personales (Habeas Data, Ley 1581 de 2012).`
      : 'Pide ver, corregir o borrar tus datos personales (Habeas Data, Ley 1581 de 2012).',
  };
}

export default async function ArcoDeLaInmobiliariaPage({ params }: Params) {
  const { inmobiliaria } = await params;
  const lectura = await leerLaInmobiliaria(decodeURIComponent(inmobiliaria));
  if (lectura.estado === 'no-existe') notFound();
  return (
    <I18nProvider>
      <main
        id="main-content"
        className="min-h-screen flex flex-col items-center justify-start px-4 pb-16 pt-8 sm:pt-16 bg-bg"
      >
        {lectura.estado === 'ok' ? (
          <ArcoFormClient
            inmobiliaria={{
              id: lectura.inmobiliaria.id,
              nombre: lectura.inmobiliaria.nombre,
              logoUrl: lectura.inmobiliaria.logoUrl,
            }}
          />
        ) : (
          <ArcoNoAbrio />
        )}
      </main>
    </I18nProvider>
  );
}
