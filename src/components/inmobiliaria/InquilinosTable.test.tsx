/**
 * La tabla de inquilinos. Nico (2026-09-02): «mejor en una tabla como las
 * otras que tenemos, con toda la información que tienes igual, y con
 * paginación».
 *
 * Lo que se protege acá: la fila sigue siendo una PERSONA, y con varios
 * arriendos NO se pierde ninguno (se despliegan) — que es la información que
 * la tarjeta mostraba anidada.
 */
import * as React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import type { Inquilino, ArriendoDeInquilino } from '@/lib/api/inquilinos.service'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}:${Object.values(p).join(',')}` : k),
    formatCurrency: (n: number) => `$${n.toLocaleString('es-CO')}`,
    formatDate: (d: string) => d,
  }),
}))
vi.mock('next/link', () => ({
  default: ({ children, href, ...r }: { children?: React.ReactNode; href: string }) =>
    React.createElement('a', { href, ...r }, children),
}))

import { InquilinosTable, canonVigente, arriendoPrincipal, ordenarInquilinos } from './InquilinosTable'

function arriendo(p: Partial<ArriendoDeInquilino> = {}): ArriendoDeInquilino {
  return {
    leaseId: 'l1',
    contractId: 'c1',
    estado: 'ACTIVE',
    desde: '2025-09-04',
    hasta: '2026-09-04',
    canonCop: 3_750_000,
    inmueble: { id: 'i1', title: 'Apto', address: 'Carrera 30a #25A-20', city: 'Bogotá' },
    ...p,
  }
}

function persona(p: Partial<Inquilino> = {}): Inquilino {
  return {
    tenantId: 't1',
    nombre: 'Esteban López Quintero',
    email: 'esteban.lopez@example.com',
    telefono: '3010082450',
    arriendos: [arriendo()],
    ...p,
  }
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
})

function montar(inquilinos: Inquilino[]) {
  const c = document.createElement('div')
  document.body.appendChild(c)
  const r = createRoot(c)
  container = c
  root = r
  const onVerFicha = vi.fn()
  act(() => {
    r.render(<InquilinosTable inquilinos={inquilinos} onVerFicha={onVerFicha} />)
  })
  return { onVerFicha }
}

const filas = () => Array.from(container!.querySelectorAll<HTMLElement>('[data-testid="inquilino-fila"]'))

describe('helpers', () => {
  it('canonVigente suma sólo lo vigente, no lo terminado', () => {
    const p = persona({
      arriendos: [
        arriendo({ leaseId: 'a', canonCop: 1_000_000, estado: 'ACTIVE' }),
        arriendo({ leaseId: 'b', canonCop: 500_000, estado: 'ENDING_SOON' }),
        arriendo({ leaseId: 'c', canonCop: 9_000_000, estado: 'ENDED' }),
      ],
    })
    expect(canonVigente(p)).toBe(1_500_000)
  })

  it('el arriendo principal es el vigente, aunque venga después del terminado', () => {
    const p = persona({
      arriendos: [arriendo({ leaseId: 'viejo', estado: 'ENDED' }), arriendo({ leaseId: 'vivo', estado: 'ACTIVE' })],
    })
    expect(arriendoPrincipal(p)?.leaseId).toBe('vivo')
  })

  it('sin ninguno vigente cae al primero, no a undefined', () => {
    const p = persona({ arriendos: [arriendo({ leaseId: 'x', estado: 'ENDED' })] })
    expect(arriendoPrincipal(p)?.leaseId).toBe('x')
  })

  it('ordena por nombre, por cantidad de arriendos y por canon, sin mutar', () => {
    const a = persona({ tenantId: 'a', nombre: 'Ana', arriendos: [arriendo({ canonCop: 100 })] })
    const b = persona({ tenantId: 'b', nombre: 'Zoe', arriendos: [arriendo({ leaseId: '1' }), arriendo({ leaseId: '2', canonCop: 900 })] })
    const lista = [b, a]
    expect(ordenarInquilinos(lista, 'nombre', 'asc').map((x) => x.tenantId)).toEqual(['a', 'b'])
    expect(ordenarInquilinos(lista, 'arriendos', 'desc').map((x) => x.tenantId)).toEqual(['b', 'a'])
    expect(ordenarInquilinos(lista, 'canon', 'desc').map((x) => x.tenantId)).toEqual(['b', 'a'])
    expect(lista.map((x) => x.tenantId)).toEqual(['b', 'a'])
  })
})

describe('<InquilinosTable>', () => {
  it('una fila por persona, con los datos de su único arriendo en las columnas', () => {
    montar([persona()])
    expect(filas()).toHaveLength(1)
    const texto = filas()[0].textContent ?? ''
    expect(texto).toContain('Esteban López Quintero')
    expect(texto).toContain('esteban.lopez@example.com')
    expect(texto).toContain('3010082450')
    expect(texto).toContain('Carrera 30a #25A-20')
    expect(texto).toContain('$3.750.000')
    expect(texto).toContain('2025-09-04')
    // Con un solo arriendo no hay nada que desplegar.
    expect(filas()[0].querySelector('[data-testid="inquilino-desplegar"]')).toBeNull()
  })

  it('con varios arriendos la fila resume y el despliegue los muestra TODOS', () => {
    montar([
      persona({
        arriendos: [
          arriendo({ leaseId: 'a', canonCop: 1_000_000, inmueble: { id: '1', title: 'A', address: 'Calle 1', city: 'Cali' } }),
          arriendo({ leaseId: 'b', canonCop: 2_000_000, inmueble: { id: '2', title: 'B', address: 'Calle 2', city: 'Cali' } }),
        ],
      }),
    ])
    expect(filas()[0].textContent).toContain('variosInmuebles:2')
    expect(container!.querySelector('[data-testid="inquilino-arriendos"]')).toBeNull()

    act(() => container!.querySelector<HTMLButtonElement>('[data-testid="inquilino-desplegar"]')!.click())
    const detalle = container!.querySelector('[data-testid="inquilino-arriendos"]')!
    expect(detalle.textContent).toContain('Calle 1')
    expect(detalle.textContent).toContain('Calle 2')

    act(() => container!.querySelector<HTMLButtonElement>('[data-testid="inquilino-desplegar"]')!.click())
    expect(container!.querySelector('[data-testid="inquilino-arriendos"]')).toBeNull()
  })

  it('desplegar no abre la ficha (el clic no se propaga a la fila)', () => {
    const { onVerFicha } = montar([persona({ arriendos: [arriendo({ leaseId: 'a' }), arriendo({ leaseId: 'b' })] })])
    act(() => container!.querySelector<HTMLButtonElement>('[data-testid="inquilino-desplegar"]')!.click())
    expect(onVerFicha).not.toHaveBeenCalled()
  })

  it('la fila abre la ficha', () => {
    const { onVerFicha } = montar([persona()])
    act(() => filas()[0].click())
    expect(onVerFicha).toHaveBeenCalledTimes(1)
    expect(onVerFicha.mock.calls[0][0].tenantId).toBe('t1')
  })

  it('sin correo ni teléfono lo dice: es a quién no se le puede cobrar', () => {
    montar([persona({ email: null, telefono: null })])
    expect(filas()[0].textContent).toContain('inquilinos.sinContacto')
  })

  it('un arriendo sin inmueble lo dice en vez de dejar la celda vacía', () => {
    montar([persona({ arriendos: [arriendo({ inmueble: null })] })])
    expect(filas()[0].textContent).toContain('inquilinos.sinInmueble')
  })

  it('el encabezado ordena, y volver a tocarlo invierte', () => {
    montar([
      persona({ tenantId: 'z', nombre: 'Zoe' }),
      persona({ tenantId: 'a', nombre: 'Ana' }),
    ])
    expect(filas().map((f) => f.dataset.tenantId)).toEqual(['a', 'z'])
    act(() => container!.querySelector<HTMLButtonElement>('[data-testid="ordenar-nombre"]')!.click())
    expect(filas().map((f) => f.dataset.tenantId)).toEqual(['z', 'a'])
  })
})
