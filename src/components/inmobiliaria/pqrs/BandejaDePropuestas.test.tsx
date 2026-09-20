/**
 * BandejaDePropuestas.test.tsx — Lo que el agente propone radicar (I-02).
 *
 * B1 — NADA SE RADICA SOLO. Con propuestas pendientes no se llama a confirmar
 *      hasta que alguien toca «Radicar». Una PQRS mal radicada arranca un
 *      reloj legal contra la inmobiliaria.
 * B2 — La fecha que hereda la PQRS es la del MENSAJE ORIGINAL, no la de hoy, y
 *      la pantalla lo dice en cada tarjeta. Demorarse en confirmar no compra
 *      tiempo, y quien confirma tiene que saberlo antes de tocar el botón.
 * B3 — Descartar EXIGE motivo: el botón no se habilita sin él.
 * B4 — Sin nada pendiente la bandeja NO se dibuja. Un bloque vacío permanente
 *      arriba de la pantalla enseña a la gente a ignorar esa zona.
 * B5 — Si la bandeja falla NO tumba la pantalla de solicitudes: es un agregado,
 *      no la lista principal.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const h = vi.hoisted(() => ({
  canAccess: vi.fn((_m: string, _a: string) => true),
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
  api: { listar: vi.fn(), confirmar: vi.fn(), descartar: vi.fn() },
}))

vi.mock('@/lib/hooks/usePermissions', () => ({
  usePermissions: () => ({ canAccess: h.canAccess }),
}))
vi.mock('@/components/ui/toast', () => ({ toast: h.toast }))
vi.mock('@/lib/api/propuestas-de-pqrs.service', () => ({
  propuestasDePqrsApi: h.api,
}))

import { BandejaDePropuestas } from './BandejaDePropuestas'

const UNA = {
  id: 'pr-1',
  tipo: 'QUEJA',
  solicitanteTipo: 'INQUILINO',
  solicitanteNombre: 'Marta Gómez',
  solicitanteContacto: '3001112233',
  asunto: 'El ascensor lleva tres días dañado',
  descripcion: null,
  consignacionId: null,
  recibidaAt: '2026-09-15T14:02:00.000Z',
  origen: 'WHATSAPP',
  referenciaExterna: 'wa:573001112233',
  extracto: 'Ya van tres días sin ascensor y nadie responde',
  propuestaPor: 'agente',
  confirmadaAt: null,
  pqrsId: null,
  descartadaAt: null,
  motivoDelDescarte: null,
  createdAt: '2026-09-15T14:05:00.000Z',
}

let contenedor: HTMLDivElement
let raiz: Root

async function montar(props: { onRadicada?: () => void } = {}) {
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  raiz = createRoot(contenedor)
  await act(async () => {
    raiz.render(<BandejaDePropuestas {...props} />)
  })
}

const boton = (texto: string) =>
  Array.from(contenedor.querySelectorAll('button')).find((b) =>
    b.textContent?.trim().includes(texto),
  )

beforeEach(() => {
  vi.clearAllMocks()
  h.canAccess.mockReturnValue(true)
  h.api.listar.mockResolvedValue([UNA])
  h.api.confirmar.mockResolvedValue({ ...UNA, confirmadaAt: 'x', pqrsId: 'q-1' })
  h.api.descartar.mockResolvedValue({ ...UNA, descartadaAt: 'x' })
})

afterEach(() => {
  act(() => raiz?.unmount())
  contenedor?.remove()
})

describe('Bandeja de propuestas del agente', () => {
  it('B1 — no radica nada sola: sólo al tocar «Radicar»', async () => {
    await montar()
    expect(contenedor.querySelectorAll('[data-testid="propuesta"]')).toHaveLength(1)
    expect(h.api.confirmar).not.toHaveBeenCalled()

    await act(async () => {
      boton('Radicar')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    // Sin correcciones: la propuesta se radica tal como la dejó el agente.
    expect(h.api.confirmar).toHaveBeenCalledWith('pr-1')
  })

  it('B2 — dice que el plazo corre desde el mensaje original, no desde hoy', async () => {
    await montar()
    expect(contenedor.textContent).toContain('el plazo corre desde ahí, no desde hoy')
    expect(contenedor.textContent).toContain('15 de septiembre')
    // Y lo repite al confirmar, que es cuando importa.
    await act(async () => {
      boton('Radicar')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(h.toast.success).toHaveBeenCalledWith(
      expect.stringContaining('fecha del mensaje original'),
    )
  })

  it('B2b — muestra textual lo que dijo la persona, para poder juzgarlo', async () => {
    await montar()
    expect(contenedor.querySelector('blockquote')?.textContent).toContain(
      'Ya van tres días sin ascensor',
    )
  })

  it('B3 — descartar exige motivo: sin él el botón no se habilita', async () => {
    await montar()
    await act(async () => {
      boton('No era')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    const descartar = boton('Descartar')!
    expect(descartar.hasAttribute('disabled')).toBe(true)
    expect(h.api.descartar).not.toHaveBeenCalled()

    const campo = contenedor.querySelector<HTMLInputElement>('input')!
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value',
    )!.set!
    await act(async () => {
      setter.call(campo, 'Era una consulta de horarios')
      campo.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(boton('Descartar')!.hasAttribute('disabled')).toBe(false)
    await act(async () => {
      boton('Descartar')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(h.api.descartar).toHaveBeenCalledWith('pr-1', 'Era una consulta de horarios')
  })

  it('B4 — sin nada pendiente no se dibuja', async () => {
    h.api.listar.mockResolvedValue([])
    await montar()
    expect(contenedor.querySelector('[data-testid="bandeja-de-propuestas"]')).toBeNull()
  })

  it('B4b — una ya confirmada o descartada no cuenta como pendiente', async () => {
    h.api.listar.mockResolvedValue([
      { ...UNA, id: 'a', confirmadaAt: 'x' },
      { ...UNA, id: 'b', descartadaAt: 'x' },
    ])
    await montar()
    expect(contenedor.querySelector('[data-testid="bandeja-de-propuestas"]')).toBeNull()
  })

  it('B5 — si falla no rompe la pantalla: no se dibuja y no lanza', async () => {
    h.api.listar.mockRejectedValue(new Error('503'))
    await expect(montar()).resolves.toBeUndefined()
    expect(contenedor.querySelector('[data-testid="bandeja-de-propuestas"]')).toBeNull()
  })

  it('sin permiso de crear no se ofrece radicar', async () => {
    h.canAccess.mockImplementation((_m: string, a: string) => a !== 'create')
    await montar()
    expect(boton('Radicar')).toBeUndefined()
    expect(boton('No era')).toBeDefined()
  })
})
