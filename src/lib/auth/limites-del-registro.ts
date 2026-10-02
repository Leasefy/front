/**
 * Los topes del registro por invitación (`/registro`), con las MISMAS frases
 * que el back (02-10-2026).
 *
 * 🔁 Espejo de `back/src/users/dto/limites-del-perfil.ts` (`MAX_LARGO_NOMBRE`,
 * `MENSAJES_DEL_PERFIL.nombreLargo` / `apellidoLargo`), que es lo que valida
 * `POST /users/me/onboarding`. Si cambia uno, cambia el otro: lo que el back
 * rechazaría se ataja antes de mandar nada.
 */

export const MAX_LARGO_NOMBRE = 100

export const MENSAJES_DEL_REGISTRO = {
  nombreLargo: 'El nombre puede tener hasta 100 caracteres.',
  apellidoLargo: 'El apellido puede tener hasta 100 caracteres.',
} as const
