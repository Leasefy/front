/**
 * HistorialView — la vista pura del historial interno de riesgo del inmueble.
 *
 * Monta con createRoot + act (convención del repo, sin RTL). Es pura: recibe el
 * historial que calcula el back y lo pinta, así que no hay red ni navegación
 * que mockear. Cubre: el medidor con sus señales y puntos, los KPI, las
 * vacancias, la tabla de contratos, las reparaciones por tipo con la marca de
 * tendencia, y el inmueble sin historia.
 */

import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

import { HistorialView } from './HistorialView'
import type { HistorialDelInmueble } from '@/lib/admin/inmuebles'

void React

/** Fixture inventada: ningún dato de acá sale de una base real. */
function historial(over: Partial<HistorialDelInmueble> = {}): HistorialDelInmueble {
  return {
    inmueble: {
      id: 'inm-1',
      code: 42,
      externalId: 'A-42',
      address: 'Calle Falsa 123',
      city: 'Envigado',
      status: 'RENTED',
      canonPublicado: 1_200_000,
      consignadoEl: '2023-01-01',
      creadoEl: '2023-01-01',
      agencia: { id: 'ag-1', name: 'Inmobiliaria de prueba' },
    },
    contratos: {
      total: 3,
      activos: 1,
      terminados: 2,
      cancelados: 0,
      sinArrancar: 0,
      vecesArrendado: 3,
      renovaciones: 1,
      duracionPromedioDias: 200,
      rotacionPorAno: 1.5,
      lista: [
        {
          id: 'c-1',
          code: 7,
          externalId: '70',
          status: 'EXPIRED',
          inicio: '2024-01-01',
          fin: '2024-06-30',
          duracionDias: 181,
          canon: 1_000_000,
          arrendo: true,
        },
        {
          id: 'c-2',
          code: 9,
          externalId: null,
          status: 'ACTIVE',
          inicio: '2024-09-01',
          fin: '2025-08-31',
          duracionDias: 364,
          canon: 1_200_000,
          arrendo: true,
        },
      ],
    },
    ocupacion: {
      desde: '2024-01-01',
      diasObservados: 620,
      diasOcupado: 557,
      diasDesocupado: 63,
      porcentajeDesocupado: 10.2,
      vacancias: [{ desde: '2024-06-30', hasta: '2024-09-01', dias: 63, entreContratos: [7, 9] }],
      vacanciaPromedioDias: 63,
      desocupadoAhora: false,
      diasDesocupadoActual: 0,
    },
    reparaciones: {
      total: 3,
      ultimos12Meses: 3,
      emergencias: 0,
      montoAprobadoTotal: 450_000,
      porTipo: [
        {
          tipo: 'PLUMBING',
          cantidad: 3,
          primera: '2026-01-10',
          ultima: '2026-05-10',
          cadaDias: 60,
          recurrente: true,
        },
      ],
      lista: [
        {
          id: 'r-1',
          tipo: 'PLUMBING',
          prioridad: 'HIGH',
          estado: 'MAINT_COMPLETED',
          titulo: 'Humedad en el baño',
          creada: '2026-01-10',
          completada: '2026-01-15',
          montoAprobado: 450_000,
          pagaQuien: 'OWNER',
        },
      ],
    },
    canon: { inicial: 1_000_000, actual: 1_200_000, variacionPct: 20 },
    riesgo: {
      nivel: 'medio',
      puntaje: 32,
      senales: [
        { clave: 'vacancia_media', texto: 'Estuvo desocupado el 10.2 % del tiempo observado.', puntos: 12 },
        {
          clave: 'reparacion_recurrente:PLUMBING',
          texto: 'Plomería / humedad: 3 reparaciones, una cada 60 días en promedio.',
          puntos: 20,
        },
      ],
    },
    ...over,
  }
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
})

afterEach(async () => {
  await act(async () => {
    root?.unmount()
  })
  container.remove()
})

async function mount(h: HistorialDelInmueble) {
  await act(async () => {
    root = createRoot(container)
    root.render(<HistorialView historial={h} />)
  })
}

describe('HistorialView', () => {
  it('pinta el inmueble, el aviso de interno y el medidor con cada señal y sus puntos', async () => {
    await mount(historial())
    const texto = container.textContent ?? ''

    expect(texto).toContain('#42 · A-42 en la inmobiliaria')
    expect(texto).toContain('Calle Falsa 123 · Envigado · Inmobiliaria de prueba')
    expect(texto.toLowerCase()).toContain('la inmobiliaria no ve esta pantalla')

    const riesgo = container.querySelector('[data-testid="riesgo"]')
    expect(riesgo?.textContent).toContain('Medio')
    expect(riesgo?.textContent).toContain('32 / 100')
    expect(riesgo?.textContent).toContain('2 señales')
    const senales = Array.from(riesgo?.querySelectorAll('li') ?? []).map((li) => li.textContent)
    expect(senales).toEqual([
      'Estuvo desocupado el 10.2 % del tiempo observado.+12',
      'Plomería / humedad: 3 reparaciones, una cada 60 días en promedio.+20',
    ])
  })

  it('muestra los KPI: contratos, veces arrendado, desocupado, reparaciones y canon', async () => {
    await mount(historial())
    const texto = container.textContent ?? ''

    expect(texto).toContain('1 activo · 2 terminados')
    expect(texto).toContain('1.5 por año · dura 200 días')
    // Renovar no es volver a arrendar: la ficha lo dice al lado de la rotación.
    expect(texto).toContain('1 renovación')
    expect(texto).toContain('10.2 %')
    expect(texto).toContain('63 días de 620 días desde 2024-01-01')
    expect(texto).toContain('3 en 12 meses')
    expect(texto).toContain('+20 % desde')
  })

  it('lista las vacancias entre contratos y dice si está ocupado ahora', async () => {
    await mount(historial())

    const ahora = container.querySelector('[data-testid="ocupacion-ahora"]')
    expect(ahora?.textContent).toContain('ocupado ahora')
    expect(ahora?.textContent).toContain('1 vacancia · 63 días en promedio')

    const texto = container.textContent ?? ''
    expect(texto).toContain('2024-06-30')
    expect(texto).toContain('#7 → #9')
  })

  it('cuando está desocupado ahora lo dice con los días que lleva', async () => {
    const h = historial()
    h.ocupacion = { ...h.ocupacion, desocupadoAhora: true, diasDesocupadoActual: 104 }
    await mount(h)

    const ahora = container.querySelector('[data-testid="ocupacion-ahora"]')
    expect(ahora?.textContent).toContain('desocupado ahora')
    expect(ahora?.textContent).toContain('lleva 104 días sin contrato')
  })

  it('tabla de contratos con estado en español, fechas, canon y si arrendó', async () => {
    await mount(historial())
    const filas = Array.from(container.querySelectorAll('tbody tr')).map((tr) => tr.textContent ?? '')
    const deContratos = filas.filter((f) => f.includes('Terminado') || f.includes('Activo'))
    expect(deContratos).toHaveLength(2)
    expect(deContratos[0]).toContain('7')
    expect(deContratos[0]).toContain('70')
    expect(deContratos[0]).toContain('Terminado')
    expect(deContratos[0]).toContain('2024-01-01')
    expect(deContratos[0]).toContain('181 días')
    expect(deContratos[0]).toContain('sí')
    expect(deContratos[1]).toContain('Activo')
    expect(deContratos[1]).toContain('—') // sin código de la inmobiliaria
  })

  it('reparaciones por tipo con la cadencia y la marca de tendencia, más la lista', async () => {
    await mount(historial())

    const porTipo = container.querySelector('[data-testid="reparaciones-por-tipo"]')
    expect(porTipo?.textContent).toContain('Plomería / humedad · 3 · cada 60 días')
    expect(porTipo?.textContent?.toLowerCase()).toContain('tendencia')

    const texto = container.textContent ?? ''
    expect(texto).toContain('Humedad en el baño')
    expect(texto).toContain('Alta')
    expect(texto).toContain('Completada')
    expect(texto).toContain('Propietario')
  })

  it('sin historia: nivel «Sin datos», sin puntaje, y los vacíos explican qué falta', async () => {
    await mount(
      historial({
        contratos: {
          total: 0,
          activos: 0,
          terminados: 0,
          cancelados: 0,
          sinArrancar: 0,
          vecesArrendado: 0,
          renovaciones: 0,
          duracionPromedioDias: null,
          rotacionPorAno: null,
          lista: [],
        },
        ocupacion: {
          desde: null,
          diasObservados: 0,
          diasOcupado: 0,
          diasDesocupado: 0,
          porcentajeDesocupado: null,
          vacancias: [],
          vacanciaPromedioDias: null,
          desocupadoAhora: false,
          diasDesocupadoActual: 0,
        },
        reparaciones: {
          total: 0,
          ultimos12Meses: 0,
          emergencias: 0,
          montoAprobadoTotal: 0,
          porTipo: [],
          lista: [],
        },
        canon: { inicial: null, actual: 1_200_000, variacionPct: null },
        riesgo: {
          nivel: 'sin_datos',
          puntaje: 0,
          senales: [{ clave: 'sin_datos', texto: 'Sin contratos ni reparaciones registradas.', puntos: 0 }],
        },
      }),
    )
    const texto = container.textContent ?? ''
    const riesgo = container.querySelector('[data-testid="riesgo"]')
    expect(riesgo?.textContent).toContain('Sin datos')
    expect(riesgo?.textContent).not.toContain('/ 100')
    expect(texto).toContain('Todavía no arrendó.')
    expect(texto).toContain('Sin contratos')
    expect(texto).toContain('Sin reparaciones')
    expect(texto).toContain('canon publicado')
  })
})
