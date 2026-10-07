/**
 * 🔴 LOGIN-BUCLE (Nico, 06-10-2026): «uno le da continuar, dice verificando
 * acceso y luego sale el login y luego vuelve a aparecer el de sigue con esta
 * cuenta».
 *
 * «Continuar como…» de `SesionYaAbierta` recarga el destino. Si algo falla allá
 * y la persona vuelve a /auth, la misma tarjeta le ofrecía «Continuar» otra vez:
 * un bucle que ella misma alimentaba sin saberlo. Esta marca recuerda, en ESTA
 * pestaña y por poco tiempo, que acaba de continuar. Si la tarjeta vuelve a
 * salir dentro de la ventana, no es un ingreso nuevo: es un rebote, y se le dice
 * con una frase clara y la salida «Entrar con otra cuenta».
 *
 * En `sessionStorage` a propósito (como el aviso de cierre de
 * session-terminal.ts): es de esta pestaña y de este momento. `ProtectedRoute`
 * la borra cuando deja entrar —el destino abrió bien—, así que un ingreso
 * normal nunca la deja viva para la próxima vez.
 */

const CLAVE = 'leasefy:auth:continuo'

/**
 * Lo que tarda un rebote de verdad: la recarga del destino, su «Verificando
 * acceso…», la vuelta a /auth y la sesión apareciendo otra vez. Con la máquina
 * cargada eso pasó de 20 s; dos minutos sobran, y la marca igual se borra en
 * cuanto un destino protegido deja entrar.
 */
export const VENTANA_DEL_REBOTE_MS = 120_000

interface Marca {
  destino: string
  en: number
}

/** «Continuar» va a navegar a `destino`: se anota, por si vuelve rebotada. */
export function anotarQueContinua(destino: string): void {
  if (typeof window === 'undefined') return
  try {
    const marca: Marca = { destino, en: Date.now() }
    window.sessionStorage.setItem(CLAVE, JSON.stringify(marca))
  } catch {
    // Modo privado o cuota llena: sin marca no hay detección, pero continuar
    // sigue funcionando igual que antes.
  }
}

/**
 * ¿La persona tocó «Continuar» hace menos de `VENTANA_DEL_REBOTE_MS` y está
 * otra vez acá? Sólo LEE: quien la muestra la borra con `olvidarQueContinuo`
 * en un efecto (leer en el render y borrar en el render rompería con el doble
 * render del modo estricto).
 */
export function volvioJustoDespuesDeContinuar(ahora: number = Date.now()): boolean {
  if (typeof window === 'undefined') return false
  try {
    const crudo = window.sessionStorage.getItem(CLAVE)
    if (!crudo) return false
    const marca = JSON.parse(crudo) as Partial<Marca>
    if (typeof marca.en !== 'number') return false
    const pasado = ahora - marca.en
    return pasado >= 0 && pasado <= VENTANA_DEL_REBOTE_MS
  } catch {
    return false
  }
}

/** Borra la marca: el destino abrió bien, o el rebote ya se le dijo a la persona. */
export function olvidarQueContinuo(): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.removeItem(CLAVE)
  } catch {
    // Nada que hacer.
  }
}
