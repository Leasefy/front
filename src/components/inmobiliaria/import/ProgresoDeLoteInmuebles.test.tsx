/**
 * La espera de la importación de inmuebles (23-09).
 *
 * 🔴 Nico: «¿para qué muestras la carga también en la tabla? Ya tenemos
 * centro de procesos, todas las cargas déjalas que sucedan allí y deja la
 * pantalla quieta». La tarjeta ya no cuenta «4 / 10 filas procesadas» ni pinta
 * una barra: manda al centro, y dice lo que el centro no dice.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { abrir } = vi.hoisted(() => ({ abrir: vi.fn() }))
vi.mock('@/lib/api/procesos.service', () => ({ abrirCentroDeProcesos: abrir }))

import { ProgresoDeLoteInmuebles } from './ProgresoDeLoteInmuebles'
import type { EstadoDeLoteInmuebles } from '@/lib/api/inmuebles-importacion.service'

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
  vi.clearAllMocks()
})

const procesando = { lote: 'l-1', estado: 'PROCESANDO', total: 10, procesadas: 4 } as unknown as EstadoDeLoteInmuebles

describe('<ProgresoDeLoteInmuebles>', () => {
  it('🔴 no pinta el avance: ni barra ni «4 / 10»; «Ver en el centro de procesos» lo abre', () => {
    act(() => root.render(<ProgresoDeLoteInmuebles estado={procesando} agotado={false} />))
    expect(container.textContent).not.toMatch(/4\s*\/\s*10/)
    expect(container.querySelector('.rounded-full.bg-primary')).toBeNull()
    expect(container.textContent).toContain('10 inmuebles')
    expect(container.textContent?.toLowerCase()).toContain('cerrar esta pestaña')
    act(() => (container.querySelector('[data-testid="lote-inmuebles-ver-en-el-centro"]') as HTMLButtonElement).click())
    expect(abrir).toHaveBeenCalledTimes(1)
  })

  it('FALLIDO sigue diciendo el error: el paso necesita su salida aquí', () => {
    act(() =>
      root.render(
        <ProgresoDeLoteInmuebles
          estado={{ ...procesando, estado: 'FALLIDO', error: 'El archivo no trae la columna Código.' } as EstadoDeLoteInmuebles}
          agotado={false}
        />,
      ),
    )
    expect(container.textContent).toContain('El archivo no trae la columna Código.')
  })
})
