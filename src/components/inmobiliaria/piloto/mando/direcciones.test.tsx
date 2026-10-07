/**
 * Las tres direcciones del centro de mando (fase 1) pintan con datos reales de
 * forma (la muestra), con el piloto automático APAGADO (como el laboratorio) y
 * con cada lectura caída o sin publicar: fail-soft por pieza, ningún 0 inventado.
 */
import * as React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
void React

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))

import type { PilotoFlotaResponse } from '@/lib/api/piloto'

import { DireccionCabina } from './DireccionCabina'
import { DireccionElegida } from './DireccionElegida'
import { DireccionMision } from './DireccionMision'
import { DireccionNucleo } from './DireccionNucleo'
import { crearMuestra } from './muestra'
import type { DatosDelMando, Pieza, PropsDeDireccion } from './tipos'

const lista = <T,>(data: T): Pieza<T> => ({ data, isLoading: false, error: null, notAvailable: false })

function datosDeMuestra(): DatosDelMando {
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
  }
}

/**
 * Apagado y SIN ACTIVAR (se puede encender), sin director. Con Leasefy apagado
 * no se invita a encenderlo: eso lo prueba `invitacion-a-encender.test.tsx`
 * (QA-PILOTO-95, 06-10).
 */
function datosApagados(): DatosDelMando {
  const m = crearMuestra(Date.now())
  const flota: PilotoFlotaResponse = {
    ...m.flota,
    activo: false,
    piloto: { activo: false, motivo: 'sin_activar', frase: 'El piloto automático todavía no está activo en tu inmobiliaria.', prueba: null, sinVencimiento: false, maestro: true, sePuedeActivar: true },
  }
  return {
    ...datosDeMuestra(),
    fuente: 'real',
    flota: lista(flota),
    hoy: lista({ ...m.hoy, encendido: false, ordenes: [], resumen: null, ciclo: null }),
    metas: lista({ encendido: false, metas: [], sinMeta: [] }),
    briefing: lista({ resumen: ['Lo que espera son tareas de la operación.'] }),
  }
}

function datosCaidos(): DatosDelMando {
  const caida = { data: null, isLoading: false, error: new Error('500'), notAvailable: false }
  const noPublicada = { data: null, isLoading: false, error: null, notAvailable: true }
  return {
    fuente: 'real',
    limiteDeActividad: 50,
    pulso: caida,
    bandeja: caida,
    actividad: noPublicada,
    briefing: noPublicada,
    flota: caida,
    hoy: noPublicada,
    metas: noPublicada,
  }
}

const acciones: PropsDeDireccion['acciones'] = { abrirItem: vi.fn(), abrirAlerta: vi.fn() }

const DIRECCIONES = [
  ['★ Elegida', DireccionElegida, 'mando-elegida'],
  ['A · Núcleo', DireccionNucleo, 'mando-nucleo'],
  ['B · Cabina', DireccionCabina, 'mando-cabina'],
  ['C · Misión del día', DireccionMision, 'mando-mision'],
] as const

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

describe.each(DIRECCIONES)('%s', (_nombre, Direccion, testid) => {
  it('pinta encendido con la muestra: las decisiones, lo urgente y el agente que trabaja', () => {
    act(() => root.render(<Direccion datos={datosDeMuestra()} acciones={acciones} />))
    const texto = container.textContent ?? ''
    expect(container.querySelector(`[data-testid="${testid}"]`)).not.toBeNull()
    expect(texto).toContain('Decisiones que esperan')
    expect(texto).toContain('Emitir 41 facturas de octubre')
    expect(texto).not.toContain('undefined')
    expect(texto).not.toContain('NaN')
  })

  it('apagado: lo dice, invita a encenderlo y no inventa plan ni metas', () => {
    act(() => root.render(<Direccion datos={datosApagados()} acciones={acciones} activacion={<div id="piloto-activacion">activación</div>} />))
    const texto = container.textContent ?? ''
    expect(texto).toMatch(/apagado/i)
    expect(texto).toContain('Enciende el piloto automático')
    expect(container.querySelector('a[href="#piloto-activacion"]')).not.toBeNull()
    expect(texto).not.toContain('NaN')
  })

  it('con las lecturas caídas: no se cae entera ni pinta ceros inventados', () => {
    act(() => root.render(<Direccion datos={datosCaidos()} acciones={acciones} />))
    const texto = container.textContent ?? ''
    expect(container.querySelector(`[data-testid="${testid}"]`)).not.toBeNull()
    expect(texto).not.toMatch(/\b0 de 0\b/)
    expect(texto).not.toContain('NaN')
  })
})

describe('★ Elegida (Nico, 05-10): la Cabina con el núcleo arriba y la línea del día', () => {
  const cuantas = (texto: string, aguja: string) => texto.split(aguja).length - 1

  it('el orden: núcleo, «Hoy, hora por hora», la Cabina y la tripulación', () => {
    act(() => root.render(<DireccionElegida datos={datosDeMuestra()} acciones={acciones} />))
    const raiz = container.querySelector('[data-testid="mando-elegida"]')!
    const hijos = [...raiz.children]
    expect(hijos[0]?.querySelector('[data-testid="mando-nucleo-cabecera"]') ?? hijos[0]).toBeTruthy()
    expect(raiz.querySelector('[data-testid="mando-nucleo-cabecera"]')).not.toBeNull()
    expect(hijos[1]?.textContent).toContain('Hoy, hora por hora')
    expect(raiz.textContent).toContain('Plan del día')
    expect(raiz.textContent).toContain('Lo urgente')
    expect(raiz.textContent).toContain('En vivo')
    expect(raiz.textContent).toContain('La tripulación')
    expect(raiz.textContent).toContain('Lo que viene')
  })

  it('cada número una vez: sin las tarjetas que el núcleo ya dice, sin píldoras de severidad, sin el avance repetido', () => {
    act(() => root.render(<DireccionElegida datos={datosDeMuestra()} acciones={acciones} />))
    const texto = container.textContent ?? ''
    expect(cuantas(texto, 'Recuperado este mes')).toBe(1)
    expect(cuantas(texto, 'Decisiones que esperan')).toBe(1)
    expect(cuantas(texto, 'Agentes en servicio')).toBe(1)
    // La tarjeta «Hoy» se fue: las llamadas las dice la telemetría (una vez) y «Resueltas hoy» era sólo suya.
    expect(cuantas(texto, 'Llamadas hoy')).toBe(1)
    expect(texto).not.toContain('Resueltas hoy')
    expect(texto).not.toContain('1 crítica') // las píldoras del núcleo: lo dice «Alertas»
    // El avance del plan lo dice su medidor (y su descripción para el lector); Plan del día no lo repite.
    expect(cuantas(texto, 'de 9 órdenes hechas')).toBe(1)
    // Los paneles de cristal de la A tampoco: los dicen «Lo urgente» y «En vivo».
    expect(texto).not.toContain('Hicieron solos hoy')
  })

  it('lo que la torre tenía se abre desde su tarjeta: la Bandeja, la actividad y el director', () => {
    const abrirBandeja = vi.fn()
    const abrirActividad = vi.fn()
    const abrirDirector = vi.fn()
    act(() => root.render(<DireccionElegida datos={datosDeMuestra()} acciones={{ ...acciones, abrirBandeja, abrirActividad, abrirDirector }} />))
    const boton = (nombre: string) => [...container.querySelectorAll('button')].find((b) => b.textContent?.includes(nombre))
    act(() => boton('Abrir la Bandeja')?.click())
    act(() => boton('Ver toda la actividad')?.click())
    act(() => boton('Abrir el plan')?.click())
    expect(abrirBandeja).toHaveBeenCalledTimes(1)
    expect(abrirActividad).toHaveBeenCalledTimes(1)
    expect(abrirDirector).toHaveBeenCalledTimes(1)
  })

  it('sin esos cajones (la muestra), no hay botones muertos', () => {
    act(() => root.render(<DireccionElegida datos={datosDeMuestra()} acciones={acciones} />))
    const textos = [...container.querySelectorAll('button')].map((b) => b.textContent ?? '')
    expect(textos.some((t) => t.includes('Abrir la Bandeja') || t.includes('Ver toda la actividad') || t.includes('Abrir el plan'))).toBe(false)
  })
})
