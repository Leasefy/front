/**
 * BitacoraDelLoop.test.tsx — la bitácora de un loop (13-04, Tarea 3).
 *
 * Qué prueba: los eventos salen en el orden del servidor, cada uno con su día; el cierre se dice con su fecha y su desenlace
 * y sin actor ni botones; la reasignación se dice una vez y entre roles; los nodos opacos y la razón libre no llegan al DOM;
 * los conteos de Naira no se escriben; con el loop abierto manda el estado del ÚLTIMO evento; y sin eventos se dice.
 *
 * Arnés: createRoot + act, stub de i18n real (es.json), `next/link` → `<a>`. Marcador [N13:*] en el TÍTULO.
 */

import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  RESPUESTA_ESTRICTA_POR_ENDPOINT,
  type NairaOpenLoopDetail,
  type NairaOpenLoopEvent,
} from '@/lib/api/naira/contrato'
import { EJEMPLOS_DE_NAIRA, USER_IDS_DE_EJEMPLO } from '@/lib/data/mock-naira'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: React.PropsWithChildren<{ href: string } & Record<string, unknown>>) =>
    React.createElement('a', { href, ...rest }, children),
}))

import { BitacoraDelLoop } from './BitacoraDelLoop'

const BASE = EJEMPLOS_DE_NAIRA['seguimiento.detalle']
const EVENTO_BASE = BASE.eventos[0]

function evento(
  tipo: NairaOpenLoopEvent['tipo'],
  dia: string,
  estado: NairaOpenLoopEvent['seguimiento']['estado'],
  over: Partial<NairaOpenLoopEvent> = {},
): NairaOpenLoopEvent {
  return {
    ...EVENTO_BASE,
    tipo,
    seguimiento: {
      ...EVENTO_BASE.seguimiento,
      estado,
      ciclos: 4711,
      rachaSinReincidencia: 5923,
      candidato: { kind: 'en_curso', desenlace: 'resuelto_por_dato', confirmaciones: 8317, desde: '2000-01-02' },
      ultimoDiaVerificado: dia,
    },
    memoria: { kind: 'ninguna', secreto: 'TOKEN-OPACO' } as NairaOpenLoopEvent['memoria'],
    ...over,
  }
}

const EVENTOS: NairaOpenLoopEvent[] = [
  evento('ciclo', '2000-01-05', 'en_seguimiento', { verificacion: { kind: 'del_dia' } }),
  evento('nacimiento', '2000-01-03', 'abierto', {
    verificacion: { kind: 'nacimiento' },
    cambioDeDueno: { kind: 'revalidacion_rechazada', razon: 'RAZON-LIBRE-TOKEN' },
  }),
  evento('cambio_de_forma', '2000-01-04', 'escalado', {
    verificacion: { kind: 'sin_veredicto' },
    cambioDeForma: { kind: 'cambio', de: 'recordatorio', a: 'impacto' },
  }),
]

function detalleCon(
  loopOver: Partial<NairaOpenLoopDetail['loop']> = {},
  eventos: NairaOpenLoopEvent[] = EVENTOS,
): NairaOpenLoopDetail {
  return {
    loop: {
      ...BASE.loop,
      metricId: 'cartera.morosidad_rate',
      ownerAlNacer: 'role:portafolio',
      owner: 'role:cartera',
      ownerRazon: 'persona_espera_b5',
      cierre: { kind: 'cerrado', en: '2000-01-06T11:00:00.000Z', desenlace: 'resuelto_por_dato' },
      ...loopOver,
    },
    eventos,
  }
}

let contenedor: HTMLDivElement
let root: Root

function montar(detalle: NairaOpenLoopDetail, hrefDeLaSenal: string | null = '/x/senal') {
  act(() => {
    root.render(<BitacoraDelLoop detalle={detalle} hrefDeLaSenal={hrefDeLaSenal} />)
  })
}

/** La cabecera: todo lo de la sección que no es la bitácora de eventos. */
function cabecera(): Element | null {
  return contenedor.querySelector('section > div:first-child')
}

beforeEach(() => {
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  root = createRoot(contenedor)
})

afterEach(() => {
  act(() => root.unmount())
  contenedor.remove()
})

describe('BitacoraDelLoop', () => {
  it('[N13:control-positivo] título de la métrica y un renglón con su día por evento', () => {
    montar(detalleCon())
    expect(contenedor.querySelector('h2')?.textContent).toBe('Índice de morosidad')
    const items = contenedor.querySelectorAll('ol[data-naira-bitacora] > li')
    expect(items).toHaveLength(3)
    for (const li of Array.from(items)) expect(li.querySelector('time')).not.toBeNull()
  })

  it('[N13:fixture-es-contrato] el detalle del test pasa el esquema estricto', () => {
    expect(() => RESPUESTA_ESTRICTA_POR_ENDPOINT['seguimiento.detalle'].parse(detalleCon())).not.toThrow()
  })

  it('[N13:orden-del-servidor] los eventos salen tal como vienen, sin reordenar por día', () => {
    montar(detalleCon())
    const items = Array.from(contenedor.querySelectorAll('ol[data-naira-bitacora] > li'))
    expect(items.map((li) => li.getAttribute('data-naira-evento'))).toEqual(['ciclo', 'nacimiento', 'cambio_de_forma'])
    expect(items.map((li) => li.querySelector('time')?.getAttribute('datetime'))).toEqual([
      '2000-01-05',
      '2000-01-03',
      '2000-01-04',
    ])
    expect(items[2]?.textContent).toContain('Cambió a Impacto')
  })

  it('[N13:cierre-sin-actor] el cierre dice cuándo y cómo, sin quién y sin botones', () => {
    montar(detalleCon())
    const cab = cabecera()
    expect(cab?.textContent).toContain('Cerrado')
    expect(cab?.textContent).toContain('Se cerró el')
    expect(cab?.querySelector('time[datetime="2000-01-06T11:00:00.000Z"]')).not.toBeNull()
    expect(cab?.textContent).toContain('Se resolvió según los datos')
    expect(contenedor.querySelectorAll('button')).toHaveLength(0)
    expect(contenedor.textContent ?? '').not.toMatch(/cerrado por|quién cerró|closed by|reabrir/i)
  })

  it('[N13:reasignacion-por-rol] la reasignación se dice una vez y entre roles; sin cambio no se dice', () => {
    montar(detalleCon())
    expect(contenedor.textContent).toContain('Empezó con Rol: Inmuebles; hoy es Rol: Cartera.')
    montar(detalleCon({ ownerAlNacer: 'role:cartera' }))
    expect(contenedor.textContent).not.toContain('Empezó con Rol:')
  })

  it('[N13:nodos-opacos] la memoria y la razón libre no llegan al DOM; la verificación se dice por su kind', () => {
    montar(detalleCon())
    expect(contenedor.innerHTML).not.toContain('TOKEN-OPACO')
    expect(contenedor.innerHTML).not.toContain('RAZON-LIBRE-TOKEN')
    const nacimiento = contenedor.querySelector('li[data-naira-evento="nacimiento"]')
    expect(nacimiento?.textContent).toContain('Primera observación')
  })

  it('[N13:conteos-sin-numeral] ni ciclos, ni racha, ni confirmaciones se escriben', () => {
    montar(detalleCon())
    for (const n of ['4711', '5923', '8317']) expect(contenedor.innerHTML).not.toContain(n)
    expect(contenedor.querySelectorAll('[data-naira-numero]')).toHaveLength(0)
  })

  it('[N13:rol-no-persona] sin valores del agente, sin razón del dueño y sin ids de persona', () => {
    montar(detalleCon({ huerfanoDeRol: true }))
    expect(contenedor.innerHTML).not.toContain('role:')
    expect(contenedor.innerHTML).not.toContain('persona_espera_b5')
    for (const u of USER_IDS_DE_EJEMPLO) expect(contenedor.innerHTML).not.toContain(u)
    expect(contenedor.textContent).toContain('Rol: Cartera')
  })

  it('[N13:abierto-con-ultimo-estado] con el loop abierto manda el estado del último evento del arreglo', () => {
    montar(detalleCon({ cierre: { kind: 'abierto' } }))
    const cab = cabecera()
    expect(cab?.textContent).toContain('Escalado')
    expect(cab?.textContent).not.toContain('En seguimiento')
    expect(contenedor.textContent).not.toContain('Se cerró el')
  })

  it('[N13:sin-eventos] sin eventos se dice y no hay lista', () => {
    montar(detalleCon({ cierre: { kind: 'abierto' } }, []))
    expect(contenedor.textContent).toContain('Esta bitácora todavía no tiene eventos.')
    expect(contenedor.querySelector('ol')).toBeNull()
  })
})
