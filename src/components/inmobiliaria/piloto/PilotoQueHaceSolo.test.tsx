/**
 * «Qué hace solo» (AUTONOMIA-POR-TIPO, 04-10-2026). Nico (31-08): «si la
 * inmobiliaria eligió piloto automático, que se maneje sola — según lo que haya
 * escogido». Lo que se fija:
 *   · por agente, sus tipos: por defecto «pide tu clic»; el ADMINISTRADOR tiene
 *     el interruptor «Que vaya solo»; el asesor lo ve sin controles;
 *   · escogido: quién y cuándo, y si hoy actúa (o qué le falta);
 *   · lo que nunca va solo y lo que no tiene cómo, con su porqué (la
 *     conciliación dudosa ofrece la sugerencia);
 *   · la confirmación dice qué va a pasar y a quién le llega;
 *   · la API: un micro viejo (404) no rompe el panel; el PUT manda `vaSolo`.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

const agentFetchMock = vi.hoisted(() => vi.fn())
vi.mock('@/lib/api/agent-fetch', () => ({ agentFetch: agentFetchMock }))

import {
  ExplicacionDeQueVayaSolo,
  PilotoLoQueNuncaVaSolo,
  PilotoQueHaceSoloDelAgente,
  diaDeLaEleccion,
} from './PilotoQueHaceSolo'
import {
  fetchPilotoTiposQueVanSolos,
  putPilotoTipoQueVaSolo,
  type PilotoTiposQueVanSolosResponse,
  type TipoQueVaSolo,
} from '@/lib/api/piloto'

const RENOVACION: TipoQueVaSolo = {
  tipo: 'gerente.renovacion_propuesta',
  agente: 'contratos',
  procesos: ['gerente.renovacion_propuesta'],
  nombre: 'Enviar la propuesta de renovación',
  queVaAPasar: 'Tres meses antes del fin, el Piloto le envía al inquilino la propuesta de renovación ya escrita.',
  aQuienLeLlega: 'Al inquilino del contrato (a su portal y a su correo).',
  condiciones: ['Vivienda: el canon propuesto no pasa del canon de hoy con el IPC del año calendario anterior.'],
  envio: 'aviso',
  porDefecto: 'Pide tu clic (como siempre).',
  escogido: false,
  escogidoPor: null,
  escogidoEn: null,
  actuaHoy: false,
  porQueNoActua: null,
}

const DATOS = (cambios: Partial<PilotoTiposQueVanSolosResponse> = {}): PilotoTiposQueVanSolosResponse => ({
  tipos: [RENOVACION],
  nunca: [
    {
      categoria: 'plata_que_sale',
      nombre: 'Plata que sale',
      porQue: 'Giros, egresos y devoluciones mueven plata de otra persona: siempre los aprueba una persona.',
      procesos: [{ id: 'propietarios.giro', agente: 'propietarios', queHace: 'Aprueba el lote de giro a los propietarios.' }],
    },
  ],
  noPuedenIrSolos: [
    {
      id: 'gerente.conciliacion_dudosos',
      agente: 'conciliacion',
      queHace: 'Te avisa de los movimientos del banco que no calzan exacto.',
      porQue: 'Hay que elegir a qué cobro va cada movimiento: eso no se puede hacer solo. El Piloto te deja su sugerencia en la conciliación para que la confirmes con un clic.',
    },
  ],
  puedeEditar: true,
  guardable: true,
  porQueNo: null,
  pilotoActivo: true,
  ...cambios,
})

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  agentFetchMock.mockReset()
  process.env.NEXT_PUBLIC_AGENT_URL = 'http://micro.test'
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  delete process.env.NEXT_PUBLIC_AGENT_URL
})

const q = (id: string) => container.querySelector(`[data-testid="${id}"]`)

describe('Qué hace solo, por agente', () => {
  it('el administrador ve «Por defecto: pide tu clic» y el interruptor «Que vaya solo»', () => {
    const onEscoger = vi.fn()
    act(() => root.render(<PilotoQueHaceSoloDelAgente agente="contratos" datos={DATOS()} ocupado={null} onEscoger={onEscoger} />))
    expect(q('piloto-tipo-gerente.renovacion_propuesta')?.textContent).toContain('Por defecto: pide tu clic (como siempre).')
    const sw = q('piloto-tipo-switch-gerente.renovacion_propuesta') as HTMLButtonElement
    expect(sw).not.toBeNull()
    act(() => sw.click())
    expect(onEscoger).toHaveBeenCalledWith(RENOVACION, true)
  })

  it('🔴 el asesor (no administrador) lo ve sin controles y con el porqué', () => {
    act(() =>
      root.render(
        <PilotoQueHaceSoloDelAgente
          agente="contratos"
          datos={DATOS({ puedeEditar: false, porQueNo: 'Sólo un administrador escoge qué hace solo el Piloto: actúa a su nombre.' })}
          ocupado={null}
          onEscoger={vi.fn()}
        />,
      ),
    )
    expect(q('piloto-tipo-switch-gerente.renovacion_propuesta')).toBeNull()
    expect(q('piloto-tipo-estado-gerente.renovacion_propuesta')?.textContent).toBe('Pide tu clic')
    expect(q('piloto-que-hace-solo-porqueno-contratos')?.textContent).toContain('Sólo un administrador')
  })

  it('escogido: dice quién y cuándo, y qué le falta hoy para actuar', () => {
    // FALTANTES (05-10-2026, decisión 18): el NOMBRE de quien lo escogió, nunca su correo.
    const escogido = { ...RENOVACION, escogido: true, escogidoPor: 'Ana Administradora Lab', escogidoEn: '2026-10-05T02:10:00.000Z', porQueNoActua: 'Contratos no está en Automático: mientras tanto pide tu clic.' }
    act(() => root.render(<PilotoQueHaceSoloDelAgente agente="contratos" datos={DATOS({ tipos: [escogido] })} ocupado={null} onEscoger={vi.fn()} />))
    expect(q('piloto-tipo-quien-gerente.renovacion_propuesta')?.textContent).toBe('Lo escogió Ana Administradora Lab el 4 de octubre de 2026.')
    // Un micro anterior que todavía manda el correo: el correo no se pinta.
    act(() => root.render(<PilotoQueHaceSoloDelAgente agente="contratos" datos={DATOS({ tipos: [{ ...escogido, escogidoPor: 'ana@lab.test' }] })} ocupado={null} onEscoger={vi.fn()} />))
    expect(q('piloto-tipo-quien-gerente.renovacion_propuesta')?.textContent).toBe('Lo escogió una persona del equipo el 4 de octubre de 2026.')
    expect(q('piloto-tipo-no-actua-gerente.renovacion_propuesta')?.textContent).toContain('no está en Automático')
  })

  it('otro agente no pinta nada', () => {
    act(() => root.render(<PilotoQueHaceSoloDelAgente agente="cobranza" datos={DATOS()} ocupado={null} onEscoger={vi.fn()} />))
    expect(container.textContent).toBe('')
  })
})

describe('lo que nunca va solo', () => {
  it('🔴 lo dice con su porqué; la conciliación dudosa ofrece la sugerencia', () => {
    act(() => root.render(<PilotoLoQueNuncaVaSolo datos={DATOS()} nombreDelAgente={(a) => a} />))
    expect(q('piloto-nunca-plata_que_sale')?.textContent).toContain('siempre los aprueba una persona')
    expect(q('piloto-no-puede-gerente.conciliacion_dudosos')?.textContent).toContain('sugerencia')
  })
})

describe('la confirmación', () => {
  it('dice qué va a pasar, a quién le llega y que pide el código', () => {
    act(() => root.render(<ExplicacionDeQueVayaSolo tipo={RENOVACION} pilotoActivo={false} />))
    expect(q('confirmar-tipo-que-pasa')?.textContent).toContain('propuesta de renovación')
    expect(q('confirmar-tipo-a-quien')?.textContent).toContain('Al inquilino del contrato')
    expect(q('confirmar-tipo-apagado')).not.toBeNull()
    expect(container.textContent).toContain('código de tu aplicación')
  })

  it('el día de la elección en palabras, en Bogotá', () => {
    expect(diaDeLaEleccion('2026-10-05T04:59:00.000Z')).toBe('4 de octubre de 2026')
    expect(diaDeLaEleccion(null)).toBeNull()
  })
})

describe('la API', () => {
  it('un micro viejo (404): nada que escoger, sin romper', async () => {
    agentFetchMock.mockResolvedValueOnce(new Response('{}', { status: 404 }))
    const r = await fetchPilotoTiposQueVanSolos('ag-1')
    expect(r.ok).toBe(true)
    expect(r.data?.tipos).toEqual([])
  })

  it('escoger manda { vaSolo } al tipo; el código pendiente vuelve como fallo', async () => {
    agentFetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ statusCode: 403, code: 'SEGUNDO_FACTOR_RECIENTE', message: 'Confirma con el código.' }), { status: 403 }),
    )
    const r = await putPilotoTipoQueVaSolo('ag-1', 'gerente.renovacion_propuesta', true)
    const [url, init] = agentFetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('http://micro.test/api/agency/ag-1/piloto/tipos-que-van-solos/gerente.renovacion_propuesta')
    expect(init.method).toBe('PUT')
    expect(JSON.parse(String(init.body))).toEqual({ vaSolo: true })
    expect(r.ok).toBe(false)
    expect((r.fallo as { code?: string })?.code).toBe('SEGUNDO_FACTOR_RECIENTE')
  })
})
