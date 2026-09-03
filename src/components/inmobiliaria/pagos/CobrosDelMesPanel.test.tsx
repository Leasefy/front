/**
 * El bloque operativo del «Resumen» de Pagos IA.
 *
 * Lo que se protege acá es lo que Nico reportó:
 *
 *  · los indicadores salen de las filas REALES que se están mostrando, no de un
 *    agente que responde otra cosa — si se pudieran desincronizar, volvería el
 *    «—» silencioso por otra puerta;
 *  · la pantalla tiene la tabla de la casa, con paginación, y el pie sólo
 *    aparece cuando hay más de una página;
 *  · el vacío es `SinDatos` (no un cartel de error ni un «—»).
 */
import * as React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import type { Cobro } from '@/lib/types/inmobiliaria'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${Object.values(p).join(',')}` : k),
    formatCurrency: (n: number) => `$${n.toLocaleString('es-CO')}`,
    // CobroTable le pasa un Date, no un string: devolver el argumento tal cual
    // haría que React intente pintar el objeto. Siempre string.
    formatDate: (d: unknown) => String(d),
  }),
}))
vi.mock('next/link', () => ({
  default: ({ children, href, ...r }: { children?: React.ReactNode; href: string }) =>
    React.createElement('a', { href, ...r }, children),
}))

// El Select del DS monta un portal de Radix: en happy-dom no aporta nada al
// contrato que se está fijando y sí rompe el montaje. Se reemplaza por un
// <select> nativo que conserva el valor y el onValueChange.
vi.mock('@/components/ui/select', () => ({
  Select: ({
    value,
    onValueChange,
    children,
  }: {
    value: string
    onValueChange: (v: string) => void
    children?: React.ReactNode
  }) =>
    React.createElement(
      'select',
      { value, onChange: (e: { target: { value: string } }) => onValueChange(e.target.value), 'data-testid': 'select-mes' },
      children,
    ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: ({ children }: { children?: React.ReactNode }) => children,
  SelectItem: ({ value, children }: { value: string; children?: React.ReactNode }) =>
    React.createElement('option', { value }, children),
}))

const useCobrosMock = vi.fn()
vi.mock('@/lib/hooks/useInmobiliaria', () => ({
  useCobros: (...args: unknown[]) => useCobrosMock(...args),
}))
vi.mock('@/lib/api/inmobiliaria.service', () => ({
  cobrosApi: { generate: vi.fn().mockResolvedValue(undefined) },
}))

import { CobrosDelMesPanel, resumirCobros, mesActual, mesesRecientes } from './CobrosDelMesPanel'

function cobro(p: Partial<Cobro> = {}): Cobro {
  return {
    id: 'c1',
    leaseId: 'l1',
    consignacionId: 'cn1',
    propertyId: 'p1',
    propietarioId: 'o1',
    tenantId: 't1',
    agenteId: 'a1',
    propertyTitle: 'Apto 301',
    propertyAddress: 'Carrera 30a #25A-20',
    tenantName: 'Esteban López',
    tenantEmail: null,
    tenantPhone: null,
    month: '2026-09',
    rentAmount: 3_000_000,
    adminAmount: 200_000,
    totalAmount: 3_200_000,
    lateFee: 0,
    totalWithFees: 3_200_000,
    status: 'pending',
    dueDate: '2026-09-05',
    paidAmount: 0,
    pendingAmount: 3_200_000,
    daysLate: 0,
    remindersSent: 0,
    createdAt: '2026-09-01',
    updatedAt: '2026-09-01',
    ...p,
  }
}

/** Lo que devuelve useCobros: mismo contrato que useApiData. */
function respuesta(cobros: Cobro[], extra: Record<string, unknown> = {}) {
  return { cobros, isLoading: false, error: null, errorCrudo: null, refetch: vi.fn(), ...extra }
}

// Los tests de helpers no montan nada: el desmontaje tiene que tolerarlo.
let container: HTMLDivElement | undefined
let root: Root | undefined
afterEach(() => {
  const r = root
  if (r) act(() => r.unmount())
  container?.remove()
  root = undefined
  container = undefined
  useCobrosMock.mockReset()
})

function montar() {
  const c = document.createElement('div')
  document.body.appendChild(c)
  const r = createRoot(c)
  container = c
  root = r
  act(() => {
    r.render(<CobrosDelMesPanel mesInicial="2026-09" />)
  })
}

const indicadores = () =>
  Array.from(container!.querySelectorAll<HTMLElement>('[data-testid="pagos-indicador"]'))
const filasTabla = () => Array.from(container!.querySelectorAll('tbody tr'))

describe('resumirCobros', () => {
  it('suma lo pagado y lo pendiente, y cuenta la mora', () => {
    const r = resumirCobros([
      cobro({ id: '1', status: 'paid', paidAmount: 1_000_000, pendingAmount: 0 }),
      cobro({ id: '2', status: 'late', paidAmount: 0, pendingAmount: 2_000_000 }),
      cobro({ id: '3', status: 'defaulted', paidAmount: 500_000, pendingAmount: 500_000 }),
      cobro({ id: '4', status: 'pending', paidAmount: 0, pendingAmount: 300_000 }),
    ])
    expect(r.total).toBe(4)
    expect(r.recaudado).toBe(1_500_000)
    expect(r.pendiente).toBe(2_800_000)
    // `late` y `defaulted` son los dos estados de mora del enum.
    expect(r.enMora).toBe(2)
  })

  it('sobre una lista vacía da ceros, no NaN', () => {
    expect(resumirCobros([])).toEqual({ total: 0, recaudado: 0, pendiente: 0, enMora: 0 })
  })
})

describe('el mes', () => {
  it('mesActual usa la hora LOCAL (no corre el mes por el huso)', () => {
    // 1 de enero a las 00:30 local. En UTC ya sería otro día, y con UTC-5 un
    // toISOString() daría diciembre del año anterior.
    expect(mesActual(new Date(2026, 0, 1, 0, 30))).toBe('2026-01')
  })

  it('mesesRecientes va del más nuevo al más viejo y cruza el año', () => {
    const meses = mesesRecientes(3, new Date(2026, 1, 15))
    expect(meses).toEqual(['2026-02', '2026-01', '2025-12'])
  })
})

describe('CobrosDelMesPanel', () => {
  it('deriva los indicadores de las mismas filas que muestra', () => {
    useCobrosMock.mockReturnValue(
      respuesta([
        cobro({ id: '1', status: 'paid', paidAmount: 1_000_000, pendingAmount: 0 }),
        cobro({ id: '2', status: 'late', paidAmount: 0, pendingAmount: 2_000_000 }),
      ]),
    )
    montar()

    const valores = indicadores().map(
      (n) => n.querySelector('[data-testid="pagos-indicador-valor"]')?.textContent ?? '',
    )
    expect(indicadores()).toHaveLength(4)
    expect(valores[0]).toContain('2') // cobros del mes
    expect(valores[1]?.replace(/\D/g, '')).toBe('1000000') // recaudado
    expect(valores[2]?.replace(/\D/g, '')).toBe('2000000') // pendiente
    expect(valores[3]).toContain('1') // en mora
    expect(filasTabla()).toHaveLength(2)
  })

  it('sin cobros muestra SinDatos y NO la tabla', () => {
    useCobrosMock.mockReturnValue(respuesta([]))
    montar()

    expect(container!.querySelector('[data-testid="sin-datos"]')).not.toBeNull()
    // El vacío es «todavía no hay», no «ningún resultado»: no hay filtro puesto.
    expect(container!.querySelector('[data-testid="sin-datos"]')?.getAttribute('data-caso')).toBe(
      'vacio',
    )
    expect(container!.querySelector('tbody')).toBeNull()
  })

  it('con 10 filas o menos no pinta el pie de paginación', () => {
    useCobrosMock.mockReturnValue(
      respuesta(Array.from({ length: 10 }, (_, i) => cobro({ id: `c${i}` }))),
    )
    montar()

    expect(filasTabla()).toHaveLength(10)
    // Un paginador sobre una sola página es ruido: el pie no se pinta.
    expect(container!.querySelector('[data-testid="pagos-cobros-pie"]')).toBeNull()
  })

  it('con más de 10 filas pagina de a 10 y muestra el pie', () => {
    useCobrosMock.mockReturnValue(
      respuesta(Array.from({ length: 23 }, (_, i) => cobro({ id: `c${i}` }))),
    )
    montar()

    // La tabla recibe SÓLO la página, no las 23 filas.
    expect(filasTabla()).toHaveLength(10)
    expect(container!.querySelector('[data-testid="pagos-cobros-pie"]')).not.toBeNull()
  })

  it('el botón de generar dice el mes en el nombre (no «del mes»)', () => {
    useCobrosMock.mockReturnValue(respuesta([]))
    montar()

    const cta = container!.querySelector<HTMLElement>('[data-testid="abrir-generar-cobros"]')
    expect(cta).not.toBeNull()
    // La clave lleva el mes interpolado: nunca un «del mes» sin decir cuál.
    expect(cta!.textContent).toContain('generarCta:Septiembre de 2026')
  })

  it('un fallo de red se dice, no se disfraza de vacío', () => {
    useCobrosMock.mockReturnValue(
      respuesta([], { errorCrudo: new Error('Network request failed') }),
    )
    montar()

    expect(container!.querySelector('[data-testid="fallo-de-carga"]')).not.toBeNull()
    expect(container!.querySelector('[data-testid="sin-datos"]')).toBeNull()
  })
})
