import { beforeEach, describe, expect, it, vi } from 'vitest'

// Una función simple en lugar de `vi.fn`: con vitest 4, un espía cuya respuesta rechaza marca la prueba aunque el
// rechazo se atrape adentro.
const llamadas: unknown[][] = []
let responder: () => Promise<unknown> = async () => ({})
vi.mock('@/lib/api/client', async (original) => {
  const real = await original<typeof import('@/lib/api/client')>()
  return {
    ...real,
    apiClient: {
      ...real.apiClient,
      post: (...a: unknown[]) => {
        llamadas.push(a)
        return responder()
      },
    },
  }
})

import { ApiError } from '@/lib/api/client'
import { mensajeDeSupabase } from './errores-de-supabase'
import { comoErrorDeSupabase, registrarPorElBack, reenviarPorElBack } from './registro-por-el-back'

describe('registro por el back', () => {
  beforeEach(() => {
    llamadas.length = 0
    responder = async () => ({ requiereConfirmacion: true })
  })

  it('crea la cuenta por el back', async () => {
    expect(await registrarPorElBack({ email: 'a@b.co', password: 'Clave-1234', datos: { intended_role: 'agency' } })).toBe('hecho')
    expect(llamadas[0]).toEqual(['/auth/registro', { email: 'a@b.co', password: 'Clave-1234', datos: { intended_role: 'agency' } }])
  })

  it('un back sin la ruta (404) deja seguir por Supabase', async () => {
    responder = async () => {
      throw new ApiError(404, 'Cannot POST /auth/registro')
    }
    expect(await registrarPorElBack({ email: 'a@b.co', password: 'x' })).toBe('sin-ruta')
    expect(await reenviarPorElBack('a@b.co')).toBe('sin-ruta')
    expect(llamadas[1]).toEqual(['/auth/registro/reenviar', { email: 'a@b.co' }])
  })

  it('los rechazos dicen lo mismo que los de Supabase', () => {
    const ya = comoErrorDeSupabase(new ApiError(409, 'Ese correo ya tiene cuenta', 'USUARIO_YA_EXISTE'))
    expect(ya).toMatchObject({ code: 'user_already_exists' })
    expect(mensajeDeSupabase(ya)).toBe('Ya hay una cuenta con este correo.')

    const espera = comoErrorDeSupabase(new ApiError(429, 'Ya te mandamos…', 'ESPERA_PARA_OTRO_CORREO', { segundos: 42 }))
    expect(mensajeDeSupabase(espera)).toBe('Ya te mandamos un correo. Puedes pedir otro en 42 segundos; mientras, revisa también spam.')

    expect(comoErrorDeSupabase(new ApiError(400, 'débil', 'CLAVE_DEBIL'))).toMatchObject({ code: 'weak_password' })
  })

  it('un 503 sale tal cual', async () => {
    const caido = new ApiError(503, 'No pudimos crear tu cuenta', 'REGISTRO_NO_DISPONIBLE')
    responder = async () => {
      throw caido
    }
    let lanzado: unknown = null
    try {
      await registrarPorElBack({ email: 'a@b.co', password: 'x' })
    } catch (e) {
      lanzado = e
    }
    expect(lanzado).toBe(caido)
  })
})
