import { redirect } from 'next/navigation';

/**
 * /panel/inmobiliaria/inmuebles/captura — APAGADA, redirige al portafolio (W6).
 *
 * La captura con IA venía de «Inmuebles · catálogo». Nico la apagó el
 * 2026-09-02 («eso no sirve ahora»): el botón quedó comentado en
 * `inmuebles/page.tsx`, así que esta ruta quedó viva SIN NINGÚN enlace que
 * llegue a ella. Una pantalla a la que sólo se entra tecleando la URL es una
 * pantalla que nadie mantiene y que, el día que alguien la encuentra (un
 * marcador viejo, un enlace pegado en un chat), ofrece una función que el
 * producto ya no sostiene.
 *
 * Se reenvía al portafolio en vez de borrarla, con el mismo patrón permanente
 * de `avaluos/page.tsx`: así un marcador viejo no da 404. El componente
 * `PropertyIACapture` queda intacto — cuando la captura esté a la altura, se
 * vuelve a montar acá y se descomenta el botón.
 */
export default function CapturaApagadaRedirectPage() {
  redirect('/panel/inmobiliaria/inmuebles');
}
