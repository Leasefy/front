/**
 * Los rótulos de Cobranza le hablan a la inmobiliaria,
 * no a quien programa (QA-IA-B, 04-10-2026).
 *
 * 🔴 Lo que pasaba en el navegador:
 *   - «Equipo IA de cobranza» y «Equipo IA de pagos» decían
 *     «LOTE_EJEMPLO (page.tsx:182) inventa contactos… useEquipo() en
 *     src/lib/hooks/useInmobiliaria.ts; para las métricas por subagente IA no
 *     encontré endpoint.»: nombres de archivo, de función y de variable delante
 *     del usuario.
 *   - «Recordatorios» decía «Esta pantalla muestra datos de ejemplo… La
 *     secuencia no se guarda en ningún lado: el estado es local y no hay
 *     endpoint detrás», cuando la pantalla YA guarda las condiciones y arma la
 *     vista previa contra `/inmobiliaria/cobranza/secuencia`: un rótulo de
 *     honestidad que había quedado mintiendo al revés.
 *
 * Convención del repo: createRoot + act, sin RTL.
 */

import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

const { redirigidoA } = vi.hoisted(() => ({ redirigidoA: [] as string[] }))
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    redirigidoA.push(url)
    throw new Error('NEXT_REDIRECT')
  },
}))

import RecordatoriosLayout from './recordatorios/layout'
import EquipoDeCobranzaRetirado from './equipo/page'
import EquipoDePagosRetirado from '../equipo/page'

void React

let contenedor: HTMLDivElement
let raiz: Root

beforeEach(() => {
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  raiz = createRoot(contenedor)
})

afterEach(() => {
  act(() => raiz.unmount())
  contenedor.remove()
})

function pintar(nodo: React.ReactElement): string {
  act(() => raiz.render(nodo))
  return contenedor.textContent ?? ''
}

/** Lo que nunca puede leer una persona de la inmobiliaria. */
const TEXTO_DE_PROGRAMADOR = /page\.tsx|LOTE_EJEMPLO|useEquipo|src\/lib|endpoint|\(\)|badges?/i

describe('rótulos de Cobranza sin texto técnico', () => {
  it('Recordatorios ya no se rotula como «datos de ejemplo»: guarda y consulta de verdad', () => {
    const texto = pintar(
      <RecordatoriosLayout>
        <p>contenido</p>
      </RecordatoriosLayout>,
    )
    expect(texto).toContain('contenido')
    expect(contenedor.querySelector('[data-testid="aviso-datos-de-ejemplo"]')).toBeNull()
    expect(texto).not.toMatch(TEXTO_DE_PROGRAMADOR)
  })

})

// MORI-37 (Nico 19-10): las dos pantallas del «Equipo IA» eran personas y
// lotes inventados; se quitaron. Quien tenga la URL guardada aterriza donde
// está lo de verdad.
describe('las pantallas inventadas del equipo ya no están', () => {
  it('«Equipo IA de cobranza» lleva a Cobranza', () => {
    expect(() => EquipoDeCobranzaRetirado()).toThrow('NEXT_REDIRECT')
    expect(redirigidoA.at(-1)).toBe('/panel/inmobiliaria/pagos/cobranza')
  })

  it('«Equipo IA de pagos» lleva a «Agente de pagos», con el equipo que corre', () => {
    expect(() => EquipoDePagosRetirado()).toThrow('NEXT_REDIRECT')
    expect(redirigidoA.at(-1)).toBe('/panel/inmobiliaria/pagos/agente')
  })
})
