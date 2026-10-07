/**
 * QA-IA-B (04-10-2026): con el plazo sin fijar, Cobranza no decía por qué no
 * había casos. Convención del repo: createRoot + act, sin RTL.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

const { agencia } = vi.hoisted(() => ({ agencia: { valor: {} as Record<string, unknown> } }))
vi.mock('@/lib/api/inmobiliaria.service', () => ({
  agencyApi: { getMyAgency: () => Promise.resolve(agencia.valor) },
}))
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

import { AvisoPlazoSinFijarEnCobranza } from './AvisoPlazoSinFijarEnCobranza'

let contenedor: HTMLDivElement
let raiz: Root
beforeEach(() => {
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  raiz = createRoot(contenedor)
})
afterEach(() => {
  act(() => raiz.unmount())
  contenedor.remove()
})

async function montar() {
  await act(async () => {
    raiz.render(<AvisoPlazoSinFijarEnCobranza />)
  })
  await act(async () => {
    await Promise.resolve()
  })
}

describe('AvisoPlazoSinFijarEnCobranza', () => {
  it('sin plazo fijado: lo dice y lleva a fijarlo', async () => {
    agencia.valor = { plazoDePagoFijadoAt: null }
    await montar()
    const aviso = contenedor.querySelector('[data-testid="cobranza-plazo-sin-fijar"]')
    expect(aviso?.textContent).toContain('no entran a la cobranza hasta fijarlos')
    expect(contenedor.querySelector('a')?.getAttribute('href')).toBe(
      '/panel/inmobiliaria/configuracion/perfil#perfil-diasDePlazo',
    )
  })

  it('con el plazo fijado (o un back que no manda el dato) no aparece', async () => {
    agencia.valor = { plazoDePagoFijadoAt: '2026-09-20T00:00:00.000Z' }
    await montar()
    expect(contenedor.querySelector('[data-testid="cobranza-plazo-sin-fijar"]')).toBeNull()
    agencia.valor = {}
    await montar()
    expect(contenedor.querySelector('[data-testid="cobranza-plazo-sin-fijar"]')).toBeNull()
  })
})
