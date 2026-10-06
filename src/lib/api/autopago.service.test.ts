/**
 * 🔴 02-10-2026 (Nico): `tokenizarTarjeta` (autopago) traduce lo que rechaza la
 * pasarela. Antes lanzaba `error.reason` de Wompi tal cual y el toast decía
 * «Insufficient funds» o «Card expired». Lo conocido, con nuestra frase; lo
 * desconocido, con una frase clara en español; el texto de Wompi, nunca.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'

vi.mock('./client', () => ({ apiClient: {} }))

import { MOTIVOS_DE_LA_TARJETA, motivoDelRechazoDeLaTarjeta, tokenizarTarjeta } from './autopago.service'

const TARJETA = {
  numero: '4242 4242 4242 4242',
  cvc: '123',
  mesDeVencimiento: '08',
  anioDeVencimiento: '28',
  nombreEnLaTarjeta: 'Ana Pérez',
}

const realFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = realFetch
})

function respuesta(status: number, cuerpo: unknown) {
  return vi.fn().mockResolvedValue({ ok: status >= 200 && status < 300, status, json: async () => cuerpo } as unknown as Response)
}

describe('motivoDelRechazoDeLaTarjeta', () => {
  it.each([
    ['Insufficient funds', MOTIVOS_DE_LA_TARJETA.fondos],
    ['Fondos insuficientes', MOTIVOS_DE_LA_TARJETA.fondos],
    ['Card expired', MOTIVOS_DE_LA_TARJETA.vencida],
    ['La tarjeta está vencida', MOTIVOS_DE_LA_TARJETA.vencida],
    ['Invalid CVC', MOTIVOS_DE_LA_TARJETA.cvc],
    ['Código de seguridad inválido', MOTIVOS_DE_LA_TARJETA.cvc],
    ['Transaction declined by the issuing bank', MOTIVOS_DE_LA_TARJETA.rechazada],
    ['Do not honor', MOTIVOS_DE_LA_TARJETA.rechazada],
    ['Transacción rechazada por el banco', MOTIVOS_DE_LA_TARJETA.rechazada],
    ['Amount exceeds credit limit', MOTIVOS_DE_LA_TARJETA.cupo],
    ['Invalid card number', MOTIVOS_DE_LA_TARJETA.numero],
  ])('🔴 «%s» se dice en español, con nuestra frase', (razon, frase) => {
    expect(motivoDelRechazoDeLaTarjeta(422, { error: { type: 'CARD_ERROR', reason: razon } })).toBe(frase)
  })

  it('los errores por campo de Wompi (`INPUT_VALIDATION_ERROR`) dicen qué revisar', () => {
    const cuerpo = {
      error: {
        type: 'INPUT_VALIDATION_ERROR',
        messages: { number: ['Number must be a valid card number'], exp_year: ['The card is expired'] },
      },
    }
    expect(motivoDelRechazoDeLaTarjeta(422, cuerpo)).toBe(
      `${MOTIVOS_DE_LA_TARJETA.numero} ${MOTIVOS_DE_LA_TARJETA.vencida}`,
    )
    expect(
      motivoDelRechazoDeLaTarjeta(422, { error: { type: 'INPUT_VALIDATION_ERROR', messages: { cvc: ['must be 3 digits'] } } }),
    ).toBe(MOTIVOS_DE_LA_TARJETA.cvc)
  })

  it('🔴 lo desconocido sale con una frase clara en español, nunca con el texto de la pasarela', () => {
    const texto = motivoDelRechazoDeLaTarjeta(422, { error: { type: 'WEIRD_ERROR', reason: 'Something unexpected happened' } })
    expect(texto).toBe(MOTIVOS_DE_LA_TARJETA.desconocido)
    expect(texto).not.toMatch(/Something|unexpected/)
    expect(motivoDelRechazoDeLaTarjeta(400, null)).toBe(MOTIVOS_DE_LA_TARJETA.desconocido)
  })

  it('una llave pública mal puesta es nuestra, no de la persona', () => {
    expect(
      motivoDelRechazoDeLaTarjeta(401, { error: { type: 'INVALID_ACCESS_TOKEN', reason: 'Se esperaba una llave pública' } }),
    ).toBe(MOTIVOS_DE_LA_TARJETA.nuestro)
  })

  it('la pasarela caída (5xx) o muchos intentos (429) se dicen como tales', () => {
    expect(motivoDelRechazoDeLaTarjeta(502, null)).toBe(MOTIVOS_DE_LA_TARJETA.pasarela)
    expect(motivoDelRechazoDeLaTarjeta(429, { error: { reason: 'Rate limit exceeded' } })).toBe(MOTIVOS_DE_LA_TARJETA.intentos)
  })
})

describe('tokenizarTarjeta', () => {
  it('devuelve el token cuando la pasarela lo crea', async () => {
    globalThis.fetch = respuesta(201, { status: 'CREATED', data: { id: 'tok_test_123' } }) as unknown as typeof fetch
    await expect(tokenizarTarjeta('pub_test', 'sandbox', TARJETA)).resolves.toBe('tok_test_123')
  })

  it('🔴 un rechazo lanza la frase en español, no la de Wompi', async () => {
    globalThis.fetch = respuesta(422, { error: { type: 'CARD_ERROR', reason: 'Insufficient funds' } }) as unknown as typeof fetch
    const error = await tokenizarTarjeta('pub_test', 'sandbox', TARJETA).catch((e: unknown) => e)
    expect((error as Error).message).toBe(MOTIVOS_DE_LA_TARJETA.fondos)
    expect((error as Error).message).not.toContain('Insufficient')
  })

  it('si el pedido ni salió, sube el TypeError (el traductor lo lee como «sin conexión»)', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch')) as unknown as typeof fetch
    await expect(tokenizarTarjeta('pub_test', 'sandbox', TARJETA)).rejects.toBeInstanceOf(TypeError)
  })
})
