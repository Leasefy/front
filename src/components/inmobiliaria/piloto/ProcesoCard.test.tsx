/**
 * Una tarjeta del process view.
 *
 * Lo que se protege: que la tarjeta cuente lo que el micro dijo (título en
 * primera persona, resumen, chip de resultado, quién e inmueble), que el
 * riel tenga UN punto por paso con su estado, que expandir muestre los pasos
 * con su detalle (y los mensajes de WhatsApp como burbujas), y que una
 * llamada en curso se vea viva. No se clava copy: se prueban propiedades.
 */

import * as React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'es' }),
}))
vi.mock('@/components/inmobiliaria/ai/ColaHumana', () => ({
  relativeTime: () => 'hace 2 h',
}))
vi.mock('@/lib/format', () => ({ formatCurrency: (n: number) => `$${n}` }))

import { ProcesoCard } from './ProcesoCard'
import type { Proceso } from '@/lib/api/piloto'

const DEPOSITO: Proceso = {
  id: 'mov:m-1',
  tipo: 'deposito',
  agente: 'conciliacion',
  estado: 'hecho',
  titulo: 'Detecté un depósito de $2.400.000',
  resumen: 'Lo concilié solo con el canon de septiembre de Carlos R. · recibo #1.',
  resultado: 'Conciliado solo',
  quien: { nombre: 'Carlos R.', inmueble: 'Apartamento en Laureles' },
  montoCop: 2_400_000,
  inicioAt: '2026-09-02T01:14:54.381-05:00',
  ultimoAt: '2026-09-02T01:14:59.619-05:00',
  pasos: [
    { at: '2026-09-02T01:14:54.381-05:00', titulo: 'Depósito detectado', detalle: 'extracto x · PAGO ARRIENDO', estado: 'hecho' },
    { at: '2026-09-02T01:14:59.619-05:00', titulo: 'Busqué el cobro', detalle: 'Carlos R. · canon de septiembre', estado: 'hecho' },
    { at: '2026-09-02T01:14:59.619-05:00', titulo: 'Conciliado por el Piloto', detalle: 'Recibo de caja #1', estado: 'hecho' },
  ],
  enVivo: false,
  enlace: { label: 'Ver en el extracto', href: '/panel/inmobiliaria/conciliacion/movimientos' },
}

let container: HTMLDivElement
let root: Root
function render(p: Proceso, onAbrir?: (id: string) => void, expandida = false) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root.render(<ProcesoCard proceso={p} {...(onAbrir ? { onAbrir } : {})} expandida={expandida} />)
  })
}
afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

describe('ProcesoCard', () => {
  it('cuenta el proceso: título, resumen, chip, quién, y un punto por paso', () => {
    render(DEPOSITO)
    expect(container.textContent).toContain('Detecté un depósito de $2.400.000')
    expect(container.textContent).toContain('recibo #1')
    expect(container.querySelector('[data-testid="proceso-resultado"]')?.textContent).toContain('Conciliado solo')
    expect(container.textContent).toContain('Carlos R. · Apartamento en Laureles')
    const riel = container.querySelector('ol[aria-label]')!
    expect(riel.querySelectorAll('li')).toHaveLength(3)
    // Plegada: el detalle de los pasos no está.
    expect(container.querySelector('[data-testid="proceso-detalle-mov:m-1"]')).toBeNull()
    expect(container.querySelector('a')?.getAttribute('href')).toBe('/panel/inmobiliaria/conciliacion/movimientos')
  })

  it('expandir muestra cada paso con su detalle; el título abre el cajón', async () => {
    const abiertos: string[] = []
    render(DEPOSITO, (id) => abiertos.push(id))
    await act(async () => {
      ;(container.querySelector('[data-testid="proceso-pasos-mov:m-1"]') as HTMLButtonElement).click()
    })
    const detalle = container.querySelector('[data-testid="proceso-detalle-mov:m-1"]')!
    expect(detalle.textContent).toContain('Recibo de caja #1')
    expect(detalle.textContent).toContain('PAGO ARRIENDO')
    await act(async () => {
      ;(container.querySelector('[data-testid="proceso-abrir-mov:m-1"]') as HTMLButtonElement).click()
    })
    expect(abiertos).toEqual(['mov:m-1'])
  })

  it('una llamada en curso se ve viva (onda, chip con pulso) y arranca expandida', () => {
    render(
      {
        ...DEPOSITO,
        id: 'call:c-1',
        tipo: 'llamada',
        agente: 'cobranza',
        estado: 'en_curso',
        titulo: 'Estoy hablando con Nicolás G.',
        resultado: 'En curso',
        enVivo: true,
        montoCop: null,
        pasos: [
          { at: '2026-09-02T19:58:00-05:00', titulo: 'Llamé a Nicolás G.', estado: 'hecho' },
          { at: null, titulo: 'Hablando ahora', detalle: '2 turnos', estado: 'en_curso' },
        ],
        enlace: null,
      },
      undefined,
      true,
    )
    const card = container.querySelector('[data-testid="proceso-call:c-1"]')!
    expect(card.getAttribute('data-estado')).toBe('en_curso')
    expect(card.querySelector('[class*="animate-onda"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="proceso-detalle-call:c-1"]')).not.toBeNull()
  })

  it('WhatsApp: los mensajes salen como burbujas, los míos a la derecha', async () => {
    render({
      ...DEPOSITO,
      id: 'wa:t-1',
      tipo: 'whatsapp',
      agente: 'cobranza',
      estado: 'esperando',
      titulo: 'María F. me escribió por WhatsApp',
      resultado: 'Reporta un pago',
      montoCop: null,
      pasos: [{ at: '2026-08-08T12:19:00-05:00', titulo: 'María F. me escribió', detalle: 'Comprobante 4471', estado: 'hecho' }],
      mensajes: [
        { at: '2026-08-08T11:19:00-05:00', de: 'yo', texto: 'Hola, te escribimos por el canon.' },
        { at: '2026-08-08T12:19:00-05:00', de: 'ellos', texto: 'Comprobante 4471' },
      ],
    })
    await act(async () => {
      ;(container.querySelector('[data-testid="proceso-pasos-wa:t-1"]') as HTMLButtonElement).click()
    })
    const burbujas = container.querySelectorAll('[data-testid="proceso-mensajes"] > div')
    expect(burbujas).toHaveLength(2)
    expect(burbujas[0]?.className).toContain('justify-end')
    expect(burbujas[1]?.className).toContain('justify-start')
    expect(burbujas[1]?.textContent).toContain('Comprobante 4471')
  })
})
