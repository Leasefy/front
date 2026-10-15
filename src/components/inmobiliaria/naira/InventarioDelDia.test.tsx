/**
 * @vitest-environment happy-dom
 *
 * InventarioDelDia — qué revisó Naira hoy, o decir que no se sabe (13-03, Tarea 2; INV-06, U5).
 *
 * Qué prueba: con inventario se nombra cada detector, fuente, compuerta e investigación sin conteos; un silencio sin
 * inventario JAMÁS dice la frase de silencio (declara que no sabe); lo que la ruta no envía se dice; los vocabularios
 * cerrados tienen texto; con datos de ejemplo el corte dice DATO DE EJEMPLO. La rama `registrado` es el espejo de E13-5
 * (solo con fixtures hasta que la ruta la traiga). Marcador [N13:*] en el TÍTULO.
 */

import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))

import es from '@/lib/i18n/locales/es.json'
import {
  CLASES_DEL_DIA,
  ESTADOS_DEL_DETECTOR,
  MOTIVOS_SIN_INVESTIGACION,
  type InventarioDelBriefing,
  type MadurezDelBriefing,
} from '@/lib/naira/briefing-y-senal'

import { InventarioDelDia, type InventarioDelDiaProps } from './InventarioDelDia'
import { ProveedorDeOrigen } from './OrigenDeNaira'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const REGISTRADO: InventarioDelBriefing = {
  kind: 'registrado',
  clase: 'silencio',
  detectores: [
    { detectorId: 'morosidad', metricId: 'cartera.morosidad_rate', estado: 'ok' },
    { detectorId: 'vacancia', metricId: 'portafolio.vacancy_rate', estado: 'skipped_stale' },
    { detectorId: 'prospectos', metricId: 'prospectos.leads_sin_contacto_count', estado: 'failed' },
  ],
  fuentes: [
    { fuente: 'agent.debtor_states', etiqueta: 'cartera.morosidad_rate', asOf: { kind: 'observada', iso: '2026-10-05T11:00:00.000Z' } },
    { fuente: 'public.consignaciones', etiqueta: 'portafolio.vacancy_rate', asOf: { kind: 'nunca_observada' } },
  ],
  compuertasConDescarte: ['compuerta_de_ejemplo'],
  investigacion: [{ metricId: 'cartera.morosidad_rate', motivo: 'no_disponible_hoy' }],
}

const MADUREZ: MadurezDelBriefing = {
  kind: 'lineas',
  lineas: [
    { metricId: 'portafolio.days_on_market_p50', asOf: '2026-10-05T11:00:00.000Z', fuente: 'public.consignaciones', madurez: { kind: 'fecha_estimada', dia: '2026-10-12' } },
    {
      metricId: 'prospectos.leads_sin_contacto_count',
      asOf: '2026-10-05T11:00:00.000Z',
      fuente: 'agent.prospect_leads',
      madurez: { kind: 'sin_fecha', remedio: 'la métrica no se está ingiriendo (ejemplo)' },
    },
  ],
}

const NO_VIAJA: MadurezDelBriefing = { kind: 'no_viaja' }

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
})

function montar(props: InventarioDelDiaProps, origen: 'agente' | 'ejemplo' = 'agente'): void {
  act(() => {
    root.render(
      <ProveedorDeOrigen origen={origen}>
        <InventarioDelDia {...props} />
      </ProveedorDeOrigen>,
    )
  })
}

const texto = () => (container.textContent ?? '').replace(/\s+/g, ' ')
const leerEs = (clave: string): string => {
  const v = clave
    .split('.')
    .reduce<unknown>((a, p) => (a !== null && typeof a === 'object' ? (a as Record<string, unknown>)[p] : undefined), es)
  return typeof v === 'string' ? v : ''
}

const FRASE = 'Hoy no hay nada que requiera tu atención'
const NO_SABEMOS = 'No podemos mostrarte qué revisó Naira hoy, así que no sabemos si este silencio es un día tranquilo.'

describe('InventarioDelDia', () => {
  it('[N13:control-positivo] con inventario nombra detectores, fuentes, compuertas, investigación y madurez, sin conteos', () => {
    montar({ inventario: REGISTRADO, madurez: MADUREZ, enSilencio: false })
    expect(container.querySelector('[data-naira-inventario="registrado"]')).not.toBeNull()
    const t = texto()
    expect(t).toContain('Qué revisó Naira hoy')
    expect(t).toContain('Corrió')
    expect(t).toContain('No corrió: la fuente estaba desactualizada')
    expect(t).toContain('Falló')
    expect(container.querySelector('[data-naira-asof="2026-10-05T11:00:00.000Z"]')).not.toBeNull()
    expect(t).toContain('Esta fuente nunca se ha leído')
    const compuerta = [...container.querySelectorAll('.font-mono')].find((n) => n.textContent === 'compuerta_de_ejemplo')
    expect(compuerta).toBeDefined()
    expect(t).toContain('La investigación no estaba disponible hoy')
    expect(container.querySelectorAll('[data-naira-madurez]').length).toBe(2)

    const copia = container.cloneNode(true) as HTMLElement
    for (const n of copia.querySelectorAll('[data-naira-asof], [data-naira-madurez]')) n.remove()
    expect(/\d/.test(copia.textContent ?? ''), copia.textContent ?? '').toBe(false)
  })

  it('[N13:silencio-sin-inventario] sin inventario el silencio no se afirma: se declara que no se sabe', () => {
    for (const inventario of [{ kind: 'no_viaja' }, { kind: 'sin_registro' }] as const) {
      montar({ inventario, madurez: NO_VIAJA, enSilencio: true })
      const aviso = container.querySelector('[role="status"][data-naira-silencio="sin-inventario"]')
      expect(aviso, inventario.kind).not.toBeNull()
      expect(aviso!.textContent).toBe(NO_SABEMOS)
      expect(texto()).not.toContain(FRASE)
    }

    montar({ inventario: REGISTRADO, madurez: NO_VIAJA, enSilencio: true })
    expect(container.querySelector('[data-naira-silencio="frase"]')?.textContent).toBe(FRASE)

    montar({ inventario: { ...REGISTRADO, clase: 'sin_evaluacion' }, madurez: NO_VIAJA, enSilencio: true })
    expect(container.querySelector('[data-naira-silencio="sin-evaluacion"]')).not.toBeNull()
    expect(texto()).not.toContain(FRASE)
  })

  it('[N13:inventario-no-viaja] lo que la ruta no envía se dice', () => {
    montar({ inventario: { kind: 'no_viaja' }, madurez: NO_VIAJA, enSilencio: false })
    expect(texto()).toContain('No podemos mostrarte qué revisó Naira hoy: esta versión no lo envía.')
    montar({ inventario: { kind: 'sin_registro' }, madurez: NO_VIAJA, enSilencio: false })
    expect(texto()).toContain('No quedó registro de qué revisó Naira este día.')
  })

  it('[N13:vocabularios-cerrados] cada clase, estado y motivo del espejo tiene su texto', () => {
    for (const clase of CLASES_DEL_DIA) {
      const esperado = leerEs('inmobiliaria.ai.naira.inventario.clase.' + clase)
      expect(esperado.length, clase).toBeGreaterThan(0)
      montar({ inventario: { ...REGISTRADO, clase }, madurez: NO_VIAJA, enSilencio: false })
      expect(texto(), clase).toContain(esperado)
    }
    for (const estado of ESTADOS_DEL_DETECTOR) {
      const esperado = leerEs('inmobiliaria.ai.naira.inventario.estadoDelDetector.' + estado)
      expect(esperado.length, estado).toBeGreaterThan(0)
      montar({
        inventario: { ...REGISTRADO, detectores: [{ detectorId: 'd', metricId: 'cartera.morosidad_rate', estado }] },
        madurez: NO_VIAJA,
        enSilencio: false,
      })
      expect(texto(), estado).toContain(esperado)
    }
    for (const motivo of MOTIVOS_SIN_INVESTIGACION) {
      const esperado = leerEs('inmobiliaria.ai.naira.inventario.motivo.' + motivo)
      expect(esperado.length, motivo).toBeGreaterThan(0)
      montar({
        inventario: { ...REGISTRADO, investigacion: [{ metricId: 'cartera.morosidad_rate', motivo }] },
        madurez: NO_VIAJA,
        enSilencio: false,
      })
      expect(texto(), motivo).toContain(esperado)
    }
  })

  it('[N13:simulado-visible] con datos de ejemplo el corte de la fuente dice DATO DE EJEMPLO, no una fecha', () => {
    montar({ inventario: REGISTRADO, madurez: NO_VIAJA, enSilencio: false }, 'ejemplo')
    const corte = container.querySelector('[data-naira-asof="2026-10-05T11:00:00.000Z"]')
    expect(corte?.textContent).toContain('DATO DE EJEMPLO')
    expect(/\d/.test(corte?.textContent ?? '')).toBe(false)
  })
})
