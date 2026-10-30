/**
 * @vitest-environment happy-dom
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth/use-auth', () => ({ useAuth: () => ({ user: { id: 'u-1', firstName: 'Juan' } }) }))
vi.mock('@/components/conversion/EscenaDeMarca', () => ({
  EscenaDeMarca: () => null,
  BeneficiosEn3D: ({ items }: { items: Array<{ texto: string }> }) => <ul>{items.map((i) => <li key={i.texto}>{i.texto}</li>)}</ul>,
}))

import { BienvenidaDelInquilino, BienvenidaDelPropietario } from './BienvenidaALaCuenta'

let caja: HTMLDivElement
let raiz: Root
const porId = (id: string) => document.querySelector(`[data-testid="${id}"]`) as HTMLElement | null

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  window.localStorage.clear()
  caja = document.createElement('div')
  document.body.appendChild(caja)
  raiz = createRoot(caja)
})
afterEach(() => {
  act(() => raiz.unmount())
  caja.remove()
})

describe('La bienvenida en todas las plataformas (Nico, 30-10-2026)', () => {
  it('el propietario la ve una vez; al empezar, no vuelve a salir', async () => {
    await act(async () => raiz.render(<BienvenidaDelPropietario deInmobiliaria={false} activa />))
    expect(porId('bienvenida-propietario')?.textContent).toContain('¡Te damos la bienvenida, Juan!')
    expect(porId('bienvenida-propietario')?.textContent).toContain('Tus inmuebles en el marketplace')
    await act(async () => porId('bienvenida-propietario-seguir')!.click())
    expect(window.localStorage.getItem('leasefy-bienvenida-propietario:u-1')).toBe('1')
    act(() => raiz.unmount())
    raiz = createRoot(caja)
    await act(async () => raiz.render(<BienvenidaDelPropietario deInmobiliaria={false} activa />))
    expect(porId('bienvenida-propietario')).toBeNull()
  })

  it('el propietario con inmobiliaria ve la suya; mientras carga, ninguna', async () => {
    await act(async () => raiz.render(<BienvenidaDelPropietario deInmobiliaria activa={false} />))
    expect(porId('bienvenida-propietario-de-inmobiliaria')).toBeNull()
    await act(async () => raiz.render(<BienvenidaDelPropietario deInmobiliaria activa />))
    expect(porId('bienvenida-propietario-de-inmobiliaria')?.textContent).toContain('Tus giros y tu estado de cuenta')
  })

  it('el inquilino ve la suya', async () => {
    await act(async () => raiz.render(<BienvenidaDelInquilino />))
    expect(porId('bienvenida-inquilino')?.textContent).toContain('Busca arriendo en el marketplace')
  })
})
