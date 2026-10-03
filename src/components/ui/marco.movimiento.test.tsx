/**
 * MOV-A8 (03-10-2026): lo que la base del movimiento dejó fuera del marco.
 *
 *   · `AlertaAccionable` con `mostrar`: SALE animada (sigue montada mientras
 *     se va) y recién después se desmonta. Sin `mostrar`, igual que siempre.
 *   · Las cards de las secciones (`BarraDePestanas` con `escalonar`) entran
 *     escalonadas: cada card va dentro de un ítem que se anima; sin
 *     `escalonar` (la primera pintada del panel) quedan quietas, como antes.
 *   · La tabla del /admin: las filas que se van SALEN animadas.
 *   · El `KpiCard` del /admin escribe la cifra igual que antes (sin separador
 *     agregado) aunque ahora cuente.
 */
import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { MotionGlobalConfig } from 'framer-motion'
import { House, Wallet } from '@phosphor-icons/react'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('next/link', () => ({
  default: ({ children, href, ...r }: { children?: React.ReactNode; href: string }) =>
    React.createElement('a', { href, ...r }, children),
}))

import { AlertaAccionable } from './alerta-accionable'
import { BarraDePestanas, type PestanaDeBarra } from '@/components/inmobiliaria/BarraDePestanas'
import { DataTable } from '@/components/admin/screen/DataTable'
import { KpiCard } from '@/components/admin/screen/KpiCard'

let host: HTMLDivElement
let root: Root
const render = (el: React.ReactElement) => act(() => root.render(el))
const esperar = (ms: number) => act(async () => { await new Promise((r) => setTimeout(r, ms)) })

beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
  MotionGlobalConfig.skipAnimations = true
})

describe('AlertaAccionable con `mostrar`', () => {
  it('🔴 al apagarla SALE animada: sigue en pantalla mientras se va y después se desmonta', async () => {
    MotionGlobalConfig.skipAnimations = false
    await render(<AlertaAccionable titulo="2 inmuebles sin arrendar" mostrar />)
    expect(host.textContent).toContain('2 inmuebles sin arrendar')
    await render(<AlertaAccionable titulo="2 inmuebles sin arrendar" mostrar={false} />)
    // Saliendo: todavía está.
    expect(host.textContent).toContain('2 inmuebles sin arrendar')
    await esperar(400)
    expect(host.textContent).not.toContain('2 inmuebles sin arrendar')
  })

  it('sin `mostrar` se pinta como siempre (sin envoltorio de Presence)', async () => {
    await render(<AlertaAccionable titulo="Hola" />)
    const alerta = host.querySelector('[data-severidad="warning"]') as HTMLElement
    expect(alerta).not.toBeNull()
    expect(alerta.parentElement).toBe(host)
    expect(alerta.className).not.toContain('!animate-none')
  })
})

describe('Las cards de las secciones, la primera vez', () => {
  const items: PestanaDeBarra[] = [
    { href: '/m/a', label: 'Uno', icon: House, active: true, current: true },
    { href: '/m/b', label: 'Dos', icon: Wallet, active: false, current: false },
  ]
  const barra = (escalonar?: string) => (
    <BarraDePestanas
      items={items}
      ariaLabel="Secciones"
      cssVar="--secciones-h"
      topClass="top-16"
      nivel="secciones"
      pathname="/m/a"
      escalonar={escalonar}
    />
  )

  it('sin `escalonar` las cards quedan quietas, como antes (hijas directas del rectángulo)', async () => {
    await render(barra())
    const links = [...host.querySelectorAll('nav a')]
    expect(links).toHaveLength(2)
    expect(links[0]!.parentElement).toBe(links[1]!.parentElement)
  })

  it('🔴 con `escalonar` cada card entra en su ítem (escalonado), todas en el mismo rectángulo', async () => {
    await render(barra('pagos|inquilinos'))
    const links = [...host.querySelectorAll('nav a')]
    expect(links).toHaveLength(2)
    // Cada card tiene su envoltorio animado; los dos cuelgan del mismo rectángulo.
    expect(links[0]!.parentElement).not.toBe(links[1]!.parentElement)
    expect(links[0]!.parentElement!.parentElement).toBe(links[1]!.parentElement!.parentElement)
  })
})

describe('La tabla del /admin', () => {
  type Fila = { id: string; nombre: string }
  const tabla = (rows: Fila[]) => (
    <DataTable<Fila>
      rows={rows}
      columns={[{ header: 'Nombre', cell: (r) => r.nombre }]}
      getKey={(r) => r.id}
    />
  )

  it('🔴 la fila que se va SALE animada y después se desmonta; las filas siguen siendo <tr> de un <tbody>', async () => {
    MotionGlobalConfig.skipAnimations = false
    await render(tabla([{ id: '1', nombre: 'Ana' }, { id: '2', nombre: 'Beto' }]))
    expect(host.querySelectorAll('tbody > tr')).toHaveLength(2)
    await render(tabla([{ id: '1', nombre: 'Ana' }]))
    expect(host.textContent).toContain('Beto')
    await esperar(400)
    expect(host.textContent).not.toContain('Beto')
    expect(host.querySelectorAll('tbody > tr')).toHaveLength(1)
  })
})

describe('El KpiCard del /admin', () => {
  it('escribe la cifra igual que antes (sin separador de miles agregado)', async () => {
    await render(<KpiCard label="Pagos" value={12345} />)
    expect(host.textContent).toContain('12345')
    await render(<KpiCard label="Pagos" value="$ 1.000" />)
    expect(host.textContent).toContain('$ 1.000')
  })
})
