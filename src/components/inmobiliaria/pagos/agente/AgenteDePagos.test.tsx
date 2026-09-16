/**
 * AgenteDePagos — lo que se ve, en cada estado de las dos lecturas.
 *
 * El defecto que no puede volver: la Sala retirada del agente de Pagos
 * pintaba ocho indicadores en «—» porque las rutas del tablero no existían.
 * Esta pantalla no dibuja un número hasta que el micro lo publica, y mientras
 * tanto dice con palabras qué falta.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as React from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('next/link', () => ({
  default: ({ children, href, ...resto }: { children: React.ReactNode; href: string } & Record<string, unknown>) =>
    React.createElement('a', { href, ...resto }, children),
}))

const permisos = { modulos: null as string[] | null, isAdmin: true, agencyRole: 'ADMIN' as string | null }

vi.mock('@/lib/context/PermissionsContext', () => ({
  usePermissionsContext: () => ({
    canAccess: (m: string) => permisos.modulos === null || permisos.modulos.includes(m),
    isAdmin: permisos.isAdmin,
    agencyRole: permisos.agencyRole,
    agentAccessStatus: 'resuelto',
  }),
}))

import { AgenteDePagos } from './AgenteDePagos'
import type { AgenteDePagosLectura } from '@/lib/hooks/use-agente-de-pagos'
import type { GobiernoItem } from '@/lib/api/piloto'

let contenedor: HTMLDivElement
let root: Root

const item = (disponibleGlobal: boolean, corre: boolean): GobiernoItem => ({
  agente: 'pagos',
  disponibleGlobal,
  corre,
  origen: 'heredado',
})

function lectura(parcial: Partial<AgenteDePagosLectura>): AgenteDePagosLectura {
  return {
    gobierno: { estado: 'listo', item: item(false, false) },
    tablero: { estado: 'no-disponible' },
    resumen: null,
    reintentar: vi.fn(async () => {}),
    ...parcial,
  }
}

function render(l: AgenteDePagosLectura) {
  act(() => {
    root.render(<AgenteDePagos lectura={l} />)
  })
}

const q = (sel: string) => contenedor.querySelector(sel)
const estadoDe = (paso: string) => q(`[data-testid="paso-${paso}"]`)?.getAttribute('data-estado')

beforeEach(() => {
  permisos.modulos = null
  permisos.isAdmin = true
  permisos.agencyRole = 'ADMIN'
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  root = createRoot(contenedor)
})

afterEach(() => {
  act(() => root.unmount())
  contenedor.remove()
})

describe('AgenteDePagos — hoy: interruptor apagado y tablero sin publicar', () => {
  it('dice que está apagado, con icono y palabra (no sólo color)', () => {
    render(lectura({}))
    const pildora = q('[data-testid="estado-del-equipo"]')
    expect(pildora?.getAttribute('data-estado')).toBe('apagado-en-leasefy')
    expect(pildora?.textContent).toContain('Apagado')
    expect(pildora?.querySelector('svg')).not.toBeNull()
  })

  it('lista lo que falta, cada paso con su estado', () => {
    render(lectura({}))
    expect(estadoDe('leasefy')).toBe('falta')
    expect(estadoDe('inmobiliaria')).toBe('espera')
    expect(estadoDe('tablero')).toBe('falta')
  })

  it('🔴 no dibuja ni un indicador en «—»: sin tablero publicado no hay tablero', () => {
    render(lectura({}))
    expect(q('[data-testid="tablero-del-equipo"]')).toBeNull()
    // Ningún elemento cuyo texto entero sea una raya (el guion largo sí
    // aparece dentro de frases, como inciso).
    const rayas = [...contenedor.querySelectorAll('*')].filter((el) => (el.textContent ?? '').trim() === '—')
    expect(rayas).toHaveLength(0)
  })

  it('presenta a los seis del equipo, cada uno con lo que hace', () => {
    render(lectura({}))
    for (const id of ['gabriela', 'laura', 'nicolas', 'valentina', 'samuel', 'sofia']) {
      expect(q(`[data-testid="especialista-${id}"]`), id).not.toBeNull()
    }
  })

  it('🔴 enlaza a donde se ve el trabajo —las pantallas que se mudaron—, no las repite', () => {
    render(lectura({}))
    const enlaces = [...contenedor.querySelectorAll('a')].map((a) => a.getAttribute('href'))
    expect(enlaces).toEqual(
      expect.arrayContaining([
        '/panel/inmobiliaria/pagos/cobranza/fallidos',
        '/panel/inmobiliaria/pagos/cobranza/recordatorios',
        '/panel/inmobiliaria/pagos/liquidaciones',
        '/panel/inmobiliaria/pagos/cartera/cobros',
      ]),
    )
    // Ni pestañas propias ni una tabla de pagos fallidos acá adentro.
    expect(contenedor.querySelector('table')).toBeNull()
  })

  it('sin permiso para abrir una pantalla, la nombra pero no la enlaza', () => {
    permisos.isAdmin = false
    permisos.agencyRole = 'CONTADOR'
    permisos.modulos = ['cobros'] // sin `cobranza`
    render(lectura({}))
    const valentina = q('[data-testid="especialista-valentina"]')
    expect(valentina?.textContent).toContain('Cobranza › Pagos fallidos')
    expect(valentina?.querySelector('a')).toBeNull()
    expect(q('[data-testid="especialista-laura"] a')?.getAttribute('href')).toBe('/panel/inmobiliaria/pagos/cartera/cobros')
  })

  it('con todo leído no ofrece «Volver a consultar»: no hay nada sin verificar', () => {
    render(lectura({}))
    expect(contenedor.textContent).not.toContain('Volver a consultar')
  })
})

describe('AgenteDePagos — cuando una lectura falla', () => {
  it('🔴 dice «sin verificar», nunca «apagado», y ofrece volver a consultar', () => {
    const reintentar = vi.fn(async () => {})
    render(lectura({ gobierno: { estado: 'fallo' }, tablero: { estado: 'fallo', error: new Error('500') }, reintentar }))
    expect(q('[data-testid="estado-del-equipo"]')?.getAttribute('data-estado')).toBe('sin-verificar')
    expect(estadoDe('leasefy')).toBe('sin-verificar')
    expect(estadoDe('tablero')).toBe('sin-verificar')
    const boton = [...contenedor.querySelectorAll('button')].find((b) => b.textContent?.includes('Volver a consultar'))
    expect(boton).toBeTruthy()
    act(() => boton!.click())
    expect(reintentar).toHaveBeenCalledTimes(1)
  })
})

describe('AgenteDePagos — el día que el backend exista, se prende sola', () => {
  it('con las dos llaves y el tablero publicado, muestra los números y los pendientes', () => {
    render(
      lectura({
        gobierno: { estado: 'listo', item: item(true, true) },
        tablero: { estado: 'listo' },
        resumen: {
          agente: 'pagos',
          kpis: [
            { id: 'cobros_enviados', label: 'Cobros enviados', value: 12, format: 'number' },
            { id: 'valor_recaudado', label: 'Valor recaudado', value: 2500000, format: 'cop' },
          ],
          pipeline: [],
          feed: [{ id: 'a1', titulo: 'Link vencido de Ana', detalle: 'Reenviar', actorType: 'system', occurredAt: '' }],
          generatedAt: '2026-09-16T00:00:00.000Z',
        },
      }),
    )
    expect(q('[data-testid="estado-del-equipo"]')?.getAttribute('data-estado')).toBe('encendido')
    expect(['leasefy', 'inmobiliaria', 'tablero'].map(estadoDe)).toEqual(['hecho', 'hecho', 'hecho'])
    const tablero = q('[data-testid="tablero-del-equipo"]')
    expect(tablero?.textContent).toContain('Cobros enviados')
    expect(tablero?.textContent).toContain('12')
    expect(tablero?.textContent).toContain('2.500.000')
    expect(tablero?.textContent).toContain('Link vencido de Ana')
  })

  it('encendido en el servidor pero no para la inmobiliaria: dice que falta encenderlo acá', () => {
    render(lectura({ gobierno: { estado: 'listo', item: item(true, false) } }))
    expect(q('[data-testid="estado-del-equipo"]')?.getAttribute('data-estado')).toBe('apagado-para-tu-inmobiliaria')
    expect(estadoDe('leasefy')).toBe('hecho')
    expect(estadoDe('inmobiliaria')).toBe('falta')
  })
})
