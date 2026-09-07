import { inmobiliariaConfigApi } from '@/lib/api/inmobiliaria.service'
import type { AgencyRole, UserInvite } from '@/lib/types/inmobiliaria'
import { buildMemberInviteLink } from './invite-link'
import type { MemberRole, MembersStepFormValues } from './members-step-schema'

/**
 * Las invitaciones del paso «Miembros», creadas DE VERDAD.
 *
 * Hasta el 2026-09-05 este paso mostraba enlaces `/onboarding/invitacion/…`
 * que daban 404 (ver `invite-link.ts`). Ahora llama al mismo endpoint que usa
 * el panel en Configuración → Equipo —`POST /inmobiliaria/agency/members`—,
 * que crea la fila en `agency_invitations`, **manda el correo** y devuelve el
 * token con el que se arma `/invitacion/<token>`.
 *
 * ── Por qué se puede llamar al back acá ───────────────────────────────────
 *
 * El asistente vive en el micro, pero la agencia YA existe en el back desde el
 * paso previo del alta (`POST /users/me/onboarding` crea la `Agency` y la
 * membresía ADMIN ACTIVE del fundador). O sea que quien está en este paso ya
 * es administrador de una agencia real y tiene permiso para invitar.
 *
 * ── Una persona a la vez, y un fallo no arrastra a los demás ──────────────
 *
 * El endpoint invita de a uno. Se invita en SERIE (no `Promise.all`) porque
 * el back valida el tope de usuarios del plan y en paralelo dos filas pueden
 * pasar el mismo control; y cada resultado se guarda por separado: si a una
 * persona el back la rechaza («ya es miembro activo», «tope del plan»), las
 * otras invitaciones siguen valiendo y la pantalla dice qué pasó con cada una
 * en vez de tirar todo el paso abajo.
 */

/** El rol del asistente (UPPER) al que espera `UserInvite` (lower). */
const ROL_PARA_EL_BACK: Record<MemberRole, AgencyRole> = {
  ADMIN: 'admin',
  AGENTE: 'agente',
  CONTADOR: 'contador',
  VIEWER: 'viewer',
}

export interface InvitacionCreada {
  email: string
  role: MemberRole
  /** El nombre que escribió quien invita. Vacío es válido: el back guarda `null`. */
  nombre: string
  /** `null` cuando el back rechazó a esta persona. */
  enlace: string | null
  /** `true` sólo cuando el servidor confirmó que el correo salió. */
  correoEnviado: boolean
  /** Por qué no salió, cuando el back lo dice. */
  estadoDelCorreo?: 'sent' | 'not_configured' | 'failed'
  /** El motivo del rechazo, en las palabras del back. */
  error: string | null
}

function mensajeDeError(e: unknown): string {
  if (e instanceof Error && e.message.trim()) return e.message
  return 'No pudimos crear esta invitación. Puedes invitar a esta persona más tarde desde el panel.'
}

export async function crearInvitacionesDelEquipo(
  miembros: MembersStepFormValues['members'],
  invitar: (invite: UserInvite) => Promise<{
    emailDelivered: boolean
    emailStatus?: 'sent' | 'not_configured' | 'failed'
    invitationToken?: string
  }> = inmobiliariaConfigApi.inviteUser,
): Promise<InvitacionCreada[]> {
  const creadas: InvitacionCreada[] = []

  for (const miembro of miembros) {
    const email = miembro.email.trim()
    const nombre = (miembro.nombre ?? '').trim()
    try {
      const resultado = await invitar({
        email,
        // El DTO del back exige `name`. Vacío es una respuesta honesta —el
        // back guarda `null` y el equipo muestra el correo hasta que la
        // persona se registre—; inventarle un nombre a partir del correo no.
        name: nombre,
        role: ROL_PARA_EL_BACK[miembro.role],
      })
      creadas.push({
        email,
        role: miembro.role,
        nombre,
        enlace: resultado.invitationToken
          ? buildMemberInviteLink(resultado.invitationToken)
          : null,
        correoEnviado: resultado.emailDelivered === true,
        estadoDelCorreo: resultado.emailStatus,
        error: null,
      })
    } catch (e) {
      creadas.push({
        email,
        role: miembro.role,
        nombre,
        enlace: null,
        correoEnviado: false,
        error: mensajeDeError(e),
      })
    }
  }

  return creadas
}
