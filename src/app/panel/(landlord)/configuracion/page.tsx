'use client';

/**
 * `/panel/configuracion` — la raíz de Configuración del propietario: Tu plan.
 * El resto de secciones vive en `/panel/configuracion/<seccion>`.
 */

import { ContenidoDelPropietario } from './contenido';

export default function ConfiguracionDelPropietarioPage() {
  return <ContenidoDelPropietario id="plan" />;
}
