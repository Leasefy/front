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
  redirect('/panel/inmobiliaria/configuracion');
}
