/**
 * /admin/chat-feedback — los pulgares del chat en la tabla del admin (20-10-2026,
 * Nico: «que las tablas tengan paginación, filtros y todo lo que tienen las
 * tablas de la plataforma»): pestañas por veredicto, la inmobiliaria con su
 * nombre y la respuesta completa en un cajón.
 *
 * createRoot + act (convención del repo, sin RTL).
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

import type { ChatFeedbackResponse, ChatFeedbackRow } from '@/lib/admin/agent-api'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const estado = vi.hoisted(() => ({
  search: '' as string,
  replace: vi.fn(),
  pedidos: [] as unknown[],
  respuesta: null as unknown,
}))

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(estado.search),
  useRouter: () => ({ replace: estado.replace, push: vi.fn() }),
  usePathname: () => '/admin/chat-feedback',
}))

vi.mock('@/lib/admin/agent-api', () => ({
  getChatFeedback: vi.fn(async (f: unknown) => {
    estado.pedidos.push(f)
    return estado.respuesta
  }),
}))

vi.mock('@/lib/admin/use-tenant-options', () => ({
  useTenantOptions: () => ({
    data: [{ tenant_id: '11111111-1111-4111-8111-111111111111', legal_name: 'Inmobiliaria Prueba S.A.S.' }],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}))

import ChatFeedbackPage from './page'

const AG = '11111111-1111-4111-8111-111111111111'

function fila(over: Partial<ChatFeedbackRow> = {}): ChatFeedbackRow {
  return {
    id: 'f1',
    agencyId: AG,
    turnId: 't1',
    pregunta: '¿Cuánto debe el contrato 145?',
    respuesta: 'Debe $ 1.027.018 de octubre.',
    veredicto: 'down',
    comentario: 'Esperaba también los intereses',
    cifraMal: true,
    herramientas: ['cartera_erp'],
    usuario: 'asesora@inmobiliaria.example.test',
    leccionId: null,
    createdAt: '2026-10-20T15:00:00.000Z',
    ...over,
  }
}

const RESPUESTA: ChatFeedbackResponse = {
  filas: [
    fila(),
    fila({ id: 'f2', veredicto: 'up', cifraMal: false, comentario: null, pregunta: '¿Qué contratos vencen?', createdAt: '2026-10-19T15:00:00.000Z' }),
  ],
  semanas: [{ semana: '2026-10-19T00:00:00.000Z', total: 2, arriba: 1, porcentajeArriba: 50 }],
  generadoEn: '2026-10-20T16:00:00.000Z',
}

let host: HTMLDivElement
let root: Root
const q = (sel: string) => document.querySelector(sel)
const esperar = () => act(async () => { await new Promise((r) => setTimeout(r, 0)) })

beforeEach(async () => {
  estado.search = ''
  estado.pedidos = []
  estado.respuesta = RESPUESTA
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => root.render(<ChatFeedbackPage />))
  await esperar()
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

describe('/admin/chat-feedback — pulgares del chat en la tabla', () => {
  it('pide las últimas 200 y muestra la inmobiliaria con su nombre, no con el pedazo del id', () => {
    expect(estado.pedidos[0]).toMatchObject({ limit: 200 })
    const tabla = host.querySelector('table')!
    expect(tabla.textContent).toContain('Inmobiliaria Prueba S.A.S.')
    expect(tabla.textContent).not.toContain('Inmobiliaria 11111111')
    expect(host.textContent).toContain('50 %')
  })

  it('las pestañas cuentan por veredicto', () => {
    const ver = q('[aria-label="Ver"]')!.textContent!.replace(/\s+/g, ' ')
    expect(ver).toContain('Pulgar abajo1')
    expect(ver).toContain('Pulgar arriba1')
    expect(ver).toContain('La cifra está mal1')
  })

  it('🔴 tocar la fila abre el cajón con la respuesta completa del chat', async () => {
    const primera = host.querySelector('table tbody tr') as HTMLTableRowElement
    await act(async () => primera.click())
    await esperar()
    const cajon = q('[data-testid="detalle-del-pulgar"]')!
    expect(cajon.textContent).toContain('Debe $ 1.027.018 de octubre.')
    expect(cajon.textContent).toContain('Esperaba también los intereses')
    expect(cajon.textContent).toContain('Inmobiliaria Prueba S.A.S.')
  })
})
