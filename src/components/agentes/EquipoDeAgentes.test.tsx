import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ agency: { id: 'agencia-1' } }) }))

import type { ActivityItem, PilotoFlotaResponse } from '@/lib/api/piloto'
import { NOMBRE_DEL_ORQUESTADOR } from '@/lib/agentes/nombre-del-orquestador'
import { EQUIPO } from '@/lib/agentes/equipo'

import { EquipoDeAgentes } from './EquipoDeAgentes'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const flota: PilotoFlotaResponse = {
  activo: true,
  modo: 'copiloto',
  agentes: [
    { agente: 'chat', modo: 'copiloto', origen: 'default', corre: true, gobierna: true, actua: true, efectoReal: 'Cada acción te la deja lista en el chat con «¿Lo hago?».' },
    { agente: 'cobranza', modo: 'autonomo', origen: 'piloto', corre: true, gobierna: true, actua: true, efectoReal: 'Laura llama y escribe sola.' },
    { agente: 'pagos', modo: 'copiloto', origen: 'default', corre: false, porQueNoCorre: 'Apagado en el servidor: lo enciende el equipo técnico.' },
    { agente: 'cotizador', modo: 'copiloto', origen: 'default', corre: true, gobierna: false, actua: false },
  ],
  resumen: { sombra: 0, copiloto: 1, autonomo: 1 },
  enVivo: { llamadas: 0, conciliando: 0, esperando: 0 },
  tomadoAt: '2026-10-02T10:00:00-05:00',
}

const actividad: ActivityItem[] = [
  { id: 'a1', at: '2026-10-02T09:00:00-05:00', agente: 'cobranza', tipo: 'promesa', titulo: 'Promesa de pago de Ana M.', detalle: '$1.200.000 para el viernes' },
]

let root: Root | null = null
let contenedor: HTMLDivElement | null = null

afterEach(() => {
  act(() => root?.unmount())
  contenedor?.remove()
  root = null
  contenedor = null
  document.body.innerHTML = ''
})

function abrir(props: Partial<React.ComponentProps<typeof EquipoDeAgentes>> = {}) {
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  root = createRoot(contenedor)
  act(() => {
    root!.render(<EquipoDeAgentes open onOpenChange={() => {}} datos={{ flota, actividad }} {...props} />)
  })
}

const porId = (id: string) => document.querySelector<HTMLElement>(`[data-testid="${id}"]`)
const texto = () => document.body.textContent ?? ''

function clic(el: HTMLElement | null) {
  expect(el).toBeTruthy()
  act(() => el!.click())
}

function escribir(valor: string) {
  const input = porId('equipo-buscar') as HTMLInputElement
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  act(() => {
    setter.call(input, valor)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

describe('<EquipoDeAgentes />', () => {
  it('título, resumen con los activos REALES y todos los agentes por frente', () => {
    abrir()
    expect(texto()).toContain('El equipo de tu inmobiliaria')
    // 2 activos: el chat (orquestador) y cobranza; pagos apagado, cotizador a pedido.
    expect(texto()).toContain(`${EQUIPO.length} agentes en 8 frentes · 2 activos hoy · ${NOMBRE_DEL_ORQUESTADOR} llama`)
    for (const a of EQUIPO) expect(porId(`equipo-fila-${a.id}`), a.id).toBeTruthy()
    expect(texto()).toContain('Cartera y cobros · 1 activo')
  })

  it('abre en el orquestador: su historia, «Hace», «No hace» y la frase real de hoy', () => {
    abrir()
    const detalle = porId('equipo-detalle')!
    expect(detalle.getAttribute('data-agente')).toBe('orquestador')
    expect(detalle.textContent).toContain(NOMBRE_DEL_ORQUESTADOR)
    expect(detalle.textContent).toContain('Es quien habla contigo en el chat')
    expect(porId('equipo-hoy')!.textContent).toContain('Cada acción te la deja lista')
    expect(porId('equipo-estado')!.getAttribute('data-tipo')).toBe('activo')
  })

  it('«→ eso lo hace Laura» lleva a Laura, con su trabajo reciente del feed', async () => {
    abrir()
    clic(porId('equipo-lo-hace-cobranza'))
    // AnimatePresence «wait»: el detalle nuevo entra cuando sale el anterior.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 400))
    })
    const detalle = porId('equipo-detalle')!
    expect(detalle.getAttribute('data-agente')).toBe('cobranza')
    expect(detalle.textContent).toContain('Laura')
    expect(detalle.textContent).toContain('Promesa de pago de Ana M.')
  })

  it('un agente sin trabajo registrado lo dice, no pinta una lista vacía', () => {
    abrir({ agenteInicial: 'conciliacion' })
    expect(porId('equipo-sin-trabajo')!.textContent).toBe('Todavía no hay trabajo suyo registrado en tu inmobiliaria.')
  })

  it('si el feed no se pudo leer, dice eso (no «no hay nada»)', () => {
    abrir({ agenteInicial: 'cobranza', datos: { flota, actividad: [], actividadNoDisponible: true } })
    expect(porId('equipo-sin-trabajo')!.textContent).toMatch(/No pudimos leer su trabajo reciente/)
  })

  it('apagado: la pastilla, el porqué del micro y su orbe sin color', () => {
    abrir({ agenteInicial: 'pagos' })
    const detalle = porId('equipo-detalle')!
    expect(porId('equipo-estado')!.getAttribute('data-tipo')).toBe('apagado')
    expect(detalle.textContent).toContain('Apagado en el servidor: lo enciende el equipo técnico.')
    expect(detalle.querySelector('[data-agente="pagos"][data-estado="apagado"]')).toBeTruthy()
  })

  it('el buscador filtra por nombre, por lo que hace o por sus herramientas, sin tildes', () => {
    abrir()
    escribir('conciliacion')
    expect(porId('equipo-fila-conciliacion')).toBeTruthy()
    expect(porId('equipo-fila-prospectos')).toBeNull()
    escribir('link de pago')
    expect(porId('equipo-fila-pagos')).toBeTruthy()
    // «Firma electrónica» es una herramienta de Vidi, no una frase de «Hace».
    escribir('firma electronica')
    expect(porId('equipo-fila-inspeccion')).toBeTruthy()
    expect(porId('equipo-fila-cobranza')).toBeNull()
    escribir('zzzz')
    expect(texto()).toContain('Nadie del equipo coincide')
  })

  it('sin flota no se afirma ningún activo (ni puntos verdes, ni «activos hoy»)', () => {
    abrir({ datos: { flota: null, actividad: [] } })
    expect(texto()).not.toContain('activos hoy')
    expect(document.querySelectorAll('[aria-label="Activo en tu inmobiliaria"]')).toHaveLength(0)
  })

  it('«En esta conversación» muestra lo que el chat ya le pidió a ese agente', () => {
    abrir({
      agenteInicial: 'cobranza',
      ejecucionesDeLaConversacion: [
        { id: 'e1', agentType: 'cobranza', taskDescription: 'Estrategia para Juan Pérez', status: 'completed', startedAt: new Date() },
        { id: 'e2', agentType: 'pagos', taskDescription: 'Otra cosa', status: 'completed', startedAt: new Date() },
      ],
    })
    expect(texto()).toContain('Estrategia para Juan Pérez')
    expect(texto()).not.toContain('Otra cosa')
  })
})
