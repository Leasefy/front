/**
 * «Casos en riesgo» después del glow-up (29-09-2026):
 *   · la tabla del panel, del puntaje más alto al más bajo, con el plan en
 *     palabras («Plan activo · 2 tareas abiertas», no «activo»);
 *   · el vacío dice cuántos esconde el filtro del umbral, en vez de un «nadie»
 *     que parece que no hay nada;
 *   · la frase larga del encabezado no vuelve: las cuentas ya están en los filtros.
 */
import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

const { riesgo } = vi.hoisted(() => ({ riesgo: vi.fn() }))
vi.mock('@/lib/hooks/retencion/use-vinci', () => ({ useRiesgoDeVinci: riesgo }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('next/link', () => ({
  default: ({ children, href }: { children?: React.ReactNode; href: string }) => React.createElement('a', { href }, children),
}))

import BandejaClient from './BandejaClient'

const caso = (id: string, puntaje: number, extra: Record<string, unknown> = {}) => ({
  caseId: `inquilino:${id}`,
  poblacion: 'inquilino',
  nombre: `Persona ${id}`,
  puntaje,
  suma: puntaje,
  umbral: 60,
  enRiesgo: puntaje >= 60,
  senales: [{ clave: 'mora', texto: '20 días de mora', puntos: puntaje }],
  contratos: [{ contratoId: id, numero: `#${id}`, inmueble: null, canonCop: 1_000_000, fechaDeFin: null, diasParaVencer: null }],
  canonEnJuegoCop: 1_000_000,
  tieneTelefono: true,
  tieneCorreo: true,
  ofertasSugeridas: [],
  ofertas: [],
  plan: null,
  ...extra,
})

const riesgoCon = (casos: unknown[]) => ({
  data: {
    disponible: true,
    faltan: [],
    notas: [],
    leidoEn: '2026-09-29T12:00:00.000Z',
    deLoGuardado: true,
    umbral: 60,
    modo: 'copiloto',
    envioHabilitado: false,
    contratosLeidos: 10,
    propietariosLeidos: 5,
    enRiesgo: { inquilinos: 0, propietarios: 0 },
    casos,
  },
  isLoading: false,
  error: null,
  refetch: vi.fn(),
})

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

describe('Casos en riesgo', () => {
  it('ordena por puntaje y dice el plan en palabras', () => {
    riesgo.mockReturnValue(
      riesgoCon([
        caso('1', 62, { plan: { id: 'q', estado: 'cancelado', objetivo: 'x', tareasAbiertas: 2, resultado: null } }),
        caso('2', 80, { plan: { id: 'p', estado: 'activo', objetivo: 'x', tareasAbiertas: 2, resultado: null } }),
      ]),
    )
    act(() => root.render(<BandejaClient />))
    const filas = [...container.querySelectorAll('[data-testid="vinci-casos"] tbody tr')]
    expect(filas.map((f) => f.querySelector('a')?.textContent)).toEqual(['Persona 2', 'Persona 1'])
    expect(filas[0].textContent).toContain('Plan activo · 2 tareas abiertas')
    // Un plan cancelado no tiene «tareas abiertas» (QA, 29-09).
    expect(filas[1].textContent).toContain('Plan cancelado')
    expect(filas[1].textContent).not.toContain('tareas abiertas')
    expect(container.textContent).not.toMatch(/Vinci ve \d/)
  })

  it('sin nadie sobre el umbral, dice cuántos esconde el filtro', () => {
    riesgo.mockReturnValue(riesgoCon([caso('1', 30), caso('2', 20), caso('3', 40, { enCobranza: true })]))
    act(() => root.render(<BandejaClient />))
    expect(container.querySelector('[data-testid="vinci-casos"]')).toBeNull()
    expect(container.textContent).toContain('Nadie pasa el umbral')
    expect(container.textContent).toContain('Otros 3 están por debajo o los lleva cobranza')
  })
})
