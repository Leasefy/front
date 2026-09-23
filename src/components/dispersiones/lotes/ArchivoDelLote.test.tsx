/**
 * La sección «El archivo al banco» del lote (23-09).
 *
 * 🔴 Nico: «todas las cargas déjalas que sucedan allí [el centro de procesos]
 * y deja la pantalla quieta». Mientras el archivo se prepara, la sección no
 * pinta la fila con su barra —eso es del centro—; cuando está, sí: con
 * «Descargar».
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('next/link', () => ({
  default: ({ children, href }: { children?: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}))
vi.mock('@/components/ui/toast', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))

import { ArchivoDelLote, type ArchivoDelLoteEstado } from './ArchivoDelLote'
import type { Proceso } from '@/lib/api/procesos.types'

function proceso(extra: Partial<Proceso>): Proceso {
  return {
    id: 'p-archivo',
    tipo: 'ARCHIVO_DEL_LOTE',
    titulo: 'Archivo del lote · Bancolombia',
    estado: 'CORRIENDO',
    hechos: 1,
    total: 3,
    porcentaje: 33,
    mensaje: null,
    lanzadoPor: null,
    esMio: true,
    recurso: { tipo: 'LOTE_DE_DISPERSION', id: 'lote-1' },
    archivo: null,
    sePuedeCancelar: false,
    cancelacionPedida: false,
    interrumpido: false,
    createdAt: '2026-09-23T10:00:00.000Z',
    iniciadoAt: '2026-09-23T10:00:00.000Z',
    terminadoAt: null,
    actualizadoAt: '2026-09-23T10:00:01.000Z',
    ...extra,
  }
}

function estado(p: Proceso): ArchivoDelLoteEstado {
  return {
    tieneArchivo: true,
    proceso: p,
    preparando: false,
    error: null,
    ultimo: null,
    descargar: vi.fn(),
    refetch: vi.fn(),
  } as unknown as ArchivoDelLoteEstado
}

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

describe('<ArchivoDelLote>', () => {
  it('🔴 en preparación: sin fila ni barra, dice que se sigue en el centro', () => {
    act(() => root.render(<ArchivoDelLote archivo={estado(proceso({}))} generadoAt={null} />))
    expect(container.querySelector('[data-testid="fila-de-proceso"]')).toBeNull()
    expect(container.querySelector('[role="progressbar"]')).toBeNull()
    expect(container.querySelector('[data-testid="archivo-en-el-centro"]')?.textContent).toContain('centro de procesos')
  })

  it('listo: la fila del centro con «Descargar»', () => {
    const listo = proceso({
      estado: 'TERMINADO',
      hechos: 3,
      porcentaje: 100,
      terminadoAt: '2026-09-23T10:00:05.000Z',
      archivo: { nombre: 'lote.txt', tipo: 'text/plain', bytes: 10, venceAt: null, vencido: false },
    })
    act(() => root.render(<ArchivoDelLote archivo={estado(listo)} generadoAt={null} />))
    expect(container.querySelector('[data-testid="fila-de-proceso"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="descargar-proceso"]')).not.toBeNull()
  })
})
