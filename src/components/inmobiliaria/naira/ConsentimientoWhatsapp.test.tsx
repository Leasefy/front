/**
 * @vitest-environment happy-dom
 *
 * ConsentimientoWhatsapp — P2 (el interruptor del briefing por WhatsApp) y #13 (Nico, 15-10-2026: «cualquier pregunta,
 * con un código (6 dígitos al correo o al panel)»): pedir el código lo muestra una vez, verificado dice hasta cuándo,
 * sin celular dice dónde agregarlo y un micro anterior a #13 deja sólo el interruptor.
 */

import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { NairaWhatsappConsent } from '@/lib/api/naira/contrato'

const red = vi.hoisted(() => ({
  leer: vi.fn(),
  guardar: vi.fn(),
  pedirCodigo: vi.fn(),
}))

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ agency: { id: 'AGY-1' } }) }))
vi.mock('@/lib/api/naira/cliente', () => ({
  leerConsentimientoWhatsapp: red.leer,
  guardarConsentimientoWhatsapp: red.guardar,
  pedirCodigoWhatsapp: red.pedirCodigo,
}))

import { ConsentimientoWhatsapp } from './ConsentimientoWhatsapp'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const BASE: NairaWhatsappConsent = { otorgado: true, texto: 'Autorizo… (ejemplo)', version: 'naira-whatsapp-v1', verificadoHasta: null, telefonoRegistrado: true }

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  red.leer.mockReset()
  red.guardar.mockReset()
  red.pedirCodigo.mockReset()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

async function montar(estado: NairaWhatsappConsent): Promise<void> {
  red.leer.mockResolvedValue({ kind: 'ok', data: estado, origen: 'agente' })
  await act(async () => {
    root.render(<ConsentimientoWhatsapp />)
  })
}

function boton(texto: string): HTMLButtonElement {
  const b = [...container.querySelectorAll('button')].find((x) => x.textContent === texto)
  if (!b) throw new Error('no está el botón ' + texto)
  return b
}

describe('ConsentimientoWhatsapp — #13 preguntar por WhatsApp con un código', () => {
  it('«Pedir código» muestra el código en dos partes con su vencimiento, y el botón pasa a «Pedir otro código»', async () => {
    await montar(BASE)
    expect(container.textContent).toContain('Preguntarle a Naira por WhatsApp')
    expect(container.textContent).toContain('te lo envía a tu correo o lo pides aquí')
    red.pedirCodigo.mockResolvedValue({ kind: 'ok', data: { codigo: '004217', venceEn: '2026-10-16T15:10:00.000Z', minutos: 10 }, origen: 'agente' })
    await act(async () => {
      boton('Pedir código').click()
    })
    expect(red.pedirCodigo).toHaveBeenCalledWith('AGY-1')
    expect(container.querySelector('[data-testid="naira-codigo-whatsapp"]')?.textContent).toContain('004 217')
    expect(container.textContent).toContain('Vence en 10 minutos')
    expect(boton('Pedir otro código')).toBeTruthy()
  })

  it('verificado: dice hasta qué día (en Bogotá) y que puede preguntar lo que necesite', async () => {
    await montar({ ...BASE, verificadoHasta: '2026-11-15T04:00:00.000Z' })
    expect(container.textContent).toContain('Tu WhatsApp está verificado hasta el')
    expect(container.textContent).toContain('14')
    expect(container.textContent).not.toContain('te lo envía a tu correo')
  })

  it('sin celular registrado dice dónde agregarlo y no ofrece el código', async () => {
    await montar({ ...BASE, telefonoRegistrado: false })
    expect(container.textContent).toContain('agrega tu celular en tu perfil')
    expect([...container.querySelectorAll('button')].some((b) => b.textContent === 'Pedir código')).toBe(false)
  })

  it('un código que no salió lo dice', async () => {
    await montar(BASE)
    red.pedirCodigo.mockResolvedValue({ kind: 'no_disponible' })
    await act(async () => {
      boton('Pedir código').click()
    })
    expect(container.textContent).toContain('No pude crear el código')
  })

  it('un micro anterior a #13 (sin esos campos) deja sólo el interruptor de siempre', async () => {
    const { verificadoHasta: _v, telefonoRegistrado: _t, ...anterior } = BASE
    await montar(anterior as NairaWhatsappConsent)
    expect(container.querySelector('[data-testid="naira-preguntas-whatsapp"]')).toBeNull()
    expect(container.textContent).toContain('Recibir el briefing por WhatsApp')
  })
})
