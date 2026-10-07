import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { conReintentos, IntentoSinRespuesta } from './con-reintentos'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('conReintentos', () => {
  it('si el primer intento responde, no espera ni reintenta', async () => {
    const intento = vi.fn().mockResolvedValue('ok')
    await expect(conReintentos(intento, { esperas: [100, 200] })).resolves.toBe('ok')
    expect(intento).toHaveBeenCalledTimes(1)
  })

  it('falla una vez y después responde: devuelve la respuesta', async () => {
    const intento = vi.fn().mockRejectedValueOnce(new Error('un instante')).mockResolvedValue('ok')
    const resultado = conReintentos(intento, { esperas: [100, 200] })
    await vi.advanceTimersByTimeAsync(100)
    await expect(resultado).resolves.toBe('ok')
    expect(intento).toHaveBeenCalledTimes(2)
  })

  it('falla siempre: intenta esperas+1 veces y lanza el último error', async () => {
    const intento = vi
      .fn()
      .mockRejectedValueOnce(new Error('1'))
      .mockRejectedValueOnce(new Error('2'))
      .mockRejectedValue(new Error('el último'))
    const resultado = conReintentos(intento, { esperas: [100, 200] })
    const atrapado: Promise<Error> = resultado.then(
      () => new Error('no falló'),
      (e: unknown) => e as Error,
    )
    await vi.advanceTimersByTimeAsync(300)
    expect((await atrapado).message).toBe('el último')
    expect(intento).toHaveBeenCalledTimes(3)
  })

  it('un intento que no vuelve cuenta como fallo al pasar el tope (el lock de auth retenido)', async () => {
    const intento = vi.fn().mockReturnValueOnce(new Promise(() => {})).mockResolvedValue('ok')
    const resultado = conReintentos(intento, { esperas: [100], tope: 1000 })
    await vi.advanceTimersByTimeAsync(1000 + 100)
    await expect(resultado).resolves.toBe('ok')
    expect(intento).toHaveBeenCalledTimes(2)
  })

  it('si nunca vuelve, termina con IntentoSinRespuesta en vez de quedarse esperando', async () => {
    const intento = vi.fn(() => new Promise<string>(() => {}))
    const atrapado = conReintentos(intento, { esperas: [100], tope: 500 }).catch((e: unknown) => e)
    await vi.advanceTimersByTimeAsync(500 + 100 + 500)
    expect(await atrapado).toBeInstanceOf(IntentoSinRespuesta)
  })

  it('`debeSeguir` en falso corta los reintentos (la sesión que preguntaba ya terminó)', async () => {
    const intento = vi.fn().mockRejectedValue(new Error('x'))
    const atrapado = conReintentos(intento, { esperas: [100, 200], debeSeguir: () => false }).catch((e: unknown) => e)
    await vi.advanceTimersByTimeAsync(0)
    expect(await atrapado).toBeInstanceOf(Error)
    expect(intento).toHaveBeenCalledTimes(1)
  })
})
