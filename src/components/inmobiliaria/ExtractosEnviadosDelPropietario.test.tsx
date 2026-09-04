/**
 * ExtractosEnviadosDelPropietario.test.tsx — las huellas del extracto en la
 * ficha del propietario: lista con chip por estado y motivo cuando no salió,
 * vacío honesto, error del back, y relectura cuando sube `version` (el
 * «Enviar por email» de la ficha).
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))

const { extractosDeMock } = vi.hoisted(() => ({ extractosDeMock: vi.fn() }))
vi.mock('@/lib/api/inmobiliaria.service', () => ({
  propietariosApi: { extractosDe: extractosDeMock },
}))

import { ExtractosEnviadosDelPropietario } from './ExtractosEnviadosDelPropietario'
import type { ExtractoEnviado } from '@/lib/types/inmobiliaria'

const HUELLAS: ExtractoEnviado[] = [
  {
    id: 'h3',
    month: '2026-08',
    origen: 'automatico',
    estado: 'ENVIADO',
    destinatario: 'ana@correo.co',
    motivo: null,
    enviadoAt: '2026-09-01T12:30:00.000Z',
    createdAt: '2026-09-01T12:30:00.000Z',
  },
  {
    id: 'h2',
    month: '2026-07',
    origen: 'manual',
    estado: 'FALLIDO',
    destinatario: 'ana@correo.co',
    motivo: 'SMTP 550 buzón lleno',
    enviadoAt: null,
    createdAt: '2026-08-03T10:00:00.000Z',
  },
  {
    id: 'h1',
    month: '2026-06',
    origen: 'automatico',
    estado: 'OMITIDO',
    destinatario: null,
    motivo: 'sin correo registrado',
    enviadoAt: null,
    createdAt: '2026-07-01T12:00:00.000Z',
  },
]

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
  vi.clearAllMocks()
})

async function flush() {
  await act(async () => {
    await new Promise<void>((r) => setTimeout(r, 0))
  })
}

async function render(props: Partial<React.ComponentProps<typeof ExtractosEnviadosDelPropietario>> = {}) {
  await act(async () => {
    root.render(<ExtractosEnviadosDelPropietario propietarioId="prop-1" {...props} />)
  })
  await flush()
}

function q<T extends Element = HTMLElement>(testId: string): T | null {
  return container.querySelector<T>(`[data-testid="${testId}"]`)
}

describe('ExtractosEnviadosDelPropietario', () => {
  it('lista las huellas con mes en palabras, origen, chip por estado y motivo', async () => {
    extractosDeMock.mockResolvedValue(HUELLAS)
    await render()

    expect(extractosDeMock).toHaveBeenCalledWith('prop-1')
    const filas = Array.from(q('extractos-enviados-lista')!.querySelectorAll('li'))
    expect(filas).toHaveLength(3)

    expect(filas[0].getAttribute('data-estado')).toBe('ENVIADO')
    expect(filas[0].textContent).toContain('Agosto de 2026')
    expect(filas[0].textContent).toContain('automático')
    expect(filas[0].textContent).toContain('a ana@correo.co')
    expect(filas[0].textContent).toContain('Enviado')

    expect(filas[1].getAttribute('data-estado')).toBe('FALLIDO')
    expect(filas[1].textContent).toContain('Julio de 2026')
    expect(filas[1].textContent).toContain('manual')
    expect(filas[1].textContent).toContain('SMTP 550 buzón lleno')
    expect(filas[1].textContent).toContain('Falló')

    expect(filas[2].getAttribute('data-estado')).toBe('OMITIDO')
    expect(filas[2].textContent).toContain('sin correo registrado')
    expect(filas[2].textContent).toContain('Omitido')
  })

  it('sin huellas dice que todavía no se le mandó ninguno', async () => {
    extractosDeMock.mockResolvedValue([])
    await render()
    expect(q('extractos-enviados-vacio')!.textContent).toContain('Todavía no se le ha enviado ningún extracto')
    expect(q('extractos-enviados-lista')).toBeNull()
  })

  it('si el back falla lo dice con su mensaje', async () => {
    extractosDeMock.mockRejectedValue(new Error('404 propietario'))
    await render()
    expect(q('extractos-enviados-error')!.textContent).toContain('404 propietario')
  })

  it('vuelve a leer cuando sube `version` (después de «Enviar por email»)', async () => {
    extractosDeMock.mockResolvedValue([])
    await render({ version: 0 })
    expect(extractosDeMock).toHaveBeenCalledTimes(1)

    extractosDeMock.mockResolvedValue(HUELLAS.slice(0, 1))
    await render({ version: 1 })
    expect(extractosDeMock).toHaveBeenCalledTimes(2)
    expect(q('extractos-enviados-lista')!.querySelectorAll('li')).toHaveLength(1)
  })
})
