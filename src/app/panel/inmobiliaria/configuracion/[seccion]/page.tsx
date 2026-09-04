'use client';

/**
 * `/panel/inmobiliaria/configuracion/<seccion>` — cada sección tiene su URL,
 * así se puede compartir y el botón atrás funciona.
 *
 * Equipo (`/equipo`) y Automatización IA (`/ia`) tienen carpeta propia porque
 * ya existían como pantallas: un segmento estático le gana al dinámico, y
 * siguen respondiendo lo mismo.
 */

import { notFound, useParams } from 'next/navigation';

import { SeccionCompleta } from '../contenido';
import { seccionPorSlug } from '../secciones';

export default function SeccionDeConfiguracionPage() {
  const params = useParams<{ seccion: string }>();
  const seccion = seccionPorSlug(params?.seccion ?? '');
  if (!seccion) notFound();
  return <SeccionCompleta id={seccion.id} />;
}
