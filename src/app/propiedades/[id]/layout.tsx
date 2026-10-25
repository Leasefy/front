import type { Metadata } from 'next';

import { conIdioma } from '@/lib/idioma/idioma';
import { datosDelInmueble } from '@/lib/seo/datos-del-inmueble';
import { alternativasSoloEnEspanol, idiomaDeLaPeticion } from '@/lib/idioma/metadata';
import {
  metadataDeLaVistaPrevia,
  pedirInmuebleParaLaVistaPrevia,
} from '@/lib/inmuebles/vista-previa-del-inmueble';

/**
 * La «mini ficha» del enlace del inmueble (Juan y Nico, 21-10-2026: «cuando
 * se comparta el enlace la idea es que genere una mini ficha como esta», con
 * la de Portofino de ejemplo): el título, «Arriendo en El Yerbal, Envigado —
 * $ 12.000.000 / mes · 3 habitaciones…» y la primera foto.
 *
 * Antes la ficha heredaba la de `propiedades/layout.tsx` (la del catálogo):
 * WhatsApp mostraba «leasefy.co» sin foto, y el canonical de cada ficha
 * apuntaba al catálogo.
 *
 * La página sigue siendo de cliente: esto sólo pide el inmueble para la
 * metadata, con la misma ruta pública que usa la ficha. Si el back no
 * responde a tiempo queda la vista previa genérica: la página carga igual.
 */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const idioma = await idiomaDeLaPeticion();
  const ruta = `/propiedades/${id}`;
  // SEO (24-10): la ficha existe sólo en español; /en/… muestra lo mismo → canonical a la de /es.
  const alternates = alternativasSoloEnEspanol(ruta);
  const inmueble = await pedirInmuebleParaLaVistaPrevia(id);
  if (!inmueble) return { alternates };
  return {
    ...metadataDeLaVistaPrevia(inmueble, { idioma, url: conIdioma(ruta, idioma) }),
    alternates,
  };
}

/**
 * Los datos estructurados del aviso (SEO, 24-10-2026): `RealEstateListing` con su precio y el inmueble. Mismo pedido
 * que la metadata de arriba (Next lo reutiliza: no es una llamada más). Sin respuesta del back, la ficha carga igual.
 */
export default async function FichaDelInmuebleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const inmueble = await pedirInmuebleParaLaVistaPrevia(id);
  const sitio = process.env.NEXT_PUBLIC_SITE_URL || 'https://leasefy.co';
  return (
    <>
      {inmueble ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(datosDelInmueble(inmueble, `${sitio}${conIdioma(`/propiedades/${id}`, 'es')}`, sitio)).replace(/</g, '\\u003c') }}
        />
      ) : null}
      {children}
    </>
  );
}
