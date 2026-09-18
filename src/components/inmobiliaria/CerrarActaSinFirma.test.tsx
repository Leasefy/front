/**
 * CerrarActaSinFirma.test.tsx — Cerrar un acta sin la firma del inquilino (I-03).
 *
 * A1 — Si el inquilino SÍ firmó, este camino no aplica: se cierra por el
 *      normal. Ofrecerlo igual sería mandar a alguien a conseguir un testigo
 *      que no hace falta.
 * A2 — Falta la firma del asesor ⇒ no se puede. Alguien de la inmobiliaria
 *      tiene que responder por este cierre.
 * A3 — Las condiciones se muestran ANTES de intentar, no como un error
 *      después: descubrir que faltan las fotos cuando ya conseguiste un
 *      testigo y le tomaste la cédula es hacerle perder el viaje a una persona.
 * A4 — El testigo va con CÉDULA. Sin documento «un testigo» es un nombre
 *      cualquiera y no sirve el día que haya que sostener el acta.
 * A5 — `fotosPorEspacio` ausente NO es «no hay fotos»: es «no lo sé». Un acta
 *      vieja, anterior a esa columna, no puede quedar bloqueada por el front —
 *      decide el back, que sí sabe.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import type { ActaEntrega } from '@/lib/types/inmobiliaria'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const h = vi.hoisted(() => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
  actasApi: { cerrarSinFirma: vi.fn(), objetar: vi.fn() },
}))

vi.mock('@/components/ui/toast', () => ({ toast: h.toast }))
vi.mock('@/lib/api/inmobiliaria.service', () => ({ actasApi: h.actasApi }))
vi.mock('@/components/providers/SmoothScroll', () => ({
  useLenis: () => ({ stop: vi.fn(), start: vi.fn() }),
}))

import {
  CerrarActaSinFirma,
  condicionesDelCierre,
  sePuedeCerrarSinFirma,
} from './CerrarActaSinFirma'

function acta(over: Partial<ActaEntrega> = {}): ActaEntrega {
  return {
    id: 'a-1',
    signatures: [{ party: 'agent', name: 'Luis', cedula: '1', signedAt: 'x' }],
    fotosPorEspacio: { sala: ['f1'] },
    status: 'pending_signatures',
    ...over,
  } as unknown as ActaEntrega
}

let contenedor: HTMLDivElement
let raiz: Root

async function montar(a: ActaEntrega) {
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  raiz = createRoot(contenedor)
  await act(async () => {
    raiz.render(
      <CerrarActaSinFirma acta={a} onCerrar={() => {}} onCerrada={() => {}} />,
    )
  })
}

const campos = () => Array.from(contenedor.querySelectorAll<HTMLInputElement>('input'))
const botonCerrar = () =>
  Array.from(contenedor.querySelectorAll('button')).find(
    (b) => b.textContent?.trim() === 'Cerrar el acta',
  )

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
  h.actasApi.cerrarSinFirma.mockResolvedValue(acta({ status: 'completed' }))
})

afterEach(() => {
  act(() => raiz?.unmount())
  contenedor?.remove()
})

describe('Cerrar un acta sin la firma del inquilino', () => {
  it('A1 — si el inquilino firmó, este camino NO aplica', () => {
    const conFirma = acta({
      signatures: [
        { party: 'agent', name: 'Luis', cedula: '1', signedAt: 'x' },
        { party: 'tenant', name: 'Marta', cedula: '2', signedAt: 'y' },
      ],
    })
    expect(sePuedeCerrarSinFirma(conFirma)).toBe(false)
    expect(condicionesDelCierre(conFirma)[0].texto).toContain(
      'se cierra por el camino normal',
    )
  })

  it('A2 — sin la firma del asesor no se puede', () => {
    const sinAsesor = acta({ signatures: [] })
    expect(sePuedeCerrarSinFirma(sinAsesor)).toBe(false)
    expect(condicionesDelCierre(sinAsesor)[1].texto).toContain(
      'tiene que responder por este cierre',
    )
  })

  it('A2b — una firma del asesor SIN fecha no cuenta como firmada', () => {
    const sinFecha = acta({
      signatures: [{ party: 'agent', name: 'Luis', cedula: '1' }],
    })
    expect(sePuedeCerrarSinFirma(sinFecha)).toBe(false)
  })

  it('A3 — las condiciones se ven ANTES de intentar', async () => {
    await montar(acta({ fotosPorEspacio: {} } as Partial<ActaEntrega>))
    const lista = contenedor.querySelector('[data-testid="condiciones-del-cierre"]')
    expect(lista).not.toBeNull()
    expect(lista!.textContent).toContain('Faltan las fotos por espacio')
    // Y el formulario queda cerrado: no se pide un testigo que no va a servir.
    // Se asserta sobre el <fieldset>, que es lo que el componente deshabilita:
    // un navegador real lo propaga a sus controles, pero happy-dom no refleja
    // eso en la propiedad `.disabled` de cada input.
    expect(
      contenedor.querySelector('fieldset')?.hasAttribute('disabled'),
    ).toBe(true)
    expect(botonCerrar()!.hasAttribute('disabled')).toBe(true)
    expect(h.actasApi.cerrarSinFirma).not.toHaveBeenCalled()
  })

  it('A4 — el testigo va con cédula: sin ella el botón no se habilita', async () => {
    await montar(acta())
    expect(botonCerrar()!.hasAttribute('disabled')).toBe(true)

    await escribir(campos()[0], 'Pedro Ruiz')
    expect(botonCerrar()!.hasAttribute('disabled')).toBe(true)

    await escribir(campos()[1], '71234567')
    expect(botonCerrar()!.hasAttribute('disabled')).toBe(false)

    await act(async () => {
      botonCerrar()!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(h.actasApi.cerrarSinFirma).toHaveBeenCalledWith('a-1', {
      testigoNombre: 'Pedro Ruiz',
      testigoDocumento: '71234567',
    })
  })

  it('A5 — sin el campo de fotos NO se bloquea: decide el back', () => {
    const vieja = acta({ fotosPorEspacio: undefined } as Partial<ActaEntrega>)
    expect(sePuedeCerrarSinFirma(vieja)).toBe(true)
  })

  it('dice los 5 días para objetar, antes y después', async () => {
    await montar(acta())
    expect(contenedor.textContent).toContain('5 días para objetar')

    await escribir(campos()[0], 'Pedro Ruiz')
    await escribir(campos()[1], '71234567')
    await act(async () => {
      botonCerrar()!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(h.toast.success).toHaveBeenCalledWith(
      expect.stringContaining('5 días para objetar'),
    )
  })

  it('el error del back se muestra con SU motivo', async () => {
    h.actasApi.cerrarSinFirma.mockRejectedValue({
      message: 'El inquilino sí firmó esta acta: se cierra por el camino normal.',
    })
    await montar(acta())
    await escribir(campos()[0], 'Pedro Ruiz')
    await escribir(campos()[1], '71234567')
    await act(async () => {
      botonCerrar()!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(contenedor.querySelector('[role="alert"]')?.textContent).toContain(
      'se cierra por el camino normal',
    )
  })
})
