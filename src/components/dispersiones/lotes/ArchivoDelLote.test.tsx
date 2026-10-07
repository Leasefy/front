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

// 02-10-2026: el hook pide el archivo al back cuando el centro no lo tiene.
const h = vi.hoisted(() => ({ generarArchivo: vi.fn(), descargarArchivo: vi.fn() }))
vi.mock('@/lib/hooks/use-centro-de-procesos', () => ({
  useCentroDeProcesos: () => ({ data: { procesos: [] }, refetch: vi.fn(async () => undefined) }),
}))
vi.mock('@/lib/api/lotes-de-dispersion.service', () => ({
  lotesDeDispersionApi: { generarArchivo: h.generarArchivo, descargarArchivo: h.descargarArchivo },
}))

import { ArchivoDelLote, useArchivoDelLote, type ArchivoDelLoteEstado } from './ArchivoDelLote'
import { ApiError } from '@/lib/api/client'
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

/*
 * 02-10-2026 · Si el archivo no se pudo preparar, se dice con la regla de oro:
 * un 5xx «de nuestro lado» con la referencia de soporte, no `e.message` crudo.
 */
describe('useArchivoDelLote — el fallo al preparar el archivo (02-10)', () => {
  function Sonda() {
    const archivo = useArchivoDelLote('lote-1', 'ARCHIVO_GENERADO', vi.fn())
    return (
      <div>
        <button type="button" data-testid="bajar" onClick={() => void archivo.descargar()}>
          bajar
        </button>
        <ArchivoDelLote archivo={archivo} generadoAt={null} />
      </div>
    )
  }

  it('🔴 un 5xx: «de nuestro lado» con la referencia', async () => {
    h.generarArchivo.mockRejectedValue(
      new ApiError(500, 'Error interno del servidor', 'ERROR_INTERNO', {
        statusCode: 500,
        code: 'ERROR_INTERNO',
        message: 'Error interno del servidor',
        referencia: 'ab12cd34',
      }),
    )
    await act(async () => root.render(<Sonda />))
    await act(async () => {
      ;(container.querySelector('[data-testid="bajar"]') as HTMLButtonElement).click()
      await new Promise((r) => setTimeout(r, 0))
    })
    const texto = container.querySelector('[data-testid="archivo-del-lote"]')?.textContent ?? ''
    expect(texto).toContain('No pudimos descargar el archivo del lote: algo falló de nuestro lado')
    expect(texto).toContain('ab12cd34')
  })

  it('sin respuesta: ahí sí habla de la conexión', async () => {
    h.generarArchivo.mockRejectedValue(new ApiError(0, 'Failed to fetch'))
    await act(async () => root.render(<Sonda />))
    await act(async () => {
      ;(container.querySelector('[data-testid="bajar"]') as HTMLButtonElement).click()
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(container.querySelector('[data-testid="archivo-del-lote"]')?.textContent).toMatch(/conexi[oó]n/)
  })
})
