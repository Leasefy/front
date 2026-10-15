/**
 * PropuestaProceduralPendiente.test.tsx — una propuesta de procedimiento pendiente (13-07, Tarea 3).
 *
 * Qué prueba: texto y «Propuesto el …» sin quién la propuso (B-5); botones solo con procedural-approve; confirmar sin
 * diálogo y rechazar tras un AlertDialog; cada desenlace por su razón sin la razón técnica; con datos de ejemplo nada
 * escribe. Arnés: molde de 13-05. Marcador [N13:*] en el TÍTULO.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'

import type { EstadoNaira } from '@/lib/api/naira/cliente'
import { RESPUESTA_ESTRICTA_POR_ENDPOINT, type NairaMemoryProposal } from '@/lib/api/naira/contrato'
import { EJEMPLOS_DE_NAIRA } from '@/lib/data/mock-naira'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { resolver } = vi.hoisted(() => ({ resolver: vi.fn() }))

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ agency: { id: 'AGY-1' } }) }))
vi.mock('@/lib/api/naira/cliente', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/naira/cliente')>()),
  resolverPropuestaProcedural: resolver,
}))

import { ProveedorDeOrigen } from './OrigenDeNaira'
import { PropuestaProceduralPendiente } from './PropuestaProceduralPendiente'

const PROPUESTA: NairaMemoryProposal = {
  id: 'PROP-PROC-1',
  proposedBy: { kind: 'user', userId: 'USR-B5-PROPUSO' },
  proposedAt: '2000-01-02T14:00:00.000Z',
  text: 'PROC-TEXTO-1 (ejemplo)',
}
const ESTRICTO = RESPUESTA_ESTRICTA_POR_ENDPOINT['memoria.vista']
const CONFIRMADA = { kind: 'confirmed' as const, ...EJEMPLOS_DE_NAIRA['memoria.corregir'] }

let host: HTMLDivElement
let root: Root
const onDesenlace = vi.fn()

async function esperar() {
  await act(async () => {
    for (let i = 0; i < 5; i++) await Promise.resolve()
  })
}

async function montar(puedeResolver = true, origen: 'agente' | 'ejemplo' = 'agente') {
  await act(async () => {
    root.render(
      <ProveedorDeOrigen origen={origen}>
        <ul>
          <PropuestaProceduralPendiente propuesta={PROPUESTA} puedeResolver={puedeResolver} onDesenlace={onDesenlace} />
        </ul>
      </ProveedorDeOrigen>,
    )
  })
  await esperar()
}

async function clic(el: Element | null | undefined) {
  await act(async () => {
    ;(el as HTMLElement).click()
  })
  await esperar()
}

type Diferida = { resolver: (e: EstadoNaira<unknown>) => void }
function diferida(): Diferida {
  const d: Diferida = { resolver: () => undefined }
  resolver.mockImplementationOnce(() => new Promise((r) => (d.resolver = r)))
  return d
}

const confirmar = () => document.querySelector('[data-testid="naira-confirmar-procedimiento"]') as HTMLButtonElement
const rechazar = () => document.querySelector('[data-testid="naira-rechazar-procedimiento"]') as HTMLButtonElement
const alerta = () => document.querySelector('[role="alertdialog"]')
const mensaje = () => document.querySelector('li[data-naira-propuesta-procedural] [role="status"]')

async function confirmarCon(e: EstadoNaira<unknown>) {
  const d = diferida()
  await clic(confirmar())
  await act(async () => d.resolver(e))
  await esperar()
}

beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  resolver.mockReset()
  onDesenlace.mockReset()
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
  document.body.innerHTML = ''
})

describe('PropuestaProceduralPendiente', () => {
  it('[N13:fixture-es-contrato] la propuesta pasa el esquema ESTRICTO de memoria.vista', () => {
    const v = { snapshot: { revision: '1' }, items: [], pendingProposals: [PROPUESTA], generatedAt: '2000-01-03T12:00:00.000Z' }
    expect(() => ESTRICTO.parse(v)).not.toThrow()
    expect(() => ESTRICTO.parse({ ...v, pendingProposals: [{ ...PROPUESTA, proposedAtt: 'x' }] })).toThrow()
  })

  it('[N13:control-positivo] texto, «Propuesto el …» y los dos botones', async () => {
    await montar()
    const li = document.querySelector('li[data-naira-propuesta-procedural]')
    expect(li?.textContent).toContain('PROC-TEXTO-1 (ejemplo)')
    expect(li?.textContent).toContain('Propuesto el')
    expect(li?.querySelector('time[datetime="2000-01-02T14:00:00.000Z"]')).not.toBeNull()
    expect(confirmar().textContent).toBe('Confirmar procedimiento')
    expect(rechazar().textContent).toBe('Rechazar procedimiento')
  })

  it('[N13:b5-sin-persona] nunca quién la propuso (ni con el diálogo abierto ni tras resolver)', async () => {
    await montar()
    expect(document.body.innerHTML).not.toContain('USR-B5-PROPUSO')
    expect(document.body.innerHTML).not.toContain('userId')
    await clic(rechazar())
    expect(document.body.innerHTML).not.toContain('USR-B5-PROPUSO')
    resolver.mockResolvedValueOnce({ kind: 'ok', data: { kind: 'rejected', proposalId: 'PROP-PROC-1' }, origen: 'agente' })
    await clic(document.querySelector('[data-testid="naira-confirmar-rechazo-procedimiento"]'))
    expect(document.body.innerHTML).not.toContain('USR-B5-PROPUSO')
    expect(document.body.innerHTML).not.toContain('userId')
  })

  it('[N13:resolver-por-permiso] sin procedural-approve no hay botones', async () => {
    await montar(false)
    expect(confirmar()).toBeNull()
    expect(rechazar()).toBeNull()
  })

  it('[N13:confirmar-sin-dialogo] confirmar va directo, una vez', async () => {
    await montar()
    const d = diferida()
    await clic(confirmar())
    expect(resolver).toHaveBeenCalledTimes(1)
    expect(resolver).toHaveBeenCalledWith('AGY-1', 'PROP-PROC-1', 'confirm')
    expect(alerta()).toBeNull()
    expect(confirmar().disabled).toBe(true)
    expect(rechazar().disabled).toBe(true)
    await clic(confirmar())
    expect(resolver).toHaveBeenCalledTimes(1)
    await act(async () => d.resolver({ kind: 'ok', data: CONFIRMADA, origen: 'agente' }))
    await esperar()
    expect(onDesenlace).toHaveBeenCalledWith({ kind: 'hecho' }, 'confirm')
  })

  it('[N13:rechazar-con-dialogo] rechazar pasa por un AlertDialog', async () => {
    await montar()
    await clic(rechazar())
    expect(resolver).not.toHaveBeenCalled()
    expect(alerta()?.textContent).toContain('¿Rechazar esta propuesta?')
    expect(alerta()?.textContent).toContain('Naira no guardará este procedimiento.')
    await clic(Array.from(document.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Volver'))
    expect(resolver).not.toHaveBeenCalled()
    await clic(rechazar())
    resolver.mockResolvedValueOnce({ kind: 'ok', data: { kind: 'rejected', proposalId: 'PROP-PROC-1' }, origen: 'agente' })
    await clic(document.querySelector('[data-testid="naira-confirmar-rechazo-procedimiento"]'))
    expect(resolver).toHaveBeenCalledTimes(1)
    expect(resolver).toHaveBeenCalledWith('AGY-1', 'PROP-PROC-1', 'reject')
    expect(onDesenlace).toHaveBeenCalledWith({ kind: 'hecho' }, 'reject')
  })

  it('[N13:resolver-por-razon] cada desenlace por su razón, sin la razón técnica', async () => {
    await montar()
    await confirmarCon({ kind: 'conflicto', razon: 'already_resolved' })
    expect(onDesenlace).toHaveBeenLastCalledWith({ kind: 'recargar', aviso: 'propuesta_ya_resuelta' }, 'confirm')
    expect(document.body.innerHTML).not.toContain('already_resolved')
    await confirmarCon({ kind: 'no_encontrado' })
    expect(onDesenlace).toHaveBeenLastCalledWith({ kind: 'recargar', aviso: 'propuesta_ya_no_esta' }, 'confirm')
    onDesenlace.mockReset()
    await confirmarCon({ kind: 'rechazado', razon: 'pii:email' })
    expect(mensaje()?.textContent).toBe('Tiene un correo. Recházala y pide que la escriban sin ese dato.')
    expect(document.body.innerHTML).not.toContain('pii:email')
    await confirmarCon({ kind: 'no_disponible' })
    expect(mensaje()?.textContent).toBe('No pudimos resolver la propuesta. Intenta de nuevo.')
    expect(confirmar().disabled).toBe(false)
    expect(rechazar().disabled).toBe(false)
    await confirmarCon({ kind: 'sin_permiso' })
    expect(confirmar().disabled).toBe(true)
    expect(rechazar().disabled).toBe(true)
    expect(mensaje()?.textContent).toBe('No tienes permiso para esta acción.')
    expect(onDesenlace).not.toHaveBeenCalled()
  })

  it('[N13:simulado-visible] con datos de ejemplo los botones están apagados y nada escribe', async () => {
    await montar(true, 'ejemplo')
    expect(confirmar().disabled).toBe(true)
    expect(rechazar().disabled).toBe(true)
    expect(document.body.textContent).toContain('Datos de ejemplo: no se puede cambiar la memoria.')
    await clic(confirmar())
    await clic(rechazar())
    expect(resolver).not.toHaveBeenCalled()
    expect(alerta()).toBeNull()
  })
})
