/**
 * ¿Quién puede abrir la pantalla a la que lleva un enlace de «lo que le falta a
 * la operación»? PURA (PILOTO-ACTIVO, 04-10-2026).
 *
 * Los requisitos del Piloto (CR-31 y compañía) traen su enlace: los días de
 * plazo (Configuración → Perfil), la cuenta del banco (Configuración → Medios
 * de pago), la resolución de la DIAN (Facturación) y el extracto
 * (Conciliación). En vivo, la asesora y el contador apretaban «Fijar los días
 * de plazo» y caían en «No tienes acceso a esto». A quien no la puede abrir
 * se le dice quién lo hace, sin la puerta cerrada (la misma regla de
 * `lib/nav/se-ve-el-enlace.ts`).
 *
 * Los roles son los de cada pantalla: el `gate` de su sección en
 * `configuracion/secciones.ts` (la prueba lo compara) y el `PageGuard` de
 * Facturación y de Conciliación (administrador y contador). Una ruta que no
 * está aquí es de todos.
 */
const PANTALLAS: ReadonlyArray<{ ruta: string; roles: readonly string[] }> = [
  { ruta: '/panel/inmobiliaria/configuracion/perfil', roles: ['ADMIN'] },
  { ruta: '/panel/inmobiliaria/configuracion/medios-de-pago', roles: ['ADMIN'] },
  { ruta: '/panel/inmobiliaria/facturacion', roles: ['ADMIN', 'CONTADOR'] },
  { ruta: '/panel/inmobiliaria/conciliacion', roles: ['ADMIN', 'CONTADOR'] },
]

export function rolesDelEnlace(href: string): readonly string[] | undefined {
  const ruta = href.split(/[?#]/)[0] ?? href
  return PANTALLAS.find((p) => ruta === p.ruta || ruta.startsWith(`${p.ruta}/`))?.roles
}

export function quienLoHace(roles: readonly string[]): string {
  return roles.includes('CONTADOR')
    ? 'Lo hace un administrador o el contador de tu inmobiliaria.'
    : 'Lo hace un administrador de tu inmobiliaria.'
}
