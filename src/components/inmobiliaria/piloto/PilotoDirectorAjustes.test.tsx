/**
 * La configuración del director (fase 1): gasto de IA y grupo de control.
 *
 *  1. 🔴 El gasto de IA es SÓLO del administrador: a nadie más se le pinta.
 *  2. Gastado contra tope, tramo, escalón, por componente, y la nota de que
 *     lo de cobranza (Laura) no cuenta: se cobra aparte.
 *  3. El interruptor del grupo de control lo mueve sólo el administrador; el
 *     resto ve cómo está.
 *  4. La explicación del experimento es la de la especificación, al pie de la
 *     letra (se verifica contra `es.json`, que es lo que se ve).
 *  5. Con el director apagado, una frase y nada más.
 */
import * as React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { toasts } = vi.hoisted(() => ({ toasts: [] as Array<[string, string]> }))

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string, vars?: Record<string, string>) => (vars ? `${k}(${Object.values(vars).join(',')})` : k),
    locale: 'es',
  }),
}))
vi.mock('sonner', () => ({
  toast: {
    success: (m: string) => toasts.push(['success', m]),
    error: (m: string) => toasts.push(['error', m]),
  },
}))

import { PilotoDirectorAjustesVista, type PilotoDirectorAjustesVistaProps } from './PilotoDirectorAjustes'
import {
  normalizarExperimento,
  normalizarGasto,
  type DirectorExperimento,
  type DirectorGasto,
  type ResultadoDeExperimento,
} from '@/lib/api/piloto-director'
import es from '@/lib/i18n/locales/es.json'

const GASTO = normalizarGasto({
  encendido: true,
  mes: '2026-09',
  topeCop: 168_000,
  tramo: 'mediana',
  gastadoCop: 25_704,
  excluidoCop: 14_280,
  escalon: 'normal',
  porComponente: [
    { componente: 'director.plan', cop: 17_220, cuentaParaTope: true },
    { componente: 'chat', cop: 8_484, cuentaParaTope: true },
    { componente: 'cobranza', cop: 14_280, cuentaParaTope: false },
  ],
  porDia: [
    { fecha: '2026-09-01', cop: 1_680 },
    { fecha: '2026-09-02', cop: 2_100 },
  ],
})

const EXPERIMENTO = normalizarExperimento({
  encendido: true,
  activo: false,
  porcentajeControl: 10,
  desde: null,
  entidadesEnControl: 0,
})

const lectura = <T,>(data: T | null, extra: Record<string, unknown> = {}) => ({
  data,
  isLoading: false,
  error: null,
  notAvailable: false,
  refetch: vi.fn(async () => {}),
  ...extra,
})

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  toasts.length = 0
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

function render({
  isAdmin = true,
  gasto = GASTO as DirectorGasto | null,
  experimento = EXPERIMENTO as DirectorExperimento | null,
  onCambiar = vi.fn(async (activo: boolean): Promise<ResultadoDeExperimento> => ({
    ok: true,
    data: { ...EXPERIMENTO, activo },
  })),
  extraExperimento = {} as Record<string, unknown>,
} = {}) {
  const props: PilotoDirectorAjustesVistaProps = {
    isAdmin,
    gasto: lectura(gasto),
    experimento: { ...lectura(experimento, extraExperimento), cambiando: false },
    onCambiarExperimento: onCambiar,
  }
  act(() => {
    root.render(<PilotoDirectorAjustesVista {...props} />)
  })
  return { onCambiar }
}

const q = (testid: string) => container.querySelector(`[data-testid="${testid}"]`)

describe('PilotoDirectorAjustes — gasto de IA', () => {
  it('🔴 quien no es administrador no ve el gasto', () => {
    render({ isAdmin: false })
    expect(q('piloto-director-gasto')).toBeNull()
    expect(q('piloto-director-experimento')).not.toBeNull()
  })

  it('el administrador ve lo gastado contra el tope, el tramo, el escalón y por componente', () => {
    render()
    expect(q('piloto-director-gasto')?.textContent).toContain('inmobiliaria.piloto.director.gasto.tituloDelMes(septiembre de 2026)')
    const total = q('piloto-director-gasto-total')?.textContent ?? ''
    // En PESOS, nunca en dólares (Nico, 04-10-2026).
    expect(total).toMatch(/\$ 25\.704/)
    expect(total).toMatch(/\$ 168\.000/)
    expect(total).not.toMatch(/US|USD/)
    expect(q('piloto-director-gasto-tramo')?.textContent).toBe('inmobiliaria.piloto.director.gasto.tramo.mediana')
    expect(q('piloto-director-gasto-escalon')?.textContent).toBe('inmobiliaria.piloto.director.gasto.escalon.normal')
    const componentes = q('piloto-director-gasto-componentes')?.textContent ?? ''
    expect(componentes).toContain('inmobiliaria.piloto.director.gasto.componente.directorPlan')
    expect(componentes).toContain('inmobiliaria.piloto.director.gasto.componente.cobranza')
    // Sólo la cobranza lleva «no cuenta».
    expect(componentes.split('inmobiliaria.piloto.director.gasto.noCuenta').length - 1).toBe(1)
  })

  it('🔴 dice que lo de cobranza (Laura) no cuenta porque se cobra aparte', () => {
    render()
    expect(q('piloto-director-gasto-laura')?.textContent).toContain('inmobiliaria.piloto.director.gasto.laura')
    expect(es.inmobiliaria.piloto.director.gasto.laura).toBe('Lo de cobranza (Laura) no cuenta: se cobra aparte.')
  })
})

describe('PilotoDirectorAjustes — grupo de control', () => {
  const interruptor = () => container.querySelector('[data-testid="piloto-director-experimento-switch"]') as HTMLButtonElement

  it('🔴 la explicación es la de la especificación, al pie de la letra', () => {
    render()
    expect(q('piloto-director-experimento-explicacion')?.textContent).toBe(
      'inmobiliaria.piloto.director.experimento.explicacion(10)',
    )
    expect(es.inmobiliaria.piloto.director.experimento.explicacion.replace('{{porcentaje}}', '10')).toContain(
      'El 10 % de tus deudores, contratos e inmuebles, al azar y siempre los mismos, no recibe órdenes del director. ' +
        'Así se mide si el director mejora tus metas. ' +
        'Siguen recibiendo todo lo automático de hoy y lo que exige la ley',
    )
  })

  it('el administrador lo prende con el interruptor', async () => {
    const { onCambiar } = render()
    expect(interruptor().disabled).toBe(false)
    await act(async () => interruptor().click())
    expect(onCambiar).toHaveBeenCalledWith(true)
    expect(toasts).toEqual([['success', 'inmobiliaria.piloto.director.experimento.toastPrendido']])
  })

  it('🔴 quien no es administrador ve el estado pero no lo puede mover', () => {
    render({ isAdmin: false, experimento: { ...EXPERIMENTO, activo: true, desde: '2026-09-29T10:00:00.000Z', entidadesEnControl: 37 } })
    expect(interruptor().disabled).toBe(true)
    expect(q('piloto-director-experimento-estado')?.textContent).toContain('prendidoDesde')
    expect(q('piloto-director-experimento-estado')?.textContent).toContain('37')
    expect(q('piloto-director-experimento-solo-admin')).not.toBeNull()
  })

  it('un 403 al cambiarlo dice que sólo un administrador puede', async () => {
    render({ onCambiar: vi.fn(async () => ({ ok: false as const, status: 403, error: 'solo_admin' })) })
    await act(async () => interruptor().click())
    expect(toasts).toEqual([['error', 'inmobiliaria.piloto.director.experimento.soloAdmin']])
  })
})

describe('PilotoDirectorAjustes — apagado', () => {
  it('con el director apagado, una frase y nada más', () => {
    render({ experimento: { ...EXPERIMENTO, encendido: false }, gasto: { ...GASTO, encendido: false } })
    expect(q('piloto-director-ajustes-apagado')?.textContent).toBe('inmobiliaria.piloto.director.apagado')
    expect(q('piloto-director-gasto')).toBeNull()
    expect(q('piloto-director-experimento')).toBeNull()
  })

  it('un micro sin estas rutas (404): la sección no se pinta', () => {
    render({ experimento: null, gasto: null, extraExperimento: { notAvailable: true } })
    // El gasto también sin ruta:
    act(() => {
      root.render(
        <PilotoDirectorAjustesVista
          isAdmin
          gasto={lectura<DirectorGasto>(null, { notAvailable: true })}
          experimento={{ ...lectura<DirectorExperimento>(null, { notAvailable: true }), cambiando: false }}
          onCambiarExperimento={async () => ({ ok: false, status: 404, error: 'x' })}
        />,
      )
    })
    expect(q('piloto-director-ajustes')).toBeNull()
  })
})
