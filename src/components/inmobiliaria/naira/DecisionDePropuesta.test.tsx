/**
 * DecisionDePropuesta.test.tsx — aprobar o rechazar una propuesta desde su ficha (13-05, Tarea 3).
 *
 * Qué prueba: los botones aparecen solo si el servidor dice que se puede decidir; aprobar decide sin diálogo y rechazar
 * pide confirmar (U9, §10.4); el pedido lleva EXACTAMENTE la huella mostrada (FG13-15); un 409 `huella_distinta` retira
 * los botones y solo «Cargar la versión actual» sigue, sin reenviar nada (P3); cada conflicto, 403 y fallo se dice por su
 * razón sin copiarla (P5); con datos de ejemplo no se decide; y nada dice quién decidió (B-5).
 *
 * Arnés (molde de 13-04): createRoot + act, stub de i18n real (es.json), `useAuth` con AGY-1, el cliente mockeado en
 * `decidirPropuesta` (promesas diferidas controladas por el test), permisos falsos; el AlertDialog sale por portal a
 * `document.body`. Marcador en el TÍTULO.
 */

import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { EstadoNaira } from '@/lib/api/naira/cliente'
import { RESPUESTA_ESTRICTA_POR_ENDPOINT, type NairaActionDecisionResult } from '@/lib/api/naira/contrato'
import { EJEMPLOS_DE_NAIRA, USER_IDS_DE_EJEMPLO } from '@/lib/data/mock-naira'
import { fechaLegible } from '@/lib/naira/vocabulario-de-seguimiento'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

type Respuesta = EstadoNaira<NairaActionDecisionResult>

const { decidir } = vi.hoisted(() => ({
  decidir: vi.fn(async (..._args: unknown[]): Promise<EstadoNaira<NairaActionDecisionResult>> => ({ kind: 'no_disponible' })),
}))

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ agency: { id: 'AGY-1' } }) }))
vi.mock('@/lib/api/naira/cliente', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/naira/cliente')>()),
  decidirPropuesta: decidir,
}))
vi.mock('@/lib/context/PermissionsContext', () => ({
  usePermissionsContext: () => ({ canAccess: () => true, isAdmin: false, agencyRole: 'ADMIN' }),
}))

import { DecisionDePropuesta, type DecisionDePropuestaProps } from './DecisionDePropuesta'
import { ProveedorDeOrigen, type OrigenDeLosDatos } from './OrigenDeNaira'

const HUELLA = 'a'.repeat(64)
const VENCE = '2000-01-03T11:35:00.000Z'
const APROBADA: Respuesta = {
  kind: 'ok',
  data: { kind: 'decidida', proposalId: 'PROP-1', decision: 'aprobada', decisionId: 'DEC-SECRETO-1' },
  origen: 'agente',
}
const RECHAZADA: Respuesta = {
  kind: 'ok',
  data: { kind: 'decidida', proposalId: 'PROP-1', decision: 'rechazada', decisionId: 'DEC-SECRETO-2' },
  origen: 'agente',
}

let contenedor: HTMLDivElement
let root: Root
let onDecidida: ReturnType<typeof vi.fn>
let onCargarVersionActual: ReturnType<typeof vi.fn>

function montar(over: Partial<DecisionDePropuestaProps> = {}, origen: OrigenDeLosDatos = 'agente') {
  const props: DecisionDePropuestaProps = {
    proposalId: 'PROP-1',
    huellaMostrada: HUELLA,
    puedeDecidir: true,
    estado: 'pendiente',
    venceEn: VENCE,
    onDecidida: onDecidida as unknown as DecisionDePropuestaProps['onDecidida'],
    onCargarVersionActual: onCargarVersionActual as unknown as DecisionDePropuestaProps['onCargarVersionActual'],
    ...over,
  }
  act(() => {
    root.render(
      <ProveedorDeOrigen origen={origen}>
        <DecisionDePropuesta {...props} />
      </ProveedorDeOrigen>,
    )
  })
}

function remontar(over: Partial<DecisionDePropuestaProps> = {}, origen: OrigenDeLosDatos = 'agente') {
  act(() => root.unmount())
  root = createRoot(contenedor)
  montar(over, origen)
}

const asentar = () =>
  act(async () => {
    for (let i = 0; i < 5; i += 1) await Promise.resolve()
  })

const aprobar = () => contenedor.querySelector<HTMLButtonElement>('[data-testid="naira-aprobar"]')
const rechazar = () => contenedor.querySelector<HTMLButtonElement>('[data-testid="naira-rechazar"]')
const dialogo = () => document.querySelector('[role="alertdialog"]')
const estado = () => contenedor.querySelector('p[role="status"]')

async function clic(el: Element | null) {
  expect(el).not.toBeNull()
  await act(async () => {
    ;(el as HTMLElement).click()
  })
}

async function aprobarCon(r: Respuesta) {
  decidir.mockImplementation(async () => r)
  await clic(aprobar())
  await asentar()
}

function sinBotones() {
  expect(aprobar()).toBeNull()
  expect(rechazar()).toBeNull()
  const textos = Array.from(contenedor.querySelectorAll('button')).map((b) => b.textContent ?? '')
  expect(textos.some((x) => x.includes('Aprobar acción') || x.includes('Rechazar propuesta'))).toBe(false)
}

beforeEach(() => {
  decidir.mockReset()
  decidir.mockImplementation(async () => ({ kind: 'no_disponible' }))
  onDecidida = vi.fn()
  onCargarVersionActual = vi.fn()
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  root = createRoot(contenedor)
})

afterEach(() => {
  act(() => root.unmount())
  contenedor.remove()
})

describe('DecisionDePropuesta', () => {
  it('[N13:control-positivo] con puedeDecidir, «Aprobar acción» y «Rechazar propuesta»', () => {
    montar()
    expect(contenedor.querySelector('[data-naira-decision="botones"]')).not.toBeNull()
    expect(aprobar()?.textContent).toContain('Aprobar acción')
    expect(rechazar()?.textContent).toContain('Rechazar propuesta')
  })

  it('[N13:fixture-es-contrato] el resultado de decidir pasa el esquema estricto y un campo renombrado no', () => {
    const ESTRICTO = RESPUESTA_ESTRICTA_POR_ENDPOINT['acciones.decidir']
    const bueno = { ...EJEMPLOS_DE_NAIRA['acciones.decidir'], proposalId: 'PROP-1' }
    expect(() => ESTRICTO.parse(bueno)).not.toThrow()
    const { proposalId, ...resto } = bueno
    expect(() => ESTRICTO.parse({ ...resto, proposalIdd: proposalId })).toThrow()
  })

  it('[N13:aprobar-sin-dialogo] aprobar decide en el acto, sin doble envío, y el resultado recibe el foco', async () => {
    montar()
    let resolver: (r: Respuesta) => void = () => undefined
    decidir.mockImplementation(() => new Promise<Respuesta>((r) => (resolver = r)))
    await clic(aprobar())
    expect(dialogo()).toBeNull()
    expect(decidir).toHaveBeenCalledTimes(1)
    expect(decidir).toHaveBeenCalledWith('AGY-1', 'PROP-1', { decision: 'aprobar', huellaVista: HUELLA })
    expect(aprobar()?.disabled).toBe(true)
    expect(rechazar()?.disabled).toBe(true)
    await act(async () => {
      aprobar()?.click()
    })
    expect(decidir).toHaveBeenCalledTimes(1)
    await act(async () => {
      resolver(APROBADA)
    })
    await asentar()
    expect(onDecidida).toHaveBeenCalledWith('aprobada')
    expect(estado()?.textContent).toBe(
      'Registramos tu aprobación. Antes de ejecutarla, Naira vuelve a comprobar que nada cambió; si algo cambió, no la ejecuta y lo verás aquí.',
    )
    expect(document.activeElement).toBe(estado())
    sinBotones()
    expect(contenedor.innerHTML).not.toContain('DEC-SECRETO-1')
  })

  it('[N13:rechazar-con-dialogo] rechazar pide confirmar; «Volver» no decide; confirmar decide con la misma huella', async () => {
    montar()
    await clic(rechazar())
    expect(decidir).not.toHaveBeenCalled()
    expect(dialogo()?.textContent).toContain('¿Rechazar esta propuesta?')
    expect(dialogo()?.textContent).toContain('Naira no la ejecutará y no la volverá a proponer para este seguimiento.')
    const volver = Array.from(dialogo()?.querySelectorAll('button') ?? []).find((b) => b.textContent?.trim() === 'Volver')
    await clic(volver ?? null)
    expect(dialogo()).toBeNull()
    expect(decidir).not.toHaveBeenCalled()
    decidir.mockImplementation(async () => RECHAZADA)
    await clic(rechazar())
    await clic(document.querySelector('[data-testid="naira-confirmar-rechazo"]'))
    await asentar()
    expect(decidir).toHaveBeenCalledTimes(1)
    expect(decidir).toHaveBeenCalledWith('AGY-1', 'PROP-1', { decision: 'rechazar', huellaVista: HUELLA })
    expect(estado()?.textContent).toBe('Rechazada. Naira no la ejecutará ni la volverá a proponer para este seguimiento.')
    expect(onDecidida).toHaveBeenCalledWith('rechazada')
  })

  it('[N13:huella-vista] el pedido lleva exactamente la huella mostrada', async () => {
    const OTRA = 'c'.repeat(64)
    montar({ huellaMostrada: OTRA })
    await aprobarCon(APROBADA)
    expect(decidir).toHaveBeenCalledTimes(1)
    expect(decidir.mock.calls[0]?.[2]).toEqual({ decision: 'aprobar', huellaVista: OTRA })
  })

  it('[N13:sin-reenvio] si la situación cambió, se avisa, se retiran los botones y nada se reenvía solo', async () => {
    montar()
    await aprobarCon({ kind: 'conflicto', razon: 'huella_distinta' })
    expect(estado()?.textContent).toBe(
      'La situación cambió desde que abriste esta propuesta. Carga la versión actual para ver su consecuencia antes de decidir.',
    )
    const cargar = contenedor.querySelector('[data-testid="naira-cargar-version-actual"]')
    expect(cargar).not.toBeNull()
    sinBotones()
    await asentar()
    expect(decidir).toHaveBeenCalledTimes(1)
    await clic(cargar)
    await asentar()
    expect(onCargarVersionActual).toHaveBeenCalledTimes(1)
    expect(decidir).toHaveBeenCalledTimes(1)
  })

  it('[N13:conflicto-por-razon] cada conflicto se dice por su razón; una razón desconocida deja reintentar', async () => {
    montar()
    await aprobarCon({ kind: 'conflicto', razon: 'vencida' })
    expect(estado()?.textContent).toBe(`Esta propuesta venció el ${fechaLegible(VENCE) ?? '∅'} y ya no se puede decidir.`)
    sinBotones()
    expect(contenedor.innerHTML).not.toContain('vencida')

    remontar()
    await aprobarCon({ kind: 'conflicto', razon: 'ya_decidida' })
    expect(estado()?.textContent).toBe('Esta propuesta ya fue decidida.')
    sinBotones()
    expect(contenedor.innerHTML).not.toContain('ya_decidida')

    for (const razon of ['no_reproducible', 'procedencia_no_disponible', 'clase_incoherente']) {
      remontar()
      await aprobarCon({ kind: 'conflicto', razon })
      expect(estado()?.textContent, razon).toBe('No podemos verificar esta propuesta, así que no se puede aprobar.')
      sinBotones()
      expect(contenedor.innerHTML).not.toContain(razon)
    }

    for (const razon of ['otra_cosa', null]) {
      remontar()
      await aprobarCon({ kind: 'conflicto', razon })
      expect(estado()?.textContent, String(razon)).toBe('No pudimos registrar tu decisión. Intenta de nuevo.')
      expect(aprobar()).not.toBeNull()
      expect(rechazar()).not.toBeNull()
      expect(contenedor.innerHTML).not.toContain('otra_cosa')
    }
  })

  it('[N13:decision-403] un 403 al decidir dice que no hay permiso y retira los botones', async () => {
    montar()
    await aprobarCon({ kind: 'sin_permiso' })
    expect(estado()?.textContent).toBe('No tienes permiso para esta acción.')
    sinBotones()
  })

  it('[N13:decision-otros] no encontrada, contrato roto, rechazado y no disponible', async () => {
    montar()
    await aprobarCon({ kind: 'no_encontrado' })
    expect(estado()?.textContent).toBe('No encontramos esta propuesta, o ya no está disponible para tu rol.')
    sinBotones()

    remontar()
    await aprobarCon({ kind: 'contrato_roto' })
    expect(estado()?.textContent).toBe('No pudimos confirmar tu decisión. Actualiza la propuesta para ver su estado.')
    sinBotones()

    for (const r of [{ kind: 'rechazado', razon: 'pedido_invalido' }, { kind: 'no_disponible' }] as const) {
      remontar()
      await aprobarCon(r)
      expect(estado()?.textContent, r.kind).toBe('No pudimos registrar tu decisión. Intenta de nuevo.')
      expect(aprobar()).not.toBeNull()
      expect(rechazar()).not.toBeNull()
      expect(contenedor.innerHTML).not.toContain('pedido_invalido')
    }
  })

  it('[N13:puede-decidir] sin puedeDecidir no hay botones; la frase del rol solo si está pendiente', () => {
    montar({ puedeDecidir: false })
    sinBotones()
    expect(contenedor.textContent).toContain('Tu rol no puede aprobar esta acción.')
    montar({ puedeDecidir: false, estado: 'aprobada' })
    sinBotones()
    expect(contenedor.textContent).not.toContain('Tu rol no puede aprobar esta acción.')
  })

  it('[N13:simulado-visible] con datos de ejemplo no se decide y lo dice', async () => {
    montar({}, 'ejemplo')
    expect(aprobar()?.disabled).toBe(true)
    expect(rechazar()?.disabled).toBe(true)
    expect(contenedor.textContent).toContain('Datos de ejemplo: no se puede decidir.')
    await act(async () => {
      aprobar()?.click()
      rechazar()?.click()
    })
    expect(decidir).not.toHaveBeenCalled()
    expect(dialogo()).toBeNull()
  })

  it('[N13:b5-sin-persona] tras decidir, nada dice quién decidió', async () => {
    montar()
    await aprobarCon(APROBADA)
    const html = contenedor.innerHTML
    for (const id of USER_IDS_DE_EJEMPLO) expect(html).not.toContain(id)
    expect(/aprobad[oa] por|rechazad[oa] por|quién/i.test(contenedor.textContent ?? '')).toBe(false)
  })
})
