/**
 * use-naira-senal.test.tsx — la lectura principal de la ficha de una señal (13-03, Tarea 1).
 *
 * Qué prueba: pide con la agencia y el id; al pasar a otra señal cuya lectura da 403 queda exactamente `sin_permiso`,
 * sin nada de la anterior (FG13-1 a nivel hook, con el disparador real: el cambio de id); y NO refresca al volver al
 * foco (lo congelado no cambia, P8).
 *
 * Arnés: el de use-naira-briefing.test.tsx con `leerSenal`. Marcador [N13:*] en el TÍTULO.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'

import type { EstadoNaira } from '@/lib/api/naira/cliente'
import type { NairaSignalDetail } from '@/lib/api/naira/contrato'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const red = vi.hoisted(() => {
  const estado: { responder: (promocionId: string) => Promise<unknown> } = { responder: async () => ({ kind: 'no_disponible' }) }
  const leerSenal = vi.fn((_agencyId: string, promocionId: string) => estado.responder(promocionId))
  return { estado, leerSenal }
})

vi.mock('@/lib/auth', () => ({ useAuth: () => ({ agency: { id: 'AGY-1' } }) }))
vi.mock('@/lib/api/naira/cliente', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/naira/cliente')>()),
  leerSenal: red.leerSenal,
}))

import type { LecturaDeNaira } from './use-lectura-de-naira'
import { useNairaSenal } from './use-naira-senal'

type Caja = { estado: LecturaDeNaira<NairaSignalDetail> | null }

function senalCon(promocionId: string, token: string): NairaSignalDetail {
  return {
    promocionId,
    dia: '2000-01-03',
    corte: '2000-01-03T11:00:00.000Z',
    congeladaEn: '2000-01-03T11:45:00.000Z',
    item: {
      seccion: 'atencion',
      posicion: 1,
      metricId: 'cartera.morosidad_rate',
      valor: '12.5',
      unidad: 'pct',
      asOf: '2000-01-03T11:15:00.000Z',
      fuente: 'agent.debtor_states',
      trust: 'system',
      clave: 'morosidad@1:cartera.morosidad_rate:2000-01-03',
      urgencyClass: 'ventana_legal',
      titulo: token,
      promocion: { kind: 'promovida', promocionId },
      causa: { kind: 'investigacion_no_disponible' },
      entidades: { kind: 'agregada' },
      valorRenderizado: '12,5%',
      nombreDeMetrica: 'Morosidad de la cartera (ejemplo)',
    },
    causa: { kind: 'investigacion_no_disponible' },
  }
}

const ok = (promocionId: string, token: string): EstadoNaira<NairaSignalDetail> => ({
  kind: 'ok',
  data: senalCon(promocionId, token),
  origen: 'agente',
})

function Probe({ promocionId, caja }: { promocionId: string; caja: Caja }) {
  const { estado } = useNairaSenal(promocionId)
  caja.estado = estado
  if (estado.kind === 'ok') return <span data-naira-numero="">{estado.data.item.titulo}</span>
  return <span data-estado={estado.kind} />
}

let container: HTMLDivElement
let root: Root

function montar(promocionId: string, caja: Caja) {
  act(() => {
    root.render(<Probe promocionId={promocionId} caja={caja} />)
  })
}

const asentar = () =>
  act(async () => {
    for (let i = 0; i < 5; i += 1) await Promise.resolve()
  })

beforeEach(() => {
  red.leerSenal.mockClear()
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

describe('useNairaSenal', () => {
  it('[N13:control-positivo] pide la señal con la agencia y el id y pinta el ok', async () => {
    red.estado.responder = async (id) => ok(id, 'TOKEN-SENAL-200')
    const caja: Caja = { estado: null }
    montar('P-1', caja)
    await asentar()
    expect(red.leerSenal).toHaveBeenCalledWith('AGY-1', 'P-1')
    expect(caja.estado?.kind).toBe('ok')
    expect(container.textContent).toContain('TOKEN-SENAL-200')
  })

  it('[N13:403-sin-residuo] al pasar a una señal sin permiso queda exactamente sin_permiso y nada de la anterior', async () => {
    red.estado.responder = async (id) => (id === 'P-1' ? ok('P-1', 'TOKEN-SENAL-200') : { kind: 'sin_permiso' })
    const caja: Caja = { estado: null }
    montar('P-1', caja)
    await asentar()
    expect(container.textContent).toContain('TOKEN-SENAL-200')

    montar('P-2', caja)
    await asentar()
    expect(red.leerSenal).toHaveBeenLastCalledWith('AGY-1', 'P-2')
    expect(caja.estado).toEqual({ kind: 'sin_permiso' })
    expect(container.textContent).not.toContain('TOKEN-SENAL-200')
    expect(container.querySelector('[data-naira-numero]')).toBeNull()
  })

  it('[N13:sin-refetch-al-volver] volver al foco no vuelve a pedir la señal congelada', async () => {
    red.estado.responder = async (id) => ok(id, 'TOKEN-SENAL-200')
    const caja: Caja = { estado: null }
    montar('P-1', caja)
    await asentar()
    expect(red.leerSenal).toHaveBeenCalledTimes(1)
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await asentar()
    expect(red.leerSenal).toHaveBeenCalledTimes(1)
    expect(container.textContent).toContain('TOKEN-SENAL-200')
  })
})
