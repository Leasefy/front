/**
 * use-estudio-de-canon.test.ts
 *
 * Contract §3.1 A: poll GET /estudio/actual every 3 s while PROCESSING, stop on
 * COMPLETED / FAILED, and never lose the study (nor flip it to FAILED) because
 * a single poll failed.
 */

import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

void React // jsx-preserve

const actual = vi.fn()

vi.mock('@/lib/api/estudio-de-canon.service', () => ({
  estudioDeCanonApi: { actual: (...a: unknown[]) => actual(...a) },
}))

import { INTERVALO_DE_CONSULTA_MS, useEstudioDeCanon } from './use-estudio-de-canon'
import type { EstudioDeCanon } from '@/lib/api/estudio-de-canon.types'

function estudio(status: EstudioDeCanon['status']): EstudioDeCanon {
  return {
    id: 'e1',
    status,
    creadoEl: null,
    terminadoEl: null,
    venceEl: null,
    documentos: [],
    faltan: [],
    resultado: null,
    error: null,
  }
}

let container: HTMLDivElement
let root: Root
type Hook = ReturnType<typeof useEstudioDeCanon>

function renderHook(options?: Parameters<typeof useEstudioDeCanon>[0]): { get: () => Hook } {
  let latest: Hook | null = null
  function Sonda() {
    latest = useEstudioDeCanon(options)
    return null
  }
  act(() => {
    root.render(React.createElement(Sonda))
  })
  return { get: () => latest as Hook }
}

async function avanzar(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

beforeEach(() => {
  vi.useFakeTimers()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  actual.mockReset()
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.useRealTimers()
})

describe('useEstudioDeCanon', () => {
  it('polls every 3 seconds', () => {
    expect(INTERVALO_DE_CONSULTA_MS).toBe(3000)
  })

  it('loads the current study once and does not poll a DRAFT', async () => {
    actual.mockResolvedValue(estudio('DRAFT'))
    const h = renderHook()
    await avanzar(0)
    expect(h.get().estudio?.status).toBe('DRAFT')
    expect(h.get().isLoading).toBe(false)
    await avanzar(10_000)
    expect(actual).toHaveBeenCalledTimes(1)
  })

  it('treats "no study" as null, not as an error', async () => {
    actual.mockResolvedValue(null)
    const h = renderHook()
    await avanzar(0)
    expect(h.get().estudio).toBeNull()
    expect(h.get().error).toBeNull()
  })

  it('polls while PROCESSING and stops once COMPLETED', async () => {
    actual
      .mockResolvedValueOnce(estudio('PROCESSING'))
      .mockResolvedValueOnce(estudio('PROCESSING'))
      .mockResolvedValueOnce(estudio('COMPLETED'))
    const h = renderHook()
    await avanzar(0)
    expect(actual).toHaveBeenCalledTimes(1)
    await avanzar(3000)
    expect(actual).toHaveBeenCalledTimes(2)
    await avanzar(3000)
    expect(actual).toHaveBeenCalledTimes(3)
    expect(h.get().estudio?.status).toBe('COMPLETED')
    await avanzar(12_000)
    expect(actual).toHaveBeenCalledTimes(3)
  })

  it('polls silently: isLoading stays false on ticks', async () => {
    actual.mockResolvedValue(estudio('PROCESSING'))
    const h = renderHook()
    await avanzar(0)
    await avanzar(3000)
    expect(h.get().isLoading).toBe(false)
  })

  it('keeps the study and keeps polling when a poll fails', async () => {
    actual
      .mockResolvedValueOnce(estudio('PROCESSING'))
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(estudio('COMPLETED'))
    const h = renderHook()
    await avanzar(0)
    await avanzar(3000)
    expect(h.get().estudio?.status).toBe('PROCESSING')
    expect(h.get().error).toBeNull()
    await avanzar(3000)
    expect(h.get().estudio?.status).toBe('COMPLETED')
  })

  it('reports an error when the FIRST load fails', async () => {
    actual.mockRejectedValue(Object.assign(new Error('Sin conexión'), { status: 0 }))
    const h = renderHook()
    await avanzar(0)
    expect(h.get().error).toBe('Sin conexión')
    expect(h.get().estudio).toBeNull()
  })

  it('does nothing when disabled', async () => {
    const h = renderHook({ enabled: false })
    await avanzar(10_000)
    expect(actual).not.toHaveBeenCalled()
    expect(h.get().isLoading).toBe(false)
  })

  it('lets the wizard push a study it just received (setEstudio) and starts polling it', async () => {
    actual.mockResolvedValue(null)
    const h = renderHook()
    await avanzar(0)
    act(() => h.get().setEstudio(estudio('PROCESSING')))
    actual.mockResolvedValue(estudio('COMPLETED'))
    await avanzar(3000)
    expect(h.get().estudio?.status).toBe('COMPLETED')
  })
})
