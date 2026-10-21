/**
 * «Cambiar de cuenta» (Nico, 21-10-2026): «un usuario puede ser inquilino de
 * la inmobiliaria y también trabajar en ella y puede tener el mismo correo…
 * que tenga switch para pasar de una a otra… y eso se puede dar para
 * múltiples más casos». Una persona, un correo, varios papeles: inquilino,
 * propietario y una o más inmobiliarias (cada una con su cargo).
 *
 * Los papeles los dice el BACK, de los datos (`cuentas` del arranque de
 * sesión, o `GET /users/me/cuentas`), nunca el rol con que se registró.
 *
 * 🔴 La cuenta de cada petición sale de la PANTALLA: en el portal del
 * inquilino se pide como inquilino, en el panel del propietario como
 * propietario y en el de la inmobiliaria como esa inmobiliaria. Así una
 * pantalla nunca puede traer los datos de otra cuenta (antes, quien era
 * inquilina y trabajaba en la inmobiliaria veía en su portal la cartera de la
 * inmobiliaria). Fuera de los portales no se manda nada: todo como antes.
 *
 * «La última que usó» (Nico: «Al entrar = al último que usó») se guarda en
 * este navegador, por persona, y decide a dónde entra después del login y
 * qué inmobiliaria abre cuando trabaja en varias.
 */

export type TipoDeCuenta = 'inquilino' | 'propietario' | 'inmobiliaria'

/** Una inmobiliaria en la que la persona trabaja (membresía activa). */
export interface InmobiliariaDeLaPersona {
  id: string
  nombre: string | null
  /** El cargo adentro (`ADMIN`, `AGENTE`, `CONTADOR`…). */
  rol: string
  nombreEnLaInmobiliaria: string | null
}

/** Lo que manda el back (`BootstrapResponse.cuentas`, `GET /users/me/cuentas`). */
export interface CuentasDeLaPersona {
  /** `TENANT | LANDLORD | AGENT | ADMIN`, el rol con que se registró. */
  rolDeRegistro: string
  inquilino: boolean
  propietario: boolean
  /** De la más vieja a la más nueva. */
  inmobiliarias: InmobiliariaDeLaPersona[]
}

export type CuentaElegida =
  | { tipo: 'inquilino' }
  | { tipo: 'propietario' }
  /** `inmobiliariaId: null` = la cuenta de inmobiliaria que todavía crea la suya. */
  | { tipo: 'inmobiliaria'; inmobiliariaId: string | null }

/** Una fila de «Cambiar de cuenta». */
export interface OpcionDeCuenta {
  clave: string
  cuenta: CuentaElegida
  tipo: TipoDeCuenta
  /** El nombre de la inmobiliaria, «Inquilino» o «Propietario». */
  titulo: string
  /** El cargo en la inmobiliaria, o qué hay en esa cuenta. */
  detalle: string
}

/** El cargo en la inmobiliaria, como lo lee una persona. */
export const NOMBRE_DEL_CARGO: Record<string, string> = {
  ADMIN: 'Administrador',
  AGENTE: 'Asesor comercial',
  CONTADOR: 'Contador',
  VIEWER: 'Sólo lectura',
  COORDINADOR: 'Coordinador',
  AUXILIAR_CARTERA: 'Auxiliar de cartera',
  ABOGADO_EXTERNO: 'Abogado externo',
  AUXILIAR_COMERCIAL: 'Auxiliar comercial',
  AUXILIAR_ADMINISTRATIVO: 'Auxiliar administrativo',
  AUXILIAR_CONTABLE: 'Auxiliar contable',
  AUXILIAR_MANTENIMIENTO: 'Auxiliar de mantenimiento',
}

const NOMBRE_DEL_CARGO_EN: Record<string, string> = {
  ADMIN: 'Administrator',
  AGENTE: 'Sales agent',
  CONTADOR: 'Accountant',
  VIEWER: 'Read only',
  COORDINADOR: 'Coordinator',
  AUXILIAR_CARTERA: 'Collections assistant',
  ABOGADO_EXTERNO: 'External lawyer',
  AUXILIAR_COMERCIAL: 'Sales assistant',
  AUXILIAR_ADMINISTRATIVO: 'Administrative assistant',
  AUXILIAR_CONTABLE: 'Accounting assistant',
  AUXILIAR_MANTENIMIENTO: 'Maintenance assistant',
}

/** Lee lo que vino del back; cualquier cosa rara es «no se sabe» (`null`). */
export function leerCuentasDeLaPersona(crudo: unknown): CuentasDeLaPersona | null {
  if (!crudo || typeof crudo !== 'object') return null
  const c = crudo as Record<string, unknown>
  if (typeof c.inquilino !== 'boolean' || typeof c.propietario !== 'boolean') return null
  const inmobiliarias = Array.isArray(c.inmobiliarias)
    ? c.inmobiliarias
        .filter((i): i is Record<string, unknown> => !!i && typeof i === 'object' && typeof (i as { id?: unknown }).id === 'string')
        .map((i) => ({
          id: i.id as string,
          nombre: typeof i.nombre === 'string' && i.nombre.trim() ? i.nombre.trim() : null,
          rol: typeof i.rol === 'string' ? i.rol : '',
          nombreEnLaInmobiliaria:
            typeof i.nombreEnLaInmobiliaria === 'string' && i.nombreEnLaInmobiliaria.trim()
              ? i.nombreEnLaInmobiliaria.trim()
              : null,
        }))
    : []
  return {
    rolDeRegistro: typeof c.rolDeRegistro === 'string' ? c.rolDeRegistro : '',
    inquilino: c.inquilino,
    propietario: c.propietario,
    inmobiliarias,
  }
}

export function claveDeLaCuenta(cuenta: CuentaElegida): string {
  return cuenta.tipo === 'inmobiliaria' ? `inmobiliaria:${cuenta.inmobiliariaId ?? ''}` : cuenta.tipo
}

/**
 * Todas sus cuentas, en el orden del menú: las inmobiliarias primero (la más
 * vieja arriba), después inquilino y propietario.
 */
export function opcionesDeCuenta(
  cuentas: CuentasDeLaPersona | null | undefined,
  locale: string = 'es',
): OpcionDeCuenta[] {
  if (!cuentas) return []
  const es = locale !== 'en'
  const opciones: OpcionDeCuenta[] = []
  for (const i of cuentas.inmobiliarias) {
    const cargo = (es ? NOMBRE_DEL_CARGO : NOMBRE_DEL_CARGO_EN)[i.rol]
    const cuenta: CuentaElegida = { tipo: 'inmobiliaria', inmobiliariaId: i.id }
    opciones.push({
      clave: claveDeLaCuenta(cuenta),
      cuenta,
      tipo: 'inmobiliaria',
      titulo: i.nombre ?? (es ? 'Inmobiliaria' : 'Agency'),
      detalle: cargo ? `${es ? 'Inmobiliaria' : 'Agency'} · ${cargo}` : es ? 'Inmobiliaria' : 'Agency',
    })
  }
  // La cuenta de inmobiliaria que todavía no tiene membresía (está creando la suya).
  if (cuentas.inmobiliarias.length === 0 && cuentas.rolDeRegistro === 'AGENT') {
    const cuenta: CuentaElegida = { tipo: 'inmobiliaria', inmobiliariaId: null }
    opciones.push({
      clave: claveDeLaCuenta(cuenta),
      cuenta,
      tipo: 'inmobiliaria',
      titulo: es ? 'Mi inmobiliaria' : 'My agency',
      detalle: es ? 'Inmobiliaria' : 'Agency',
    })
  }
  if (cuentas.inquilino) {
    opciones.push({
      clave: 'inquilino',
      cuenta: { tipo: 'inquilino' },
      tipo: 'inquilino',
      titulo: es ? 'Inquilino' : 'Tenant',
      detalle: es ? 'Tu arriendo, pagos y contratos' : 'Your rental, payments and contracts',
    })
  }
  if (cuentas.propietario) {
    opciones.push({
      clave: 'propietario',
      cuenta: { tipo: 'propietario' },
      tipo: 'propietario',
      titulo: es ? 'Propietario' : 'Owner',
      detalle: es ? 'Tus inmuebles, giros y certificados' : 'Your properties, payouts and certificates',
    })
  }
  return opciones
}

/** Con una sola cuenta no hay nada que cambiar (ni cabeceras que mandar). */
export function tieneVariasCuentas(cuentas: CuentasDeLaPersona | null | undefined): boolean {
  return opcionesDeCuenta(cuentas).length > 1
}

function laTiene(cuentas: CuentasDeLaPersona, cuenta: CuentaElegida): boolean {
  return opcionesDeCuenta(cuentas).some((o) => o.clave === claveDeLaCuenta(cuenta))
}

/** El portal de una ruta, o `null` si la ruta no es de ningún portal. */
export function portalDeLaRuta(pathname: string | null | undefined): TipoDeCuenta | null {
  const p = pathname ?? ''
  if (p === '/inquilino' || p.startsWith('/inquilino/')) return 'inquilino'
  if (p === '/panel/inmobiliaria' || p.startsWith('/panel/inmobiliaria/')) return 'inmobiliaria'
  if (p === '/panel' || p.startsWith('/panel/')) return 'propietario'
  return null
}

/** ¿La persona tiene el papel del portal de esta ruta? (`null` = no se sabe). */
export function tieneElPapelDeLaRuta(
  pathname: string | null | undefined,
  cuentas: CuentasDeLaPersona | null | undefined,
): boolean {
  if (!cuentas) return false
  const portal = portalDeLaRuta(pathname)
  if (portal === 'inquilino') return cuentas.inquilino
  if (portal === 'propietario') return cuentas.propietario
  if (portal === 'inmobiliaria') return cuentas.inmobiliarias.length > 0 || cuentas.rolDeRegistro === 'AGENT'
  return false
}

/** La inmobiliaria que abre el panel: la última que usó, si sigue siendo suya; si no, la más vieja. */
export function inmobiliariaQueAbre(
  cuentas: CuentasDeLaPersona,
  guardada: GuardadoDeLaCuenta | null,
): string | null {
  const ids = cuentas.inmobiliarias.map((i) => i.id)
  if (guardada?.inmobiliariaId && ids.includes(guardada.inmobiliariaId)) return guardada.inmobiliariaId
  return ids[0] ?? null
}

/**
 * La cuenta con la que se está en esta pantalla. En un portal, la del portal
 * (si la persona tiene ese papel); fuera, la última que usó.
 */
export function cuentaEnPantalla(
  pathname: string | null | undefined,
  cuentas: CuentasDeLaPersona | null | undefined,
  guardada: GuardadoDeLaCuenta | null,
): CuentaElegida | null {
  if (!cuentas) return null
  const portal = portalDeLaRuta(pathname)
  if (portal && tieneElPapelDeLaRuta(pathname, cuentas)) {
    return portal === 'inmobiliaria'
      ? { tipo: 'inmobiliaria', inmobiliariaId: inmobiliariaQueAbre(cuentas, guardada) }
      : { tipo: portal }
  }
  return ultimaCuentaValida(cuentas, guardada)
}

/** La última cuenta que usó, si todavía la tiene. */
export function ultimaCuentaValida(
  cuentas: CuentasDeLaPersona | null | undefined,
  guardada: GuardadoDeLaCuenta | null,
): CuentaElegida | null {
  if (!cuentas || !guardada) return null
  const cuenta: CuentaElegida =
    guardada.tipo === 'inmobiliaria'
      ? { tipo: 'inmobiliaria', inmobiliariaId: inmobiliariaQueAbre(cuentas, guardada) }
      : { tipo: guardada.tipo }
  return laTiene(cuentas, cuenta) ? cuenta : null
}

/** El inicio de cada cuenta. */
export function inicioDeLaCuenta(cuenta: CuentaElegida): string {
  if (cuenta.tipo === 'inquilino') return '/inquilino'
  if (cuenta.tipo === 'propietario') return '/panel'
  return '/panel/inmobiliaria'
}

/**
 * Las cabeceras de una petición hecha desde `pathname`. Vacío para quien
 * tiene una sola cuenta, para lo que no se sabe y fuera de los portales:
 * exactamente lo de antes.
 *
 * `x-inmobiliaria` viaja en TODAS las rutas para quien trabaja en varias: el
 * arranque de sesión (que puede pedirse desde cualquier pantalla) tiene que
 * traer la misma inmobiliaria que después mostrará el panel.
 */
export function cabecerasParaLaRuta(
  pathname: string | null | undefined,
  cuentas: CuentasDeLaPersona | null | undefined,
  guardada: GuardadoDeLaCuenta | null,
): Record<string, string> {
  if (!cuentas || !tieneVariasCuentas(cuentas)) return {}
  const cabeceras: Record<string, string> = {}
  const inmobiliaria = inmobiliariaQueAbre(cuentas, guardada)
  if (cuentas.inmobiliarias.length > 1 && inmobiliaria) cabeceras['x-inmobiliaria'] = inmobiliaria
  const portal = portalDeLaRuta(pathname)
  if (portal && tieneElPapelDeLaRuta(pathname, cuentas)) cabeceras['x-cuenta'] = portal
  return cabeceras
}

// ── Lo que se guarda en este navegador ─────────────────────────────────────

const CLAVE_GUARDADA = 'leasefy:cuenta-activa'

export interface GuardadoDeLaCuenta {
  tipo: TipoDeCuenta
  /** La última inmobiliaria que abrió (aunque ahora esté en otra cuenta). */
  inmobiliariaId?: string | null
}

interface Guardado extends GuardadoDeLaCuenta {
  userId: string
}

/** La última cuenta que usó ESTA persona en este navegador (`null` si es de otra o no hay). */
export function leerCuentaGuardada(userId: string | null | undefined): GuardadoDeLaCuenta | null {
  if (typeof window === 'undefined' || !userId) return null
  try {
    const crudo = window.localStorage.getItem(CLAVE_GUARDADA)
    if (!crudo) return null
    const g = JSON.parse(crudo) as Partial<Guardado>
    if (!g || g.userId !== userId) return null
    if (g.tipo !== 'inquilino' && g.tipo !== 'propietario' && g.tipo !== 'inmobiliaria') return null
    return {
      tipo: g.tipo,
      inmobiliariaId: typeof g.inmobiliariaId === 'string' ? g.inmobiliariaId : null,
    }
  } catch {
    return null
  }
}

/**
 * Guarda la cuenta que usa ahora. La inmobiliaria se conserva al pasar a la
 * cuenta de inquilino: al volver al panel abre la misma.
 */
export function guardarCuenta(userId: string, cuenta: CuentaElegida): void {
  if (typeof window === 'undefined') return
  try {
    const antes = leerCuentaGuardada(userId)
    const g: Guardado = {
      userId,
      tipo: cuenta.tipo,
      inmobiliariaId: cuenta.tipo === 'inmobiliaria' ? cuenta.inmobiliariaId : antes?.inmobiliariaId ?? null,
    }
    const nuevo = JSON.stringify(g)
    if (window.localStorage.getItem(CLAVE_GUARDADA) === nuevo) return
    window.localStorage.setItem(CLAVE_GUARDADA, nuevo)
  } catch {
    // Sin almacenamiento (modo privado): se entra como siempre.
  }
}

export function olvidarCuentaGuardada(): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(CLAVE_GUARDADA)
  } catch {
    // ignore
  }
}

// ── Para el cliente HTTP (fuera de React) ──────────────────────────────────

let _sesion: { userId: string; cuentas: CuentasDeLaPersona } | null = null

/** La sesión fija sus cuentas al llegar el arranque; `null` al salir. */
export function fijarCuentasDeLaSesion(userId: string | null, cuentas: CuentasDeLaPersona | null): void {
  _sesion = userId && cuentas ? { userId, cuentas } : null
}

/** Las cabeceras de la petición que sale AHORA (la ruta del navegador en este instante). */
export function cabecerasDeLaCuenta(): Record<string, string> {
  if (!_sesion || typeof window === 'undefined') return {}
  return cabecerasParaLaRuta(window.location.pathname, _sesion.cuentas, leerCuentaGuardada(_sesion.userId))
}

/** Para la clave de los GET compartidos: dos cuentas nunca comparten respuesta. */
export function claveDeLasCabeceras(): string {
  const c = cabecerasDeLaCuenta()
  return c['x-cuenta'] || c['x-inmobiliaria'] ? `${c['x-cuenta'] ?? ''}|${c['x-inmobiliaria'] ?? ''}` : ''
}
