import { describe, it, expect, vi } from 'vitest'

import { crearInvitacionesDelEquipo } from './crear-invitaciones'
import { buildMemberInviteLink } from './invite-link'

/**
 * 🔴 EL DEFECTO QUE CIERRA (auditoría 2026-09-05): el paso «Miembros» del alta
 * mostraba enlaces `/onboarding/invitacion/<rawToken>` — una ruta que no
 * existe (404) — y decía «guardá estos links ahora, no se vuelven a mostrar».
 * Ninguna invitación hecha en el registro se podía aceptar.
 *
 * Ahora se crean con el endpoint real del back, el mismo del panel.
 */
describe('buildMemberInviteLink', () => {
  it('apunta a /invitacion/<token>, la ÚNICA ruta que acepta invitaciones', () => {
    expect(buildMemberInviteLink('tok-1')).toContain('/invitacion/tok-1')
  })

  it('NO arma la ruta placeholder que daba 404', () => {
    expect(buildMemberInviteLink('tok-1')).not.toContain('/onboarding/invitacion')
  })
})

describe('crearInvitacionesDelEquipo', () => {
  const miembros = [
    { email: '  ana@inmo.co ', nombre: '  Ana Restrepo ', role: 'ADMIN' as const },
    { email: 'luis@inmo.co', nombre: '', role: 'CONTADOR' as const },
  ]

  it('invita una por una con el rol en la forma que espera el back y arma el enlace real', async () => {
    const invitar = vi.fn().mockResolvedValue({
      emailDelivered: true,
      emailStatus: 'sent',
      invitationToken: 'tok-x',
    })

    const r = await crearInvitacionesDelEquipo(miembros, invitar)

    expect(invitar).toHaveBeenCalledTimes(2)
    expect(invitar).toHaveBeenNthCalledWith(1, {
      email: 'ana@inmo.co',
      name: 'Ana Restrepo',
      role: 'admin',
    })
    // Sin nombre se manda vacío: el back guarda `null` y el equipo muestra el
    // correo. NUNCA se deriva un nombre del correo.
    expect(invitar).toHaveBeenNthCalledWith(2, {
      email: 'luis@inmo.co',
      name: '',
      role: 'contador',
    })
    expect(r[0].enlace).toContain('/invitacion/tok-x')
    expect(r[0].correoEnviado).toBe(true)
  })

  it('un rechazo del back no arrastra a los demás: se guarda el motivo y las otras siguen', async () => {
    const invitar = vi
      .fn()
      .mockRejectedValueOnce(new Error('El usuario ya es miembro activo de esta inmobiliaria.'))
      .mockResolvedValueOnce({ emailDelivered: true, invitationToken: 'tok-2' })

    const r = await crearInvitacionesDelEquipo(miembros, invitar)

    expect(r).toHaveLength(2)
    expect(r[0].error).toContain('ya es miembro activo')
    expect(r[0].enlace).toBeNull()
    expect(r[1].error).toBeNull()
    expect(r[1].enlace).toContain('/invitacion/tok-2')
  })

  it('sin token del back no se inventa un enlace', async () => {
    const invitar = vi.fn().mockResolvedValue({ emailDelivered: false, emailStatus: 'failed' })

    const [r] = await crearInvitacionesDelEquipo([miembros[0]], invitar)

    expect(r.enlace).toBeNull()
    expect(r.correoEnviado).toBe(false)
    expect(r.estadoDelCorreo).toBe('failed')
  })

  it('invita en SERIE, no en paralelo: el tope de usuarios del plan se valida de a uno', async () => {
    const enVuelo: number[] = []
    let activas = 0
    const invitar = vi.fn(async () => {
      activas += 1
      enVuelo.push(activas)
      await new Promise((r) => setTimeout(r, 0))
      activas -= 1
      return { emailDelivered: true, invitationToken: 'tok' }
    })

    await crearInvitacionesDelEquipo(miembros, invitar)

    expect(Math.max(...enVuelo)).toBe(1)
  })

  it('sin miembros no llama al back', async () => {
    const invitar = vi.fn()
    expect(await crearInvitacionesDelEquipo([], invitar)).toEqual([])
    expect(invitar).not.toHaveBeenCalled()
  })
})
