/**
 * El seguimiento de PQRS dentro de la ficha del contrato (Nico, 2026-09-12:
 * «Dentro del contrato debe quedar ese registro de PQRs, si ya se
 * solucionaron, cuáles fueron»).
 *
 * Lo que se prueba es lo que la sección promete: el resumen de arriba, el
 * estado y la solución de cada una, el enlace que vuelve a ESTE contrato, el
 * filtro cuando hay muchas, y que un vacío y un fallo NO se digan igual.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/api/pqrs-agencia.service', () => ({
  pqrsApi: { deContrato: vi.fn() },
}))
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children?: React.ReactNode }) =>
    React.createElement('a', { href, ...rest }, children),
}))
// La ficha del contrato desde la que se mira: los enlaces a las solicitudes la
// llevan en `?volver=` para poder devolver a la persona acá.
vi.mock('next/navigation', () => ({
  usePathname: () => '/panel/inmobiliaria/contratos/k-1',
}))

import { pqrsApi } from '@/lib/api/pqrs-agencia.service'
import type { Pqrs, PqrsEstado } from '@/lib/api/pqrs-agencia.types'
import { PqrsDelContrato, lineaDeRelacion, lineaDeResumen } from './PqrsDelContrato'

const deContrato = pqrsApi.deContrato as unknown as ReturnType<typeof vi.fn>

function pqrs(overrides: Partial<Pqrs> = {}): Pqrs {
  return {
    id: 'p-1',
    numero: 7,
    radicado: 'PQRS-0007',
    tipo: 'QUEJA',
    solicitanteTipo: 'INQUILINO',
    solicitanteNombre: 'Camila Restrepo',
    solicitanteContacto: null,
    asunto: 'Fuga en el baño del 402',
    descripcion: 'El agua sale por debajo del sanitario desde el lunes.',
    consignacionId: 'c-1',
    inmuebleLabel: 'Apto 402',
    asignadoAUserId: null,
    asignadoANombre: null,
    estado: 'EN_PROCESO',
    slaVenceAt: '2036-03-20T10:00:00.000Z',
    resueltaAt: null,
    cerradaAt: null,
    createdAt: '2026-03-01T10:00:00.000Z',
    updatedAt: '2026-03-01T10:00:00.000Z',
    ...overrides,
  }
}

const RELACION = {
  propertyId: 'prop-1',
  desde: '2026-01-01',
  hasta: '2026-12-31',
  sinFin: false,
}

function resumen(sobre: Partial<Record<string, number>> = {}) {
  return {
    total: 0,
    recibidas: 0,
    asignadas: 0,
    enProceso: 0,
    enCotizacion: 0,
    resueltas: 0,
    cerradas: 0,
    ...sobre,
  } as {
    total: number
    recibidas: number
    asignadas: number
    enProceso: number
    enCotizacion: number
    resueltas: number
    cerradas: number
  }
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
  vi.clearAllMocks()
})

async function montar() {
  await act(async () => {
    root.render(React.createElement(PqrsDelContrato, { contractId: 'k-1' }))
  })
  await act(async () => {
    await Promise.resolve()
  })
}

function textos(selector: string): string[] {
  return Array.from(container.querySelectorAll(selector)).map((e) => e.textContent ?? '')
}

describe('PqrsDelContrato — con PQRS', () => {
  it('el resumen cuenta lo resuelto y lo abierto, sin inventar categorías', () => {
    expect(lineaDeResumen({ total: 4, resueltas: 3, cerradas: 0 })).toBe(
      '4 PQRS · 3 resueltas · 1 abierta',
    )
    // Una cerrada no se cuenta como resuelta: son estados distintos.
    expect(lineaDeResumen({ total: 3, resueltas: 1, cerradas: 2 })).toBe(
      '3 PQRS · 1 resuelta · 2 cerradas',
    )
  })

  it('dice de dónde salió la lista: el inmueble y la ventana del contrato', () => {
    // El día se lee LOCAL: `new Date('2026-01-01')` es medianoche UTC y en
    // Bogotá caería al 31 de diciembre, corriendo la ventana un día.
    // El «de» del formato largo depende del ICU de Node; lo que importa es el
    // DÍA, no cómo lo escribe la locale.
    expect(lineaDeRelacion(RELACION)).toMatch(/entre el 1 (de )?ene(\.|de)? ?(de )?2026/)
    expect(lineaDeRelacion(RELACION)).toMatch(/y el 31 (de )?dic(\.|de)? ?(de )?2026/)
    // Un contrato que todavía corre llega hasta hoy, y lo dice con esa palabra.
    expect(lineaDeRelacion({ desde: '2026-01-01', hasta: '2026-09-12', sinFin: true })).toContain(
      'y hoy',
    )
  })

  it('muestra tipo, estado, asunto, detalle, la solución y quién atendió', async () => {
    deContrato.mockResolvedValue({
      resumen: resumen({ total: 2, enProceso: 1, resueltas: 1 }),
      relacion: RELACION,
      solicitudes: [
        pqrs(),
        pqrs({
          id: 'p-2',
          radicado: 'PQRS-0008',
          tipo: 'RECLAMO',
          estado: 'RESUELTA',
          asunto: 'Cobro que no reconozco',
          resueltaAt: '2026-03-05T10:00:00.000Z',
          asignadoANombre: 'Ana Ruiz',
        }),
      ],
    })
    await montar()

    expect(deContrato).toHaveBeenCalledWith('k-1')
    const texto = container.textContent ?? ''
    expect(texto).toContain('2 PQRS · 1 resuelta · 1 abierta')
    expect(texto).toContain('Queja')
    expect(texto).toContain('En proceso')
    expect(texto).toContain('Fuga en el baño del 402')
    expect(texto).toContain('El agua sale por debajo del sanitario desde el lunes.')
    // Resuelta: la FECHA de la solución y quién la atendió — lo único que el
    // modelo guarda. No hay texto de la solución y no se inventa ninguno.
    expect(texto).toContain('Resuelta')
    expect(texto).toMatch(/Resuelta el 5 (de )?mar(\.|de)? ?(de )?2026/)
    expect(texto).toContain('Atendió Ana Ruiz')
    expect(textos('[data-testid="pqrs-del-contrato-fila"]')).toHaveLength(2)
  })

  it('el enlace al detalle abre ESA solicitud y sabe volver al contrato', async () => {
    deContrato.mockResolvedValue({
      resumen: resumen({ total: 1, enProceso: 1 }),
      relacion: RELACION,
      solicitudes: [pqrs()],
    })
    await montar()

    const enlace = container.querySelector('[data-testid="pqrs-del-contrato-enlace"]')
    expect(enlace?.getAttribute('href')).toBe(
      '/panel/inmobiliaria/solicitudes?pqrs=p-1&volver=%2Fpanel%2Finmobiliaria%2Fcontratos%2Fk-1',
    )
  })

  it('con más de cinco aparece el filtro por estado y recorta la lista', async () => {
    const estados: PqrsEstado[] = [
      'RECIBIDA',
      'EN_PROCESO',
      'EN_PROCESO',
      'RESUELTA',
      'RESUELTA',
      'CERRADA',
    ]
    deContrato.mockResolvedValue({
      resumen: resumen({ total: 6, recibidas: 1, enProceso: 2, resueltas: 2, cerradas: 1 }),
      relacion: RELACION,
      solicitudes: estados.map((estado, i) =>
        pqrs({ id: `p-${i}`, radicado: `PQRS-000${i}`, estado }),
      ),
    })
    await montar()

    expect(textos('[data-testid="pqrs-del-contrato-fila"]')).toHaveLength(6)
    const chips = Array.from(
      container.querySelectorAll('[data-testid="pqrs-del-contrato-filtro"] button'),
    )
    // Sólo los estados que de verdad aparecen, más «Todas».
    expect(chips.map((c) => c.textContent)).toEqual([
      'Todas',
      'Recibida',
      'En proceso',
      'Resuelta',
      'Cerrada',
    ])

    const resueltas = chips.find((c) => c.textContent === 'Resuelta') as HTMLButtonElement
    await act(async () => {
      resueltas.click()
    })
    expect(textos('[data-testid="pqrs-del-contrato-fila"]')).toHaveLength(2)
    expect(resueltas.getAttribute('aria-pressed')).toBe('true')
  })

  it('con cinco o menos no hay filtro: no hace falta una herramienta para cinco filas', async () => {
    deContrato.mockResolvedValue({
      resumen: resumen({ total: 2, enProceso: 2 }),
      relacion: RELACION,
      solicitudes: [pqrs(), pqrs({ id: 'p-2' })],
    })
    await montar()

    expect(container.querySelector('[data-testid="pqrs-del-contrato-filtro"]')).toBeNull()
  })
})

describe('PqrsDelContrato — cuando no hay nada que mostrar', () => {
  it('sin PQRS lo dice con esas palabras, y no como una tabla vacía', async () => {
    deContrato.mockResolvedValue({
      resumen: resumen(),
      relacion: RELACION,
      solicitudes: [],
    })
    await montar()

    expect(container.querySelector('[data-testid="pqrs-del-contrato-vacio"]')?.textContent).toContain(
      'Este contrato no tiene PQRS',
    )
  })

  it('un contrato sin inmueble dice que FALTA el vínculo, no que no hay historia', async () => {
    deContrato.mockResolvedValue({
      resumen: resumen(),
      relacion: { propertyId: null, desde: null, hasta: '2026-09-12', sinFin: true },
      solicitudes: [],
    })
    await montar()

    const sinInmueble = container.querySelector('[data-testid="pqrs-del-contrato-sin-inmueble"]')
    expect(sinInmueble?.textContent).toContain('todavía no tiene inmueble')
    expect(container.querySelector('[data-testid="pqrs-del-contrato-vacio"]')).toBeNull()
  })

  it('un fallo NO se pinta como «no tiene PQRS»: son cosas distintas', async () => {
    deContrato.mockRejectedValue(new Error('Se cayó el back.'))
    await montar()

    expect(container.querySelector('[data-testid="pqrs-del-contrato-error"]')?.textContent).toBe(
      'Se cayó el back.',
    )
    expect(container.textContent).not.toContain('Este contrato no tiene PQRS')
  })
})
