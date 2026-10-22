import type { Metadata } from 'next';

import { conIdioma } from '@/lib/idioma/idioma';
import { alternativasDelIdioma, idiomaDeLaPeticion } from '@/lib/idioma/metadata';
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
  const alternates = alternativasDelIdioma(ruta, idioma);
  const inmueble = await pedirInmuebleParaLaVistaPrevia(id);
  if (!inmueble) return { alternates };
  return {
    ...metadataDeLaVistaPrevia(inmueble, { idioma, url: conIdioma(ruta, idioma) }),
    alternates,
  };
}

export default function FichaDelInmuebleLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
