import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

/**
 * 02-10-2026 · `useCandidateDecision` ya no se traga el error. Antes devolvía
 * `null`, guardaba `err.message` en un estado que nadie pintaba y el
 * propietario veía el panel cerrarse sin saber que la decisión no se guardó.
 */

const { decideCandidateMock } = vi.hoisted(() => ({ decideCandidateMock: vi.fn() }))
vi.mock('@/lib/api/landlord.service', () => ({
  landlordApi: { decideCandidate: (...a: unknown[]) => decideCandidateMock(...a) },
}))

import { ApiError } from '@/lib/api/client'
import { useCandidateDecision, mensajeDelFalloAlDecidir } from './useLandlord'

let container: HTMLDivElement
let root: Root
let hook: ReturnType<typeof useCandidateDecision>

function Sonda() {
  hook = useCandidateDecision()
  return null
}

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  decideCandidateMock.mockReset()
  act(() => root.render(<Sonda />))
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

describe('useCandidateDecision', () => {
  it('🔴 relanza el error y deja `error` traducido (un 5xx: de nuestro lado, con la referencia)', async () => {
    const fallo = new ApiError(500, 'Error interno del servidor.', 'ERROR_INTERNO', { referencia: 'ab12cd34' })
    decideCandidateMock.mockRejectedValue(fallo)

    let lanzado: unknown
    await act(async () => {
      try {
        await hook.decide('c1', { decision: 'approved' })
      } catch (e) {
        lanzado = e
      }
    })

    expect(lanzado).toBe(fallo)
    expect(hook.error).toMatch(/^No pudimos aprobar al candidato: algo falló de nuestro lado/)
    expect(hook.error).toContain('ab12cd34')
    expect(hook.isSubmitting).toBe(false)
  })

  it('si sale bien devuelve el candidato y no hay error', async () => {
    decideCandidateMock.mockResolvedValue({ id: 'c1' })
    let resultado: unknown
    await act(async () => {
      resultado = await hook.decide('c1', { decision: 'rejected' })
    })
    expect(resultado).toEqual({ id: 'c1' })
    expect(hook.error).toBeNull()
  })
})

describe('mensajeDelFalloAlDecidir', () => {
  it('un 4xx dice lo que mandó el back', () => {
    const e = new ApiError(409, 'La postulación ya fue decidida.', 'CONFLICTO')
    expect(mensajeDelFalloAlDecidir(e, 'rejected')).toBe('La postulación ya fue decidida.')
  })

  it('sin respuesta habla de la conexión', () => {
    expect(mensajeDelFalloAlDecidir(new TypeError('Failed to fetch'), 'approved')).toMatch(/conexión/)
  })

  it('el 5xx nombra la acción', () => {
    expect(mensajeDelFalloAlDecidir(new ApiError(500, ''), 'more-info')).toMatch(
      /^No pudimos pedirle más información al candidato/,
    )
  })
})
