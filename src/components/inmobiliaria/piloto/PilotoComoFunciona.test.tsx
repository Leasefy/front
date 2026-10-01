/**
 * «¿Cómo funciona?» del Piloto (Nico, 30-09: quien llega no entiende qué hace
 * la pantalla, qué agentes usa ni qué significa el modo).
 *
 * Se prueba con los textos REALES de `es.json`: un `t` de mentira que devuelve
 * la clave no vería una clave que falta, y en pantalla saldría
 * «inmobiliaria.piloto.comoFunciona…» en vez de la explicación.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

import es from '@/lib/i18n/locales/es.json'
import en from '@/lib/i18n/locales/en.json'
import {
  MODOS_DEL_PILOTO,
  type AgenteDeLaFlota,
  type PilotoFlotaResponse,
} from '@/lib/api/piloto'

type Dic = Record<string, unknown>
function traducir(dic: Dic, k: string, vars?: Record<string, string>): string {
  const v = k.split('.').reduce<unknown>((o, p) => (o && typeof o === 'object' ? (o as Dic)[p] : undefined), dic)
  if (typeof v !== 'string') return k
  return v.replace(/\{\{(\w+)\}\}/g, (_, n: string) => vars?.[n] ?? '')
}

const h = vi.hoisted(() => ({
  flota: {
    data: null as PilotoFlotaResponse | null,
    isLoading: false,
    error: null as string | null,
    notAvailable: false,
  },
}))

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string, vars?: Record<string, string>) => traducir(es as Dic, k, vars),
    locale: 'es',
  }),
}))
vi.mock('@/lib/hooks/piloto/piloto-flota-context', () => ({
  usePilotoFlotaCompartida: () => ({
    ...h.flota,
    busy: false,
    setModo: vi.fn(),
    refetch: vi.fn(),
  }),
}))
// El panel de autonomía arrastra permisos y auth; de él sólo se usa la pausa.
vi.mock('@/components/inmobiliaria/piloto/PilotoAutonomia', () => ({
  AGENTES_NO_DISPONIBLES: new Set(['retencion', 'prospectos']),
}))

import { PilotoQueEs } from './PilotoQueEs'
import {
  AGENTES_DEL_PILOTO,
  agruparAgentes,
  claveDeLaNovedadDelPiloto,
} from './como-funciona'

const agente = (a: Partial<AgenteDeLaFlota> & { agente: string }): AgenteDeLaFlota => ({
  modo: 'copiloto',
  origen: 'default',
  corre: true,
  gobierna: true,
  actua: true,
  ...a,
})

const FLOTA: PilotoFlotaResponse = {
  activo: true,
  modo: 'copiloto',
  agentes: [
    agente({ agente: 'cobranza' }),
    agente({ agente: 'conciliacion' }),
    agente({ agente: 'cotizador', gobierna: false, actua: false }),
    agente({ agente: 'retencion' }),
    agente({ agente: 'contabilidad', corre: false, actua: false }),
    agente({ agente: 'agente-nuevo', efectoReal: 'Hace algo que este front todavía no conoce.' }),
  ],
  resumen: { sombra: 0, copiloto: 6, autonomo: 0 },
  enVivo: { llamadas: 0, conciliando: 0, esperando: 0 },
  tomadoAt: '2026-09-30T17:00:00.000Z',
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  h.flota = { data: FLOTA, isLoading: false, error: null, notAvailable: false }
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
})

async function render(el: React.ReactElement) {
  await act(async () => {
    root.render(el)
  })
}

const cajon = () => document.body.querySelector('[data-testid="piloto-como-funciona"]')

/** Abre «¿Cómo funciona?» como lo hace una persona: con su botón. */
async function abrirExplicacion(onVerPresentacion?: () => void) {
  await render(<PilotoQueEs {...(onVerPresentacion ? { onVerPresentacion } : {})} />)
  const boton = container.querySelector('[data-testid="para-entender-mas"]') as HTMLButtonElement
  await act(async () => boton.click())
}

describe('en la pantalla: qué modo y qué significa, sin abrir nada', () => {
  it('dice el modo de la flota y quién decide antes de que algo salga', async () => {
    await render(<PilotoQueEs />)
    const modo = container.querySelector('[data-testid="piloto-que-es-modo"]')
    expect(modo?.textContent).toContain('Modo Copiloto.')
    expect(modo?.textContent).toContain(es.inmobiliaria.piloto.comoFunciona.modoCorto.copiloto)
  })

  it('si algunos agentes van con otro modo, lo dice, igual que la píldora', async () => {
    h.flota = { ...h.flota, data: { ...FLOTA, distintos: ['cobranza', 'contratos', 'chat', 'matching'] } }
    await render(<PilotoQueEs />)
    const modo = container.querySelector('[data-testid="piloto-que-es-modo"]')
    expect(modo?.textContent).toContain('Modo Copiloto (4 con otro modo).')
  })

  it('con el Piloto apagado lo dice, sin nombrar un modo', async () => {
    h.flota = { ...h.flota, data: { ...FLOTA, activo: false } }
    await render(<PilotoQueEs />)
    const modo = container.querySelector('[data-testid="piloto-que-es-modo"]')
    expect(modo?.textContent).toBe(es.inmobiliaria.piloto.comoFunciona.apagadoCorto)
  })

  it('sin lectura de la flota no inventa un modo, pero el botón sigue', async () => {
    h.flota = { data: null, isLoading: false, error: 'x', notAvailable: false }
    await render(<PilotoQueEs />)
    expect(container.querySelector('[data-testid="piloto-que-es-modo"]')).toBeNull()
    expect(container.querySelector('[data-testid="para-entender-mas"]')).not.toBeNull()
  })

  it('el botón «¿Cómo funciona?» abre la explicación (el modal de ParaEntenderMas)', async () => {
    await render(<PilotoQueEs />)
    expect(cajon()).toBeNull()
    const boton = container.querySelector('[data-testid="para-entender-mas"]') as HTMLButtonElement
    expect(boton.textContent).toContain('¿Cómo funciona?')
    await act(async () => boton.click())
    expect(cajon()).not.toBeNull()
    const modal = document.body.querySelector('[data-testid="para-entender-mas-contenido"]')
    expect(modal?.textContent).toContain('Cómo funciona el Piloto automático')
  })
})

describe('la explicación de «¿Cómo funciona?»', () => {
  it('los modos listados son los del código, en su orden, con su nombre y lo que hacen', async () => {
    await abrirExplicacion()
    const filas = [...document.body.querySelectorAll('[data-testid="piloto-cf-modos"] [data-modo]')]
    expect(filas.map((f) => f.getAttribute('data-modo'))).toEqual([...MODOS_DEL_PILOTO])
    filas.forEach((f, i) => {
      const modo = MODOS_DEL_PILOTO[i] as keyof typeof es.inmobiliaria.piloto.flota.modo
      expect(f.textContent).toContain(es.inmobiliaria.piloto.flota.modo[modo])
      expect(f.textContent).toContain(es.inmobiliaria.piloto.flota.que[modo])
    })
    // El modo actual se marca; los otros no.
    const actual = document.body.querySelector('[data-modo="copiloto"]')
    expect(actual?.textContent).toContain('Tu modo ahora')
    expect(document.body.querySelector('[data-modo="autonomo"]')?.textContent).not.toContain('Tu modo ahora')
  })

  it('dice que no es el chat', async () => {
    await abrirExplicacion()
    expect(cajon()?.textContent).toContain(es.inmobiliaria.piloto.comoFunciona.queEs.noEsElChat)
  })

  it('agrupa los agentes de la flota EN VIVO: con el modo, a pedido, y los que no trabajan', async () => {
    await abrirExplicacion()
    const ids = (g: string) =>
      [...document.body.querySelectorAll(`[data-testid="piloto-cf-grupo-${g}"] [data-agente]`)].map((e) =>
        e.getAttribute('data-agente'),
      )
    expect(ids('conModo')).toEqual(['cobranza', 'conciliacion', 'agente-nuevo'])
    expect(ids('aPedido')).toEqual(['cotizador'])
    // Retención está en pausa de producto; Contabilidad no corre.
    expect(ids('apagados')).toEqual(['retencion', 'contabilidad'])
    // Nombre del panel + qué hace; el desconocido, con lo que dice el micro.
    const cobranza = document.body.querySelector('[data-agente="cobranza"]')
    expect(cobranza?.textContent).toContain('Cobranza')
    expect(cobranza?.textContent).toContain(es.inmobiliaria.piloto.comoFunciona.agente.cobranza)
    expect(document.body.querySelector('[data-agente="agente-nuevo"]')?.textContent).toContain(
      'Hace algo que este front todavía no conoce.',
    )
  })

  it('sin lectura de la flota muestra la lista del micro, sin inventar estados', async () => {
    h.flota = { data: null, isLoading: false, error: 'x', notAvailable: false }
    await abrirExplicacion()
    const ids = [...document.body.querySelectorAll('[data-agente]')].map((e) => e.getAttribute('data-agente'))
    expect(ids).toEqual([...AGENTES_DEL_PILOTO])
    expect(document.body.querySelector('[data-testid^="piloto-cf-grupo-"]')).toBeNull()
  })

  it('ninguna clave de la explicación sale cruda en pantalla', async () => {
    await abrirExplicacion(vi.fn())
    expect(cajon()?.textContent).not.toMatch(/inmobiliaria\.(piloto|ai)\./)
  })

  it('«Ver la presentación otra vez» cierra la explicación y la pide', async () => {
    const ver = vi.fn()
    await abrirExplicacion(ver)
    const boton = document.body.querySelector(
      '[data-testid="piloto-como-funciona-ver-presentacion"]',
    ) as HTMLButtonElement
    await act(async () => boton.click())
    expect(ver).toHaveBeenCalledTimes(1)
    // Y cierra la explicación: dos modales apilados se pelean el foco.
    expect(cajon()).toBeNull()
  })
})

describe('los agentes del Piloto (lista del micro)', () => {
  it('cada uno tiene nombre y qué hace, en español y en inglés; «gerente» no es uno', () => {
    for (const id of AGENTES_DEL_PILOTO) {
      expect(es.inmobiliaria.ai.workspace.agente, id).toHaveProperty(id)
      expect(es.inmobiliaria.piloto.comoFunciona.agente, id).toHaveProperty(id)
      expect(en.inmobiliaria.piloto.comoFunciona.agente, id).toHaveProperty(id)
    }
    expect(AGENTES_DEL_PILOTO).not.toContain('gerente')
    expect(new Set(AGENTES_DEL_PILOTO).size).toBe(AGENTES_DEL_PILOTO.length)
  })

  it('agruparAgentes no pierde ni repite a nadie', () => {
    const g = agruparAgentes(FLOTA.agentes, new Set(['retencion']))
    expect(g.conModo.length + g.aPedido.length + g.apagados.length).toBe(FLOTA.agentes.length)
  })
})

describe('la clave de «ya vio la presentación», por persona', () => {
  it('lleva el id de la persona con la forma que acepta el back', () => {
    expect(claveDeLaNovedadDelPiloto('6F1C2A3B-0000-4000-8000-00000000ABCD')).toBe(
      'novedad:piloto:6f1c2a3b-0000-4000-8000-00000000abcd',
    )
  })

  it('sin id, o con uno que el back rechazaría, cae a la clave de la agencia', () => {
    expect(claveDeLaNovedadDelPiloto(undefined)).toBe('novedad:piloto')
    expect(claveDeLaNovedadDelPiloto('correo@dominio.co')).toBe('novedad:piloto')
    expect(claveDeLaNovedadDelPiloto('a'.repeat(80))).toBe('novedad:piloto')
  })
})
