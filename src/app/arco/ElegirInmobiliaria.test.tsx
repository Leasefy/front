import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

// ARCO-1 (Nico 19-10-2026): /arco sin inmobiliaria pregunta a cuál le escribe la persona.

vi.mock('@/lib/i18n', () => ({ useI18n: () => ({ locale: 'es', t: (k: string) => k }) }))
vi.mock('next/link', () => ({
  default: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}))
vi.mock('@leasefy/cadence', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@leasefy/cadence')>()),
  Stagger: ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
  StaggerItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

import { ElegirInmobiliaria } from './ElegirInmobiliaria'
import { rutaDelFormulario, type InmobiliariaDelFormulario } from './inmobiliaria-del-formulario'

const LISTA: InmobiliariaDelFormulario[] = [
  { id: 'id-portofino', slug: 'portofino', nombre: 'Portofino Propiedad Raíz', logoUrl: null, ciudad: 'Medellín' },
  { id: 'id-nogal', slug: null, nombre: 'Nogal Inmobiliaria', logoUrl: null, ciudad: 'Bogotá' },
]

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

// Los formularios de las inmobiliarias (el logo, que lleva al inicio, no cuenta).
const enlaces = () => [...container.querySelectorAll('a[href^="/arco/"]')].map((a) => a.getAttribute('href'))

function buscar(valor: string) {
  const el = container.querySelector('input[type="search"]') as HTMLInputElement
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  act(() => {
    setter.call(el, valor)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

describe('<ElegirInmobiliaria>', () => {
  it('lista las inmobiliarias en orden y cada una va a su formulario (nombre corto o id)', () => {
    act(() => root.render(<ElegirInmobiliaria inmobiliarias={LISTA} />))
    expect(enlaces()).toEqual(['/arco/id-nogal', '/arco/portofino'])
  })

  it('busca sin tildes ni mayúsculas, también por ciudad', () => {
    act(() => root.render(<ElegirInmobiliaria inmobiliarias={LISTA} />))
    buscar('RAIZ')
    expect(enlaces()).toEqual(['/arco/portofino'])
    buscar('bogota')
    expect(enlaces()).toEqual(['/arco/id-nogal'])
    buscar('zzz')
    expect(enlaces()).toEqual([])
    expect(container.querySelector('[data-testid="arco-elegir-vacio"]')?.textContent).toBe(
      'inmobiliaria.ai.arco.public.elegir.sinResultados',
    )
  })

  it('si el servidor no respondió lo dice, sin una lista inventada', () => {
    act(() => root.render(<ElegirInmobiliaria inmobiliarias={null} />))
    expect(container.querySelector('[role="alert"]')?.textContent).toBe('inmobiliaria.ai.arco.public.elegir.noCargo')
    expect(container.querySelector('input')).toBeNull()
    expect(container.querySelector('a[href^="mailto:hola@leasefy.co"]')).not.toBeNull()
  })

  it('sin ninguna inmobiliaria para mostrar no ofrece buscar: dice dónde está el enlace', () => {
    act(() => root.render(<ElegirInmobiliaria inmobiliarias={[]} />))
    expect(container.querySelector('input')).toBeNull()
    // Revisora r25 (R4): sin lista no se pide elegir; la salida es el correo de Leasefy.
    expect(container.querySelector('[data-testid="arco-elegir-vacio"]')?.textContent).toBe(
      'inmobiliaria.ai.arco.public.elegir.sinLista',
    )
    expect(container.querySelector('a[href^="mailto:hola@leasefy.co"]')).not.toBeNull()
    expect(container.querySelector('a[href="/"]')).not.toBeNull()
  })

  it('la ruta escapa lo que no es seguro en una dirección', () => {
    expect(rutaDelFormulario({ id: 'a b', slug: null })).toBe('/arco/a%20b')
  })
})
