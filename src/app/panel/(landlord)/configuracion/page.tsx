'use client';

/**
 * `/panel/configuracion` — la raíz de Configuración del propietario: Tu plan.
 * El resto de secciones vive en `/panel/configuracion/<seccion>`.
 * QA-PROP-95: al propietario de inmobiliaria (no compra plan) le abre en Notificaciones.
 */

import { useContratosAdministrados } from '@/components/landlord/ContratosConLaInmobiliaria';
import { ContenidoDelPropietario } from './contenido';

export default function ConfiguracionDelPropietarioPage() {
  const administrados = useContratosAdministrados();
  if (administrados.cargando) return null;
  return <ContenidoDelPropietario id={administrados.doc !== null ? 'notificaciones' : 'plan'} />;
}
