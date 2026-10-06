import { redirect } from 'next/navigation';

/**
 * `/panel/inmobiliaria/configuracion/agentes` — la vitrina de agentes IA
 * quedó oculta (Nico, 2026-09-03: «la sección de Agentes IA ocultala por
 * favor»).
 *
 * La ruta NO se borra: hay enlaces guardados y una redirección vieja —el hub
 * `/ai` del panel, en `rutas-por-ciclo-de-vida.data.mjs`, apunta acá— que si no
 * caerían en un 404. Se manda a Configuración, que es donde está todo lo demás.
 */
export default function AgentesIaOcultoPage() {
  // CF-01 (QA 04-10): a la raíz no decía nada; la automatización con IA vive
  // en Configuración → Automatización IA, así que se llega ahí.
  redirect('/panel/inmobiliaria/configuracion/ia');
}
