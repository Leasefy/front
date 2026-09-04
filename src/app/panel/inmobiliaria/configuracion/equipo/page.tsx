'use client';

/**
 * `/panel/inmobiliaria/configuracion/equipo` — la sección Equipo dentro del
 * marco de Configuración.
 *
 * Era una pantalla aparte (con su propia lista de agentes, sus filtros y su
 * formulario de invitación) que peleaba con la pestaña «Usuarios»: las dos
 * mostraban a las mismas personas y las dos invitaban al mismo endpoint. La
 * lista quedó una sola (`SeccionEquipo`); la URL no cambia.
 */

import { SeccionCompleta } from '../contenido';

export default function EquipoPage() {
  return <SeccionCompleta id="equipo" />;
}
