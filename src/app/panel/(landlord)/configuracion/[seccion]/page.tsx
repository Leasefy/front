'use client';

import { notFound, useParams } from 'next/navigation';

import { seccionPorSlug } from '@/components/configuracion/configuracion-de-cuenta';
import { ContenidoDelPropietario } from '../contenido';
import { CONFIGURACION_DEL_PROPIETARIO } from '../secciones';

export default function SeccionDeConfiguracionDelPropietarioPage() {
  const params = useParams<{ seccion: string }>();
  const seccion = seccionPorSlug(CONFIGURACION_DEL_PROPIETARIO, params?.seccion ?? '');
  if (!seccion) notFound();
  return <ContenidoDelPropietario id={seccion.id} />;
}
