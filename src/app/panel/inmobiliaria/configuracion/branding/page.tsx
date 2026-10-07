import { redirect } from 'next/navigation';

/**
 * `/panel/inmobiliaria/configuracion/branding` — Branding quedó oculto
 * (Nico, 2026-09-04: «ocultemos esa sección de branding por favor»).
 *
 * La ruta NO se borra: hay enlaces guardados y `SeccionBranding` sigue
 * existiendo. Sin este archivo, el segmento dinámico `[seccion]` no
 * encontraría el slug en la lista y respondería un 404 a quien tuviera el
 * enlace. Se manda a Configuración, que es donde está todo lo demás.
 */
export default function BrandingOcultoPage() {
  // CF-01 (QA 04-10): los datos con los que se presenta la inmobiliaria viven
  // en Configuración → Perfil; se llega ahí, no a la raíz sin decir nada.
  redirect('/panel/inmobiliaria/configuracion/perfil');
}
