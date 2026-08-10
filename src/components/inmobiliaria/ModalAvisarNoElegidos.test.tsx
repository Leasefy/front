/**
 * @vitest-environment happy-dom
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import type { LandlordCandidate } from '@/lib/api/applications.types'

const approve = vi.fn()
const reject = vi.fn()
vi.mock('@/lib/api/applications.service', () => ({
  landlordApplicationsApi: {
    approve: (...a: unknown[]) => approve(...a),
    reject: (...a: unknown[]) => reject(...a),
  },
}))

const toastSuccess = vi.fn()
const toastError = vi.fn()
vi.mock('sonner', () => ({
  toast: { success: (m: string) => toastSuccess(m), error: (m: string) => toastError(m) },
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, isLoading, hideArrow, ...props }: { children?: React.ReactNode; isLoading?: boolean; hideArrow?: boolean }) =>
    React.createElement('button', props, children),
}))
vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ checked, onCheckedChange, ...props }: { checked?: boolean; onCheckedChange?: () => void }) =>
    React.createElement('input', { type: 'checkbox', checked: Boolean(checked), onChange: () => onCheckedChange?.(), ...props }),
}))
vi.mock('@/components/ui/textarea', () => ({
  Textarea: (props: Record<string, unknown>) => React.createElement('textarea', props),
}))

import { ModalAvisarNoElegidos } from './ModalAvisarNoElegidos'

function candidato(id: string, nombre: string, status: LandlordCandidate['status'] = 'SUBMITTED'): LandlordCandidate {
  return {
    id,
    tenantName: nombre,
    tenantEmail: `${id}@example.com`,
    status,
    submittedAt: '2026-08-01T10:00:00.000Z',
  }
}

describe('<ModalAvisarNoElegidos>', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    approve.mockReset().mockResolvedValue(undefined)
    reject.mockReset().mockResolvedValue(undefined)
    toastSuccess.mockReset()
    toastError.mockReset()
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  const montar = (props: Partial<React.ComponentProps<typeof ModalAvisarNoElegidos>> = {}) => {
    const onListo = vi.fn()
    act(() =>
      root.render(
        <ModalAvisarNoElegidos
          elegido={candidato('a', 'Ana Gómez')}
          otros={[candidato('b', 'Bruno Díaz'), candidato('c', 'Clara Ruiz')]}
          onCerrar={vi.fn()}
          onListo={onListo}
          {...props}
        />,
      ),
    )
    return { onListo }
  }

  const confirmar = async () => {
    const boton = container.querySelector('[data-testid="confirmar-eleccion"]') as HTMLButtonElement
    await act(async () => {
      boton.click()
    })
  }

  it('aprueba al elegido y avisa a los demás', async () => {
    const { onListo } = montar()
    await confirmar()

    expect(approve).toHaveBeenCalledWith('a')
    expect(reject).toHaveBeenCalledTimes(2)
    expect(reject.mock.calls.map((c) => c[0]).sort()).toEqual(['b', 'c'])
    expect(onListo).toHaveBeenCalled()
  })

  it('si falla aprobar al elegido NO rechaza a nadie', () => {
    // Rechazar a los demás sin haber aprobado al ganador dejaría el inmueble
    // sin nadie y sin vuelta atrás.
    approve.mockRejectedValue(new Error('boom'))
    montar()
    return confirmar().then(() => {
      expect(reject).not.toHaveBeenCalled()
      expect(container.textContent).toContain('No le avisamos a nadie más')
    })
  })

  it('no dice «listo» cuando a alguien no le llegó: lo nombra', async () => {
    reject.mockImplementation((id: string) =>
      id === 'c' ? Promise.reject(new Error('smtp')) : Promise.resolve(undefined),
    )
    const { onListo } = montar()
    await confirmar()

    expect(toastSuccess).not.toHaveBeenCalled()
    expect(toastError).toHaveBeenCalled()
    expect(toastError.mock.calls[0][0]).toContain('Clara Ruiz')
    // y NO cierra: queda algo por hacer
    expect(onListo).not.toHaveBeenCalled()
  })

  it('al reintentar no vuelve a aprobar al elegido ni re-avisa a quien ya recibió', async () => {
    reject.mockImplementation((id: string) =>
      id === 'c' ? Promise.reject(new Error('smtp')) : Promise.resolve(undefined),
    )
    montar()
    await confirmar()

    expect(approve).toHaveBeenCalledTimes(1)
    reject.mockReset().mockResolvedValue(undefined)

    await confirmar()
    expect(approve).toHaveBeenCalledTimes(1) // no se repitió
    expect(reject).toHaveBeenCalledTimes(1)
    expect(reject.mock.calls[0][0]).toBe('c') // sólo el que falló
  })

  it('destildar a alguien lo deja fuera del aviso', async () => {
    montar()
    const casilla = container.querySelector('[data-testid="avisar-b"]') as HTMLInputElement
    act(() => casilla.click())
    await confirmar()

    expect(reject).toHaveBeenCalledTimes(1)
    expect(reject.mock.calls[0][0]).toBe('c')
  })

  it('a quien ya está rechazado o retirado no se le vuelve a avisar', async () => {
    montar({
      otros: [
        candidato('b', 'Bruno Díaz', 'REJECTED'),
        candidato('c', 'Clara Ruiz', 'WITHDRAWN'),
        candidato('d', 'Diana Paz'),
      ],
    })
    await confirmar()

    expect(reject).toHaveBeenCalledTimes(1)
    expect(reject.mock.calls[0][0]).toBe('d')
  })

  it('el mensaje que se manda es el que quedó en pantalla', async () => {
    montar({ otros: [candidato('b', 'Bruno Díaz')] })
    const area = container.querySelector('#mensaje-no-elegidos') as HTMLTextAreaElement
    expect(area.value).toContain('se asignó a otra')

    await confirmar()
    expect(reject.mock.calls[0][1]).toContain('se asignó a otra')
  })

  it('sin nadie más esperando, sólo aprueba', async () => {
    const { onListo } = montar({ otros: [] })
    expect(container.textContent).toContain('No hay nadie más esperando')
    await confirmar()
    expect(approve).toHaveBeenCalledWith('a')
    expect(reject).not.toHaveBeenCalled()
    expect(onListo).toHaveBeenCalled()
  })
})
