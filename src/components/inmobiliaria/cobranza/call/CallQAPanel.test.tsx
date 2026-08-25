/**
 * CallQAPanel.test.tsx — la tarjeta «Calidad de la llamada».
 *
 * Por qué existe: la tarjeta decía «QA pendiente.» en el 100 % de las llamadas
 * aunque la base ya tuviera el puntaje. El panel leía
 * `{ rapport, compliance, resolution, sentiment }` y el evaluador escribe
 * `{ empatia, claridad, adherencia, objeciones }` — los cuatro campos llegaban
 * en `null` y el `allNull` daba siempre `true`.
 *
 * Las etiquetas se resuelven contra el es.json REAL (i18n-test-stub), así que
 * estas pruebas también fallan si alguien saca una clave de traducción sin
 * tocar el panel.
 *
 * Render con `react-dom/client` + `act`, que es el patrón de los demás
 * `*.test.tsx` del repo (no hay `@testing-library/react` instalado).
 */

import * as React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))

import CallQAPanel from './CallQAPanel'
import type { CallQAScores } from '@/lib/hooks/cobranza/use-call-detail'

/** La llamada real 01a034e9: dimensiones 3/3/3/3 del evaluador → 60/100. */
const CON_PUNTAJE: CallQAScores = {
  overall: 60,
  empatia: 60,
  claridad: 60,
  adherencia: 60,
  objeciones: 60,
  compliance: null,
  violations: [],
  quality: null,
}

/**
 * Lo que llega para una llamada vieja con las claves antiguas: el agente las
 * ignora a propósito y manda las cuatro dimensiones en `null`.
 */
const SIN_PUNTAJE: CallQAScores = {
  overall: null,
  empatia: null,
  claridad: null,
  adherencia: null,
  objeciones: null,
  compliance: null,
  violations: [],
  quality: null,
}

let host: HTMLDivElement | null = null
let root: Root | null = null

function render(qa: CallQAScores): HTMLDivElement {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root!.render(<CallQAPanel qa={qa} />)
  })
  return host
}

afterEach(() => {
  act(() => root?.unmount())
  host?.remove()
  root = null
  host = null
})

const textos = (el: HTMLElement) =>
  Array.from(el.querySelectorAll('span')).map((n) => n.textContent)

const barras = (el: HTMLElement) =>
  Array.from(el.querySelectorAll('[role="progressbar"]'))

const barraDe = (el: HTMLElement, label: string) =>
  el.querySelector(`[role="progressbar"][aria-label="${label}"]`)

describe('CallQAPanel', () => {
  it('con puntaje NO dice «QA pendiente»', () => {
    expect(render(CON_PUNTAJE).textContent).not.toContain('QA pendiente')
  })

  it('rotula las cuatro dimensiones que el evaluador mide de verdad', () => {
    const el = render(CON_PUNTAJE)
    expect(textos(el)).toEqual(
      expect.arrayContaining([
        'Empatía',
        'Claridad',
        'Adherencia al guion',
        'Manejo de objeciones',
      ]),
    )
  })

  it('ya no rotula las dimensiones que nadie calificaba', () => {
    const el = render(CON_PUNTAJE)
    for (const inventada of ['Trato', 'Cumplimiento', 'Resolución', 'Sentimiento']) {
      expect(textos(el)).not.toContain(inventada)
    }
  })

  it('dibuja una barra por dimensión + la general, en escala 0-100', () => {
    const el = render(CON_PUNTAJE)
    expect(barras(el)).toHaveLength(5) // General + 4 dimensiones
    for (const b of barras(el)) {
      expect(b.getAttribute('aria-valuenow')).toBe('60')
      expect(b.getAttribute('aria-valuemax')).toBe('100')
    }
    // El texto imprime el número sobre 100, no la nota cruda 0-5.
    expect(textos(el).filter((t) => t === '60/100')).toHaveLength(5)
  })

  it('cada dimensión nueva es una barra accesible por su nombre', () => {
    const el = render(CON_PUNTAJE)
    for (const label of [
      'Empatía',
      'Claridad',
      'Adherencia al guion',
      'Manejo de objeciones',
    ]) {
      expect(barraDe(el, label)).not.toBeNull()
    }
  })

  it('sin ninguna dimensión sigue diciendo «QA pendiente» y no se rompe', () => {
    const el = render(SIN_PUNTAJE)
    expect(el.textContent).toContain('QA pendiente')
    expect(barras(el)).toHaveLength(0)
  })

  it('con una sola dimensión presente ya muestra el desglose', () => {
    const el = render({ ...SIN_PUNTAJE, adherencia: 20, overall: 20 })
    expect(el.textContent).not.toContain('QA pendiente')
    expect(barraDe(el, 'Adherencia al guion')?.getAttribute('aria-valuenow')).toBe(
      '20',
    )
    // Las que no llegaron se dibujan vacías («—»), no en cero rojo.
    expect(textos(el).filter((t) => t === '—').length).toBeGreaterThan(0)
  })
})
