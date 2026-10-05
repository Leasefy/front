/**
 * 🔴 PI-23 (QA-PILOTO, 04-10-2026) — pasar a Automático se confirma con lo
 * que va a pasar y queda a nombre de quien lo hace.
 *
 * Lo que se protege:
 *  1. El diálogo dice qué hace solo, qué sigue pidiendo el clic y, con el
 *     Piloto apagado, que la elección se guarda pero no actúa todavía.
 *  2. Confirmar llama al cambio una vez; si sale bien, se cierra.
 *  3. Si el micro responde `SEGUNDO_FACTOR_RECIENTE`, pide las seis cifras
 *     AHÍ MISMO (el reto de Supabase), marca la sesión y repite el cambio.
 *  4. Sin AuthProvider no revienta (vive montado en el encabezado).
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { mfa } = vi.hoisted(() => ({
  mfa: {
    listFactors: vi.fn(async () => ({ data: { totp: [{ id: 'factor-1', status: 'verified' }] } })),
    challenge: vi.fn(async () => ({ data: { id: 'reto-1' }, error: null })),
    verify: vi.fn(async () => ({ error: null })),
  },
}))
vi.mock('@/lib/supabase/client', () => ({ getSupabase: () => ({ auth: { mfa } }) }))

import { ConfirmarAutomatico, pideSegundoFactor, CODIGO_SEGUNDO_FACTOR_RECIENTE } from './ConfirmarAutomatico'
import { AuthContext } from '@/lib/auth/auth-context'

let host: HTMLDivElement | null = null
let root: Root | null = null
const q = (sel: string) => document.querySelector(sel)

const FALLO_DEL_CODIGO = { status: 403, code: CODIGO_SEGUNDO_FACTOR_RECIENTE, message: 'Para pasar a Automático…' }

async function pintar(
  props: Partial<React.ComponentProps<typeof ConfirmarAutomatico>> & {
    onConfirmar: React.ComponentProps<typeof ConfirmarAutomatico>['onConfirmar']
  },
  conSesion?: { setMfaVerified: () => void },
) {
  host = document.createElement('div')
  document.body.appendChild(host)
  const r = createRoot(host)
  root = r
  const dialogo = (
    <ConfirmarAutomatico abierto quien="Facturación" pilotoActivo onCerrar={() => {}} {...props} />
  )
  await act(async () => {
    r.render(
      conSesion ? (
        <AuthContext.Provider value={conSesion as never}>{dialogo}</AuthContext.Provider>
      ) : (
        dialogo
      ),
    )
  })
}

async function pegarCodigo(codigo: string) {
  const casilla = document.querySelector<HTMLInputElement>('[data-testid="casilla-0"]')!
  await act(async () => {
    casilla.dispatchEvent(
      Object.assign(new Event('paste', { bubbles: true, cancelable: true }), {
        clipboardData: { getData: () => codigo },
      }),
    )
  })
  // El reto, la verificación y el segundo intento del cambio.
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0))
  })
}

beforeEach(() => {
  mfa.listFactors.mockClear()
  mfa.challenge.mockClear()
  mfa.verify.mockClear()
})
afterEach(() => {
  const r = root
  if (r) act(() => r.unmount())
  host?.remove()
  root = null
  host = null
})

describe('PI-23: ConfirmarAutomatico', () => {
  it('pideSegundoFactor lee el código del ApiError o de su cuerpo, y nada más', () => {
    expect(pideSegundoFactor({ code: CODIGO_SEGUNDO_FACTOR_RECIENTE })).toBe(true)
    expect(pideSegundoFactor({ detalle: { code: CODIGO_SEGUNDO_FACTOR_RECIENTE } })).toBe(true)
    expect(pideSegundoFactor({ code: 'SOLO_ADMIN' })).toBe(false)
    expect(pideSegundoFactor(new TypeError('fetch failed'))).toBe(false)
    expect(pideSegundoFactor(undefined)).toBe(false)
  })

  it('dice lo que va a pasar: actúa a tu nombre, lo que sale de la inmobiliaria sigue con clic y pide el código', async () => {
    await pintar({ onConfirmar: async () => ({ ok: true }) })
    const texto = q('[data-testid="confirmar-automatico"]')!.textContent ?? ''
    expect(texto).toContain('¿Pasar Facturación a Automático?')
    expect(texto).toContain('actúa a tu nombre')
    expect(texto).toContain('te lo sigue dejando en la Bandeja con su clic')
    expect(texto).toContain('código de tu aplicación de autenticación')
    // Con el Piloto activo no se avisa «apagado».
    expect(q('[data-testid="confirmar-automatico-apagado"]')).toBeNull()
  })

  it('🔴 con el Piloto apagado lo dice: la elección se guarda pero no actúa sola todavía (PI-27)', async () => {
    await pintar({ pilotoActivo: false, onConfirmar: async () => ({ ok: true }) })
    expect(q('[data-testid="confirmar-automatico-apagado"]')!.textContent).toContain('no actuará solo hasta que lo actives en la página del Piloto')
  })

  it('confirmar hace el cambio una vez y cierra', async () => {
    const onConfirmar = vi.fn(async () => ({ ok: true }))
    const onCerrar = vi.fn()
    await pintar({ onConfirmar, onCerrar })
    await act(async () => {
      ;(q('[data-testid="confirmar-automatico-si"]') as HTMLButtonElement).click()
    })
    expect(onConfirmar).toHaveBeenCalledTimes(1)
    expect(onCerrar).toHaveBeenCalledTimes(1)
  })

  it('🔴 sin el segundo factor de hace poco, pide el código ahí mismo, lo verifica y repite el cambio', async () => {
    const onConfirmar = vi
      .fn<() => Promise<{ ok: boolean; fallo?: unknown }>>()
      .mockResolvedValueOnce({ ok: false, fallo: FALLO_DEL_CODIGO })
      .mockResolvedValueOnce({ ok: true })
    const onCerrar = vi.fn()
    const setMfaVerified = vi.fn()
    await pintar({ onConfirmar, onCerrar }, { setMfaVerified })
    await act(async () => {
      ;(q('[data-testid="confirmar-automatico-si"]') as HTMLButtonElement).click()
    })
    // No se cerró: ahora pide el código.
    expect(onCerrar).not.toHaveBeenCalled()
    expect(q('[data-testid="confirmar-automatico-codigo"]')).not.toBeNull()
    expect(mfa.listFactors).toHaveBeenCalled()

    await pegarCodigo('481902')
    expect(mfa.challenge).toHaveBeenCalledWith({ factorId: 'factor-1' })
    expect(mfa.verify).toHaveBeenCalledWith({ factorId: 'factor-1', challengeId: 'reto-1', code: '481902' })
    expect(setMfaVerified).toHaveBeenCalledTimes(1)
    expect(onConfirmar).toHaveBeenCalledTimes(2)
    expect(onCerrar).toHaveBeenCalledTimes(1)
  })

  it('un código que no sirve se dice en palabras y no repite el cambio', async () => {
    mfa.verify.mockResolvedValueOnce({ error: new Error('Invalid TOTP code entered') } as never)
    const onConfirmar = vi.fn(async () => ({ ok: true }))
    await pintar({ onConfirmar, pasoInicial: 'codigo' })
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })
    await pegarCodigo('000000')
    expect(q('[role="alert"]')!.textContent).toBe(
      'Ese código no sirvió. Mira tu aplicación de autenticación y escribe el de ahora.',
    )
    expect(onConfirmar).not.toHaveBeenCalled()
  })

  it('la píldora abre directo en el código (ya confirmó en línea: no se confirma dos veces)', async () => {
    await pintar({ onConfirmar: async () => ({ ok: true }), pasoInicial: 'codigo' })
    expect(q('[data-testid="confirmar-automatico-explicacion"]')).toBeNull()
    expect(q('[data-testid="confirmar-automatico-codigo"]')).not.toBeNull()
  })
})
