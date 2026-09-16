'use client';

/**
 * `/inquilino/configuracion` — la raíz de Configuración: Notificaciones. El
 * resto de secciones vive en `/inquilino/configuracion/<seccion>`.
 */

import { ContenidoDelInquilino } from './contenido';

export default function ConfiguracionDelInquilinoPage() {
  return <ContenidoDelInquilino id="notificaciones" />;
}
