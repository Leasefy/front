/**
 * SeccionSlaDePqrs.test.tsx — El tiempo máximo de una PQRS.
 *
 * S1 — Vacío NO es cero. Vacío significa «este tipo va por el plazo legal», y
 *      un cero dejaría toda PQRS vencida desde el segundo uno. Lo que se manda
 *      al back no puede llevar ceros ni valores basura.
 * S2 — Sin la migración la sección lo DICE y no deja guardar. Un formulario
 *      editable que falla al enviar es peor que uno deshabilitado con motivo.
 * S3 — Sin permiso de `configuracion:edit` se puede MIRAR pero no cambiar: el
 *      back deja leer con `operaciones:view` justamente para que quien atiende
 *      PQRS sepa con qué plazo trabaja.
 * S4 — Al guardar, la pantalla dice que las PQRS ya radicadas conservan su
 *      plazo. Es lo primero que alguien se pregunta al bajar el compromiso.
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
  api: { ver: vi.fn(), guardar: vi.fn() },
}))

vi.mock('@/lib/hooks/usePermissions', () => ({
  usePermissions: () => ({ canAccess: h.canAccess }),
}))
vi.mock('@/components/ui/toast', () => ({ toast: h.toast }))
vi.mock('@/lib/api/sla-de-pqrs.service', () => ({ slaDePqrsApi: h.api }))

import { SeccionSlaDePqrs } from './SeccionSlaDePqrs'

const DISPONIBLE = {
  disponible: true,
  motivo: null,
  porTipo: { PETICION: null, QUEJA: 48, RECLAMO: null, SOLICITUD: null },
  legalDiasHabiles: 15,
}

let contenedor: HTMLDivElement
let raiz: Root

async function montar() {
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  raiz = createRoot(contenedor)
  await act(async () => {
    raiz.render(<SeccionSlaDePqrs />)
  })
}

function campos() {
  return Array.from(contenedor.querySelectorAll<HTMLInputElement>('input[type="number"]'))
}
function botonGuardar() {
  return Array.from(contenedor.querySelectorAll('button')).find(
    (b) => b.textContent?.trim() === 'Guardar',
  )
}
async function escribir(campo: HTMLInputElement, valor: string) {
  const setter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value',
  )!.set!
  await act(async () => {
    setter.call(campo, valor)
    campo.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  h.canAccess.mockReturnValue(true)
  h.api.ver.mockResolvedValue(DISPONIBLE)
  h.api.guardar.mockResolvedValue(DISPONIBLE)
})

afterEach(() => {
  act(() => raiz?.unmount())
  contenedor?.remove()
})

describe('Tiempo máximo de una PQRS', () => {
  it('muestra lo configurado y deja vacíos los que van por el plazo legal', async () => {
    await montar()
    const valores = campos().map((c) => c.value)
    expect(valores).toEqual(['', '48', '', ''])
    expect(contenedor.textContent).toContain('15 días hábiles')
  })

  it('S1 — un cero o un valor basura NO viaja: se manda como el plazo legal', async () => {
    await montar()
    await escribir(campos()[0], '0')
    await escribir(campos()[2], 'abc')
    await act(async () => {
      botonGuardar()!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(h.api.guardar).toHaveBeenCalledWith({
      PETICION: null,
      QUEJA: 48,
      RECLAMO: null,
      SOLICITUD: null,
    })
  })

  it('S1b — un número válido sí viaja', async () => {
    await montar()
    await escribir(campos()[0], '72')
    await act(async () => {
      botonGuardar()!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(h.api.guardar).toHaveBeenCalledWith(
      expect.objectContaining({ PETICION: 72, QUEJA: 48 }),
    )
  })

  it('S2 — sin la migración lo dice con su motivo y no deja guardar', async () => {
    h.api.ver.mockResolvedValue({
      ...DISPONIBLE,
      disponible: false,
      motivo: 'Falta la migración de PQRS y actas.',
      porTipo: { PETICION: null, QUEJA: null, RECLAMO: null, SOLICITUD: null },
    })
    await montar()
    expect(contenedor.querySelector('[role="alert"]')?.textContent).toContain(
      'Falta la migración de PQRS y actas.',
    )
    expect(campos().every((c) => c.disabled)).toBe(true)
    expect(botonGuardar()?.hasAttribute('disabled')).toBe(true)
  })

  it('S3 — sin permiso de editar se puede mirar, no cambiar', async () => {
    h.canAccess.mockImplementation((m: string, a: string) =>
      !(m === 'configuracion' && a === 'edit'),
    )
    await montar()
    expect(campos()).toHaveLength(4)
    expect(campos()[1].value).toBe('48')
    expect(campos().every((c) => c.disabled)).toBe(true)
    expect(botonGuardar()).toBeUndefined()
  })

  it('S4 — al guardar dice que lo ya radicado conserva su plazo', async () => {
    await montar()
    await escribir(campos()[0], '72')
    await act(async () => {
      botonGuardar()!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(h.toast.success).toHaveBeenCalledWith(
      expect.stringContaining('conservan el plazo'),
    )
  })

  it('la pantalla explica que bajar el compromiso no vence lo abierto', async () => {
    await montar()
    expect(contenedor.textContent).toContain('no mueve las PQRS ya radicadas')
  })
})
