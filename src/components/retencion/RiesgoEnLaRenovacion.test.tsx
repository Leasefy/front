/**
 * P-7: el riesgo de Vinci va DENTRO de la propuesta de renovación — el
 * puntaje, qué señal sumó cuánto y la oferta sugerida. Sin medición, se dice;
 * con un back anterior (sin el campo), no se pinta nada.
 */
import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

vi.mock('next/link', () => ({
  default: ({ children, href }: { children?: React.ReactNode; href: string }) => React.createElement('a', { href }, children),
}))

import { RiesgoEnLaRenovacion } from './RiesgoEnLaRenovacion'
import { fraseDeLasMetricas, fraseDelRiesgo } from './frases'
import { formatCurrency } from '@/lib/format'
import type { RiesgoDeRetencion } from '@/lib/types/retencion'

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

const RIESGO: RiesgoDeRetencion = {
  umbral: 60,
  medidoEn: '2026-09-28T12:00:00.000Z',
  inquilino: {
    puntaje: 72,
    umbral: 60,
    enRiesgo: true,
    senales: [
      { clave: 'mora', texto: '70 días de mora ($4.500.000 vencido)', puntos: 40 },
      { clave: 'incremento_alto', texto: 'incremento del 12 %', puntos: 15 },
      { clave: 'pqrs_abiertas', texto: '1 PQRS abierta del inquilino', puntos: 10 },
      { clave: 'pqrs_vencidas', texto: 'una PQRS con el plazo vencido', puntos: 5 },
      { clave: 'x', texto: 'otra', puntos: 2 },
    ],
    ofertaSugerida: {
      tipo: 'congelar_incremento',
      nombre: 'Congelar el incremento',
      porque: 'x',
      cuestaPlata: true,
      quienAprueba: 'el propietario la acepta y el administrador la aprueba',
    },
  },
  propietario: null,
}

describe('el riesgo de Vinci en la propuesta de renovación (P-7)', () => {
  it('muestra el puntaje, cada señal con lo que sumó y la oferta sugerida con quién la aprueba', () => {
    act(() => root.render(<RiesgoEnLaRenovacion riesgo={RIESGO} contractId="c1" />))
    const t = container.textContent ?? ''
    expect(t).toContain('Riesgo de que se vaya · Vinci')
    expect(t).toContain('72/100')
    expect(t).toContain('En riesgo')
    expect(t).toContain('70 días de mora ($4.500.000 vencido)+40')
    expect(t).toContain('Vinci sugiere: congelar el incremento (el propietario la acepta y el administrador la aprueba)')
    // El propietario sin señales se dice, no se esconde.
    expect(t).toContain('Sin señales de que se vaya.')
    expect(container.querySelector('a')?.getAttribute('href')).toBe('/panel/inmobiliaria/contratos/riesgo/inquilino%3Ac1')
  })

  it('sin medición lo dice (y la renovación sigue); con un back anterior no pinta nada', () => {
    act(() => root.render(<RiesgoEnLaRenovacion riesgo={null} />))
    expect(container.textContent).toContain('No se pudo medir ahora')
    act(() => root.render(<RiesgoEnLaRenovacion riesgo={undefined} />))
    expect(container.textContent).toBe('')
  })
})

describe('las frases del tablero', () => {
  it('el riesgo, en una frase con el umbral y de cuándo es', () => {
    expect(
      fraseDelRiesgo({
        disponible: true,
        faltan: [],
        notas: [],
        leidoEn: '2026-09-28T12:00:00.000Z',
        deLoGuardado: true,
        umbral: 60,
        modo: 'copiloto',
        envioHabilitado: false,
        contratosLeidos: 739,
        propietariosLeidos: 505,
        enRiesgo: { inquilinos: 8, propietarios: 1 },
        casos: [],
      }),
    ).toMatch(/^Vinci ve 8 inquilinos y 1 propietario en riesgo \(umbral 60\/100\) entre 739 contratos vigentes; medido .* \(el barrido de la mañana\)\.$/)
  })

  it('lo retenido: contratos, propietarios, canon conservado y los que se fueron', () => {
    expect(
      fraseDeLasMetricas({
        enGestion: { inquilinos: 2, propietarios: 1 },
        contratosRetenidos: 3,
        propietariosQueSeQuedaron: 1,
        inmueblesRetenidos: 4,
        canonConservadoCop: 9_000_000,
        perdidos: { inquilinos: 1, propietarios: 0, canonPerdidoCop: 1_500_000 },
        tasaDeRetencion: 0.8,
      }),
    ).toBe(
      `Vinci retuvo 3 contratos (renovaron) y 1 propietario se quedó con 4 inmuebles: ${formatCurrency(9_000_000)} de canon al mes conservado. Se fue 1 (${formatCurrency(1_500_000)} al mes). De los casos cerrados, se retuvo el 80 %.`,
    )
  })
})
