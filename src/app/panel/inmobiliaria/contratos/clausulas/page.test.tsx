/**
 * page.test.tsx — Las cláusulas propias de la inmobiliaria.
 *
 * C1 — El validador corre MIENTRAS se escribe, no al guardar. Dejar que
 *      alguien redacte tres párrafos para recibir un 400 es la forma más cara
 *      de enseñar una regla.
 * C2 — Cada motivo se muestra CON SU NORMA. Es lo que va a mirar un abogado y
 *      lo que deja aprender la regla en vez de adivinarla.
 * C3 — Con la cláusula rechazada, guardar NO se ofrece. El back la va a
 *      rechazar igual: el botón habilitado sólo promete algo que no va a pasar.
 * C4 — Si el validador no responde NO se afirma que está bien: se queda en «no
 *      sé» y decide el back. Un visto bueno inventado es peor que ninguno.
 * C5 — Desactivar no borra, y dice que los contratos ya firmados no cambian.
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
  api: {
    listar: vi.fn(),
    revisar: vi.fn(),
    crear: vi.fn(),
    actualizar: vi.fn(),
    eliminar: vi.fn(),
  },
}))

vi.mock('@/lib/hooks/usePermissions', () => ({
  usePermissions: () => ({ canAccess: h.canAccess }),
}))
vi.mock('@/components/ui/toast', () => ({ toast: h.toast }))
vi.mock('@/lib/api/clausulas-propias.service', () => ({ clausulasPropiasApi: h.api }))
vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children: React.ReactNode }) => children,
}))
vi.mock('@/components/ui/back-button', () => ({ BackButton: () => null }))
vi.mock('@/components/providers/SmoothScroll', () => ({
  useLenis: () => ({ stop: vi.fn(), start: vi.fn() }),
}))

import ClausulasPropiasPage from './page'

const UNA = {
  id: 'c-1',
  codigo: 'uso-de-zonas-comunes',
  titulo: 'Uso de zonas comunes',
  resumen: 'Remite al reglamento de propiedad horizontal',
  aplicaA: ['CONTRATO_VIVIENDA'],
  cuerpo: 'El arrendatario se sujeta al reglamento…',
  activa: true,
  validadaAt: '2026-09-18T10:00:00.000Z',
  createdAt: '2026-09-18T10:00:00.000Z',
}

const MOTIVO_ILEGAL = {
  codigo: 'DEPOSITO_EN_DINERO',
  donde: 'cuerpo',
  mensaje: 'En vivienda urbana no se puede exigir depósito en dinero.',
  norma: 'Ley 820 de 2003, art. 16',
}

let contenedor: HTMLDivElement
let raiz: Root

async function montar() {
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  raiz = createRoot(contenedor)
  await act(async () => {
    raiz.render(<ClausulasPropiasPage />)
  })
}

const boton = (texto: string) =>
  Array.from(contenedor.querySelectorAll('button')).find((b) =>
    b.textContent?.trim().includes(texto),
  )

async function escribir(el: HTMLInputElement | HTMLTextAreaElement, valor: string) {
  const proto =
    el.tagName === 'TEXTAREA'
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')!.set!
  await act(async () => {
    setter.call(el, valor)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

/** Abre el editor y llena los cuatro campos, que es lo que dispara la revisión. */
async function abrirYLlenar(cuerpo = 'El arrendatario entrega dos meses en depósito.') {
  await act(async () => {
    boton('Escribir una cláusula')!.dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    )
  })
  const inputs = Array.from(contenedor.querySelectorAll<HTMLInputElement>('input'))
  await escribir(inputs[0], 'Depósito')
  await escribir(inputs[1], 'Pide dos meses por adelantado')
  await escribir(contenedor.querySelector('textarea')!, cuerpo)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({ shouldAdvanceTime: true })
  h.canAccess.mockReturnValue(true)
  h.api.listar.mockResolvedValue([UNA])
  h.api.revisar.mockResolvedValue({ ok: true, motivos: [] })
  h.api.crear.mockResolvedValue(UNA)
  h.api.actualizar.mockResolvedValue({ ...UNA, activa: false })
})

afterEach(() => {
  vi.useRealTimers()
  act(() => raiz?.unmount())
  contenedor?.remove()
})

describe('Cláusulas propias de la inmobiliaria', () => {
  it('lista lo que hay, con a qué contratos se ofrece', async () => {
    await montar()
    expect(contenedor.querySelectorAll('[data-testid="clausula"]')).toHaveLength(1)
    expect(contenedor.textContent).toContain('Uso de zonas comunes')
    expect(contenedor.textContent).toContain('Vivienda urbana')
  })

  it('C1 — revisa mientras se escribe, sin haber guardado nada', async () => {
    h.api.revisar.mockResolvedValue({ ok: false, motivos: [MOTIVO_ILEGAL] })
    await montar()
    await abrirYLlenar()
    await act(async () => {
      vi.advanceTimersByTime(600)
    })
    expect(h.api.revisar).toHaveBeenCalled()
    expect(h.api.crear).not.toHaveBeenCalled()
  })

  it('C2 — cada motivo se muestra con su norma', async () => {
    h.api.revisar.mockResolvedValue({ ok: false, motivos: [MOTIVO_ILEGAL] })
    await montar()
    await abrirYLlenar()
    await act(async () => {
      vi.advanceTimersByTime(600)
    })
    const motivos = contenedor.querySelector('[data-testid="motivos"]')
    expect(motivos?.textContent).toContain('no se puede exigir depósito en dinero')
    expect(motivos?.textContent).toContain('Ley 820 de 2003, art. 16')
  })

  it('C3 — rechazada, guardar no se ofrece', async () => {
    h.api.revisar.mockResolvedValue({ ok: false, motivos: [MOTIVO_ILEGAL] })
    await montar()
    await abrirYLlenar()
    await act(async () => {
      vi.advanceTimersByTime(600)
    })
    expect(boton('Agregar')!.hasAttribute('disabled')).toBe(true)
  })

  it('C3b — limpia, sí se puede guardar y se dice que pasó el validador', async () => {
    await montar()
    await abrirYLlenar('El arrendatario se sujeta al reglamento de propiedad horizontal.')
    await act(async () => {
      vi.advanceTimersByTime(600)
    })
    expect(contenedor.querySelector('[data-testid="veredicto"]')?.textContent).toContain(
      'no encontró nada que la ley prohíba',
    )
    expect(boton('Agregar')!.hasAttribute('disabled')).toBe(false)
    await act(async () => {
      boton('Agregar')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(h.api.crear).toHaveBeenCalled()
  })

  it('C4 — si el validador no responde NO se afirma que está bien', async () => {
    h.api.revisar.mockRejectedValue(new Error('503'))
    await montar()
    await abrirYLlenar()
    await act(async () => {
      vi.advanceTimersByTime(600)
    })
    const veredicto = contenedor.querySelector('[data-testid="veredicto"]')
    expect(veredicto?.textContent).not.toContain('no encontró nada')
    expect(contenedor.querySelector('[data-testid="motivos"]')).toBeNull()
    // Y se deja intentar: manda el back, que es quien sabe.
    expect(boton('Agregar')!.hasAttribute('disabled')).toBe(false)
  })

  it('C5 — desactivar no borra, y dice que lo firmado no cambia', async () => {
    await montar()
    await act(async () => {
      boton('Dejar de ofrecer')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(h.api.eliminar).not.toHaveBeenCalled()
    expect(h.api.actualizar).toHaveBeenCalledWith('c-1', { activa: false })
    expect(h.toast.success).toHaveBeenCalledWith(
      expect.stringContaining('Los firmados no cambian'),
    )
  })

  it('sin permiso de editar no se ofrece escribir ni cambiar', async () => {
    h.canAccess.mockImplementation((_m: string, a: string) => a !== 'edit')
    await montar()
    expect(boton('Escribir una cláusula')).toBeUndefined()
    expect(boton('Editar')).toBeUndefined()
    expect(boton('Dejar de ofrecer')).toBeUndefined()
  })
})

/**
 * 🔴 19-09-2026 · El vacío, con la cara de todos los vacíos del panel.
 *
 * Nico: «esto se ve horrible». Era un recuadro punteado con tres párrafos
 * centrados, un cuadro de ejemplos alineado a la IZQUIERDA dentro de esa
 * columna centrada —dos ejes peleando— y ningún botón: para escribir la
 * primera cláusula había que subir la vista hasta el encabezado. Encima, el
 * primer párrafo repetía casi palabra por palabra el subtítulo de la pantalla,
 * dos veces lo mismo a 40 px de distancia.
 */
describe('el vacío de cláusulas propias', () => {
  it('🔴 usa el EmptyState de la casa y trae su acción ADENTRO', async () => {
    h.api.listar.mockResolvedValue([])
    await montar()
    const vacio = contenedor.querySelector('[data-testid="empty-state"]')
    expect(vacio).not.toBeNull()
    // La salida está en el vacío, no sólo arriba en el encabezado.
    expect(
      Array.from(vacio!.querySelectorAll('button')).some((b) =>
        b.textContent?.includes('Escribir la primera'),
      ),
    ).toBe(true)
  })

  it('enseña con ejemplos: es lo que explica qué se escribe acá', async () => {
    h.api.listar.mockResolvedValue([])
    await montar()
    const vacio = contenedor.querySelector('[data-testid="empty-state"]')!
    expect(vacio.textContent).toContain('Por ejemplo')
    expect(vacio.textContent).toContain('Prohibido tener mascotas')
    expect(vacio.textContent).toContain('Ley 820')
  })

  it('🔴 no repite el subtítulo de la pantalla', async () => {
    // El encabezado ya dice «se suman al final y pasan por el mismo validador».
    // El vacío decía lo mismo con otras palabras, justo debajo.
    h.api.listar.mockResolvedValue([])
    await montar()
    const vacio = contenedor.querySelector('[data-testid="empty-state"]')!
    expect(vacio.textContent).not.toContain('Tus contratos ya salen completos')
  })

  it('sin permiso de editar el vacío no ofrece una acción que no se puede hacer', async () => {
    h.canAccess.mockReturnValue(false)
    h.api.listar.mockResolvedValue([])
    await montar()
    const vacio = contenedor.querySelector('[data-testid="empty-state"]')!
    expect(vacio.querySelector('button')).toBeNull()
  })
})
