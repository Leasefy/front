/**
 * use-naira-briefing.test.tsx — la lectura principal del Briefing (13-03, Tarea 1).
 *
 * Qué prueba: pide con la agencia y el día; cambiar de día es otra lectura; al volver al foco refresca y REEMPLAZA el
 * estado (con la pestaña oculta, no); y tras un ok, un 403 al volver al foco deja exactamente `sin_permiso`, sin nada del
 * ok ni en el estado ni en el DOM (FG13-1 a nivel hook, con el disparador real).
 *
 * Arnés (molde de use-lectura-de-naira.test.tsx): createRoot + act, `useAuth` falso con la agencia AGY-1, el cliente
 * mockeado SOLO en `leerBriefing` (el resto del módulo real sigue) y un `Probe` que pinta el token solo en `ok`.
 * `document.visibilityState` se redefine por test y se restaura. Marcador [N13:*] en el TÍTULO.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'

import type { EstadoNaira } from '@/lib/api/naira/cliente'
import type { NairaBriefingDay } from '@/lib/api/naira/contrato'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const red = vi.hoisted(() => {
  const estado: { responder: (dia?: string) => Promise<unknown> } = { responder: async () => ({ kind: 'no_disponible' }) }
  const leerBriefing = vi.fn((_agencyId: string, dia?: string) => estado.responder(dia))
  return { estado, leerBriefing }
})

vi.mock('@/lib/auth', () => ({ useAuth: () => ({ agency: { id: 'AGY-1' } }) }))
vi.mock('@/lib/api/naira/cliente', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/naira/cliente')>()),
  leerBriefing: red.leerBriefing,
}))

import type { LecturaDeNaira } from './use-lectura-de-naira'
import { useNairaBriefing } from './use-naira-briefing'

type Caja = { estado: LecturaDeNaira<NairaBriefingDay> | null }

function diaCon(dia: string, token: string): NairaBriefingDay {
  return {
    dia,
    corte: dia + 'T11:00:00.000Z',
    resultado: {
      kind: 'entregado',
      ocultosPorRol: 0,
      entregas: [
        {
          canal: 'email',
          tipo: 'briefing',
          congeladaEn: dia + 'T11:45:00.000Z',
          estadoDelEnvio: 'enviado',
          items: [
            {
              seccion: 'atencion',
              posicion: 1,
              metricId: 'cartera.morosidad_rate',
              valor: '12.5',
              unidad: 'pct',
              asOf: dia + 'T11:15:00.000Z',
              fuente: 'agent.debtor_states',
              trust: 'system',
              clave: 'morosidad@1:cartera.morosidad_rate:' + dia,
              urgencyClass: 'ventana_legal',
              titulo: token,
              promocion: { kind: 'promovida', promocionId: '00000000-0000-4000-8000-000000000001' },
              causa: { kind: 'investigacion_no_disponible' },
              entidades: { kind: 'agregada' },
              valorRenderizado: '12,5%',
              nombreDeMetrica: 'Morosidad de la cartera (ejemplo)',
            },
          ],
        },
      ],
    },
  }
}

const ok = (dia: string, token: string): EstadoNaira<NairaBriefingDay> => ({ kind: 'ok', data: diaCon(dia, token), origen: 'agente' })

function tokenDe(data: NairaBriefingDay): string {
  if (data.resultado.kind !== 'entregado') return ''
  return data.resultado.entregas.flatMap((e) => e.items.map((i) => i.titulo)).join(' ')
}

function Probe({ dia, caja }: { dia?: string; caja: Caja }) {
  const { estado } = useNairaBriefing(dia)
  caja.estado = estado
  if (estado.kind === 'ok') return <span data-naira-numero="">{tokenDe(estado.data)}</span>
  return <span data-estado={estado.kind} />
}

let container: HTMLDivElement
let root: Root

function montar(dia: string | undefined, caja: Caja) {
  act(() => {
    root.render(<Probe dia={dia} caja={caja} />)
  })
}

const asentar = () =>
  act(async () => {
    for (let i = 0; i < 5; i += 1) await Promise.resolve()
  })

function fijarVisibilidad(v: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => v })
}

async function volverAlFoco() {
  await act(async () => {
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await asentar()
}

beforeEach(() => {
  red.leerBriefing.mockClear()
  red.estado.responder = async () => ({ kind: 'no_disponible' })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  delete (document as { visibilityState?: unknown }).visibilityState
})

describe('useNairaBriefing', () => {
  it('[N13:control-positivo] pide el briefing del día con la agencia y pinta el ok', async () => {
    red.estado.responder = async (dia) => ok(dia ?? 'hoy', 'TOKEN-DEL-DIA')
    const caja: Caja = { estado: null }
    montar('2026-10-05', caja)
    await asentar()
    expect(red.leerBriefing).toHaveBeenCalledWith('AGY-1', '2026-10-05')
    expect(caja.estado?.kind).toBe('ok')
    expect(container.textContent).toContain('TOKEN-DEL-DIA')
  })

  it('[N13:dia-en-las-dependencias] cambiar de día vuelve a pedir y queda el estado del día nuevo', async () => {
    red.estado.responder = async (dia) => ok(dia ?? 'hoy', 'TOKEN-' + (dia ?? 'hoy'))
    const caja: Caja = { estado: null }
    montar('2026-10-05', caja)
    await asentar()
    expect(container.textContent).toContain('TOKEN-2026-10-05')
    montar('2026-10-04', caja)
    await asentar()
    expect(red.leerBriefing).toHaveBeenLastCalledWith('AGY-1', '2026-10-04')
    expect(red.leerBriefing).toHaveBeenCalledTimes(2)
    expect(caja.estado).toEqual(ok('2026-10-04', 'TOKEN-2026-10-04'))
    expect(container.textContent).not.toContain('TOKEN-2026-10-05')
  })

  it('[N13:refetch-al-volver] al volver al foco refresca y reemplaza el estado; con la pestaña oculta, no', async () => {
    let n = 0
    red.estado.responder = async (dia) => {
      n += 1
      return ok(dia ?? 'hoy', 'TOKEN-' + n)
    }
    const caja: Caja = { estado: null }
    montar('2026-10-05', caja)
    await asentar()
    expect(container.textContent).toContain('TOKEN-1')

    fijarVisibilidad('hidden')
    await volverAlFoco()
    expect(red.leerBriefing).toHaveBeenCalledTimes(1)

    fijarVisibilidad('visible')
    await volverAlFoco()
    expect(red.leerBriefing).toHaveBeenCalledTimes(2)
    expect(caja.estado).toEqual(ok('2026-10-05', 'TOKEN-2'))
    expect(container.textContent).not.toContain('TOKEN-1')
  })

  it('[N13:403-sin-residuo] tras un ok, un 403 al volver al foco deja exactamente sin_permiso y nada del ok', async () => {
    let respuesta: EstadoNaira<NairaBriefingDay> = ok('2026-10-05', 'TOKEN-BRIEFING-200')
    red.estado.responder = async () => respuesta
    const caja: Caja = { estado: null }
    montar('2026-10-05', caja)
    await asentar()
    expect(container.textContent).toContain('TOKEN-BRIEFING-200')

    respuesta = { kind: 'sin_permiso' }
    fijarVisibilidad('visible')
    await volverAlFoco()
    expect(red.leerBriefing).toHaveBeenCalledTimes(2)
    expect(caja.estado).toEqual({ kind: 'sin_permiso' })
    expect(container.textContent).not.toContain('TOKEN-BRIEFING-200')
    expect(container.querySelector('[data-naira-numero]')).toBeNull()
  })
})
