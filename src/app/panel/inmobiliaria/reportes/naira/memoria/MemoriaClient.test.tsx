/**
 * MemoriaClient.test.tsx — la pestaña «Qué cree Naira» (13-07, Tarea 4).
 *
 * Qué prueba: el ok con versión y corte pegado, en el orden del servidor; un 403 al volver a la pestaña o tras escribir no
 * deja nada de lo que se veía (FG13-1); cada escritura existe solo con su permiso; 409 recarga y avisa con el foco en el
 * aviso; un hecho da toast, recarga y foco (tras borrar, al siguiente ítem o al título); los filtros no reordenan y van a la
 * URL; los vacíos no mienten; B-5; datos de ejemplo sin escritura; ningún enlace del agente; Naira apagada.
 * Arnés: molde de AprobacionesClient.test.tsx (13-05). Marcador [N13:*] en el TÍTULO.
 */

import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { leer, corregir, borrar, promover, resolver, permisos, nav, exito } = vi.hoisted(() => ({
  leer: vi.fn(),
  corregir: vi.fn(),
  borrar: vi.fn(),
  promover: vi.fn(),
  resolver: vi.fn(),
  permisos: { conjunto: new Set<string>() },
  nav: { consulta: '', replace: vi.fn(), push: vi.fn(), back: vi.fn() },
  exito: vi.fn(),
}))

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))
vi.mock('next/link', () => ({
  default: ({ href, prefetch, children, ...resto }: React.PropsWithChildren<{ href: string; prefetch?: boolean } & Record<string, unknown>>) =>
    React.createElement('a', { href, 'data-prefetch': String(prefetch), ...resto }, children),
}))
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(nav.consulta),
  useRouter: () => ({ replace: nav.replace, push: nav.push, back: nav.back }),
  usePathname: () => '/panel/inmobiliaria/reportes/naira/memoria',
}))
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ agency: { id: 'AGY-1' } }) }))
vi.mock('@/lib/api/naira/cliente', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/naira/cliente')>()),
  leerMemoria: leer,
  corregirItem: corregir,
  borrarItem: borrar,
  promoverItem: promover,
  resolverPropuestaProcedural: resolver,
}))
vi.mock('@/lib/context/PermissionsContext', () => ({
  usePermissionsContext: () => ({
    canAccess: (m: string, a: string) => m !== 'naira' || permisos.conjunto.has(a),
    isAdmin: false,
    agencyRole: 'ADMIN',
  }),
  usePermissionsContextSafe: () => null,
}))
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => false }))
vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  PopoverContent: ({ children }: { children?: React.ReactNode }) => <div data-testid="popover">{children}</div>,
}))
vi.mock('@/components/ui/toast', () => ({ toast: { success: exito, error: vi.fn() } }))

import { RESPUESTA_ESTRICTA_POR_ENDPOINT, type NairaMemoryItem, type NairaMemoryView } from '@/lib/api/naira/contrato'
import { EJEMPLOS_DE_NAIRA, USER_IDS_DE_EJEMPLO } from '@/lib/data/mock-naira'

import { MemoriaClient } from './MemoriaClient'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const RUTA = '/panel/inmobiliaria/reportes/naira/memoria'
const ESTRICTO = RESPUESTA_ESTRICTA_POR_ENDPOINT['memoria.vista']
const EJEMPLO = EJEMPLOS_DE_NAIRA['memoria.vista']
const comun = { trust: 'system' as const, writtenBy: { kind: 'system' as const }, recordedAt: '2000-01-03T10:00:00.000Z', revision: '7' }

const ITEMS: NairaMemoryItem[] = [
  {
    ...comun,
    id: 'MEM-A',
    layer: 'semantic',
    provenance: 'observed',
    derivedFrom: { kind: 'fact', source: 'agent.debtor_states', ref: 'REF-1' },
    content: { kind: 'present', text: 'MEM-TOKEN-A' },
  },
  {
    ...comun,
    id: 'MEM-B',
    layer: 'episodic',
    provenance: 'inferred',
    derivedFrom: { kind: 'memory', itemId: 'MEM-A' },
    content: { kind: 'present', text: 'MEM-TOKEN-B' },
  },
  {
    ...comun,
    id: 'MEM-C',
    layer: 'preference',
    provenance: 'stated_by_human',
    trust: 'staff',
    writtenBy: { kind: 'user', userId: 'USR-B5-VISTA' },
    derivedFrom: { kind: 'human_statement' },
    content: { kind: 'present', text: 'MEM-TOKEN-C' },
  },
  {
    ...comun,
    id: 'MEM-D',
    layer: 'semantic',
    provenance: 'observed',
    derivedFrom: { kind: 'human_statement' },
    content: { kind: 'erased', erasedAt: '2000-01-02T10:00:00.000Z', erasedBy: { kind: 'user', userId: 'USR-B5-BORRO-VISTA' } },
  },
]

const VISTA: NairaMemoryView = ESTRICTO.parse({
  ...EJEMPLO,
  snapshot: { revision: '4711' },
  items: ITEMS,
  pendingProposals: [
    { id: 'PROP-1', proposedBy: { kind: 'user', userId: 'USR-B5-PROPUSO-VISTA' }, proposedAt: '2000-01-02T09:00:00.000Z', text: 'PROP-TOKEN-1' },
  ],
  generatedAt: '2000-01-03T11:00:00.000Z',
})

const okAgente = (data: NairaMemoryView = VISTA) => ({ kind: 'ok' as const, data, origen: 'agente' as const })
const TODOS = ['memory-view', 'memory-correct', 'memory-erase', 'memory-promote', 'procedural-approve']

let host: HTMLDivElement
let root: Root
let visible: DocumentVisibilityState = 'visible'
const descriptorOriginal = Object.getOwnPropertyDescriptor(document, 'visibilityState')

async function esperar() {
  await act(async () => {
    for (let i = 0; i < 6; i++) await Promise.resolve()
    await new Promise((r) => setTimeout(r, 0))
  })
}

async function montar() {
  await act(async () => {
    root.render(<MemoriaClient />)
  })
  await esperar()
}

async function remontar() {
  act(() => root.unmount())
  root = createRoot(host)
  await montar()
}

async function clic(el: Element | null | undefined) {
  await act(async () => {
    ;(el as HTMLElement).click()
  })
  await esperar()
}

async function escribir(valor: string) {
  const campo = document.querySelector('textarea') as HTMLTextAreaElement
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set?.call(campo, valor)
    campo.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

const articulo = (id: string) => document.getElementById('memoria-' + id)
const accion = (id: string, op: string) => articulo(id)?.querySelector(`[data-naira-accion="${op}"]`) as HTMLButtonElement | null
const ops = (id: string) => Array.from(articulo(id)?.querySelectorAll('[data-naira-accion]') ?? []).map((b) => b.getAttribute('data-naira-accion'))
const idsEnPantalla = () => Array.from(document.querySelectorAll('article[id^="memoria-"]')).map((a) => a.id)
const h1 = () => document.querySelector('h1')
const porTexto = (texto: string) =>
  Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.trim() === texto) as HTMLButtonElement | undefined

async function corregirA(texto: string, e: unknown) {
  await clic(accion('MEM-A', 'corregir'))
  await escribir(texto)
  corregir.mockResolvedValueOnce(e)
  await clic(document.querySelector('[data-testid="naira-corregir-guardar"]'))
  await esperar()
}

async function borrarItem(id: string) {
  await clic(accion(id, 'borrar'))
  await clic(document.querySelector('input[type="radio"]'))
  borrar.mockResolvedValueOnce({ kind: 'ok', data: { erasedItemIds: [id], erasedAt: '2000-01-03T12:00:00.000Z', auditId: 'AUD-1' }, origen: 'agente' })
  await clic(document.querySelector('[data-testid="naira-confirmar-borrado"]'))
  await esperar()
}

beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  for (const f of [leer, corregir, borrar, promover, resolver, nav.replace, nav.push, nav.back, exito]) f.mockReset()
  leer.mockResolvedValue(okAgente())
  permisos.conjunto = new Set(TODOS)
  nav.consulta = ''
  visible = 'visible'
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visible })
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
  document.body.innerHTML = ''
  if (descriptorOriginal) Object.defineProperty(document, 'visibilityState', descriptorOriginal)
  else delete (document as { visibilityState?: unknown }).visibilityState
})

describe('MemoriaClient', () => {
  it('[N13:fixture-es-contrato] la vista del test pasa el esquema ESTRICTO de memoria.vista', () => {
    expect(() => ESTRICTO.parse(VISTA)).not.toThrow()
    expect(() => ESTRICTO.parse({ ...VISTA, snapshot: { revisionn: '1' } })).toThrow()
  })

  it('[N13:control-positivo] el ok: título, bajada, versión con su corte, ítems en orden y propuestas', async () => {
    await montar()
    const raiz = document.querySelector('[data-naira-vista="memoria"]')
    expect(raiz?.getAttribute('data-naira-estado')).toBe('ok')
    expect(document.querySelectorAll('h1')).toHaveLength(1)
    expect(h1()?.textContent).toBe('Qué cree Naira sobre tu inmobiliaria')
    expect(document.body.textContent).toContain('Cada cosa que Naira cree, de dónde la sacó y desde cuándo. Puedes corregirla o borrarla.')
    expect(document.querySelector('[data-naira-version]')?.textContent).toContain('Versión 4711 de la memoria')
    expect(document.querySelector('[data-naira-asof="2000-01-03T11:00:00.000Z"]')).not.toBeNull()
    expect(idsEnPantalla()).toEqual(['memoria-MEM-A', 'memoria-MEM-B', 'memoria-MEM-C', 'memoria-MEM-D'])
    const prop = document.querySelector('[data-naira-propuestas-pendientes]')
    expect(prop?.querySelector('h2')?.textContent).toBe('Propuestas pendientes (procedimientos)')
    expect(prop?.textContent).toContain('PROP-TOKEN-1')
    expect(leer).toHaveBeenCalledTimes(1)
    expect(leer).toHaveBeenCalledWith('AGY-1')
  })

  it('[N13:asof-pegado] la memoria no pinta cifras y el corte va pegado a la versión', async () => {
    await montar()
    expect(document.querySelectorAll('[data-naira-numero]')).toHaveLength(0)
    expect(document.querySelector('[data-naira-version] [data-naira-asof]')?.getAttribute('data-naira-asof')).toBe('2000-01-03T11:00:00.000Z')
  })

  it('[N13:403-sin-residuo] un 403 al volver a la pestaña no deja nada de lo que se veía', async () => {
    await montar()
    expect(document.body.textContent).toContain('MEM-TOKEN-A')
    leer.mockResolvedValueOnce({ kind: 'sin_permiso' })
    visible = 'visible'
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await esperar()
    const sp = document.querySelector('[data-testid="naira-sin-permiso"]')
    expect(sp).not.toBeNull()
    expect(sp?.querySelector('a[href="/panel/inmobiliaria"]')?.textContent).toContain('Ir al inicio del panel')
    for (const x of ['MEM-TOKEN', 'PROP-TOKEN-1', '4711', 'Propuestas pendientes']) expect(host.innerHTML).not.toContain(x)
    expect(host.querySelector('article')).toBeNull()
    expect(host.querySelector('[data-naira-filtros]')).toBeNull()
    expect(leer).toHaveBeenCalledTimes(2)
  })

  it('[N13:403-tras-escribir] si la recarga tras corregir da 403, solo queda «No tienes acceso a esto»', async () => {
    await montar()
    leer.mockResolvedValueOnce({ kind: 'sin_permiso' })
    await corregirA('Texto nuevo', { kind: 'ok', data: EJEMPLOS_DE_NAIRA['memoria.corregir'], origen: 'agente' })
    expect(document.querySelector('[data-testid="naira-sin-permiso"]')).not.toBeNull()
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(document.body.innerHTML).not.toContain('MEM-TOKEN')
    expect(document.body.innerHTML).not.toContain('Texto nuevo')
  })

  it('[N13:memoria-acciones-por-permiso] cada escritura aparece solo con su acción', async () => {
    const confirmarProc = () => document.querySelector('[data-testid="naira-confirmar-procedimiento"]')
    permisos.conjunto = new Set(['memory-view'])
    await montar()
    expect(document.querySelectorAll('[data-naira-accion]')).toHaveLength(0)
    expect(confirmarProc()).toBeNull()
    permisos.conjunto = new Set(['memory-view', 'memory-correct'])
    await remontar()
    expect(ops('MEM-A')).toEqual(['corregir'])
    expect(ops('MEM-B')).toEqual(['corregir'])
    expect(ops('MEM-C')).toEqual(['corregir'])
    expect(ops('MEM-D')).toEqual([])
    permisos.conjunto = new Set(['memory-view', 'memory-correct', 'memory-erase'])
    await remontar()
    for (const id of ['MEM-A', 'MEM-B', 'MEM-C']) expect(ops(id)).toEqual(['corregir', 'borrar'])
    permisos.conjunto = new Set(['memory-view', 'memory-correct', 'memory-erase', 'memory-promote'])
    await remontar()
    expect(ops('MEM-B')).toEqual(['promover', 'corregir', 'borrar'])
    expect(ops('MEM-A')).toEqual(['corregir', 'borrar'])
    expect(ops('MEM-C')).toEqual(['corregir', 'borrar'])
    expect(confirmarProc()).toBeNull()
    permisos.conjunto = new Set(TODOS)
    await remontar()
    expect(confirmarProc()?.textContent).toBe('Confirmar procedimiento')
    expect(document.querySelector('[data-testid="naira-rechazar-procedimiento"]')?.textContent).toBe('Rechazar procedimiento')
  })

  it('[N13:conflicto-recarga] un 409 recarga y avisa con el foco en el aviso, sin reenviar ni mostrar la razón', async () => {
    await montar()
    await corregirA('Texto nuevo', { kind: 'conflicto', razon: 'not-current' })
    expect(leer).toHaveBeenCalledTimes(2)
    const aviso = document.querySelector('[data-naira-aviso-de-memoria="item_cambio"]')
    expect(aviso?.textContent).toBe('Este ítem cambió mientras lo revisabas. Ya te mostramos la versión actual.')
    expect(document.activeElement).toBe(aviso)
    expect(document.body.innerHTML).not.toContain('not-current')
    expect(corregir).toHaveBeenCalledTimes(1)
    resolver.mockResolvedValueOnce({ kind: 'conflicto', razon: 'already_resolved' })
    await clic(document.querySelector('[data-testid="naira-confirmar-procedimiento"]'))
    expect(document.querySelector('[data-naira-aviso-de-memoria="propuesta_ya_resuelta"]')).not.toBeNull()
    expect(document.body.innerHTML).not.toContain('already_resolved')
  })

  it('[N13:hecho-toast-recarga] un hecho da su toast, recarga y lleva el foco al título', async () => {
    await montar()
    await corregirA('Texto nuevo', { kind: 'ok', data: EJEMPLOS_DE_NAIRA['memoria.corregir'], origen: 'agente' })
    expect(exito).toHaveBeenCalledTimes(1)
    expect(exito).toHaveBeenCalledWith('Corregido. Naira usará la versión nueva desde ahora; la anterior queda en el historial.')
    expect(leer).toHaveBeenCalledTimes(2)
    expect(document.activeElement).toBe(h1())
    await clic(document.querySelector('[data-testid="naira-rechazar-procedimiento"]'))
    resolver.mockResolvedValueOnce({ kind: 'ok', data: { kind: 'rejected', proposalId: 'PROP-1' }, origen: 'agente' })
    await clic(document.querySelector('[data-testid="naira-confirmar-rechazo-procedimiento"]'))
    expect(exito).toHaveBeenLastCalledWith('Propuesta rechazada. Naira no guardará este procedimiento.')
  })

  it('[N13:foco-tras-borrar] tras borrar, el foco va al siguiente visible o al título', async () => {
    await montar()
    await borrarItem('MEM-B')
    expect(exito).toHaveBeenCalledWith('Borrado. También se borró lo que Naira había derivado de ese ítem.')
    expect(leer).toHaveBeenCalledTimes(2)
    expect((document.activeElement as HTMLElement | null)?.id).toBe('memoria-MEM-C')
    nav.consulta = 'procedencia=stated_by_human'
    await remontar()
    expect(idsEnPantalla()).toEqual(['memoria-MEM-C'])
    await borrarItem('MEM-C')
    expect(document.activeElement).toBe(h1())
  })

  it('[N13:filtros-en-el-cliente] los filtros no reordenan, van a la URL y los desconocidos se ignoran', async () => {
    await montar()
    const grupo = () => document.querySelector('[role="radiogroup"][aria-label="Procedencia"]')
    expect(grupo()?.querySelectorAll('[role="radio"]')).toHaveLength(4)
    for (const g of Array.from(document.querySelectorAll('[role="radiogroup"]'))) {
      expect(g.querySelectorAll('[role="radio"]').length).toBeLessThanOrEqual(4)
    }
    await clic(grupo()?.querySelector('[role="radio"][aria-label="Inferido"]'))
    expect(idsEnPantalla()).toEqual(['memoria-MEM-B'])
    expect(nav.replace).toHaveBeenLastCalledWith(RUTA + '?procedencia=inferred', { scroll: false })
    const pill = () => document.querySelector('[data-naira-filtro-capa]') as HTMLElement
    await act(async () => {
      pill().dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, pointerId: 1 }))
      await new Promise((r) => setTimeout(r, 0))
    })
    await esperar()
    const episodios = Array.from(document.querySelectorAll('[role="menuitemradio"]')).find((m) => m.textContent?.trim() === 'Episodios')
    await clic(episodios)
    expect(nav.replace).toHaveBeenLastCalledWith(RUTA + '?capa=episodic&procedencia=inferred', { scroll: false })
    expect(pill().textContent).toContain('Episodios')
    expect(pill().classList.contains('border-border-strong')).toBe(true)

    nav.consulta = 'capa=procedural'
    await remontar()
    const sin = document.querySelector('[data-testid="naira-memoria-sin-resultados"]')
    expect(sin?.textContent).toContain('No hay nada con estos filtros.')
    await clic(porTexto('Quitar filtros'))
    expect(idsEnPantalla()).toEqual(['memoria-MEM-A', 'memoria-MEM-B', 'memoria-MEM-C', 'memoria-MEM-D'])
    expect(nav.replace).toHaveBeenLastCalledWith(RUTA, { scroll: false })

    nav.consulta = 'capa=x&procedencia=constructor'
    await remontar()
    expect(idsEnPantalla()).toHaveLength(4)
    expect(grupo()?.querySelector('[role="radio"][aria-label="Todas"]')?.getAttribute('aria-checked')).toBe('true')
    expect(pill().textContent).toContain('Capa')
    expect(pill().classList.contains('border-border-strong')).toBe(false)
  })

  it('[N13:vacio-no-miente] sin memoria se dice; con propuestas, también se muestran', async () => {
    leer.mockResolvedValue(okAgente(ESTRICTO.parse({ ...VISTA, items: [], pendingProposals: [] })))
    await montar()
    const v = document.querySelector('[data-testid="naira-memoria-vacio"]')
    expect(v?.textContent).toContain('Naira todavía no cree nada sobre tu inmobiliaria')
    expect(v?.textContent).toContain('A medida que trabaje, aquí verás cada cosa que crea, de dónde la sacó y desde cuándo.')
    leer.mockResolvedValue(okAgente(ESTRICTO.parse({ ...VISTA, items: [] })))
    await remontar()
    expect(document.querySelector('[data-testid="naira-memoria-vacio"]')).not.toBeNull()
    expect(document.querySelector('[data-naira-propuestas-pendientes]')?.textContent).toContain('PROP-TOKEN-1')
  })

  it('[N13:b5-sin-persona] ni con el agente ni con el ejemplo aparece una persona', async () => {
    await montar()
    for (const x of ['USR-B5-VISTA', 'USR-B5-BORRO-VISTA', 'USR-B5-PROPUSO-VISTA', 'userId']) expect(document.body.innerHTML).not.toContain(x)
    expect(document.body.textContent).toContain('Lo escribió alguien del equipo')
    leer.mockResolvedValue({ kind: 'ok', data: EJEMPLO, origen: 'ejemplo' })
    await remontar()
    for (const u of USER_IDS_DE_EJEMPLO) expect(document.body.innerHTML).not.toContain(u)
    expect(document.body.innerHTML).not.toContain('userId')
    expect(document.body.textContent).toContain('Lo escribió alguien del equipo')
  })

  it('[N13:simulado-visible] con datos de ejemplo todo se marca y nada escribe', async () => {
    leer.mockResolvedValue({ kind: 'ok', data: VISTA, origen: 'ejemplo' })
    await montar()
    expect(document.querySelector('[data-testid="aviso-datos-de-ejemplo"]')).not.toBeNull()
    expect(document.querySelector('[data-sample="true"]')).not.toBeNull()
    const corte = document.querySelector('[data-naira-version] [data-naira-asof]')
    expect(corte?.getAttribute('data-naira-ejemplo')).toBe('true')
    expect(document.querySelector('[data-naira-version]')?.textContent).toContain('DATO DE EJEMPLO')
    const botones = [
      ...Array.from(document.querySelectorAll('[data-naira-accion]')),
      document.querySelector('[data-testid="naira-confirmar-procedimiento"]'),
      document.querySelector('[data-testid="naira-rechazar-procedimiento"]'),
    ] as HTMLButtonElement[]
    expect(botones.length).toBeGreaterThan(2)
    for (const b of botones) expect(b.disabled).toBe(true)
    expect(document.body.textContent).toContain('Datos de ejemplo: no se puede cambiar la memoria.')
    for (const b of botones) await clic(b)
    for (const f of [corregir, borrar, promover, resolver]) expect(f).not.toHaveBeenCalled()
    expect(document.querySelector('[role="dialog"], [role="alertdialog"]')).toBeNull()
  })

  it('[N13:sin-href-del-agente] todo enlace del ok es del panel', async () => {
    await montar()
    const enlaces = Array.from(document.querySelectorAll('a[href]')).map((a) => a.getAttribute('href') ?? '')
    expect(enlaces.length).toBeGreaterThan(0)
    for (const h of enlaces) {
      expect(h.startsWith('/panel/inmobiliaria/'), h).toBe(true)
      expect(h).not.toContain('javascript:')
    }
  })

  it('[N13:apagada] Naira apagada se dice y no hay ítems', async () => {
    leer.mockResolvedValue({ kind: 'apagada' })
    await montar()
    expect(document.querySelector('[data-testid="naira-apagada"]')).not.toBeNull()
    expect(document.querySelector('article')).toBeNull()
  })
})
