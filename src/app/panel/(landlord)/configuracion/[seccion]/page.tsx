'use client';

import { useEffect } from 'react';
import { notFound, useParams, useRouter } from 'next/navigation';

import { seccionPorSlug } from '@/components/configuracion/configuracion-de-cuenta';
import { ContenidoDelPropietario } from '../contenido';
import { useContratosAdministrados } from '@/components/landlord/ContratosConLaInmobiliaria';
import { CONFIGURACION_DEL_PROPIETARIO, SECCIONES_SOLO_DEL_INDEPENDIENTE } from '../secciones';

export default function SeccionDeConfiguracionDelPropietarioPage() {
  const params = useParams<{ seccion: string }>();
  const seccion = seccionPorSlug(CONFIGURACION_DEL_PROPIETARIO, params?.seccion ?? '');
  const administrados = useContratosAdministrados();
  const router = useRouter();
  // QA-PROP-95: plan, equipo y cuentas de recaudo no son del propietario de
  // inmobiliaria. QA 11-10: la dirección vuelve a la de Notificaciones (antes
  // se quedaba en «/equipo» mostrando las notificaciones).
  const noEsSuya =
    !administrados.cargando &&
    (administrados.doc !== null || Boolean(administrados.fichaSinContratos)) &&
    Boolean(seccion && SECCIONES_SOLO_DEL_INDEPENDIENTE.includes(seccion.id));
  useEffect(() => {
    if (noEsSuya) router.replace('/panel/configuracion/notificaciones');
  }, [noEsSuya, router]);
  if (!seccion) notFound();
  if (administrados.cargando || noEsSuya) return null;
  return <ContenidoDelPropietario id={seccion.id} />;
}
