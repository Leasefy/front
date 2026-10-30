/**
 * «Estoy cerrando mi propia sesión» (T-0183).
 *
 * `revocarSesion()` es lo que corren el cierre explícito (`signOut`,
 * `auth-context.tsx`) y el cierre por inactividad (`IdleSessionGuard`). Con el
 * transporte SSE el back puede entregar a esta misma pestaña el
 * `session.revoked` que ese cierre provoca; sin esta marca el
 * `SessionRevocationHandler` lo leería como «entraste en otro dispositivo» y
 * mostraría ese modal después del cierre propio.
 *
 * Bandera de módulo (fuera de React, como `session-terminal.ts`): la ponen
 * quienes cierran y la lee el handler, que la baja cuando vuelve a haber un
 * usuario con sesión.
 */

let enCurso = false

export function marcarCierrePropio(): void {
  enCurso = true
}

export function limpiarCierrePropio(): void {
  enCurso = false
}

export function cierrePropioEnCurso(): boolean {
  return enCurso
}
