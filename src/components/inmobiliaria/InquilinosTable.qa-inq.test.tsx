/**
 * QA-INQ (03-10-2026) · la tabla de inquilinos.
 *
 *  · E-01: un contrato en firma NO es «Terminado»: dice «En firma».
 *  · I-04 (Nico): uno que todavía no empieza dice «Empieza el …» y no es vigente.
 *  · I-08: «1 vigente», no «1 vigentes».
 *  · I-11: `aria-sort`, y con el orden en la página la tabla avisa en vez de ordenar sola.
 *  · I-27: a 390 px, TARJETAS con nombre, estado, canon y vigencia.
 */
import * as React from 'react'
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
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
const { pantalla } = vi.hoisted(() => ({ pantalla: { celular: false } }))
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: () => pantalla.celular }))

import { InquilinosTable, EstadoDelArriendo, textoDeVigentes } from './InquilinosTable'
import { arriendosVigentes, estadoParaMostrar } from '@/lib/api/inquilinos.service'

function arriendo(p: Partial<ArriendoDeInquilino> = {}): ArriendoDeInquilino {
  return {
    leaseId: null,
    contractId: p.contractId ?? 'c1',
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
    email: 'esteban@correo.co',
    telefono: '3010082450',
    documento: '1020304050',
    arriendos: [arriendo()],
    ...p,
  }
}

let container: HTMLDivElement | undefined
let root: Root | undefined
beforeEach(() => {
  pantalla.celular = false
})
afterEach(() => {
  const r = root
  if (r) act(() => r.unmount())
  container?.remove()
  root = undefined
  container = undefined
})
function montar(nodo: React.ReactElement) {
  const c = document.createElement('div')
  document.body.appendChild(c)
  const r = createRoot(c)
  container = c
  root = r
  act(() => {
    r.render(nodo)
  })
}
const texto = () => container!.textContent ?? ''

describe('E-01 / I-04 · los estados nuevos', () => {
  it('🔴 un contrato en firma dice «En firma», no «Terminado»', () => {
    montar(<InquilinosTable inquilinos={[persona({ arriendos: [arriendo({ estado: 'EN_FIRMA' })] })]} onAbrir={() => {}} />)
    expect(texto()).toContain('inquilinos.estados.enFirma')
    expect(texto()).not.toContain('inquilinos.estados.terminado')
  })

  it('🔴 un arriendo que empieza mañana dice «Empieza el …» aunque el back lo mande ACTIVE', () => {
    montar(<EstadoDelArriendo arriendo={arriendo({ desde: '2099-11-01T00:00:00.000Z', hasta: '2100-10-31' })} />)
    expect(texto()).toBe('inquilinos.estados.empiezaEl:2099-11-01')
  })

  it('el estado POR_EMPEZAR del back también se pinta con su fecha', () => {
    montar(<EstadoDelArriendo arriendo={arriendo({ estado: 'POR_EMPEZAR', desde: '2099-11-01' })} />)
    expect(texto()).toBe('inquilinos.estados.empiezaEl:2099-11-01')
  })

  it('🔴 el que todavía no empieza y el que está en firma NO son vigentes (no suman canon)', () => {
    const p = persona({
      arriendos: [
        arriendo({ contractId: 'a' }),
        arriendo({ contractId: 'b', desde: '2099-01-01' }),
        arriendo({ contractId: 'c', estado: 'EN_FIRMA' }),
        arriendo({ contractId: 'd', estado: 'POR_EMPEZAR', desde: '2099-02-01' }),
      ],
    })
    expect(arriendosVigentes(p, '2026-10-03').map((a) => a.contractId)).toEqual(['a'])
    expect(estadoParaMostrar(arriendo({ desde: '2026-10-04' }), '2026-10-03')).toBe('POR_EMPEZAR')
    expect(estadoParaMostrar(arriendo({ desde: '2026-10-03' }), '2026-10-03')).toBe('ACTIVE')
  })
})

describe('I-08 · número gramatical', () => {
  it('«1 vigente», «0 vigentes», «2 vigentes»', () => {
    const t = (k: string, p?: Record<string, string | number>) => (p ? `${k}:${p.n}` : k)
    expect(textoDeVigentes(t, 1)).toBe('inquilinos.tabla.nVigentesUno')
    expect(textoDeVigentes(t, 0)).toBe('inquilinos.tabla.nVigentes:0')
    expect(textoDeVigentes(t, 2)).toBe('inquilinos.tabla.nVigentes:2')
  })

  it('🔴 la fila con dos arriendos y uno vigente no dice «1 vigentes»', () => {
    montar(
      <InquilinosTable
        inquilinos={[persona({ arriendos: [arriendo(), arriendo({ contractId: 'c2', estado: 'ENDED' })] })]}
        onAbrir={() => {}}
      />,
    )
    expect(texto()).toContain('inquilinos.tabla.nVigentesUno')
    expect(texto()).not.toContain('inquilinos.tabla.nVigentes:1')
  })
})

describe('I-11 · el orden', () => {
  it('con el orden en la página, tocar la cabecera AVISA (la página ordena la lista entera)', () => {
    const onOrdenar = vi.fn()
    montar(
      <InquilinosTable
        inquilinos={[persona()]}
        onAbrir={() => {}}
        orden={{ campo: 'canon', sentido: 'desc' }}
        onOrdenar={onOrdenar}
      />,
    )
    const th = container!.querySelector('[data-testid="ordenar-canon"]')!.closest('th')!
    expect(th.getAttribute('aria-sort')).toBe('descending')
    act(() => {
      container!.querySelector('[data-testid="ordenar-nombre"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(onOrdenar).toHaveBeenCalledWith({ campo: 'nombre', sentido: 'asc' })
  })
})

describe('I-27 · a 390 px, tarjetas', () => {
  it('🔴 en el celular cada persona es una tarjeta con nombre, estado, canon y vigencia, sin tabla que se corra', () => {
    pantalla.celular = true
    const onAbrir = vi.fn()
    montar(<InquilinosTable inquilinos={[persona({ nombre: 'Ana Sofía Restrepo de la Cuesta' })]} onAbrir={onAbrir} />)
    expect(container!.querySelector('[data-testid="inquilinos-tabla"]')).toBeNull()
    const tarjeta = container!.querySelector('[data-testid="inquilino-tarjeta"]')!
    expect(tarjeta.textContent).toContain('Ana Sofía Restrepo de la Cuesta')
    expect(tarjeta.textContent).toContain('inquilinos.estados.activo')
    expect(tarjeta.textContent).toContain('$3.750.000')
    expect(tarjeta.textContent).toContain('2025-09-04 → 2026-09-04')
    act(() => {
      tarjeta.querySelector('[data-testid="inquilino-abrir"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(onAbrir).toHaveBeenCalled()
  })

  it('la tarjeta sin arriendo ofrece crear SU contrato', () => {
    pantalla.celular = true
    montar(<InquilinosTable inquilinos={[persona({ tenantId: 'doc:55', arriendos: [] })]} onAbrir={() => {}} />)
    expect(container!.querySelector('[data-testid="inquilino-crear-contrato"]')!.getAttribute('href')).toBe(
      '/panel/inmobiliaria/contratos/nuevo?modo=manual&inquilino=doc%3A55',
    )
  })

  it('en escritorio sigue siendo la tabla', () => {
    montar(<InquilinosTable inquilinos={[persona()]} onAbrir={() => {}} />)
    expect(container!.querySelector('[data-testid="inquilinos-tabla"]')).not.toBeNull()
    expect(container!.querySelector('[data-testid="inquilino-tarjeta"]')).toBeNull()
  })
})
