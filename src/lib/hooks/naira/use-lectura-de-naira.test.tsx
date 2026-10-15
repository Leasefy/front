/**
 * use-lectura-de-naira.test.tsx — el hook base de Naira (13-01, Tarea 3).
 *
 * Qué prueba: el estado se reemplaza ENTERO (un 403 después de un 200 no deja nada del 200 ni en el estado ni en el DOM,
 * FG13-1 a nivel hook); `leer = null` ⇒ sin_permiso sin red; el cambio de agencia vuelve a `cargando` sin mostrar lo de
 * la anterior; una respuesta vieja se descarta; sin agencia no se lee.
 *
 * Arnés: createRoot + act (no hay Testing Library), `useAuth` falso con la agencia que fija cada test, promesas diferidas
 * controladas por el test y un espía del `fetch` global que nunca debe llamarse. Marcador [N13:*] en el TÍTULO.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let agenciaActual: { id: string } | null = { id: 'AGY-A' }
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ agency: agenciaActual }) }))

import type { EstadoNaira } from '@/lib/api/naira/cliente'
import { useLecturaDeNaira, type LecturaDeNaira } from './use-lectura-de-naira'

type Dato = { readonly token: string }
type Leer = (() => Promise<EstadoNaira<Dato>>) | null
type Caja = { estado: LecturaDeNaira<Dato> | null; recargar: (() => void) | null }

function Probe({ leer, deps, caja }: { leer: Leer; deps: readonly unknown[]; caja: Caja }) {
  const { estado, recargar } = useLecturaDeNaira<Dato>(leer, deps)
  caja.estado = estado
  caja.recargar = recargar
  if (estado.kind === 'ok') return <span data-naira-numero="">{estado.data.token}</span>
  return <span data-estado={estado.kind} />
}

function diferida<T>() {
  let resolver: (v: T) => void = () => undefined
  const promesa = new Promise<T>((r) => {
    resolver = r
  })
  return { promesa, resolver }
}

const ok = (token: string): EstadoNaira<Dato> => ({ kind: 'ok', data: { token }, origen: 'agente' })

let container: HTMLDivElement
let root: Root
let espiaDelFetchGlobal = vi.fn()

function montar(leer: Leer, deps: readonly unknown[], caja: Caja) {
  act(() => {
    root.render(<Probe leer={leer} deps={deps} caja={caja} />)
  })
}

const asentar = () =>
  act(async () => {
    for (let i = 0; i < 5; i += 1) await Promise.resolve()
  })

beforeEach(() => {
  agenciaActual = { id: 'AGY-A' }
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  espiaDelFetchGlobal = vi.fn()
  vi.stubGlobal('fetch', espiaDelFetchGlobal)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.unstubAllGlobals()
})

describe('useLecturaDeNaira', () => {
  it('[N13:control-positivo] una lectura ok pinta el dato', async () => {
    const caja: Caja = { estado: null, recargar: null }
    const leer = vi.fn(async () => ok('TOKEN-DEL-200'))
    montar(leer, [], caja)
    await asentar()
    expect(caja.estado).toEqual(ok('TOKEN-DEL-200'))
    expect(container.textContent).toContain('TOKEN-DEL-200')
    expect(container.querySelector('[data-naira-numero]')).not.toBeNull()
    expect(leer).toHaveBeenCalledTimes(1)
  })

  it('[N13:403-sin-residuo] después de un 200, un 403 deja exactamente sin_permiso y nada del 200 en el DOM', async () => {
    const caja: Caja = { estado: null, recargar: null }
    let respuesta: EstadoNaira<Dato> = ok('TOKEN-DEL-200')
    const leer = vi.fn(async () => respuesta)
    montar(leer, [], caja)
    await asentar()
    expect(container.textContent).toContain('TOKEN-DEL-200')

    respuesta = { kind: 'sin_permiso' }
    await act(async () => {
      caja.recargar?.()
    })
    await asentar()
    expect(caja.estado).toEqual({ kind: 'sin_permiso' })
    expect('data' in (caja.estado ?? {})).toBe(false)
    expect(container.textContent).not.toContain('TOKEN-DEL-200')
    expect(container.querySelector('[data-naira-numero]')).toBeNull()
  })

  it('[N13:estado-entero] después de un ok, un conflicto queda tal cual, sin data', async () => {
    const caja: Caja = { estado: null, recargar: null }
    let respuesta: EstadoNaira<Dato> = ok('TOKEN-DEL-200')
    montar(async () => respuesta, [], caja)
    await asentar()
    respuesta = { kind: 'conflicto', razon: 'x' }
    await act(async () => {
      caja.recargar?.()
    })
    await asentar()
    expect(caja.estado).toEqual({ kind: 'conflicto', razon: 'x' })
    expect(Object.keys(caja.estado ?? {}).sort()).toEqual(['kind', 'razon'])
  })

  it('[N13:recargar-reemplaza] mientras recargar está pendiente se conserva lo vigente; al llegar lo reemplaza entero', async () => {
    const caja: Caja = { estado: null, recargar: null }
    const segunda = diferida<EstadoNaira<Dato>>()
    let llamada = 0
    const leer = vi.fn(() => {
      llamada += 1
      return llamada === 1 ? Promise.resolve(ok('PRIMERO')) : segunda.promesa
    })
    montar(leer, [], caja)
    await asentar()
    expect(caja.estado).toEqual(ok('PRIMERO'))

    await act(async () => {
      caja.recargar?.()
    })
    await asentar()
    expect(caja.estado).toEqual(ok('PRIMERO')) // no parpadea a cargando
    expect(container.textContent).toContain('PRIMERO')

    await act(async () => {
      segunda.resolver(ok('SEGUNDO'))
    })
    await asentar()
    expect(caja.estado).toEqual(ok('SEGUNDO'))
    expect(container.textContent).not.toContain('PRIMERO')
  })

  it('[N13:leer-null-sin-red] leer = null ⇒ sin_permiso desde el primer render, sin red; y pasar a null borra el dato', async () => {
    const caja: Caja = { estado: null, recargar: null }
    montar(null, [], caja)
    expect(caja.estado).toEqual({ kind: 'sin_permiso' })
    await asentar()
    expect(caja.estado).toEqual({ kind: 'sin_permiso' })
    expect(espiaDelFetchGlobal).not.toHaveBeenCalled()

    const otraCaja: Caja = { estado: null, recargar: null }
    const leer = vi.fn(async () => ok('TOKEN-CON-PERMISO'))
    act(() => root.unmount())
    root = createRoot(container)
    montar(leer, [], otraCaja)
    await asentar()
    expect(container.textContent).toContain('TOKEN-CON-PERMISO')
    montar(null, [], otraCaja)
    await asentar()
    expect(otraCaja.estado).toEqual({ kind: 'sin_permiso' })
    expect(container.textContent).not.toContain('TOKEN-CON-PERMISO')
    expect(leer).toHaveBeenCalledTimes(1)
    expect(espiaDelFetchGlobal).not.toHaveBeenCalled()
  })

  it('[N13:agencia-sin-residuo] al cambiar de agencia vuelve a cargando en el mismo cuadro y no muestra lo de la anterior', async () => {
    const caja: Caja = { estado: null, recargar: null }
    const pendienteDeB = diferida<EstadoNaira<Dato>>()
    const leerA = vi.fn(async () => ok('TOKEN-A'))
    montar(leerA, [], caja)
    await asentar()
    expect(container.textContent).toContain('TOKEN-A')

    agenciaActual = { id: 'AGY-B' }
    const leerB = vi.fn(() => pendienteDeB.promesa)
    montar(leerB, [], caja)
    expect(caja.estado?.kind).toBe('cargando')
    expect(container.textContent).not.toContain('TOKEN-A')
    expect(container.querySelector('[data-estado="cargando"]')).not.toBeNull()
    expect(leerB).toHaveBeenCalledTimes(1)

    await act(async () => {
      pendienteDeB.resolver(ok('TOKEN-B'))
    })
    await asentar()
    expect(container.textContent).toContain('TOKEN-B')
  })

  it('[N13:respuesta-vieja-descartada] si deps cambia con una lectura pendiente, gana la nueva aunque la vieja llegue después', async () => {
    const caja: Caja = { estado: null, recargar: null }
    const deX = diferida<EstadoNaira<Dato>>()
    const deY = diferida<EstadoNaira<Dato>>()
    montar(() => deX.promesa, ['x'], caja)
    expect(caja.estado?.kind).toBe('cargando')
    montar(() => deY.promesa, ['y'], caja)
    await act(async () => {
      deY.resolver(ok('DE-Y'))
    })
    await asentar()
    await act(async () => {
      deX.resolver(ok('DE-X'))
    })
    await asentar()
    expect(caja.estado).toEqual(ok('DE-Y'))
    expect(container.textContent).not.toContain('DE-X')
  })

  it('[N13:sin-agencia-cargando] sin agencia queda cargando y no lee; al llegar la agencia lee una vez', async () => {
    agenciaActual = null
    const caja: Caja = { estado: null, recargar: null }
    const leer = vi.fn(async () => ok('TOKEN-CON-AGENCIA'))
    montar(leer, [], caja)
    await asentar()
    expect(caja.estado).toEqual({ kind: 'cargando' })
    expect(leer).not.toHaveBeenCalled()

    agenciaActual = { id: 'AGY-A' }
    montar(leer, [], caja)
    await asentar()
    expect(leer).toHaveBeenCalledTimes(1)
    expect(caja.estado).toEqual(ok('TOKEN-CON-AGENCIA'))
  })
})
