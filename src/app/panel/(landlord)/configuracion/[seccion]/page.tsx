'use client';

import { notFound, useParams } from 'next/navigation';

import { seccionPorSlug } from '@/components/configuracion/configuracion-de-cuenta';
import { ContenidoDelPropietario } from '../contenido';
import { useContratosAdministrados } from '@/components/landlord/ContratosConLaInmobiliaria';
import { CONFIGURACION_DEL_PROPIETARIO, SECCIONES_SOLO_DEL_INDEPENDIENTE } from '../secciones';

export default function SeccionDeConfiguracionDelPropietarioPage() {
  const params = useParams<{ seccion: string }>();
  const seccion = seccionPorSlug(CONFIGURACION_DEL_PROPIETARIO, params?.seccion ?? '');
  const administrados = useContratosAdministrados();
  if (!seccion) notFound();
  if (administrados.cargando) return null;
  // QA-PROP-95: plan, equipo y cuentas de recaudo no son del propietario de inmobiliaria.
  if ((administrados.doc !== null || administrados.fichaSinContratos) && SECCIONES_SOLO_DEL_INDEPENDIENTE.includes(seccion.id)) {
    return <ContenidoDelPropietario id="notificaciones" />;
  }
  return <ContenidoDelPropietario id={seccion.id} />;
}
