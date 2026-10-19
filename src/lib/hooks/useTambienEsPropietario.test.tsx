/**
 * AVALI-3 (QA de agentes 17-10; Nico: «una cuenta, dos portales»): Juliet es
 * propietaria y además inquilina; entra con su cuenta de inquilina. El portal
 * del propietario la devolvía a /inquilino y no podía aprobar sus reparaciones.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const api = vi.hoisted(() => ({ disponibles: vi.fn() }))
vi.mock('@/lib/api/informes-del-propietario.service', () => ({ informesDelPropietarioApi: { disponibles: api.disponibles } }))

import { useTambienEsPropietario } from './useTambienEsPropietario'

let host: HTMLDivElement
let root: Root
let visto: boolean | null = null
function Sonda() {
  visto = useTambienEsPropietario()
  return null
}
beforeEach(() => {
  visto = null
  api.disponibles.mockReset()
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})
const montar = async () => {
  await act(async () => root.render(<Sonda />))
  await act(async () => { await new Promise((r) => setTimeout(r, 0)) })
}

describe('useTambienEsPropietario', () => {
  it('con ficha de propietario en una inmobiliaria: sí', async () => {
    api.disponibles.mockResolvedValue({ fichas: [{ propietarioId: 'p', agencyId: 'a', agencia: 'Portofino' }], anios: [], motivo: null })
    await montar()
    expect(visto).toBe(true)
  })

  it('el inquilino de siempre (sin ficha): no', async () => {
    api.disponibles.mockResolvedValue({ fichas: [], anios: [], motivo: 'No encontramos tu ficha' })
    await montar()
    expect(visto).toBe(false)
  })

  it('si la consulta falla, no se ofrece lo que no se sabe', async () => {
    api.disponibles.mockRejectedValue(new Error('caído'))
    await montar()
    expect(visto).toBe(false)
  })
})

describe('los dos portales (guardián de los layouts)', () => {
  const leer = (p: string) => readFileSync(join(process.cwd(), p), 'utf8')

  it('el portal del propietario deja entrar la cuenta de inquilino, y la devuelve si no es propietaria', () => {
    const layout = leer('src/app/panel/(landlord)/layout.tsx')
    expect(layout).toMatch(/<ProtectedRoute allowedRoles=\{\['landlord', 'tenant'\]\}>/)
    expect(layout).toMatch(/esCuentaDeInquilino && !administrados\.cargando && !esPropietarioConfirmado/)
    expect(layout).toMatch(/router\.replace\('\/inquilino'\)/)
    expect(layout).toMatch(/\[\.\.\.AGENCY_OWNER_NAV_ITEMS, PORTAL_DEL_INQUILINO\]/)
  })

  it('el portal del inquilino ofrece el del propietario sólo a quien lo es', () => {
    const layout = leer('src/app/inquilino/layout.tsx')
    expect(layout).toMatch(/const tambienPropietario = useTambienEsPropietario\(\)/)
    expect(layout).toMatch(/tambienPropietario\s*\?\s*\[\{ label: locale === 'es' \? 'Mi portal de propietario'/)
  })
})
