/**
 * QA-PROP-95 B-51 (04-10-2026): con `GET …/extractos` en 500 la ficha pintaba
 * el `message` crudo del back («Internal server error: TypeError…»). Ahora va
 * por el traductor: «de nuestro lado», con la referencia.
 * (Arnés copiado de `ExtractosEnviadosDelPropietario.test.tsx`.)
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
import { ApiError } from '@/lib/api/client'
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

describe('B-51 · el fallo de los extractos enviados', () => {
  it('un 500 no muestra el texto técnico: dice que fue de nuestro lado, con la referencia', async () => {
    extractosDeMock.mockRejectedValue(
      new ApiError(500, 'Internal server error: TypeError: x is undefined at y.ts:12', 'ERROR_INTERNO', { referencia: 'ab12cd34' }),
    )
    await render()
    const t = q('extractos-enviados-error')!.textContent ?? ''
    expect(t).not.toContain('TypeError')
    expect(t).not.toContain('y.ts')
    expect(t).toContain('ab12cd34')
  })
})
