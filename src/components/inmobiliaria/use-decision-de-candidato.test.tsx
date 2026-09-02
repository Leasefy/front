/**
 * @vitest-environment happy-dom
 *
 * La regla que estas pruebas cuidan: **aprobar a uno deja a los demás
 * esperando una respuesta que se les prometió.** Estaba escrita dentro de una
 * pantalla; ahora vive acá y la usan las dos que deciden sobre un candidato.
 * Si se rompe, alguien queda esperando para siempre y nadie se entera.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import type { LandlordCandidate } from '@/lib/api/applications.types'

const approve = vi.fn()
const reject = vi.fn()
const requestInfo = vi.fn()
const preapprove = vi.fn()
vi.mock('@/lib/api/applications.service', () => ({
  landlordApplicationsApi: {
    approve: (...a: unknown[]) => approve(...a),
    reject: (...a: unknown[]) => reject(...a),
    requestInfo: (...a: unknown[]) => requestInfo(...a),
    preapprove: (...a: unknown[]) => preapprove(...a),
    getEvaluationResult: vi.fn().mockRejectedValue(new Error('404 not found')),
    triggerReevaluation: vi.fn(),
    triggerSmartMatching: vi.fn(),
  },
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))
vi.mock('@/lib/hooks/useDocuments', () => ({
  useCandidateDocuments: () => ({ documents: [], isLoading: false, error: null }),
}))
vi.mock('@/lib/hooks/useContracts', () => ({
  useContractByApplication: () => ({ contract: null }),
}))
vi.mock('@/lib/api/agent-credits.service', () => ({
  agentCreditsApi: { getBalance: vi.fn().mockResolvedValue({ remaining: 0 }) },
}))
vi.mock('@/components/messages/ChatThread', () => ({
  ChatThread: () => React.createElement('div', null, 'chat'),
}))

import { useDecisionDeCandidato } from './use-decision-de-candidato'

function candidato(
  id: string,
  nombre: string,
  status: LandlordCandidate['status'] = 'SUBMITTED',
): LandlordCandidate {
  return {
    id,
    tenantName: nombre,
    tenantEmail: `${id}@example.com`,
    status,
    submittedAt: '2026-08-01T10:00:00.000Z',
  }
}

const ANA = candidato('a', 'Ana Gómez')

/** Banco de pruebas: expone `abrir` y `pedirAccion` como botones. */
function Banco({
  hermanos,
  onCambio,
}: {
  hermanos?: LandlordCandidate[]
  onCambio: () => void
}) {
  const { abrir, pedirAccion, cajon } = useDecisionDeCandidato({ hermanos, onCambio })
  return (
    <div>
      <button data-testid="abrir" onClick={() => abrir(ANA)}>
        abrir
      </button>
      <button data-testid="aprobar" onClick={() => pedirAccion('approve', ANA)}>
        aprobar
      </button>
      <button data-testid="rechazar" onClick={() => pedirAccion('reject', ANA)}>
        rechazar
      </button>
      {cajon}
    </div>
  )
}

describe('useDecisionDeCandidato', () => {
  let container: HTMLDivElement
  let root: Root
  const onCambio = vi.fn()

  beforeEach(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    approve.mockReset().mockResolvedValue(undefined)
    reject.mockReset().mockResolvedValue(undefined)
    requestInfo.mockReset().mockResolvedValue(undefined)
    preapprove.mockReset().mockResolvedValue(undefined)
    onCambio.mockReset()
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  async function montar(hermanos?: LandlordCandidate[]) {
    await act(async () => {
      root.render(<Banco hermanos={hermanos} onCambio={onCambio} />)
    })
  }

  const tocar = async (testid: string) => {
    const boton = container.querySelector<HTMLButtonElement>(`[data-testid="${testid}"]`)
    await act(async () => boton!.click())
  }

  it('aprobar con otros esperando pasa por el aviso a los no elegidos', async () => {
    await montar([ANA, candidato('b', 'Bruno Díaz'), candidato('c', 'Clara Ruiz')])
    await tocar('aprobar')

    // El modal del paso 10, no el formulario suelto.
    expect(document.body.textContent).toContain('Eliges a Ana Gómez')
    expect(document.body.textContent).toContain('Avisarle a quienes no quedaron')
    // Todavía no se aprobó a nadie: eso lo hace el modal al confirmar.
    expect(approve).not.toHaveBeenCalled()
  })

  it('aprobar sin nadie más esperando va derecho al formulario', async () => {
    // Los rechazados y los retirados ya recibieron respuesta.
    await montar([ANA, candidato('b', 'Bruno Díaz', 'REJECTED'), candidato('c', 'Clara Ruiz', 'WITHDRAWN')])
    await tocar('aprobar')

    expect(document.body.textContent).toContain('Aprobar candidato')
    expect(document.body.textContent).not.toContain('Avisarle a quienes no quedaron')
  })

  it('sin hermanos —una pantalla que mezcla inmuebles— tampoco avisa a nadie', async () => {
    await montar(undefined)
    await tocar('aprobar')

    expect(document.body.textContent).toContain('Aprobar candidato')
    expect(document.body.textContent).not.toContain('Avisarle a quienes no quedaron')
  })

  it('rechazar pide el motivo, lo manda y avisa que hay que releer', async () => {
    await montar([ANA])
    await tocar('rechazar')
    expect(document.body.textContent).toContain('Rechazar postulación')

    const motivo = document.querySelector('textarea')!
    await act(async () => {
      // React escucha el input nativo a través de su propio setter.
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype,
        'value',
      )!.set!
      setter.call(motivo, 'No acredita ingresos')
      motivo.dispatchEvent(new Event('input', { bubbles: true }))
    })

    const confirmar = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Rechazar',
    )
    await act(async () => confirmar!.click())

    expect(reject).toHaveBeenCalledWith('a', 'No acredita ingresos')
    expect(onCambio).toHaveBeenCalled()
  })

  it('pedir una acción desde el cajón lo cierra antes de abrir el modal', async () => {
    await montar([ANA])
    await tocar('abrir')
    expect(document.querySelector('[role="dialog"]')).not.toBeNull()

    const rechazar = Array.from(
      document.querySelectorAll<HTMLButtonElement>('[role="dialog"] button'),
    ).find((b) => b.textContent?.trim() === 'Rechazar')
    expect(rechazar).toBeDefined()
    await act(async () => rechazar!.click())

    // Dos capas de scroll una sobre otra es lo que se evita: queda el modal.
    expect(document.body.textContent).toContain('Rechazar postulación')
  })
})
