/**
 * El resumen de conciliación, pintado.
 *
 * Lo que se prueba acá es lo que la pantalla AFIRMA: que la franja no repite
 * el monto en una tarjeta aparte, que «Lo que encontró el agente» dice en una
 * línea qué pasó, que con la cola vacía no ofrece un botón para revisar lo que
 * no existe y que sin resumen del backend no pinta nada (fail-soft).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

import { ConciliacionResumen, HallazgosDelAgente } from './ConciliacionResumen'
import type { ConciliacionSummaryResponse } from '@/lib/hooks/conciliacion/use-conciliacion-summary'

const COLA_HREF = '/panel/inmobiliaria/conciliacion/cola'

function resumen(sobre: Partial<ConciliacionSummaryResponse> = {}): ConciliacionSummaryResponse {
  return {
    tenantId: 't-1',
    generatedAt: '2026-09-03T10:00:00.000Z',
    taxonomy: {
      parciales: 2,
      duplicados: 1,
      diferencias_monto: 0,
      fuera_de_fecha: 0,
      sin_identificar: 0,
    },
    totals: {
      movimientos: 40,
      conciliados: 37,
      en_cola: 3,
      monto_conciliado_cop: 12_500_000,
    },
    tasa_conciliacion: 92.5,
    ...sobre,
  }
}

let root: Root | null = null
let contenedor: HTMLDivElement | null = null

async function montar(nodo: React.ReactNode) {
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  root = createRoot(contenedor)
  await act(async () => {
    root!.render(nodo)
  })
}

beforeEach(() => {
  document.body.innerHTML = ''
})

afterEach(async () => {
  if (root) {
    await act(async () => {
      root!.unmount()
    })
  }
  root = null
  document.body.innerHTML = ''
})

describe('ConciliacionResumen — la franja', () => {
  it('es UNA sola franja: el monto conciliado entra como un KPI más, y «en cola» NO', async () => {
    await montar(<ConciliacionResumen data={resumen()} />)
    const franja = document.querySelector('[data-testid="conciliacion-resumen"]')!
    const tarjetas = franja.querySelectorAll('[data-testid^="conciliacion-total-"]')
    expect(tarjetas.length).toBe(4)
    // «En cola» es el número del que habla <HallazgosDelAgente>; repetirlo en la
    // franja lo convierte en ruido (Nico: no repetir información).
    expect(document.querySelector('[data-testid="conciliacion-total-en_cola"]')).toBeNull()
    expect(document.querySelector('[data-testid="conciliacion-total-monto"]')!.textContent).toContain(
      'Monto conciliado',
    )
    expect(document.querySelector('[data-testid="conciliacion-total-tasa"]')!.textContent).toContain(
      '92,5 %',
    )
  })

  it('sin resumen del backend no pinta nada (fail-soft)', async () => {
    await montar(<ConciliacionResumen data={null} />)
    expect(document.querySelector('[data-testid="conciliacion-resumen"]')).toBeNull()
  })
})

describe('HallazgosDelAgente — lo que encontró el agente', () => {
  it('dice en una línea qué pasó, lo desglosa por tipo y ofrece ir a revisarlo', async () => {
    await montar(<HallazgosDelAgente data={resumen()} colaHref={COLA_HREF} />)
    const tarjeta = document.querySelector('[data-testid="conciliacion-hallazgos"]')!
    expect(tarjeta.textContent).toContain('3 movimientos necesitan tu ojo: 2 pagos parciales y 1 duplicado.')
    // Sólo los tipos con casos: los tres en cero no se pintan.
    expect(tarjeta.querySelectorAll('[data-testid^="conciliacion-hallazgo-"]').length).toBe(2)

    const cta = document.querySelector('[data-testid="conciliacion-hallazgos-cta"]')!
    expect(cta.textContent).toContain('Revisar 3 casos')
    expect(cta.getAttribute('href')).toBe(COLA_HREF)
  })

  it('con la cola vacía no ofrece revisar lo que no existe', async () => {
    await montar(
      <HallazgosDelAgente
        data={resumen({
          totals: { movimientos: 40, conciliados: 40, en_cola: 0, monto_conciliado_cop: 1 },
          taxonomy: {
            parciales: 0,
            duplicados: 0,
            diferencias_monto: 0,
            fuera_de_fecha: 0,
            sin_identificar: 0,
          },
        })}
        colaHref={COLA_HREF}
      />,
    )
    const tarjeta = document.querySelector('[data-testid="conciliacion-hallazgos"]')!
    expect(tarjeta.textContent).toContain('Nada pendiente de tu ojo')
    expect(document.querySelector('[data-testid="conciliacion-hallazgos-cta"]')).toBeNull()
  })

  it('cola con casos pero taxonomía en ceros: dice el total y no inventa el desglose', async () => {
    // `case_type` es aditiva: hasta que la migración esté aplicada el back la
    // omite. Decir «nada pendiente» acá sería mentir sobre plata.
    await montar(
      <HallazgosDelAgente
        data={resumen({
          taxonomy: {
            parciales: 0,
            duplicados: 0,
            diferencias_monto: 0,
            fuera_de_fecha: 0,
            sin_identificar: 0,
          },
        })}
        colaHref={COLA_HREF}
      />,
    )
    const tarjeta = document.querySelector('[data-testid="conciliacion-hallazgos"]')!
    expect(tarjeta.textContent).toContain('3 movimientos necesitan tu ojo.')
    expect(tarjeta.querySelector('[data-testid="conciliacion-hallazgos-tipos"]')).toBeNull()
    expect(document.querySelector('[data-testid="conciliacion-hallazgos-cta"]')).not.toBeNull()
  })

  it('sin resumen del backend no pinta nada (fail-soft)', async () => {
    await montar(<HallazgosDelAgente data={null} colaHref={COLA_HREF} />)
    expect(document.querySelector('[data-testid="conciliacion-hallazgos"]')).toBeNull()
  })
})
