/**
 * «Resolver y cerrar» desde el Piloto (02-10-2026, decisión de Nico).
 *
 * El micro declara para esta acción lo mismo que para «Resolver» en la cola
 * humana, de la misma fuente (`shared/resolucion-de-escalaciones.ts`): el
 * relato con al menos 80 caracteres y, con «Pasa a jurídico», una casilla que
 * hay que marcar. Lo que se fija:
 *
 *  · la casilla sólo aparece con «Pasa a jurídico» y, sin marcar, el botón no
 *    ejecuta;
 *  · la casilla NUNCA viaja en el cuerpo (el de `resolve` es `.strict()`);
 *  · al cambiar de categoría la casilla se desmarca;
 *  · el mínimo de 80 se ve como pista y no deja ejecutar con menos;
 *  · un `tipo` desconocido no se pinta ni viaja.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'es' }),
  useOptionalI18n: () => ({ t: (k: string) => k, locale: 'es' }),
}))

import { PilotoAccionForm } from './PilotoAccionForm'
import type { AccionCampo, InboxAccion } from '@/lib/api/piloto'

/** Como la declara el micro (`src/piloto/detalle.ts`). */
const RESOLVER: InboxAccion = {
  label: 'Resolver y cerrar',
  method: 'POST',
  path: '/api/agency/a/cobranza/escalations/e-1/resolve',
  campos: [
    {
      id: 'category',
      label: '¿Cómo terminó?',
      tipo: 'opcion',
      requerido: true,
      opciones: [
        { valor: 'compromise', label: 'Se llegó a un acuerdo con el deudor' },
        { valor: 'customer-rejected', label: 'El deudor se negó a pagar' },
        { valor: 'escalated-to-legal', label: 'Pasa a jurídico' },
        { valor: 'false-positive', label: 'No hacía falta escalar: falsa alarma' },
        { valor: 'other', label: 'Otra cosa' },
      ],
    },
    {
      id: 'confirmacion_de_juridico',
      label: 'Entiendo que el deudor pasa a cobro prejurídico.',
      tipo: 'confirmacion',
      requerido: true,
      visibleSi: { campo: 'category', valor: 'escalated-to-legal' },
      aviso: 'Al cerrar como «Pasa a jurídico», el deudor avanza automáticamente a la etapa prejurídica.',
    },
    {
      id: 'resolution_text',
      label: 'Qué pasó, en tus palabras',
      tipo: 'texto',
      requerido: true,
      minLargo: 80,
      maxLargo: 2000,
    },
  ],
}

const RELATO =
  'El deudor rechazó todas las ofertas y dejó de contestar; se pasa a jurídico para iniciar la restitución.'

let container: HTMLDivElement
let root: Root
let onEnviar: Mock<(valores: Record<string, unknown>) => void>

beforeEach(() => {
  onEnviar = vi.fn<(valores: Record<string, unknown>) => void>()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

function pintar(accion: InboxAccion = RESOLVER) {
  act(() => {
    root.render(<PilotoAccionForm accion={accion} onEnviar={onEnviar} onCancelar={vi.fn()} enVuelo={false} />)
  })
}

const casilla = () =>
  container.querySelector('[data-testid="piloto-confirmacion-confirmacion_de_juridico"]') as HTMLButtonElement | null
const enviarBoton = () =>
  container.querySelector('[data-testid="piloto-cajon-formulario-enviar"]') as HTMLButtonElement
const elegir = (valor: string) =>
  act(() => (container.querySelector(`#accion-category-${valor}`) as HTMLButtonElement).click())
const unCuadro = () =>
  act(async () => {
    await new Promise((r) => setTimeout(r, 40))
  })

function escribir(valor: string) {
  const area = container.querySelector('#accion-resolution_text') as HTMLTextAreaElement
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!
  act(() => {
    setter.call(area, valor)
    area.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

async function enviar() {
  await act(async () => {
    ;(container.querySelector('[data-testid="piloto-cajon-formulario"]') as HTMLFormElement).requestSubmit()
  })
}

describe('PilotoAccionForm — la casilla de «Pasa a jurídico»', () => {
  it('aparece sólo con «Pasa a jurídico», con su aviso', () => {
    pintar()
    expect(casilla()).toBeNull()
    elegir('compromise')
    expect(casilla()).toBeNull()
    elegir('escalated-to-legal')
    expect(casilla()).not.toBeNull()
    expect(container.textContent).toContain('el deudor avanza automáticamente a la etapa prejurídica')
    expect(container.textContent).toContain('Entiendo que el deudor pasa a cobro prejurídico.')
    expect(casilla()!.getAttribute('aria-describedby')).toContain('accion-confirmacion_de_juridico-aviso')
    expect(container.textContent).not.toMatch(/pre_judicial|escalated-to-legal/)
  })

  it('🔴 sin marcarla no se ejecuta; marcada, sí — y la casilla NO viaja en el cuerpo', async () => {
    pintar()
    elegir('escalated-to-legal')
    escribir(RELATO)
    expect(enviarBoton().disabled).toBe(true)
    await enviar()
    expect(onEnviar).not.toHaveBeenCalled()

    act(() => casilla()!.click())
    expect(enviarBoton().disabled).toBe(false)
    await enviar()
    expect(onEnviar).toHaveBeenCalledTimes(1)
    expect(onEnviar.mock.calls[0][0]).toEqual({ category: 'escalated-to-legal', resolution_text: RELATO })
  })

  it('al cambiar de categoría se desmarca: hay que volver a marcarla', async () => {
    pintar()
    elegir('escalated-to-legal')
    act(() => casilla()!.click())
    expect(casilla()!.getAttribute('aria-checked')).toBe('true')
    elegir('other')
    await unCuadro()
    expect(casilla()).toBeNull()
    elegir('escalated-to-legal')
    expect(casilla()!.getAttribute('aria-checked')).toBe('false')
  })

  it('con otra categoría la casilla oculta no estorba ni viaja', async () => {
    pintar()
    elegir('false-positive')
    escribir(RELATO)
    await enviar()
    expect(onEnviar).toHaveBeenCalledWith({ category: 'false-positive', resolution_text: RELATO })
  })
})

describe('PilotoAccionForm — el relato tiene al menos 80 caracteres', () => {
  it('la pista «Mínimo 80 caracteres» se ve bajo el relato y lo describe', () => {
    pintar()
    const pista = container.querySelector('#accion-resolution_text-error-pista')
    expect(pista?.textContent).toBe('Mínimo 80 caracteres')
    expect(
      (container.querySelector('#accion-resolution_text') as HTMLElement).getAttribute('aria-describedby'),
    ).toContain('accion-resolution_text-error-pista')
  })

  it('🔴 con 79 caracteres no se ejecuta; con 80, sí', async () => {
    pintar()
    elegir('compromise')
    escribir('a'.repeat(79))
    expect(enviarBoton().disabled).toBe(true)
    await enviar()
    expect(onEnviar).not.toHaveBeenCalled()
    escribir('a'.repeat(80))
    expect(enviarBoton().disabled).toBe(false)
    await enviar()
    expect(onEnviar).toHaveBeenCalledWith({ category: 'compromise', resolution_text: 'a'.repeat(80) })
  })
})

describe('PilotoAccionForm — un `tipo` que esta versión no conoce', () => {
  it('no se pinta ni bloquea ni viaja', async () => {
    const raro = { id: 'firma', label: 'Firma', tipo: 'dibujo', requerido: true } as unknown as AccionCampo
    pintar({ ...RESOLVER, campos: [...RESOLVER.campos!, raro] })
    expect(container.querySelector('[data-campo="firma"]')).toBeNull()
    expect(container.textContent).not.toContain('Firma')
    elegir('compromise')
    escribir(RELATO)
    await enviar()
    expect(onEnviar).toHaveBeenCalledWith({ category: 'compromise', resolution_text: RELATO })
  })
})
