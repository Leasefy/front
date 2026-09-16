'use client';

import { notFound, useParams } from 'next/navigation';

import { seccionPorSlug } from '@/components/configuracion/configuracion-de-cuenta';
import { ContenidoDelInquilino } from '../contenido';
import { CONFIGURACION_DEL_INQUILINO } from '../secciones';

export default function SeccionDeConfiguracionDelInquilinoPage() {
  const params = useParams<{ seccion: string }>();
  const seccion = seccionPorSlug(CONFIGURACION_DEL_INQUILINO, params?.seccion ?? '');
  if (!seccion) notFound();
  return <ContenidoDelInquilino id={seccion.id} />;
}
