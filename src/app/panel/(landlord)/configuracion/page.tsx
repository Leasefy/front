'use client';

/**
 * `/panel/configuracion` — la raíz de Configuración del propietario: Tu plan.
 * El resto de secciones vive en `/panel/configuracion/<seccion>`.
 * QA-PROP-95: al propietario de inmobiliaria (no compra plan) le abre en Notificaciones.
 */

import { useContratosAdministrados } from '@/components/landlord/ContratosConLaInmobiliaria';
import { EsqueletoDeSeccion } from '@/components/configuracion/piezas';
import { ContenidoDelPropietario } from './contenido';

export default function ConfiguracionDelPropietarioPage() {
  const administrados = useContratosAdministrados();
  // Mientras se sabe si es de inmobiliaria, el esqueleto (antes, la sección en blanco).
  if (administrados.cargando) return <EsqueletoDeSeccion filas={3} />;
  return <ContenidoDelPropietario id={administrados.doc !== null || administrados.fichaSinContratos ? 'notificaciones' : 'plan'} />;
}
