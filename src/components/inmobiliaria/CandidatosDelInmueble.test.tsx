/**
 * @vitest-environment happy-dom
 *
 * La tarjeta enseñaba quién se había postulado y ahí se acababa: para ver a
 * una persona había que irse a la otra pantalla y buscarla de nuevo. Estas
 * pruebas fijan lo contrario — que el clic abre a ESA persona— y que la
 * tarjeta no anuncie a alguien que después esconde.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import type { LandlordCandidate } from '@/lib/api/applications.types'

const getCandidates = vi.fn()
vi.mock('@/lib/api/applications.service', () => ({
  landlordApplicationsApi: {
    getCandidates: (...a: unknown[]) => getCandidates(...a),
    getEvaluationResult: vi.fn().mockRejectedValue(new Error('404 not found')),
    triggerReevaluation: vi.fn(),
    triggerSmartMatching: vi.fn(),
    preapprove: vi.fn(),
    approve: vi.fn(),
    reject: vi.fn(),
    requestInfo: vi.fn(),
  },
}))

// Fronteras de red del cajón: acá sólo interesa que ABRA con la persona
// correcta, no lo que el agente conteste.
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

import { CandidatosDelInmueble } from './CandidatosDelInmueble'

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

describe('<CandidatosDelInmueble>', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    getCandidates.mockReset()
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  /** Monta y deja que resuelva la carga de candidatos. */
  async function montar(lista: LandlordCandidate[]) {
    getCandidates.mockResolvedValue(lista)
    await act(async () => {
      root.render(<CandidatosDelInmueble propertyId="prop-1" consignacionId="cons-1" />)
    })
  }

  function filas() {
    return Array.from(container.querySelectorAll('li button')) as HTMLButtonElement[]
  }

  it('abre el cajón de la persona en la que se hace clic', async () => {
    await montar([
      candidato('a', 'Ana Gómez'),
      candidato('b', 'Bruno Díaz'),
      candidato('c', 'Clara Ruiz'),
    ])

    // Antes de tocar nada no hay cajón: el diálogo se monta en un portal
    // fuera del contenedor, así que se mira el documento entero.
    expect(document.querySelector('[role="dialog"]')).toBeNull()

    const bruno = filas().find((b) => b.textContent?.includes('Bruno Díaz'))
    expect(bruno).toBeDefined()
    await act(async () => {
      bruno!.click()
    })

    const cajon = document.querySelector('[role="dialog"]')
    expect(cajon).not.toBeNull()
    // La persona abierta es la del clic, no la primera de la lista.
    expect(cajon!.textContent).toContain('Bruno Díaz')
    expect(cajon!.textContent).toContain('b@example.com')
    expect(cajon!.textContent).not.toContain('Ana Gómez')
  })

  it('cada fila es alcanzable con teclado y se anuncia por su nombre', async () => {
    await montar([candidato('a', 'Ana Gómez')])

    const [fila] = filas()
    expect(fila.tagName).toBe('BUTTON')
    expect(fila.getAttribute('aria-label')).toBe('Ver la postulación de Ana Gómez')
  })

  it('muestra primero a quien espera decisión, aunque el servidor la mande al final', async () => {
    // El encabezado dice «1 espera tu decisión»: si esa persona no está entre
    // las tres que se enseñan, la tarjeta pide una acción sobre alguien que
    // esconde.
    await montar([
      candidato('a', 'Ana Gómez', 'APPROVED'),
      candidato('b', 'Bruno Díaz', 'REJECTED'),
      candidato('c', 'Clara Ruiz', 'REJECTED'),
      candidato('d', 'Diego Peña', 'SUBMITTED'),
    ])

    expect(container.textContent).toContain('1 espera tu decisión')
    const nombres = filas().map((b) => b.querySelector('span span')?.textContent)
    expect(nombres).toHaveLength(3)
    expect(nombres[0]).toBe('Diego Peña')
  })

  it('con más de tres, el pie enlaza a la lista completa', async () => {
    await montar([
      candidato('a', 'Ana Gómez'),
      candidato('b', 'Bruno Díaz'),
      candidato('c', 'Clara Ruiz'),
      candidato('d', 'Diego Peña'),
    ])

    const enlace = container.querySelector('a')
    expect(enlace?.textContent).toContain('Ver los 4 candidatos')
    expect(enlace?.getAttribute('href')).toBe(
      '/panel/inmobiliaria/inmuebles/cons-1/candidatos',
    )
  })
})
