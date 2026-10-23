/**
 * AgenteDePagos — lo que se ve, en cada estado de la lectura del gobierno.
 *
 * El defecto que no puede volver: la Sala retirada del agente de Pagos
 * pintaba ocho indicadores en «—» porque las rutas del tablero no existían.
 * 🔴 (14-10-2026) Tampoco hay un paso «Su tablero publicado» en «Falta»: esa
 * ruta no existe en el micro y no es lo que el equipo necesita para trabajar.
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

// La sección de Cobri tiene sus propias lecturas y su prueba (`CobriEsteMes.test.tsx`):
// acá sólo importa que esté, entre los pasos y el equipo.
vi.mock('./CobriEsteMes', () => ({
  // r25 (#1): la cifra de Cobri arriba, lo que necesita el equipo debajo de ella y, después, su sección.
  CobriEsteMes: ({ debajoDeLaCifra }: { debajoDeLaCifra?: React.ReactNode }) =>
    React.createElement(
      React.Fragment,
      null,
      React.createElement('div', { 'data-testid': 'cobri-la-respuesta' }),
      debajoDeLaCifra,
      React.createElement('section', { 'data-testid': 'cobri-este-mes' }),
    ),
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

describe('AgenteDePagos — hoy: interruptor apagado', () => {
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
  })

  it('🔴 (14-10) ni paso ni tablero del micro: no pide lo que no existe', () => {
    render(lectura({}))
    expect(q('[data-testid="paso-tablero"]')).toBeNull()
    expect(q('[data-testid="tablero-del-equipo"]')).toBeNull()
    expect(contenedor.textContent).not.toContain('tablero')
    // Ningún elemento cuyo texto entero sea una raya (el guion largo sí
    // aparece dentro de frases, como inciso).
    const rayas = [...contenedor.querySelectorAll('*')].filter((el) => (el.textContent ?? '').trim() === '—')
    expect(rayas).toHaveLength(0)
  })

  it('presenta a los seis del equipo, cada uno con lo que hace (COBRI-6: los que corren)', () => {
    render(lectura({}))
    for (const id of ['pagui', 'cuenti', 'cobri', 'reti', 'giri', 'noti']) {
      expect(q(`[data-testid="especialista-${id}"]`), id).not.toBeNull()
    }
    for (const viejo of ['Gabriela', 'Nicolás', 'Valentina', 'Samuel', 'Sofía']) {
      expect(contenedor.textContent, viejo).not.toContain(viejo)
    }
  })

  it('🔴 enlaza a donde se ve el trabajo —las pantallas que se mudaron—, no las repite', () => {
    render(lectura({}))
    const enlaces = [...contenedor.querySelectorAll('a')].map((a) => a.getAttribute('href'))
    expect(enlaces).toEqual(
      expect.arrayContaining([
        '/panel/inmobiliaria/pagos/cobranza/fallidos',
        '/panel/inmobiliaria/pagos/dispersiones/lotes',
        '/panel/inmobiliaria/piloto?bandeja=1',
        '/panel/inmobiliaria/piloto?actividad=1',
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
    const reti = q('[data-testid="especialista-reti"]')
    expect(reti?.textContent).toContain('Cobranza › Pagos fallidos')
    expect(reti?.querySelector('a')).toBeNull()
    // Inicio lo ve cualquier miembro: la Bandeja de Cuenti siempre se enlaza.
    expect(q('[data-testid="especialista-cuenti"] a')?.getAttribute('href')).toBe('/panel/inmobiliaria/piloto?bandeja=1')
  })

  it('con todo leído no ofrece «Volver a consultar»: no hay nada sin verificar', () => {
    render(lectura({}))
    expect(contenedor.textContent).not.toContain('Volver a consultar')
  })
})

describe('AgenteDePagos — cuando una lectura falla', () => {
  it('🔴 dice «sin verificar», nunca «apagado», y ofrece volver a consultar', () => {
    const reintentar = vi.fn(async () => {})
    render(lectura({ gobierno: { estado: 'fallo' }, reintentar }))
    expect(q('[data-testid="estado-del-equipo"]')?.getAttribute('data-estado')).toBe('sin-verificar')
    expect(estadoDe('leasefy')).toBe('sin-verificar')
    expect(estadoDe('inmobiliaria')).toBe('sin-verificar')
    const boton = [...contenedor.querySelectorAll('button')].find((b) => b.textContent?.includes('Volver a consultar'))
    expect(boton).toBeTruthy()
    act(() => boton!.click())
    expect(reintentar).toHaveBeenCalledTimes(1)
  })
})

describe('AgenteDePagos — con las llaves', () => {
  it('con las dos llaves: encendido y los dos pasos listos', () => {
    render(lectura({ gobierno: { estado: 'listo', item: item(true, true) } }))
    expect(q('[data-testid="estado-del-equipo"]')?.getAttribute('data-estado')).toBe('encendido')
    expect(['leasefy', 'inmobiliaria'].map(estadoDe)).toEqual(['hecho', 'hecho'])
  })

  it('encendido en el servidor pero no para la inmobiliaria: dice que falta encenderlo aquí', () => {
    render(lectura({ gobierno: { estado: 'listo', item: item(true, false) } }))
    expect(q('[data-testid="estado-del-equipo"]')?.getAttribute('data-estado')).toBe('apagado-para-tu-inmobiliaria')
    expect(estadoDe('leasefy')).toBe('hecho')
    expect(estadoDe('inmobiliaria')).toBe('falta')
  })

  it('Cobri (08-10): su sección va entre lo que necesita el equipo y quién es quién', () => {
    render(lectura({}))
    const cobri = q('[data-testid="cobri-este-mes"]')
    expect(cobri).not.toBeNull()
    const pasos = q('[data-testid="paso-leasefy"]')
    const equipo = q('[data-testid="especialista-pagui"]')
    expect(pasos!.compareDocumentPosition(cobri!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    // r25 (#1): la respuesta (la cifra de Cobri) va ANTES de lo que necesita: pegada al encabezado.
    const respuesta = q('[data-testid="cobri-la-respuesta"]')
    expect(respuesta!.compareDocumentPosition(pasos!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(cobri!.compareDocumentPosition(equipo!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
