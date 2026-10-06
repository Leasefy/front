/**
 * El movimiento de las pestañas, las acciones masivas y la tabla (02-10-2026,
 * «cada interacción con su animación»), con el sistema de Cadence.
 *
 *   · La marca de la activa (la card de las secciones, el subrayado de las
 *     pestañas, la card del riel) es UNA sola por barra —un
 *     `MotionIndicator` con `layoutId`— que se desliza a la nueva; no una por
 *     pestaña prendida o apagada con opacidad.
 *   · La barra de acciones masivas sube al aparecer con algo marcado y su
 *     «N marcadas» cuenta.
 *   · `TableBodyAnimado` es un `<tbody>` de verdad con filas `<tr>`.
 */
import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { MotionGlobalConfig } from 'framer-motion'
import { House, Wallet } from '@phosphor-icons/react'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const rutaMock = vi.fn<() => string>()
vi.mock('next/navigation', () => ({ usePathname: () => rutaMock() }))
vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))
vi.mock('next/link', () => ({
  default: ({ children, href, ...r }: { children?: React.ReactNode; href: string }) =>
    React.createElement('a', { href, ...r }, children),
}))

import { BarraDePestanas, type PestanaDeBarra } from './BarraDePestanas'
import { RielDePestanas } from './RielDePestanas'
import { BarraDeAccionesMasivas } from '@/components/ui/acciones-masivas'
import { Table, TableBodyAnimado, TableCell, TableRowAnimada } from '@/components/ui/table'

let host: HTMLDivElement
let root: Root
const render = (el: React.ReactElement) => act(() => root.render(el))

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

const items = (activa: string): PestanaDeBarra[] =>
  ['/a', '/b', '/c'].map((href) => ({
    href,
    label: href,
    icon: House,
    active: href === activa,
    current: href === activa,
  }))

const barra = (nivel: 'secciones' | 'pestanas', activa: string) => (
  <BarraDePestanas
    items={items(activa)}
    ariaLabel="Secciones"
    cssVar="--secciones-h"
    topClass="top-16"
    nivel={nivel}
    pathname={activa}
  />
)

const indicadores = () => host.querySelectorAll('[data-indicador-de-la-activa]')

describe('BarraDePestanas — la marca de la activa se desliza', () => {
  it.each(['secciones', 'pestanas'] as const)('nivel «%s»: una sola marca, adentro de la activa', (nivel) => {
    render(barra(nivel, '/b'))
    expect(indicadores()).toHaveLength(1)
    expect(indicadores()[0]!.closest('a')!.getAttribute('href')).toBe('/b')

    render(barra(nivel, '/c'))
    expect(indicadores()).toHaveLength(1)
    expect(indicadores()[0]!.closest('a')!.getAttribute('href')).toBe('/c')
  })

  it('la card de la sección activa ya no lleva el fondo pegado: lo pone la marca', () => {
    render(barra('secciones', '/a'))
    const activa = host.querySelector<HTMLElement>('a[href="/a"]')!
    expect(activa.className).not.toMatch(/\bbg-surface\b/)
    expect(activa.className).toMatch(/\bisolate\b/)
    expect(indicadores()[0]!.getAttribute('class')).toMatch(/\bbg-surface\b/)
  })

  it('dos barras en la misma página no comparten la marca', () => {
    render(
      <>
        {barra('secciones', '/a')}
        {barra('pestanas', '/b')}
      </>,
    )
    expect(indicadores()).toHaveLength(2)
  })
})

describe('RielDePestanas — la misma marca que se desliza', () => {
  it('una sola marca, en la lectura de la ruta', () => {
    rutaMock.mockReturnValue('/y')
    render(
      <RielDePestanas
        ariaLabel="Lecturas"
        items={[
          { href: '/x', labelKey: 'x', icon: Wallet },
          { href: '/y', labelKey: 'y', icon: Wallet },
        ]}
      />,
    )
    expect(indicadores()).toHaveLength(1)
    expect(indicadores()[0]!.closest('a')!.getAttribute('href')).toBe('/y')
  })
})

describe('BarraDeAccionesMasivas — sube al aparecer y la cifra cuenta', () => {
  const masiva = (marcadas: number) => (
    <BarraDeAccionesMasivas marcadas={marcadas} queSon={['factura', 'facturas']} onQuitar={() => {}} testid="masiva">
      <button type="button">Aprobar</button>
    </BarraDeAccionesMasivas>
  )

  it('el texto final es el de siempre (miles con punto)', () => {
    render(masiva(1250))
    expect(host.querySelector('[data-testid="masiva-resumen"]')!.textContent).toContain('1.250 facturas')
  })

  it('montada con algo marcado, arranca abajo e invisible', () => {
    MotionGlobalConfig.skipAnimations = false
    render(masiva(3))
    const barraMasiva = host.querySelector<HTMLElement>('[data-testid="masiva"]')!
    expect(barraMasiva.style.opacity).toBe('0')
    expect(barraMasiva.style.transform).toContain('translateY(8px)')
  })

  it('montada con cero marcadas, no entra animada', () => {
    MotionGlobalConfig.skipAnimations = false
    render(masiva(0))
    const barraMasiva = host.querySelector<HTMLElement>('[data-testid="masiva"]')!
    expect(barraMasiva.style.opacity).not.toBe('0')
    expect(barraMasiva.style.transform).not.toContain('translateY(8px)')
  })
})

describe('TableBodyAnimado — filas que entran y salen', () => {
  it('es un <tbody> con <tr>, y una fila que se va desaparece', async () => {
    const tabla = (ids: string[]) => (
      <Table>
        <TableBodyAnimado>
          {ids.map((id) => (
            <TableRowAnimada key={id} data-testid={`fila-${id}`}>
              <TableCell>{id}</TableCell>
            </TableRowAnimada>
          ))}
        </TableBodyAnimado>
      </Table>
    )
    render(tabla(['1', '2', '3']))
    const fila = host.querySelector('[data-testid="fila-2"]')!
    expect(fila.tagName).toBe('TR')
    expect(fila.parentElement!.tagName).toBe('TBODY')

    render(tabla(['1', '3']))
    // La salida (150 ms, terminada al instante en las pruebas) desmonta la
    // fila cuando su animación avisa que terminó.
    for (let i = 0; i < 5; i++) await act(async () => {})
    expect(host.querySelector('[data-testid="fila-2"]')).toBeNull()
    expect(host.querySelectorAll('tbody > tr')).toHaveLength(2)
  })
})
