/**
 * COBRANZA-MANUAL (04-10-2026): lo del agente y lo del equipo, juntos y
 * distinguidos; la promesa con su estado y lo que falta.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ formatCurrency: (n: number) => `$ ${n.toLocaleString('es-CO')}` }),
}))

import { HistorialDeGestiones, cuandoParaLaPersona } from './HistorialDeGestiones'

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

describe('<HistorialDeGestiones>', () => {
  it('🔴 SO-17: la promesa que dejó una nueva se dice «Promesa reemplazada», sin «no entró ningún pago»', () => {
    act(() => {
      root.render(
        <HistorialDeGestiones
          entradas={[
            {
              id: 'g0',
              origen: 'equipo',
              cuando: '2026-10-04T15:30:00.000Z',
              tipo: 'LLAMADA',
              tipoTexto: 'Llamada',
              resultado: 'PROMETIO_PAGAR',
              resultadoTexto: 'Prometió pagar',
              comentario: null,
              quien: 'Ana Gómez',
              promesa: { fecha: '2026-10-10', montoCop: 1500000, estado: 'REEMPLAZADA', abonadoCop: 0, faltaCop: 1500000 },
            },
          ]}
        />,
      )
    })
    const promesa = container.querySelector('[data-testid="historial-promesa"]')
    expect(promesa?.textContent).toContain('Promesa reemplazada')
    expect(promesa?.textContent).not.toContain('no entró ningún pago')
  })

  it('distingue al equipo del agente y dice la promesa incumplida con lo que falta', () => {
    act(() => {
      root.render(
        <HistorialDeGestiones
          entradas={[
            {
              id: 'g1',
              origen: 'equipo',
              cuando: '2026-10-04T15:30:00.000Z',
              tipo: 'LLAMADA',
              tipoTexto: 'Llamada',
              resultado: 'PROMETIO_PAGAR',
              resultadoTexto: 'Prometió pagar',
              comentario: 'Le pagan el viernes',
              quien: 'Ana Gómez',
              promesa: { fecha: '2026-10-06', montoCop: 1500000, estado: 'INCUMPLIDA', abonadoCop: 500000, faltaCop: 1000000 },
            },
            {
              id: 'agente-llamada-c1',
              origen: 'agente',
              cuando: '2026-10-03T14:00:00.000Z',
              tipo: 'LLAMADA',
              tipoTexto: 'Llamada',
              resultado: 'no_answer',
              resultadoTexto: 'No contestó',
              comentario: null,
              quien: 'Laura, el agente de cobranza',
              promesa: null,
            },
          ]}
        />,
      )
    })
    const filas = container.querySelectorAll('[data-testid="historial-entrada"]')
    expect([...filas].map((f) => f.getAttribute('data-origen'))).toEqual(['equipo', 'agente'])
    expect(filas[0].textContent).toContain('Equipo')
    expect(filas[0].textContent).toContain('Prometió pagar')
    expect(filas[0].textContent).toContain('Promesa incumplida')
    expect(filas[0].textContent).toContain('6 de octubre de 2026')
    expect(filas[0].textContent).toContain('faltan $ 1.000.000')
    expect(filas[0].textContent).toContain('Ana Gómez · 4 de octubre de 2026')
    expect(filas[1].textContent).toContain('Agente')
    expect(filas[1].textContent).toContain('Laura, el agente de cobranza')
  })

  it('vacío: lo dice', () => {
    act(() => root.render(<HistorialDeGestiones entradas={[]} />))
    expect(container.textContent).toContain('Todavía no hay gestiones')
  })

  it('la fecha y la hora de Colombia', () => {
    expect(cuandoParaLaPersona('2026-10-05T02:30:00.000Z')).toMatch(/^4 de octubre de 2026, 9:30/)
  })
})
