/**
 * El enlace que se le pasa a alguien para que entre a la inmobiliaria.
 *
 * 🔴 QUÉ ESTABA ROTO (auditoría del 2026-09-05, alta real de una agencia).
 *
 * Esta función armaba `/onboarding/invitacion/<rawToken>`, una ruta que NO
 * EXISTE — `curl` al enlace generado daba 404 — y el propio archivo lo
 * declaraba «PLACEHOLDER» desde el 2026-07-14. Encima, la pantalla decía
 * «Guardá estos links ahora, no se vuelven a mostrar», así que quien invitaba
 * a su equipo durante el registro repartía enlaces muertos y no podía
 * regenerarlos. Ninguna invitación hecha en el alta se podía aceptar.
 *
 * Eran dos sistemas que nunca se conectaron: los `rawToken` nacían en el
 * MICRO (`onboarding_sessions.draft.members`, hasheados) y el único aceptador
 * que existe —`/invitacion/[token]`— resuelve contra `agency_invitations` del
 * BACK.
 *
 * QUÉ SE HIZO: el paso «Miembros» ahora crea invitaciones DE VERDAD con
 * `POST /inmobiliaria/agency/members` (el mismo endpoint que usa el panel en
 * Configuración → Equipo), que además manda el correo. Puede hacerlo porque
 * la agencia y la membresía ADMIN del fundador ya existen en el back desde el
 * paso previo (`POST /users/me/onboarding` → `AgencyService.createAgency`),
 * mucho antes de este paso del asistente.
 *
 * Este helper arma el enlace con el token que devuelve ESE endpoint
 * (`AgencyInviteResult.invitationToken`) — el mismo enlace que manda el correo
 * y el mismo que copia el panel (`SeccionEquipo.copiarEnlace`).
 */
export function buildMemberInviteLink(invitationToken: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  return `${origin}/invitacion/${invitationToken}`
}
