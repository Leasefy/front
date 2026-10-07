/**
 * MANDO-DATOS (05-10-2026) · las tendencias en la pantalla elegida del piloto
 * automático: lo recuperado día por día bajo «Recuperado este mes», «El negocio
 * este mes» (recaudo, mora larga y horas ahorradas con su supuesto) y «El ritmo
 * de los agentes». Cada número una vez, nada inventado: sin la pieza, «sin dato».
 */
import * as React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
void React

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))

import { DireccionElegida } from './DireccionElegida'
import { crearMuestra } from './muestra'
import type { DatosDelMando, Pieza, PropsDeDireccion } from './tipos'

const lista = <T,>(data: T): Pieza<T> => ({ data, isLoading: false, error: null, notAvailable: false })
const acciones: PropsDeDireccion['acciones'] = { abrirItem: vi.fn(), abrirAlerta: vi.fn() }

function datos(cambios: Partial<DatosDelMando> = {}): DatosDelMando {
  const m = crearMuestra(Date.now())
  return {
    fuente: 'muestra',
    limiteDeActividad: 50,
    pulso: lista(m.pulso),
    bandeja: lista({ items: m.bandeja.items, total: m.bandeja.total, porPrioridad: m.bandeja.porPrioridad }),
    actividad: lista(m.actividad),
    briefing: lista(m.briefing),
    flota: lista(m.flota),
    hoy: lista(m.hoy),
    metas: lista(m.metas),
    tendencias: lista(m.tendencias),
    recaudo: lista(m.recaudo),
    ...cambios,
  }
}

let container: HTMLDivElement
let root: Root
beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

const cuantas = (texto: string, aguja: string) => texto.split(aguja).length - 1

describe('las tendencias en la pantalla elegida', () => {
  it('pinta las cuatro piezas nuevas con datos y sin repetir números', () => {
    act(() => root.render(<DireccionElegida datos={datos()} acciones={acciones} />))
    const texto = container.textContent ?? ''
    // Dato 1: la serie de 30 días, debajo de «Recuperado este mes» (que sigue saliendo UNA vez).
    expect(cuantas(texto, 'Recuperado este mes')).toBe(1)
    expect(texto).toContain('Últimos 30 días')
    expect(container.querySelector('[aria-label^="Lo recuperado día por día en los últimos 30 días"]')).not.toBeNull()
    // Dato 4: el recaudo del mes con el rótulo de su base (la clave de i18n del rótulo).
    expect(container.querySelector('[data-testid="mando-recaudo-del-mes"]')?.textContent).toMatch(/Recaudo del mes.*causado/i)
    // Dato 5: la mora larga y su tendencia.
    expect(container.querySelector('[data-testid="mando-mora"]')?.textContent).toMatch(/Mora de más de 30 días.*(bajó|subió|igual)/)
    // Dato 3: las horas, con lo medido y lo estimado separados, el rótulo «estimada» y el supuesto escrito.
    const horas = container.querySelector('[data-testid="mando-horas"]')?.textContent ?? ''
    expect(horas).toContain('84\u00a0h')
    expect(horas).toContain('12\u00a0h medidas en llamadas · 72\u00a0h estimadas')
    expect(horas).toContain('estimada')
    expect(horas).toContain('Cómo se cuenta')
    expect(horas).toContain('el tiempo real al teléfono de Laura')
    // Dato 2: el ritmo, con la leyenda (varias series) y la parte que decidió el equipo.
    expect(texto).toContain('El ritmo de los agentes')
    expect(texto).toContain('Otros')
    expect(texto).toMatch(/las decidió tu equipo/)
    expect(texto).not.toContain('undefined')
    expect(texto).not.toContain('NaN')
  })

  it('el medidor de las metas dice que la estimada va aparte', () => {
    act(() => root.render(<DireccionElegida datos={datos()} acciones={acciones} />))
    expect(container.textContent).toContain('1 estimada aparte')
  })

  it('sin la pieza (micro anterior o caído) dice «sin dato»; sin las piezas, la pantalla de antes', () => {
    const caida = { data: null, isLoading: false, error: new Error('500'), notAvailable: false }
    act(() => root.render(<DireccionElegida datos={datos({ tendencias: caida, recaudo: caida })} acciones={acciones} />))
    const texto = container.textContent ?? ''
    expect(texto).toContain('El negocio este mes')
    expect(texto).not.toContain('Últimos 30 días')
    expect(texto).not.toContain('NaN')

    const { tendencias: _t, recaudo: _r, ...sinPiezas } = datos()
    act(() => root.render(<DireccionElegida datos={sinPiezas} acciones={acciones} />))
    expect(container.textContent).not.toContain('El negocio este mes')
    expect(container.textContent).not.toContain('El ritmo de los agentes')
  })

  it('las horas sin la parte estimada (el back no contestó): sólo lo medido y lo dice', () => {
    const m = crearMuestra(Date.now())
    const t = { ...m.tendencias, horas: { ...m.tendencias.horas!, total: null, estimadas: null, acciones: null } }
    act(() => root.render(<DireccionElegida datos={datos({ tendencias: lista(t) })} acciones={acciones} />))
    const horas = container.querySelector('[data-testid="mando-horas"]')?.textContent ?? ''
    expect(horas).toContain('12\u00a0h')
    expect(horas).toContain('La parte estimada no llegó')
  })
})
