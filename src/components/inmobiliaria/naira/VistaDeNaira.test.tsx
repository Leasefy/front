/**
 * @vitest-environment happy-dom
 *
 * VistaDeNaira — el estado ANTES que los hijos (D13-4, UI-03, FG13-1 a nivel componente).
 *
 * Sin Testing Library: `createRoot` + `act`. La copy sale del es.json REAL por el stub de i18n (FG13-17).
 */

import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: React.PropsWithChildren<{ href: string } & Record<string, unknown>>) =>
    React.createElement('a', { href, ...rest }, children),
}))

import { KINDS_DE_ESTADO_NAIRA } from '@/lib/api/naira/cliente'
import type { LecturaDeNaira } from '@/lib/hooks/naira/use-lectura-de-naira'

import { useOrigenDeNaira, type OrigenDeLosDatos } from './OrigenDeNaira'
import { VistaDeNaira } from './VistaDeNaira'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

interface Datos {
  readonly token: string
}

/** La ruta la pone el test: el componente no conoce ninguna (P17). */
const VOLVER = { label: 'Volver a la lista (prueba)', href: '/panel/inmobiliaria/x' }
const TOKEN = 'TOKEN-DEL-200'
const OK_AGENTE: LecturaDeNaira<Datos> = { kind: 'ok', data: { token: TOKEN }, origen: 'agente' }
const QUE_EJEMPLO = 'El briefing, las señales, el seguimiento, las propuestas y la memoria de Naira'

type KindNoOk = Exclude<LecturaDeNaira<Datos>['kind'], 'ok'>

/** Un estado distinto de `ok`, con `razon: null` donde el tipo la pide. */
function estadoNoOk(kind: KindNoOk): LecturaDeNaira<Datos> {
  if (kind === 'conflicto' || kind === 'rechazado') return { kind, razon: null }
  return { kind } as LecturaDeNaira<Datos>
}

const NO_OK: readonly KindNoOk[] = [
  'cargando',
  ...KINDS_DE_ESTADO_NAIRA.filter((k): k is Exclude<(typeof KINDS_DE_ESTADO_NAIRA)[number], 'ok'> => k !== 'ok'),
]

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
  vi.restoreAllMocks()
})

function pintarDatos(data: Datos): React.ReactNode {
  return (
    <>
      <p>{data.token}</p>
      <span data-naira-numero="">1</span>
    </>
  )
}

function montar(
  estado: LecturaDeNaira<Datos>,
  renderOk: (data: Datos, origen: OrigenDeLosDatos) => React.ReactNode = pintarDatos,
  onReintentar?: () => void,
): void {
  act(() => {
    root.render(
      <VistaDeNaira
        nombre="briefing"
        estado={estado}
        renderOk={renderOk}
        queEs="el briefing"
        volverA={VOLVER}
        onReintentar={onReintentar}
      />,
    )
  })
}

const raiz = () => container.querySelector('[data-naira-vista]')

function Sonda(): React.ReactElement {
  const origen = useOrigenDeNaira()
  return <span data-testid="sonda" data-origen={origen} />
}

describe('<VistaDeNaira>', () => {
  it('[N13:control-positivo] un ok del agente llama a renderOk una vez con (data, agente) y pinta sus hijos', () => {
    const espia = vi.fn(pintarDatos)
    montar(OK_AGENTE, espia)
    expect(espia).toHaveBeenCalledTimes(1)
    expect(espia).toHaveBeenCalledWith({ token: TOKEN }, 'agente')
    expect(container.textContent).toContain(TOKEN)
    expect(container.querySelector('[data-naira-numero]')).not.toBeNull()
    expect(raiz()?.getAttribute('data-naira-vista')).toBe('briefing')
    expect(raiz()?.getAttribute('data-naira-estado')).toBe('ok')
    expect(container.querySelector('[data-testid="aviso-datos-de-ejemplo"]')).toBeNull()
    expect(raiz()?.hasAttribute('data-sample')).toBe(false)
  })

  it('[N13:solo-ok-llama-renderOk] cargando y cada kind distinto de ok NO llaman a renderOk', () => {
    expect(NO_OK.length).toBe(KINDS_DE_ESTADO_NAIRA.length)
    for (const kind of NO_OK) {
      const espia = vi.fn(pintarDatos)
      montar(estadoNoOk(kind), espia, () => {})
      expect(espia, kind).not.toHaveBeenCalled()
      expect(raiz()?.getAttribute('data-naira-estado'), kind).toBe(kind)
      expect(container.textContent, kind).not.toContain(TOKEN)
    }
  })

  it('[N13:estados-cerrados] cada kind pinta su estado y solo ese', () => {
    const reintentar = vi.fn()
    for (const kind of NO_OK) {
      montar(estadoNoOk(kind), pintarDatos, reintentar)
      const q = (s: string) => container.querySelector(s)
      switch (kind) {
        case 'cargando':
          expect(q('[role="status"][aria-busy="true"]'), kind).not.toBeNull()
          break
        case 'sin_permiso':
          expect(q('[data-testid="naira-sin-permiso"]'), kind).not.toBeNull()
          break
        case 'apagada':
          expect(q('[data-testid="naira-apagada"]'), kind).not.toBeNull()
          break
        case 'no_encontrado':
          expect(q('[data-testid="naira-no-encontrado"]'), kind).not.toBeNull()
          expect(q('a[href="/panel/inmobiliaria/x"]'), kind).not.toBeNull()
          break
        case 'no_disponible':
        case 'conflicto':
        case 'rechazado':
          expect(q('[data-testid="fallo-de-carga"][data-tipo="servidor"]'), kind).not.toBeNull()
          expect(q('[data-testid="reintentar"]'), kind).not.toBeNull()
          break
        case 'contrato_roto':
          expect(q('[data-testid="naira-contrato-roto"]'), kind).not.toBeNull()
          expect(q('[data-testid="reintentar"]'), kind).toBeNull()
          break
        default:
          // Un kind nuevo que nadie pinta: el test lo ve.
          throw new Error('kind sin estado propio en VistaDeNaira: ' + kind)
      }
    }
  })

  it('[N13:403-sin-residuo] tras un ok, un 403 (y la apagada y el no disponible) no deja nada del ok', () => {
    for (const siguiente of ['sin_permiso', 'apagada', 'no_disponible'] as const) {
      montar(OK_AGENTE)
      // Control: el token del 200 está antes del cambio.
      expect(container.textContent, siguiente).toContain(TOKEN)
      expect(container.querySelector('[data-naira-numero]'), siguiente).not.toBeNull()
      act(() => {
        root.render(
          <VistaDeNaira
            nombre="briefing"
            estado={estadoNoOk(siguiente)}
            renderOk={pintarDatos}
            queEs="el briefing"
            volverA={VOLVER}
          />,
        )
      })
      expect(container.textContent, siguiente).not.toContain(TOKEN)
      expect(container.querySelector('[data-naira-numero]'), siguiente).toBeNull()
      if (siguiente === 'sin_permiso') {
        expect(container.querySelector('[data-testid="naira-sin-permiso"]')).not.toBeNull()
      }
    }
  })

  it('[N13:ejemplo-avisado] un ok de ejemplo pinta el aviso, marca data-sample y provee el origen a los hijos', () => {
    montar({ kind: 'ok', data: { token: TOKEN }, origen: 'ejemplo' }, () => <Sonda />)
    const aviso = container.querySelector('[data-testid="aviso-datos-de-ejemplo"]')
    expect(aviso).not.toBeNull()
    expect(aviso?.textContent).toContain(QUE_EJEMPLO)
    expect(raiz()?.getAttribute('data-sample')).toBe('true')
    expect(container.querySelector('[data-testid="sonda"]')?.getAttribute('data-origen')).toBe('ejemplo')

    montar({ kind: 'ok', data: { token: TOKEN }, origen: 'agente' }, () => <Sonda />)
    expect(container.querySelector('[data-testid="sonda"]')?.getAttribute('data-origen')).toBe('agente')
    expect(container.querySelector('[data-testid="aviso-datos-de-ejemplo"]')).toBeNull()
    expect(raiz()?.hasAttribute('data-sample')).toBe(false)
  })

  it('[N13:sin-permiso-sin-reintentar] el 403 no ofrece reintentar aunque se pase onReintentar, y sí la salida de la página', () => {
    montar(estadoNoOk('sin_permiso'), pintarDatos, () => {})
    expect(container.querySelector('[data-testid="reintentar"]')).toBeNull()
    const volver = container.querySelector('a[href="/panel/inmobiliaria/x"]')
    expect(volver).not.toBeNull()
    expect(volver?.textContent).toContain(VOLVER.label)
    expect(container.textContent).toContain('No tienes acceso a esto')
  })
})
