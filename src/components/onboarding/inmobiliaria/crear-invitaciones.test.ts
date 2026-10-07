import { describe, it, expect, vi } from 'vitest'

import {
  MOTIVO_SIN_SEGUNDO_FACTOR,
  correosConInvitacion,
  crearInvitacionesDelEquipo,
} from './crear-invitaciones'
import { buildMemberInviteLink } from './invite-link'

/**
 * 🔴 EL DEFECTO QUE CIERRA (auditoría 2026-09-05): el paso «Miembros» del alta
 * mostraba enlaces `/onboarding/invitacion/<rawToken>` — una ruta que no
 * existe (404) — y decía «guarda estos links ahora, no se vuelven a mostrar».
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

/**
 * 🔴 01-10-2026 (Alexis): el back rechazó a una persona (el tope del plan), la
 * persona volvió a Miembros, guardó, «le dio»… y nunca llegó el correo. «Quién
 * ya está invitado» se sacaba del borrador del micro, que guarda el paso ANTES
 * de que el back invite. Ahora lo dice el back.
 */
describe('correosConInvitacion', () => {
  it('cuenta lo vigente y lo aceptado del BACK, en minúsculas', async () => {
    const listar = vi.fn().mockResolvedValue([
      { email: 'Alex.Dev+8@leasefy.co', status: 'invited' },
      { email: 'duena@inmo.co', status: 'active' },
      { email: 'se-fue@inmo.co', status: 'inactive' },
    ])
    const correos = await correosConInvitacion(listar)
    expect(correos).toEqual(new Set(['alex.dev+8@leasefy.co', 'duena@inmo.co']))
  })

  it('quien el back rechazó NO está, aunque haya quedado en el borrador del paso', async () => {
    const listar = vi.fn().mockResolvedValue([{ email: 'alex.dev+8@leasefy.co', status: 'invited' }])
    const correos = await correosConInvitacion(listar)
    expect(correos?.has('alex.dev+9@leasefy.co')).toBe(false)
  })

  it('si no se puede preguntar, devuelve null (y el llamador NO usa el borrador como respaldo)', async () => {
    const listar = vi.fn().mockRejectedValue(new Error('network down'))
    expect(await correosConInvitacion(listar)).toBeNull()
  })
})

/**
 * 🔴 02-10-2026 (Alexis): el fundador llega al asistente sin segundo factor y
 * el back se lo exige al administrador para invitar (403
 * `SEGUNDO_FACTOR_REQUERIDO`). Se dice qué falta, y no se ofrece reintentar.
 */
describe('crearInvitacionesDelEquipo — sin el segundo factor de quien invita', () => {
  const sinSegundoFactor = Object.assign(
    new Error('Tu rol exige segundo factor. Actívalo en Configuración → Seguridad y vuelve a entrar.'),
    { status: 403, code: 'SEGUNDO_FACTOR_REQUERIDO' },
  )

  it('dice qué falta y que reintentar ahora no sirve', async () => {
    const invitar = vi.fn().mockRejectedValue(sinSegundoFactor)
    const [creada] = await crearInvitacionesDelEquipo(
      [{ email: 'alex.dev+9@leasefy.co', nombre: '', role: 'VIEWER' }],
      invitar,
    )
    expect(creada.error).toBe(MOTIVO_SIN_SEGUNDO_FACTOR)
    expect(creada.reintentable).toBe(false)
    expect(creada.enlace).toBeNull()
  })

  it('cualquier otro rechazo sigue siendo reintentable y con las palabras del back', async () => {
    const invitar = vi.fn().mockRejectedValue(new Error('Alcanzaste el límite de agentes de tu plan.'))
    const [creada] = await crearInvitacionesDelEquipo(
      [{ email: 'alex.dev+8@leasefy.co', nombre: '', role: 'AGENTE' }],
      invitar,
    )
    expect(creada.error).toBe('Alcanzaste el límite de agentes de tu plan.')
    expect(creada.reintentable).toBeUndefined()
  })
})

/**
 * 02-10-2026 · El motivo de cada persona con la regla de oro del traductor, y
 * «Reintentar» sólo cuando reintentar puede servir.
 */
describe('crearInvitacionesDelEquipo — la regla de oro en cada invitación', () => {
  const UNA = [{ email: 'ana@acme.co', nombre: '', role: 'AGENTE' as const }]

  function errorDelBack(status: number, cuerpo: Record<string, unknown>) {
    return Object.assign(new Error(String(cuerpo.message ?? '')), {
      name: 'ApiError',
      status,
      code: cuerpo.code,
      detalle: cuerpo,
    })
  }

  it('un 409 dice lo que mandó el back y no ofrece reintentar', async () => {
    const invitar = vi.fn().mockRejectedValue(
      errorDelBack(409, { statusCode: 409, code: 'YA_EXISTE', message: 'Ya existe una invitación pendiente para este correo.' }),
    )
    const [creada] = await crearInvitacionesDelEquipo(UNA, invitar)
    expect(creada.error).toBe('Ya existe una invitación pendiente para este correo.')
    expect(creada.reintentable).toBe(false)
  })

  it('el límite del plan (402) no es reintentable', async () => {
    const invitar = vi.fn().mockRejectedValue(
      errorDelBack(402, { statusCode: 402, code: 'LIMITE_DEL_PLAN', message: 'Alcanzaste el límite de agentes de tu plan.' }),
    )
    const [creada] = await crearInvitacionesDelEquipo(UNA, invitar)
    expect(creada.error).toBe('Alcanzaste el límite de agentes de tu plan.')
    expect(creada.reintentable).toBe(false)
  })

  it('🔴 un 5xx dice que fue nuestro, con la referencia, sin culpar a la conexión; se puede reintentar', async () => {
    const invitar = vi.fn().mockRejectedValue(
      errorDelBack(500, { statusCode: 500, code: 'ERROR_INTERNO', message: 'Error interno del servidor.', referencia: 'ab12cd34' }),
    )
    const [creada] = await crearInvitacionesDelEquipo(UNA, invitar)
    expect(creada.error).toMatch(/^No pudimos invitar a esta persona: algo falló de nuestro lado/)
    expect(creada.error).toContain('ab12cd34')
    expect(creada.error).not.toMatch(/conexi[oó]n/)
    expect(creada.reintentable).toBeUndefined()
  })

  it('sin respuesta (la red): habla de la conexión y se puede reintentar', async () => {
    const invitar = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
    const [creada] = await crearInvitacionesDelEquipo(UNA, invitar)
    expect(creada.error).toMatch(/conexión/)
    expect(creada.reintentable).toBeUndefined()
  })
})

describe('crearInvitacionesDelEquipo — entorno de pruebas', () => {
  it('un correo retenido por el entorno de pruebas queda sin enviar y con su enlace', async () => {
    const invitar = vi.fn().mockResolvedValue({
      emailDelivered: false,
      emailStatus: 'suppressed',
      invitationToken: 'tok-9',
    })
    const [creada] = await crearInvitacionesDelEquipo(
      [{ email: 'alex.dev+9@leasefy.co', nombre: '', role: 'ADMIN' }],
      invitar,
    )
    expect(creada.correoEnviado).toBe(false)
    expect(creada.estadoDelCorreo).toBe('suppressed')
    expect(creada.enlace).toContain('/invitacion/tok-9')
  })
})
