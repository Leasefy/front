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

import {
  BarraDeInquilinos,
  InquilinosTable,
  canonVigente,
  arriendoPrincipal,
  ordenarInquilinos,
} from './InquilinosTable'

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
    documento: '1020304050',
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

function montarEn(nodo: React.ReactElement) {
  const c = document.createElement('div')
  document.body.appendChild(c)
  const r = createRoot(c)
  container = c
  root = r
  act(() => {
    r.render(nodo)
  })
}

function montar(inquilinos: Inquilino[]) {
  const onAbrir = vi.fn()
  montarEn(<InquilinosTable inquilinos={inquilinos} onAbrir={onAbrir} />)
  return { onAbrir }
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

  it('desplegar no abre el cajón (el clic no se propaga a la fila)', () => {
    const { onAbrir } = montar([persona({ arriendos: [arriendo({ leaseId: 'a' }), arriendo({ leaseId: 'b' })] })])
    act(() => container!.querySelector<HTMLButtonElement>('[data-testid="inquilino-desplegar"]')!.click())
    expect(onAbrir).not.toHaveBeenCalled()
  })

  it('la fila abre el cajón', () => {
    const { onAbrir } = montar([persona()])
    act(() => filas()[0].click())
    expect(onAbrir).toHaveBeenCalledTimes(1)
    expect(onAbrir.mock.calls[0][0].tenantId).toBe('t1')
  })

  /*
   * Nico (2026-09-03): «lo de "ver ficha" sobra». Se fue el botón — y con él
   * se habría ido el único camino de teclado al detalle, porque un <tr> con
   * onClick no se tabula. Estas dos pruebas son las dos mitades de eso.
   */
  it('ya no hay botón «Ver ficha» en la fila', () => {
    montar([persona()])
    const textos = Array.from(container!.querySelectorAll('button')).map((b) => b.textContent ?? '')
    expect(textos.some((x) => x.includes('verFicha'))).toBe(false)
  })

  it('el nombre es un botón: el teclado también abre el cajón', () => {
    const { onAbrir } = montar([persona()])
    const nombre = container!.querySelector<HTMLButtonElement>('[data-testid="inquilino-abrir"]')
    expect(nombre).not.toBeNull()
    expect(nombre!.tagName).toBe('BUTTON')
    act(() => nombre!.click())
    // Una sola vez: el botón corta la propagación, no dispara también la fila.
    expect(onAbrir).toHaveBeenCalledTimes(1)
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

/*
 * Nico (2026-09-03): «nuestras tablas tienen el buscador y las tabs también
 * asociadas a la tabla, no fuera de ella». La barra vive con la tabla, pero
 * es un componente aparte para que la página la pueda pintar ARRIBA del
 * vacío: si desapareciera con la última fila, quien buscó algo que no existe
 * se quedaría sin campo para borrar lo que escribió.
 */
describe('<BarraDeInquilinos>', () => {
  it('escribir en el buscador avisa hacia arriba', () => {
    const onBuscar = vi.fn()
    montarEn(
      <BarraDeInquilinos buscar="" onBuscar={onBuscar} estado="activos" onEstado={vi.fn()} />,
    )
    const campo = container!.querySelector<HTMLInputElement>('[data-testid="inquilinos-buscar"] input')
      ?? container!.querySelector<HTMLInputElement>('input')
    expect(campo).not.toBeNull()
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!
    act(() => {
      setter.call(campo!, 'lopez')
      campo!.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(onBuscar).toHaveBeenCalledWith('lopez')
  })

  it('las tres pestañas están y cambiar de pestaña avisa hacia arriba', () => {
    const onEstado = vi.fn()
    montarEn(
      <BarraDeInquilinos buscar="" onBuscar={vi.fn()} estado="activos" onEstado={onEstado} />,
    )
    const texto = container!.textContent ?? ''
    expect(texto).toContain('inquilinos.filtros.activos')
    expect(texto).toContain('inquilinos.filtros.terminados')
    expect(texto).toContain('inquilinos.filtros.todos')

    const terminados = Array.from(container!.querySelectorAll('button')).find((b) =>
      (b.textContent ?? '').includes('inquilinos.filtros.terminados'),
    )
    act(() => terminados!.click())
    expect(onEstado).toHaveBeenCalledWith('terminados')
  })
})

describe('InquilinosTable — la persona sin arriendo', () => {
  /*
   * Existe desde que se puede crear un inquilino solo. La fila tiene que
   * decir DOS cosas: que no tiene arriendo —o sea que no se le está cobrando
   * nada— y por dónde dárselo.
   */
  const sola = persona({ tenantId: 'sin-arriendo', nombre: 'Carla Mesa', arriendos: [] })

  it('la marca «sin arriendo» y ofrece crearle el contrato', () => {
    montarEn(<InquilinosTable inquilinos={[sola]} onAbrir={() => {}} />)

    const fila = container!.querySelector('[data-tenant-id="sin-arriendo"]')!
    expect(fila.textContent).toContain('inquilinos.sinArriendo')

    const contrato = fila.querySelector('[data-testid="inquilino-crear-contrato"]')!
    expect(contrato).not.toBeNull()
    expect(contrato.getAttribute('href')).toBe(
      '/panel/inmobiliaria/contratos/nuevo?modo=manual',
    )
    expect(contrato.textContent).toContain('inquilinos.crearSuContrato')
  })

  it('🔴 no dice «$0» ni «sin inmueble asignado»: las dos mienten', () => {
    montarEn(<InquilinosTable inquilinos={[sola]} onAbrir={() => {}} />)
    const fila = container!.querySelector('[data-tenant-id="sin-arriendo"]')!

    // «$0» se lee como un inquilino que no paga; «sin inmueble asignado» es un
    // contrato incompleto, que es otra cosa. Acá simplemente no hay arriendo.
    expect(fila.textContent).not.toContain('$0')
    expect(fila.textContent).not.toContain('inquilinos.sinInmueble')
  })

  it('abrir el contrato desde la fila NO abre el cajón', () => {
    let abiertos = 0
    montarEn(
      <InquilinosTable inquilinos={[sola]} onAbrir={() => { abiertos += 1 }} />,
    )
    const contrato = container!.querySelector('[data-testid="inquilino-crear-contrato"]')!
    act(() => {
      contrato.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    expect(abiertos).toBe(0)
  })

  it('la que SÍ tiene arriendo no se marca', () => {
    montarEn(<InquilinosTable inquilinos={[persona()]} onAbrir={() => {}} />)
    expect(container!.textContent).not.toContain('inquilinos.sinArriendo')
    expect(
      container!.querySelector('[data-testid="inquilino-crear-contrato"]'),
    ).toBeNull()
  })
})
