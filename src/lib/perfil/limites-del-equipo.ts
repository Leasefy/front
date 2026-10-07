/**
 * El equipo del propietario (`POST/PATCH /users/me/team`), validado con las
 * MISMAS reglas y frases que el back (02-10-2026).
 *
 * 🔁 Espejo de `back/src/users/dto/create-team-member.dto.ts` y
 * `update-team-member.dto.ts`:
 *  · `email`: `team_members.email` es `VarChar(255)`; uno más largo daba 500
 *    (P2000). Frase: `MENSAJES_DEL_PERFIL.correoLargo` del back.
 *  · `name`: `@MaxLength(100)`; la frase es la que arma el sobre de error.
 */

export const MAX_LARGO_CORREO_DEL_EQUIPO = 255
export const MAX_LARGO_NOMBRE_DEL_EQUIPO = 100

export const MENSAJES_DEL_EQUIPO = {
  correoInvalido: 'Revisa el correo: debe tener la forma nombre@dominio.com.',
  correoLargo: 'El correo puede tener hasta 255 caracteres.',
  nombreLargo: 'El nombre no puede tener más de 100 caracteres.',
} as const

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** El error del correo de una invitación, o `undefined` si está bien. */
export function errorDelCorreoDelEquipo(correo: string): string | undefined {
  const c = correo.trim()
  if (!c || !CORREO.test(c)) return MENSAJES_DEL_EQUIPO.correoInvalido
  if (c.length > MAX_LARGO_CORREO_DEL_EQUIPO) return MENSAJES_DEL_EQUIPO.correoLargo
  return undefined
}

/** El error del nombre de un miembro, o `undefined` si está bien. */
export function errorDelNombreDelEquipo(nombre: string): string | undefined {
  return nombre.length > MAX_LARGO_NOMBRE_DEL_EQUIPO ? MENSAJES_DEL_EQUIPO.nombreLargo : undefined
}
