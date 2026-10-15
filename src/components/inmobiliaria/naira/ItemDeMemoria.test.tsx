/**
 * ItemDeMemoria.test.tsx — una cosa que Naira cree (13-07, Tarea 3).
 *
 * Qué prueba: procedencia primero y categoría por el CAMPO (D13-9); autor solo como tipo, sin persona (B-5); origen con el
 * camino al listado de la fuente por el mapa cerrado y nunca un enlace del agente (D13-7); «Desde el …» en hora de Colombia;
 * ítem borrado sin texto ni autor; cada acción solo con su permiso, en fila o en el menú del móvil; confirmar como cierto
 * solo en inferencias y tras un AlertDialog; un 403 apaga ESE control; con datos de ejemplo nada escribe.
 * Arnés: molde de 13-05 (createRoot + act; diálogos en document.body; popover plano). Marcador [N13:*] en el TÍTULO.
 */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'

import type { EstadoNaira } from '@/lib/api/naira/cliente'
import { RESPUESTA_ESTRICTA_POR_ENDPOINT, type NairaMemoryItem } from '@/lib/api/naira/contrato'
import { EJEMPLOS_DE_NAIRA, USER_IDS_DE_EJEMPLO } from '@/lib/data/mock-naira'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { promover, corregir, borrar, resolver, movil } = vi.hoisted(() => ({
  promover: vi.fn(),
  corregir: vi.fn(),
  borrar: vi.fn(),
  resolver: vi.fn(),
  movil: { valor: false },
}))

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))
vi.mock('next/link', () => ({
  default: ({ href, children, ...resto }: { href: string; children?: React.ReactNode }) => (
    <a href={href} {...resto}>
      {children}
    </a>
  ),
}))
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ agency: { id: 'AGY-1' } }) }))
vi.mock('@/lib/api/naira/cliente', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/naira/cliente')>()),
  promoverItem: promover,
  corregirItem: corregir,
  borrarItem: borrar,
  resolverPropuestaProcedural: resolver,
}))
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => movil.valor }))
vi.mock('@/lib/context/PermissionsContext', () => ({
  usePermissionsContext: () => ({ canAccess: () => true, isAdmin: false, agencyRole: 'ADMIN' }),
}))
vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  PopoverContent: ({ children }: { children?: React.ReactNode }) => <div data-testid="popover">{children}</div>,
}))

import { ItemDeMemoria, type PermisosDeMemoria } from './ItemDeMemoria'
import { ProveedorDeOrigen } from './OrigenDeNaira'

const base = {
  trust: 'system' as const,
  writtenBy: { kind: 'system' as const },
  derivedFrom: { kind: 'human_statement' as const },
  recordedAt: '2000-01-03T13:00:00.000Z',
  revision: '5',
}
const presente = (text: string) => ({ kind: 'present' as const, text })

const OBS: NairaMemoryItem = {
  ...base,
  id: 'MEM-OBS',
  layer: 'semantic',
  provenance: 'observed',
  derivedFrom: { kind: 'fact', source: 'agent.debtor_states', ref: 'REF-SECRETO-1' },
  content: presente('MEM-TEXTO-OBS'),
}
const HUM: NairaMemoryItem = {
  ...base,
  id: 'MEM-HUM',
  layer: 'preference',
  provenance: 'stated_by_human',
  trust: 'staff',
  writtenBy: { kind: 'user', userId: 'USR-B5-ESCRIBIO' },
  content: presente('MEM-TEXTO-HUM'),
}
const INF: NairaMemoryItem = {
  ...base,
  id: 'MEM-INF',
  layer: 'episodic',
  provenance: 'inferred',
  derivedFrom: { kind: 'memory', itemId: 'MEM-OBS' },
  content: presente('DATO OBSERVADO (ejemplo)'),
}
const PROC: NairaMemoryItem = {
  ...base,
  id: 'MEM-PROC',
  layer: 'procedural',
  provenance: 'stated_by_human',
  trust: 'staff',
  writtenBy: { kind: 'user', userId: 'USR-B5-PROC' },
  content: presente('MEM-TEXTO-PROC'),
}
const CONS: NairaMemoryItem = {
  ...base,
  id: 'MEM-CONS',
  layer: 'semantic',
  provenance: 'observed',
  derivedFrom: { kind: 'deterministic_query', queryId: 'Q-777' },
  content: presente('MEM-TEXTO-CONS'),
}
const HOSTIL: NairaMemoryItem = {
  ...base,
  id: 'MEM-HOSTIL',
  layer: 'semantic',
  provenance: 'observed',
  derivedFrom: { kind: 'fact', source: 'javascript:alert(1)', ref: 'REF-SECRETO-1' },
  content: presente('MEM-TEXTO-HOSTIL'),
}
const BORR: NairaMemoryItem = {
  ...base,
  id: 'MEM-BORR',
  layer: 'semantic',
  provenance: 'stated_by_human',
  trust: 'staff',
  writtenBy: { kind: 'user', userId: 'USR-B5-ESCRIBIO' },
  content: { kind: 'erased', erasedAt: '2000-01-02T15:00:00.000Z', erasedBy: { kind: 'user', userId: 'USR-B5-BORRO' } },
}
const TODOS_LOS_ITEMS = [OBS, HUM, INF, PROC, CONS, HOSTIL, BORR]

const ESTRICTO = RESPUESTA_ESTRICTA_POR_ENDPOINT['memoria.vista']
const vista = (items: readonly NairaMemoryItem[]) => ({
  snapshot: { revision: '9' },
  items,
  pendingProposals: [],
  generatedAt: '2000-01-03T14:00:00.000Z',
})

const TODOS: PermisosDeMemoria = { corregir: true, borrar: true, promover: true, resolver: true }
const NINGUNO: PermisosDeMemoria = { corregir: false, borrar: false, promover: false, resolver: false }

let host: HTMLDivElement
let root: Root
const onDesenlace = vi.fn()

async function esperar() {
  await act(async () => {
    for (let i = 0; i < 5; i++) await Promise.resolve()
    await new Promise((r) => setTimeout(r, 0))
  })
}

async function montar(
  items: readonly NairaMemoryItem[],
  permisos: PermisosDeMemoria = TODOS,
  idsVisibles: readonly string[] = items.map((i) => i.id),
  origen: 'agente' | 'ejemplo' = 'agente',
) {
  await act(async () => {
    root.render(
      <ProveedorDeOrigen origen={origen}>
        <ul>
          {items.map((item) => (
            <li key={item.id}>
              <ItemDeMemoria item={item} permisos={permisos} idsVisibles={idsVisibles} onDesenlace={onDesenlace} />
            </li>
          ))}
        </ul>
      </ProveedorDeOrigen>,
    )
  })
  await esperar()
}

const articulo = (id: string) => document.getElementById('memoria-' + id) as HTMLElement
const accion = (id: string, op: string) => articulo(id)?.querySelector(`[data-naira-accion="${op}"]`) as HTMLButtonElement | null
const alerta = () => document.querySelector('[role="alertdialog"]')
const botonPorTexto = (texto: string, dentro: ParentNode = document) =>
  Array.from(dentro.querySelectorAll('button')).find((b) => b.textContent?.trim() === texto) as HTMLButtonElement | undefined

async function clic(el: Element | null | undefined) {
  await act(async () => {
    ;(el as HTMLElement).click()
  })
  await esperar()
}

async function abrirMenu(id: string) {
  const disparador = articulo(id).querySelector('[data-naira-acciones-movil]') as HTMLElement
  await act(async () => {
    disparador.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, pointerId: 1 }))
    await new Promise((r) => setTimeout(r, 0))
  })
  await esperar()
}

type Diferida<T> = { resolver: (e: EstadoNaira<T>) => void }
function diferida<T>(doble: ReturnType<typeof vi.fn>): Diferida<T> {
  const d: Diferida<T> = { resolver: () => undefined }
  doble.mockImplementationOnce(() => new Promise((r) => (d.resolver = r)))
  return d
}

async function promoverCon(e: EstadoNaira<unknown>) {
  await clic(accion('MEM-INF', 'promover'))
  const d = diferida<unknown>(promover)
  await clic(document.querySelector('[data-testid="naira-confirmar-promocion"]'))
  await act(async () => d.resolver(e))
  await esperar()
}

beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  for (const f of [promover, corregir, borrar, resolver, onDesenlace]) f.mockReset()
  movil.valor = false
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
  document.body.innerHTML = ''
})

describe('ItemDeMemoria', () => {
  it('[N13:fixture-es-contrato] los fixtures pasan el esquema ESTRICTO de memoria.vista', () => {
    expect(() => ESTRICTO.parse(vista(TODOS_LOS_ITEMS))).not.toThrow()
    expect(() => ESTRICTO.parse(vista([{ ...OBS, layer: 'otra' } as unknown as NairaMemoryItem]))).toThrow()
  })

  it('[N13:control-positivo] un ítem observado con su procedencia, capa, aporte, autor, origen, fecha y acciones', async () => {
    await montar([OBS])
    const a = articulo('MEM-OBS')
    expect(a.getAttribute('data-naira-memoria')).toBe('present')
    expect(a.textContent).toContain('MEM-TEXTO-OBS')
    expect(a.querySelector('[data-naira-procedencia="observed"]')?.textContent).toBe('Observado')
    expect(a.textContent).toContain('Conocimiento')
    expect(a.textContent).toContain('Aportado por: Sistema')
    expect(a.querySelector('[data-naira-autor="naira"]')?.textContent).toBe('Lo escribió Naira')
    const origen = a.querySelector('[data-naira-origen="fact"]')
    expect(origen?.textContent).toContain('Sale de un dato:')
    expect(origen?.querySelector('a[href="/panel/inmobiliaria/pagos/cobranza/deudores"]')).not.toBeNull()
    expect(a.querySelector('time[datetime="2000-01-03T13:00:00.000Z"]')).not.toBeNull()
    expect(a.textContent).toContain('Desde el')
    expect(accion('MEM-OBS', 'corregir')?.textContent).toBe('Corregir ítem')
    expect(accion('MEM-OBS', 'borrar')?.textContent).toBe('Borrar ítem')
  })

  it('[N13:procedencia-primero] la procedencia es la primera etiqueta de cada ítem presente', async () => {
    await montar([OBS, HUM, INF, PROC, CONS, HOSTIL])
    const etiquetas = Array.from(document.querySelectorAll('[data-naira-etiquetas-del-item]'))
    expect(etiquetas).toHaveLength(6)
    for (const e of etiquetas) expect(e.firstElementChild?.hasAttribute('data-naira-procedencia')).toBe(true)
  })

  it('[N13:categoria-por-campo] la categoría sale del campo, no del texto', async () => {
    await montar([OBS, HUM, INF])
    const cat = (id: string) => articulo(id).querySelector('[data-categoria]')
    expect(cat('MEM-INF')?.getAttribute('data-categoria')).toBe('inferencia')
    expect(cat('MEM-INF')?.getAttribute('data-seccion')).toBe('MEMORY')
    expect(cat('MEM-OBS')?.getAttribute('data-categoria')).toBe('dato')
    expect(cat('MEM-HUM')?.getAttribute('data-categoria')).toBe('dato')
  })

  it('[N13:b5-sin-persona] el autor es un tipo y ningún id de persona llega al DOM', async () => {
    await montar([HUM, BORR])
    expect(articulo('MEM-HUM').querySelector('[data-naira-autor="equipo"]')?.textContent).toBe('Lo escribió alguien del equipo')
    expect(document.body.innerHTML).not.toContain('USR-B5-ESCRIBIO')
    expect(document.body.innerHTML).not.toContain('USR-B5-BORRO')
    act(() => root.unmount())
    root = createRoot(host)
    await montar(EJEMPLOS_DE_NAIRA['memoria.vista'].items)
    for (const u of USER_IDS_DE_EJEMPLO) expect(document.body.innerHTML).not.toContain(u)
    expect(document.body.innerHTML).not.toContain('userId')
  })

  it('[N13:item-borrado] un ítem borrado solo dice que se borró y cuándo', async () => {
    await montar([BORR])
    const a = articulo('MEM-BORR')
    expect(a.getAttribute('data-naira-memoria')).toBe('erased')
    expect(a.textContent).toContain('Se borró el')
    expect(a.querySelector('time[datetime="2000-01-02T15:00:00.000Z"]')).not.toBeNull()
    for (const s of ['[data-naira-procedencia]', '[data-naira-autor]', '[data-naira-origen]', '[data-naira-accion]', '[data-categoria]']) {
      expect(a.querySelector(s), s).toBeNull()
    }
  })

  it('[N13:origen-con-drill-down] otra memoria lleva el foco; persona y consulta se dicen', async () => {
    await montar([INF, OBS, HUM, CONS])
    const inf = articulo('MEM-INF')
    expect(inf.querySelector('[data-naira-origen="memory"]')?.textContent).toContain('Sale de otra memoria')
    await clic(botonPorTexto('Ver esa memoria', inf))
    expect(document.activeElement).toBe(articulo('MEM-OBS'))
    expect(articulo('MEM-HUM').querySelector('[data-naira-origen="human_statement"]')?.textContent).toBe(
      'Sale de algo que dijo alguien del equipo',
    )
    const cons = articulo('MEM-CONS').querySelector('[data-naira-origen="deterministic_query"]')
    expect(cons?.textContent).toContain('Lo reprodujo una consulta:')
    expect(cons?.querySelector('.font-mono')?.textContent).toBe('Q-777')
    act(() => root.unmount())
    root = createRoot(host)
    await montar([INF], TODOS, ['MEM-INF'])
    expect(botonPorTexto('Ver esa memoria', articulo('MEM-INF'))).toBeUndefined()
  })

  it('[N13:sin-href-del-agente] una fuente hostil no da enlace; la referencia solo en el popover; ref jamás', async () => {
    await montar([HOSTIL, OBS, INF])
    const h = articulo('MEM-HOSTIL')
    expect(h.querySelectorAll('a[href]')).toHaveLength(0)
    expect(h.querySelector('[data-naira-enlace="sin-ruta"]')).not.toBeNull()
    const clon = h.cloneNode(true) as HTMLElement
    clon.querySelectorAll('[data-testid="popover"]').forEach((p) => p.remove())
    expect(clon.innerHTML).not.toContain('javascript:')
    expect(h.querySelector('[data-testid="popover"]')?.textContent).toContain('javascript:')
    expect(document.body.innerHTML).not.toContain('REF-SECRETO-1')
    const ver = botonPorTexto('Ver esa memoria', articulo('MEM-INF'))
    expect(ver?.tagName).toBe('BUTTON')
    expect(ver?.closest('a')).toBeNull()
  })

  describe('en otra zona horaria', () => {
    let tzPrevio: string | undefined
    beforeAll(() => {
      tzPrevio = process.env.TZ
      process.env.TZ = 'Asia/Tokyo'
    })
    afterAll(() => {
      if (tzPrevio === undefined) delete process.env.TZ
      else process.env.TZ = tzPrevio
    })

    it('[N13:fecha-del-item] [N13:asof-bogota] «Desde el …» se lee en hora de Colombia', async () => {
      expect(new Date('2000-01-04T03:30:00.000Z').getDate()).toBe(4)
      await montar([{ ...OBS, recordedAt: '2000-01-04T03:30:00.000Z' }])
      const a = articulo('MEM-OBS')
      expect(a.querySelector('time[datetime="2000-01-04T03:30:00.000Z"]')).not.toBeNull()
      expect(a.textContent).toContain('3 de ene')
      expect(a.textContent).not.toContain('4 de ene')
    })
  })

  it('[N13:memoria-acciones-por-permiso] cada acción existe solo con su permiso', async () => {
    const ops = () => Array.from(document.querySelectorAll('[data-naira-accion]')).map((b) => b.getAttribute('data-naira-accion'))
    await montar([OBS, INF], NINGUNO)
    expect(ops()).toEqual([])
    act(() => root.unmount())
    root = createRoot(host)
    await montar([OBS, INF], { ...NINGUNO, corregir: true })
    expect(ops()).toEqual(['corregir', 'corregir'])
    act(() => root.unmount())
    root = createRoot(host)
    await montar([OBS, INF], { ...NINGUNO, borrar: true })
    expect(ops()).toEqual(['borrar', 'borrar'])
    act(() => root.unmount())
    root = createRoot(host)
    await montar([OBS, INF], { ...NINGUNO, promover: true })
    expect(ops()).toEqual(['promover'])
    expect(accion('MEM-INF', 'promover')).not.toBeNull()
  })

  it('[N13:promover-solo-inferencias] solo una inferencia que no es procedimiento se puede confirmar', async () => {
    await montar([OBS, HUM, INF, PROC, CONS])
    for (const id of ['MEM-OBS', 'MEM-HUM', 'MEM-PROC', 'MEM-CONS']) expect(accion(id, 'promover'), id).toBeNull()
    expect(accion('MEM-INF', 'promover')?.textContent).toBe('Confirmar que es cierto')
  })

  it('[N13:promover-con-dialogo] confirmar como cierto pasa por un AlertDialog', async () => {
    await montar([INF])
    await clic(accion('MEM-INF', 'promover'))
    expect(promover).not.toHaveBeenCalled()
    expect(alerta()?.textContent).toContain('¿Confirmar que esto es cierto?')
    expect(alerta()?.textContent).toContain('Naira pasará a tratarlo como observado. Hazlo solo si lo comprobaste.')
    await clic(botonPorTexto('Volver'))
    expect(alerta()).toBeNull()
    expect(promover).not.toHaveBeenCalled()
    await promoverCon({ kind: 'ok', data: EJEMPLOS_DE_NAIRA['memoria.corregir'], origen: 'agente' })
    expect(promover).toHaveBeenCalledTimes(1)
    expect(promover).toHaveBeenCalledWith('AGY-1', 'MEM-INF')
    expect(onDesenlace).toHaveBeenCalledWith('promover', { kind: 'hecho' }, 'MEM-INF')
  })

  it('[N13:promover-por-razon] la razón se dice por su clave; no-promovible y 409 recargan; sin servicio se reintenta', async () => {
    await montar([INF])
    await promoverCon({ kind: 'rechazado', razon: 'pii:cedula' })
    expect(articulo('MEM-INF').querySelector('[data-naira-mensaje-del-item]')?.textContent).toBe(
      'Tiene un número de cédula. Corrígelo antes de confirmarlo.',
    )
    expect(document.body.innerHTML).not.toContain('pii:cedula')
    expect(onDesenlace).not.toHaveBeenCalled()
    await promoverCon({ kind: 'rechazado', razon: 'no-promovible' })
    expect(onDesenlace).toHaveBeenLastCalledWith('promover', { kind: 'recargar', aviso: 'ya_no_se_puede_confirmar' }, 'MEM-INF')
    await promoverCon({ kind: 'conflicto', razon: 'not-current' })
    expect(onDesenlace).toHaveBeenLastCalledWith('promover', { kind: 'recargar', aviso: 'item_cambio' }, 'MEM-INF')
    await promoverCon({ kind: 'no_disponible' })
    expect(articulo('MEM-INF').querySelector('[data-naira-mensaje-del-item]')?.textContent).toBe(
      'No pudimos confirmarlo. Intenta de nuevo.',
    )
    expect(accion('MEM-INF', 'promover')?.disabled).toBe(false)
  })

  it('[N13:escritura-403] un 403 apaga ESE control y lo dice, sin tocar lo que se ve', async () => {
    await montar([INF])
    await promoverCon({ kind: 'sin_permiso' })
    expect(accion('MEM-INF', 'promover')?.disabled).toBe(true)
    expect(articulo('MEM-INF').querySelector('[data-naira-mensaje-del-item]')?.textContent).toBe('No tienes permiso para esta acción.')
    expect(articulo('MEM-INF').textContent).toContain('DATO OBSERVADO (ejemplo)')
    expect(onDesenlace).not.toHaveBeenCalled()
    expect(accion('MEM-INF', 'corregir')?.disabled).toBe(false)

    act(() => root.unmount())
    root = createRoot(host)
    await montar([OBS])
    await clic(accion('MEM-OBS', 'corregir'))
    const campo = document.querySelector('textarea') as HTMLTextAreaElement
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set?.call(campo, 'CENTINELA-403')
      campo.dispatchEvent(new Event('input', { bubbles: true }))
    })
    corregir.mockResolvedValueOnce({ kind: 'sin_permiso' })
    await clic(document.querySelector('[data-testid="naira-corregir-guardar"]'))
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    expect(accion('MEM-OBS', 'corregir')?.disabled).toBe(true)
    expect(articulo('MEM-OBS').querySelector('[data-naira-mensaje-del-item]')?.textContent).toBe('No tienes permiso para esta acción.')
    expect(document.body.innerHTML).not.toContain('CENTINELA-403')

    await clic(accion('MEM-OBS', 'borrar'))
    const radio = document.querySelector('input[type="radio"]') as HTMLInputElement
    await clic(radio)
    borrar.mockResolvedValueOnce({ kind: 'sin_permiso' })
    await clic(document.querySelector('[data-testid="naira-confirmar-borrado"]'))
    expect(accion('MEM-OBS', 'borrar')?.disabled).toBe(true)
    expect(articulo('MEM-OBS').querySelector('[data-naira-mensaje-del-item]')?.textContent).toBe('No tienes permiso para esta acción.')
  })

  it('[N13:dialogos-desde-el-item] corregir y borrar abren sus diálogos y su hecho sube', async () => {
    await montar([OBS])
    await clic(accion('MEM-OBS', 'corregir'))
    expect((document.querySelector('[role="dialog"] textarea') as HTMLTextAreaElement).value).toBe('MEM-TEXTO-OBS')
    const campo = document.querySelector('textarea') as HTMLTextAreaElement
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set?.call(campo, 'MEM-TEXTO-NUEVO')
      campo.dispatchEvent(new Event('input', { bubbles: true }))
    })
    corregir.mockResolvedValueOnce({ kind: 'ok', data: EJEMPLOS_DE_NAIRA['memoria.corregir'], origen: 'agente' })
    await clic(document.querySelector('[data-testid="naira-corregir-guardar"]'))
    expect(onDesenlace).toHaveBeenLastCalledWith('corregir', { kind: 'hecho' }, 'MEM-OBS')
    await clic(accion('MEM-OBS', 'borrar'))
    expect(alerta()?.querySelector('[data-naira-motivo-de-borrado]')).not.toBeNull()
    await clic(document.querySelector('input[type="radio"]'))
    borrar.mockResolvedValueOnce({
      kind: 'ok',
      data: { erasedItemIds: ['MEM-OBS'], erasedAt: '2000-01-03T15:00:00.000Z', auditId: 'AUD-1' },
      origen: 'agente',
    })
    await clic(document.querySelector('[data-testid="naira-confirmar-borrado"]'))
    expect(onDesenlace).toHaveBeenLastCalledWith('borrar', { kind: 'hecho' }, 'MEM-OBS')
  })

  it('[N13:acciones-en-movil] en móvil las acciones van en el menú «Acciones» con los mismos permisos', async () => {
    movil.valor = true
    await montar([INF])
    expect(document.querySelector('[data-naira-accion]')).toBeNull()
    const disparador = articulo('MEM-INF').querySelector('[data-naira-acciones-movil]')
    expect(disparador?.textContent).toContain('Acciones')
    await abrirMenu('MEM-INF')
    const items = Array.from(document.querySelectorAll('[role="menuitem"]')).map((m) => m.textContent?.trim())
    expect(items).toEqual(['Confirmar que es cierto', 'Corregir ítem', 'Borrar ítem'])
    const borrarItem = Array.from(document.querySelectorAll('[role="menuitem"]')).find((m) => m.textContent?.trim() === 'Borrar ítem')
    await clic(borrarItem)
    expect(alerta()?.querySelector('[data-naira-motivo-de-borrado]')).not.toBeNull()

    act(() => root.unmount())
    document.body.innerHTML = ''
    host = document.createElement('div')
    document.body.appendChild(host)
    root = createRoot(host)
    await montar([INF], { ...NINGUNO, corregir: true })
    await abrirMenu('MEM-INF')
    expect(Array.from(document.querySelectorAll('[role="menuitem"]')).map((m) => m.textContent?.trim())).toEqual(['Corregir ítem'])

    act(() => root.unmount())
    root = createRoot(host)
    await montar([INF], NINGUNO)
    expect(document.querySelector('[data-naira-acciones-movil]')).toBeNull()
  })

  it('[N13:simulado-visible] con datos de ejemplo nada escribe y se dice', async () => {
    await montar([OBS, INF], TODOS, ['MEM-OBS', 'MEM-INF'], 'ejemplo')
    const botones = Array.from(document.querySelectorAll('[data-naira-accion]')) as HTMLButtonElement[]
    expect(botones.length).toBeGreaterThan(0)
    for (const b of botones) expect(b.disabled).toBe(true)
    expect(document.body.textContent).toContain('Datos de ejemplo: no se puede cambiar la memoria.')
    for (const b of botones) await clic(b)
    expect(document.querySelector('[role="dialog"], [role="alertdialog"]')).toBeNull()
    for (const f of [promover, corregir, borrar]) expect(f).not.toHaveBeenCalled()
    expect(articulo('MEM-OBS').querySelector('[data-naira-enlace="inactivo-ejemplo"]')).not.toBeNull()

    act(() => root.unmount())
    root = createRoot(host)
    movil.valor = true
    await montar([INF], TODOS, ['MEM-INF'], 'ejemplo')
    expect((articulo('MEM-INF').querySelector('[data-naira-acciones-movil]') as HTMLButtonElement).disabled).toBe(true)
  })
})
