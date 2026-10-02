/**
 * 🔴 02-10-2026 · Crear un acta que el back rechaza mostraba DOS avisos: el de
 * la página (con el motivo) y el del formulario («Hubo un error al crear el
 * acta. Intenta de nuevo.», que culpaba a la conexión aunque el problema no se
 * arreglaba reintentando). Ahora el aviso es UNO: el de quien guarda.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }))
vi.mock('@/components/ui/toast', () => ({ toast: toastMock }))
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'es', formatCurrency: (n: number) => `$${n}` }),
}))
// Los pasos se prueban aparte: acá importa sólo el envío.
vi.mock('./ActaEntregaSteps', () => ({
  StepBasicInfo: () => null,
  StepRoomSelection: () => null,
  StepInventory: () => null,
  StepMetersKeys: () => null,
  StepObservations: () => null,
  StepSignatures: () => null,
}))

import { ActaEntregaForm } from './ActaEntregaForm'
import { ApiError } from '@/lib/api/client'
import type { Consignacion } from '@/lib/types/inmobiliaria'

const CONSIGNACION = {
  id: 'c-1',
  propertyId: 'p-1',
  propertyTitle: 'Apto 301',
  propertyAddress: 'Cra 7 #45-23',
  propietarioId: 'own-1',
  agenteId: 'ag-1',
  availability: 'rented',
} as unknown as Consignacion

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

const boton = (texto: string) =>
  Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes(texto))!

async function crearCon(onSave: () => Promise<void>) {
  await act(async () => {
    root.render(
      <ActaEntregaForm
        consignaciones={[CONSIGNACION]}
        initialData={{ consignacionId: 'c-1', deliveryDate: '2026-10-02' }}
        onSave={onSave}
      />,
    )
  })
  for (let i = 0; i < 5; i++) {
    await act(async () => {
      boton('inmobiliaria.acta.next').click()
    })
  }
  await act(async () => {
    boton('inmobiliaria.acta.createActa').click()
  })
  await act(async () => {
    await Promise.resolve()
  })
}

describe('ActaEntregaForm — un solo aviso', () => {
  it('🔴 si quien guarda rechaza, el formulario NO pone un segundo aviso', async () => {
    const onSave = vi.fn().mockRejectedValue(new ApiError(409, 'El inmueble ya tiene un acta de entrega abierta'))
    await crearCon(onSave)
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(toastMock.error).not.toHaveBeenCalled()
    // Y se puede reintentar: el botón volvió.
    expect(boton('inmobiliaria.acta.createActa').disabled).toBe(false)
  })

  it('si guarda bien, el aviso de éxito también es el de quien guarda (no hay dos verdes)', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    await crearCon(onSave)
    expect(onSave).toHaveBeenCalledTimes(1)
    expect(toastMock.success).not.toHaveBeenCalled()
  })
})
