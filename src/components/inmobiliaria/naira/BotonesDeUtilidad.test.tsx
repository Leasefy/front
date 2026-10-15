/**
 * @vitest-environment happy-dom
 *
 * BotonesDeUtilidad — tres votos de equipo, sin actor y de sesión; cada razón del servidor por su nombre; deshabilitados
 * con datos de ejemplo (D13-15, U20, UI-SPEC §7.3.2 y §8.6). El cliente se mockea con promesas que controla el test.
 */

import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { EstadoNaira } from '@/lib/api/naira/cliente'
import type { NairaSignalFeedbackResult } from '@/lib/api/naira/contrato'

type Respuesta = EstadoNaira<NairaSignalFeedbackResult>

const red = vi.hoisted(() => {
  const pendientes: ((r: unknown) => void)[] = []
  const votar = vi.fn(
    (_agencyId: string, _promocionId: string, _valor: string) =>
      new Promise<unknown>((resolve) => {
        pendientes.push(resolve)
      }),
  )
  return { pendientes, votar, toastError: vi.fn() }
})

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ agency: { id: 'AGY-1' } }) }))
vi.mock('@/lib/api/naira/cliente', () => ({ votarSenal: red.votar }))
vi.mock('@/components/ui/toast', () => ({ toast: { error: red.toastError, success: vi.fn() } }))

import { BotonesDeUtilidad, type OrigenDelVoto } from './BotonesDeUtilidad'
import { ProveedorDeOrigen } from './OrigenDeNaira'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const REGISTRADO: Respuesta = {
  kind: 'ok',
  data: { kind: 'registrado', votoId: 'v-1', valor: 'util', diaDelVoto: '2000-01-03' },
  origen: 'agente',
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  red.pendientes.length = 0
  red.votar.mockClear()
  red.toastError.mockClear()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

function montar(origenDelVoto: OrigenDelVoto = { kind: 'loop_abierto' }, origen: 'agente' | 'ejemplo' = 'agente'): void {
  act(() => {
    root.render(
      <ProveedorDeOrigen origen={origen}>
        <BotonesDeUtilidad promocionId="P-1" origenDelVoto={origenDelVoto} />
      </ProveedorDeOrigen>,
    )
  })
}

const botones = () => [...container.querySelectorAll('[role="group"] button')] as HTMLButtonElement[]
const boton = (texto: string) => botones().find((b) => (b.textContent ?? '').trim() === texto)
const region = () => container.querySelector('[aria-live="polite"]')
const presionados = () => botones().filter((b) => b.getAttribute('aria-pressed') === 'true')

async function clic(texto: string): Promise<void> {
  await act(async () => {
    boton(texto)?.click()
  })
}

async function responder(r: Respuesta): Promise<void> {
  await act(async () => {
    const resolver = red.pendientes.shift()
    if (!resolver) throw new Error('no había un voto en vuelo')
    resolver(r)
  })
}

describe('<BotonesDeUtilidad>', () => {
  it('[N13:control-positivo] votar Útil llama al cliente sin actor y, con el 201, lo marca y lo dice', async () => {
    montar()
    await clic('Útil')
    expect(red.votar).toHaveBeenCalledTimes(1)
    expect(red.votar).toHaveBeenCalledWith('AGY-1', 'P-1', 'util')
    await responder(REGISTRADO)
    expect(boton('Útil')?.getAttribute('aria-pressed')).toBe('true')
    expect(boton('No útil')?.getAttribute('aria-pressed')).toBe('false')
    expect(boton('Ya lo sabía')?.getAttribute('aria-pressed')).toBe('false')
    expect(region()?.textContent).toBe(
      'Registrado como "útil". Tu respuesta cuenta como la del equipo y reemplaza la anterior.',
    )
  })

  it('[N13:voto-secciones] solo votan atención, informativo y los loops; estado, semanal y seguimiento no pintan nada', () => {
    for (const seccion of ['estado', 'semanal', 'seguimiento'] as const) {
      montar({ kind: 'item_del_briefing', seccion })
      expect(container.innerHTML, seccion).toBe('')
    }
    for (const origen of [
      { kind: 'item_del_briefing', seccion: 'atencion' },
      { kind: 'item_del_briefing', seccion: 'informativo' },
      { kind: 'loop_abierto' },
    ] as const) {
      montar(origen)
      const grupo = container.querySelector('[data-naira-voto] [role="group"]')
      expect(grupo, JSON.stringify(origen)).not.toBeNull()
      expect(grupo?.querySelectorAll('button'), JSON.stringify(origen)).toHaveLength(3)
    }
  })

  it('[N13:voto-razones] cada razón del servidor se dice por su nombre y ningún botón queda presionado', async () => {
    const casos: [Respuesta, string][] = [
      [{ kind: 'conflicto', razon: 'ventana_vencida' }, 'Ya pasó el plazo para responder sobre esta señal.'],
      [{ kind: 'conflicto', razon: 'voto_antes_de_la_entrega' }, 'Esta señal todavía no te llegó.'],
      [{ kind: 'no_encontrado' }, 'Solo puede responder quien recibió esta señal en su briefing.'],
      [{ kind: 'sin_permiso' }, 'No tienes permiso para esta acción.'],
      [{ kind: 'conflicto', razon: 'otra' }, 'No pudimos registrar tu respuesta. Intenta de nuevo.'],
    ]
    for (const [respuesta, texto] of casos) {
      act(() => root.unmount())
      root = createRoot(container)
      montar()
      await clic('No útil')
      await responder(respuesta)
      expect(region()?.textContent, JSON.stringify(respuesta)).toBe(texto)
      expect(presionados(), JSON.stringify(respuesta)).toHaveLength(0)
      if (respuesta.kind === 'sin_permiso') {
        for (const b of botones()) expect(b.disabled, b.textContent ?? '').toBe(true)
      }
    }
  })

  it('[N13:voto-en-vuelo] mientras viaja el voto los tres están deshabilitados y un segundo clic no manda otro', async () => {
    montar()
    await clic('Útil')
    expect(red.votar).toHaveBeenCalledTimes(1)
    for (const b of botones()) expect(b.disabled, b.textContent ?? '').toBe(true)
    await clic('No útil')
    await clic('Útil')
    expect(red.votar).toHaveBeenCalledTimes(1)
    await responder(REGISTRADO)
  })

  it('[N13:voto-red] sin red: toast de error, los botones vuelven y ninguno queda presionado', async () => {
    montar()
    await clic('Ya lo sabía')
    await responder({ kind: 'no_disponible' })
    expect(red.toastError).toHaveBeenCalledWith('No pudimos registrar tu respuesta. Intenta de nuevo.')
    for (const b of botones()) expect(b.disabled, b.textContent ?? '').toBe(false)
    expect(presionados()).toHaveLength(0)
  })

  it('[N13:simulado-visible] con datos de ejemplo los tres están deshabilitados, se dice por qué y no se llama a la red', async () => {
    montar({ kind: 'loop_abierto' }, 'ejemplo')
    expect(botones()).toHaveLength(3)
    for (const b of botones()) expect(b.disabled, b.textContent ?? '').toBe(true)
    expect(container.textContent).toContain('Datos de ejemplo: no se puede responder.')
    await clic('Útil')
    expect(red.votar).not.toHaveBeenCalled()
  })

  it('[N13:voto-sin-persistencia] un voto exitoso no deja nada guardado y al volver a montar ninguno está presionado', async () => {
    const local = localStorage.length
    const sesion = sessionStorage.length
    montar()
    await clic('Útil')
    await responder(REGISTRADO)
    expect(presionados()).toHaveLength(1)
    expect(localStorage.length).toBe(local)
    expect(sessionStorage.length).toBe(sesion)
    for (const almacen of [localStorage, sessionStorage]) {
      for (let i = 0; i < almacen.length; i++) {
        const clave = almacen.key(i) ?? ''
        expect(clave + '=' + (almacen.getItem(clave) ?? '')).not.toContain('P-1')
      }
    }
    act(() => root.unmount())
    root = createRoot(container)
    montar()
    expect(presionados()).toHaveLength(0)
  })
})
