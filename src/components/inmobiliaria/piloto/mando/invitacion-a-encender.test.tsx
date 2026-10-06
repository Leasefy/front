/**
 * QA-PILOTO-95 (06-10-2026): con el interruptor maestro de Leasefy apagado
 * (`apagado_por_leasefy`, ACT-09) o con la prueba terminada, el núcleo ofrecía
 * «Enciende el piloto automático», pero no se puede: la franja dice «Leasefy
 * tiene apagado…» sin botón y la API contesta 409 APAGADO_POR_LEASEFY.
 *
 * Ahora, por motivo de `/piloto/activo` (lo trae la flota en `piloto`):
 *   · `sin_activar`, `apagado_por_la_inmobiliaria` → el botón sigue;
 *   · `apagado_por_leasefy`, `prueba_terminada` (y `no_se_pudo_leer`) → la
 *     `frase` del micro y NINGÚN botón para encender.
 */
import * as React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
void React

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))

import type { MotivoDelPilotoActivo, PilotoFlotaResponse } from '@/lib/api/piloto'

import { DireccionElegida } from './DireccionElegida'
import { DireccionNucleo } from './DireccionNucleo'
import { crearMuestra } from './muestra'
import type { DatosDelMando, Pieza } from './tipos'

const lista = <T,>(data: T): Pieza<T> => ({ data, isLoading: false, error: null, notAvailable: false })

const FRASE: Record<MotivoDelPilotoActivo, string> = {
  activo: 'El piloto automático está activo.',
  sin_activar: 'El piloto automático todavía no está activo en tu inmobiliaria.',
  apagado_por_la_inmobiliaria: 'Apagaste el piloto automático: todo te pide un clic.',
  apagado_por_leasefy: 'Leasefy tiene apagado el Piloto automático por ahora: ninguna inmobiliaria opera sola.',
  prueba_terminada: 'Terminó tu prueba del Piloto automático: volviste a Copiloto.',
  no_se_pudo_leer: 'No pude comprobar el Piloto automático.',
}

function datos(motivo: MotivoDelPilotoActivo): DatosDelMando {
  const m = crearMuestra(Date.now())
  const flota: PilotoFlotaResponse = {
    ...m.flota,
    activo: false,
    piloto: {
      activo: false,
      motivo,
      frase: FRASE[motivo],
      prueba: null,
      sinVencimiento: false,
      maestro: motivo !== 'apagado_por_leasefy',
      sePuedeActivar: motivo === 'sin_activar' || motivo === 'apagado_por_la_inmobiliaria',
    },
  }
  return {
    fuente: 'real',
    limiteDeActividad: 50,
    pulso: lista(m.pulso),
    bandeja: lista({ items: m.bandeja.items, total: m.bandeja.total, porPrioridad: m.bandeja.porPrioridad }),
    actividad: lista(m.actividad),
    briefing: lista(m.briefing),
    flota: lista(flota),
    hoy: lista({ ...m.hoy, encendido: false, ordenes: [], resumen: null, ciclo: null }),
    metas: lista({ encendido: false, metas: [], sinMeta: [] }),
  }
}

const acciones = { abrirItem: vi.fn(), abrirAlerta: vi.fn() }
const activacion = <div id="piloto-activacion">la franja de activación</div>

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

const invitaciones = () => [...container.querySelectorAll('a, button')].filter((e) => e.textContent?.includes('Enciende el piloto automático')).length

describe.each([
  ['el núcleo', DireccionNucleo],
  ['la pantalla elegida', DireccionElegida],
] as const)('%s, con el piloto automático apagado', (_n, Vista) => {
  it.each(['sin_activar', 'apagado_por_la_inmobiliaria'] as const)('%s: dice la frase y ofrece encenderlo', (motivo) => {
    act(() => root.render(<Vista datos={datos(motivo)} acciones={acciones} activacion={activacion} />))
    expect(container.textContent).toContain(FRASE[motivo])
    expect(invitaciones()).toBeGreaterThan(0)
  })

  it.each(['apagado_por_leasefy', 'prueba_terminada', 'no_se_pudo_leer'] as const)(
    '%s: dice la frase del micro y NO ofrece encenderlo (no se puede)',
    (motivo) => {
      act(() => root.render(<Vista datos={datos(motivo)} acciones={acciones} activacion={activacion} />))
      expect(container.textContent).toContain(FRASE[motivo])
      expect(invitaciones()).toBe(0)
    },
  )
})
