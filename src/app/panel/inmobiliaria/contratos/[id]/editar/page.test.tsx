/**
 * Editar contrato — cuando el back rechaza, se dice POR QUÉ.
 *
 * 🔴 C25: `actions.update` nunca lanzaba (`run()` se tragaba el error y
 * devolvía `null`), así que todo rechazo decía «No se pudo actualizar el
 * contrato. Verifica los datos e intenta de nuevo.» — también un 403 de quien
 * no tiene permiso, que se ponía a revisar fechas que estaban bien. Ahora la
 * acción relanza y la pantalla pinta el motivo del back.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// 10-10-2026: las fechas son campos de Cadence (se eligen, no se escriben); en la
// prueba, un <input> con el mismo id y data-testid (`campos-de-fecha.doble-de-prueba`).
vi.mock('@/components/contabilidad/CampoDeDia', () => import('@/components/ui/campos-de-fecha.doble-de-prueba'))
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { acciones, router, CONTRATO } = vi.hoisted(() => ({
  acciones: { update: vi.fn(), uploadPdf: vi.fn(), isSubmitting: false, lastError: null },
  router: { push: vi.fn(), back: vi.fn(), replace: vi.fn() },
  // Estable: el formulario se llena en un efecto que depende del contrato.
  CONTRATO: {
    id: 'c-1',
    status: 'draft',
    contractOrigin: 'TEMPLATE',
    startDate: '2026-10-01',
    endDate: '2027-09-30',
    monthlyRent: 2_000_000,
    paymentDueDay: 5,
    prorratearPrimerMes: false,
    diasDePlazo: null,
    insuranceTier: 'NONE',
  },
}))

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'c-1' }),
  useRouter: () => router,
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}))
vi.mock('@/components/contract/RejectionsHistory', () => ({ RejectionsHistory: () => null }))
vi.mock('@/lib/hooks/useContracts', () => ({
  useContract: () => ({ contract: CONTRATO, isLoading: false, error: null }),
  useContractRejections: () => ({ rejections: [] }),
  useContractActions: () => acciones,
}))

import EditarContratoPage from './page'
import { ApiError } from '@/lib/api/client'

let contenedor: HTMLDivElement
let raiz: Root

beforeEach(() => {
  acciones.update.mockReset()
  router.push.mockReset()
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  raiz = createRoot(contenedor)
})

afterEach(() => {
  act(() => raiz.unmount())
  contenedor.remove()
})

async function guardar() {
  await act(async () => {
    raiz.render(<EditarContratoPage />)
  })
  const boton = Array.from(contenedor.querySelectorAll<HTMLButtonElement>('button[type="submit"]')).find((b) =>
    b.textContent?.includes('Guardar'),
  )
  if (!boton) throw new Error('No está el botón de guardar')
  expect(boton.disabled).toBe(false)
  await act(async () => {
    boton.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe('Editar contrato — el rechazo del back en palabras', () => {
  it('400 del ValidationPipe → la lista de motivos del back, no «Verifica los datos»', async () => {
    acciones.update.mockRejectedValue(
      new ApiError(400, ['paymentDay must not be greater than 28', 'El canon no puede bajar en una edición']),
    )
    await guardar()

    expect(acciones.update).toHaveBeenCalledTimes(1)
    expect(contenedor.textContent).toContain(
      'paymentDay must not be greater than 28 · El canon no puede bajar en una edición',
    )
    expect(contenedor.textContent).not.toContain('Verifica los datos')
    expect(router.push).not.toHaveBeenCalled()
  })

  it('403 → dice que es de permisos, no el texto crudo del back', async () => {
    acciones.update.mockRejectedValue(new ApiError(403, 'Forbidden resource'))
    await guardar()

    expect(contenedor.textContent).toContain('No tienes permiso para editar contratos.')
    expect(contenedor.textContent).not.toContain('Forbidden resource')
  })

  it('cuando sale bien, vuelve a la ficha del contrato', async () => {
    acciones.update.mockResolvedValue({ ...CONTRATO, status: 'pending_tenant' })
    await guardar()
    expect(router.push).toHaveBeenCalledWith('/panel/inmobiliaria/contratos/c-1')
  })
})

/**
 * 🔴 02-10-2026 · Sistema de errores: el 400 con `campos` del DTO topado va
 * bajo SU campo con el foco; un 5xx es nuestro (con la referencia) y sólo un
 * pedido sin respuesta habla de la conexión.
 */
describe('Editar contrato — el error en su campo y la regla de oro', () => {
  const FIN = 'La fecha de fin debe ser posterior a la de inicio.'

  it('🔴 un 400 con campos pinta el error bajo la fecha de fin y le da el foco', async () => {
    acciones.update.mockRejectedValue(
      new ApiError(400, [FIN], 'DATOS_INVALIDOS', {
        statusCode: 400,
        code: 'DATOS_INVALIDOS',
        message: [FIN],
        campos: [{ campo: 'endDate', regla: 'rango', mensaje: FIN }],
      }),
    )
    await guardar()

    const fin = contenedor.querySelector<HTMLInputElement>('#contrato-endDate')!
    expect(contenedor.querySelector('#contrato-endDate-error')?.textContent).toBe(FIN)
    expect(fin.getAttribute('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(fin)
    // Una sola vez: no se repite en el renglón rojo del pie.
    expect(contenedor.textContent?.split(FIN).length).toBe(2)
  })

  it('🔴 un 5xx dice que falló de nuestro lado, con la referencia', async () => {
    acciones.update.mockRejectedValue(
      new ApiError(500, 'Error interno del servidor.', 'ERROR_INTERNO', {
        statusCode: 500,
        code: 'ERROR_INTERNO',
        referencia: '9f8e7d6c',
      }),
    )
    await guardar()

    const texto = contenedor.textContent ?? ''
    expect(texto).toContain('No pudimos guardar los cambios del contrato: algo falló de nuestro lado.')
    expect(texto).toContain('9f8e7d6c')
    expect(texto).not.toContain('conexión')
  })

  it('🔴 sin respuesta (status 0) habla de la conexión', async () => {
    acciones.update.mockRejectedValue(new ApiError(0, 'Failed to fetch'))
    await guardar()
    expect(contenedor.textContent).toContain('conexión')
    expect(contenedor.textContent).not.toContain('de nuestro lado')
  })
})
