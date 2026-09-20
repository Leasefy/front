/**
 * Una contraseña en la URL no se usa: se borra.
 *
 * 🔴 El origen (prueba en vivo, 2026-09-16): tocar «Iniciar sesión» antes de
 * que React hidratara enviaba el `<form>` como GET nativo, y la pantalla
 * quedaba en `/auth?email=…&password=…`. Los formularios ya no pueden hacer
 * eso (`method="post"` y el botón apagado hasta hidratar, ver
 * `use-hidratado.ts`), pero las URL que ya se generaron siguen vivas: en el
 * historial, en la pestaña que el navegador restaura, en un marcador. Al
 * abrir una de ésas, la contraseña se saca de la barra en el acto y nunca se
 * lee: ni se precarga en el campo ni se intenta entrar con ella. Una URL no es
 * un canal para una credencial, ni siquiera la propia.
 *
 * Junto con el secreto se van los campos que el mismo envío nativo pegó a su
 * lado (correo, nombre, teléfono): son datos personales que sólo están ahí
 * porque viajaron con la contraseña. Lo demás de la URL —`returnUrl`,
 * `invitationToken`, `mode`— no se toca: sin la contraseña no hay nada de qué
 * protegerse y es lo que la pantalla necesita para saber a qué vino la persona.
 */

/** Un parámetro que huele a contraseña, se llame como se llame el campo. */
const PARECE_SECRETO = /password|contrase(n|ñ)a/i;

/** Lo que un formulario de acceso manda al lado de la contraseña. */
const VIAJAN_CON_EL_SECRETO = ['email', 'correo', 'firstName', 'lastName', 'phone'] as const;

/**
 * La misma dirección sin credenciales, como ruta relativa (`/auth?x=1#y`), o
 * `null` si no traía ninguna y no hay nada que cambiar.
 *
 * Pura: no toca `window`. La usa `limpiarCredencialesDeLaUrl`.
 */
export function urlSinCredenciales(href: string): string | null {
  let url: URL;
  try {
    url = new URL(href, 'http://localhost');
  } catch {
    return null;
  }

  const secretos = Array.from(url.searchParams.keys()).filter((clave) => PARECE_SECRETO.test(clave));
  if (secretos.length === 0) return null;

  for (const clave of new Set([...secretos, ...VIAJAN_CON_EL_SECRETO])) {
    url.searchParams.delete(clave);
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

/**
 * Si la barra trae una contraseña, la reemplaza —sin navegar ni dejar una
 * entrada nueva en el historial— por la misma dirección sin ella. Devuelve si
 * cambió algo.
 *
 * `history.replaceState` y no el router, por lo mismo que el aviso de cierre de
 * `AuthForm`: `router.replace` remonta el formulario y borra lo que la persona
 * esté escribiendo. Next 14.2 sincroniza `useSearchParams` con `replaceState`.
 */
export function limpiarCredencialesDeLaUrl(): boolean {
  if (typeof window === 'undefined') return false;
  const limpia = urlSinCredenciales(window.location.href);
  if (limpia === null) return false;
  window.history.replaceState(window.history.state, '', limpia);
  return true;
}
