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
  /** Por qué no salió, cuando el back lo dice (`suppressed`: entorno de pruebas). */
  estadoDelCorreo?: 'sent' | 'suppressed' | 'not_configured' | 'failed'
  /** El motivo del rechazo, en las palabras del back. */
  error: string | null
  /**
   * `false` cuando volver a intentarlo AHORA no sirve: falta el segundo
   * factor de quien invita (ver `faltaElSegundoFactor`). Ausente = sí sirve.
   */
  reintentable?: boolean
}

/**
 * 🔴 02-10-2026 (Alexis): «siempre falla la primera vez al ingresar un
 * invitado». El fundador llega al asistente SIN segundo factor —el registro
 * no lo pide (`enElRegistro` en `ProtectedRoute`, Nico 30-09)— y el back se lo
 * exige al administrador para invitar (`AgencyMemberGuard`, 403
 * `SEGUNDO_FACTOR_REQUERIDO`). Reintentar en el asistente no lo arregla:
 * se dice qué falta y dónde se hace.
 *
 * Desde el 02-10 (Nico) el back deja al fundador invitar y listar sin segundo
 * factor mientras dura el registro (`invitar-desde-el-registro.ts` del back).
 * Este aviso queda de RESPALDO: un back anterior, o quien no es el fundador o
 * ya salió de esa ventana.
 */
export const MOTIVO_SIN_SEGUNDO_FACTOR =
  'Para invitar a tu equipo, Leasefy te pide el segundo factor y todavía no lo tienes activo. Cuando lo actives (Configuración → Seguridad), invita a esta persona desde Configuración → Equipo.'

function faltaElSegundoFactor(e: unknown): boolean {
  return (
    typeof e === 'object' &&
    e !== null &&
    (e as { code?: unknown }).code === 'SEGUNDO_FACTOR_REQUERIDO'
  )
}

function mensajeDeError(e: unknown): string {
  if (faltaElSegundoFactor(e)) return MOTIVO_SIN_SEGUNDO_FACTOR
  if (e instanceof Error && e.message.trim()) return e.message
  return 'No pudimos crear esta invitación. Puedes invitar a esta persona más tarde desde el panel.'
}

export async function crearInvitacionesDelEquipo(
  miembros: MembersStepFormValues['members'],
  invitar: (invite: UserInvite) => Promise<{
    emailDelivered: boolean
    emailStatus?: 'sent' | 'suppressed' | 'not_configured' | 'failed'
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
        ...(faltaElSegundoFactor(e) && { reintentable: false }),
      })
    }
  }

  return creadas
}

/**
 * Los correos que YA tienen invitación en el back (vigente o aceptada), en
 * minúsculas. `null` si no se pudo preguntar — y entonces NO hay respaldo que
 * valga: el borrador del micro no sabe quién quedó invitado (ver abajo).
 *
 * 🔴 01-10-2026 (Alexis): «quién ya está invitado» se sacaba del borrador del
 * micro, y el borrador NO dice eso — dice a quién se escribió en el paso. El
 * micro guarda el paso ANTES de que el back invite, así que una invitación que
 * el back rechazó quedaba en el borrador igual. Al volver a Miembros y guardar,
 * esa persona se daba por invitada, no se le pedía nada al back y la pantalla
 * decía que todo había salido bien: no llegó ningún correo. Quién está invitado
 * lo sabe el back, y sólo él.
 */
export async function correosConInvitacion(
  listar: () => Promise<Array<{ email: string; status: string }>> = inmobiliariaConfigApi.getUsers,
): Promise<Set<string> | null> {
  try {
    const miembros = await listar()
    return new Set(
      miembros
        .filter((m) => m.status === 'active' || m.status === 'invited')
        .map((m) => m.email.trim().toLowerCase())
        .filter(Boolean),
    )
  } catch {
    return null
  }
}
