/**
 * 🔴 ACT-09 (Nico, 05-10-2026): «construir el interruptor en /admin». Leasefy
 * deja el Piloto automático de UNA inmobiliaria en prueba, contratado o
 * apagado; el cambio pide un motivo (queda en la bitácora) y la pantalla dice
 * qué va a pasar y lo que respondió el back.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { adminApi } = vi.hoisted(() => ({ adminApi: vi.fn() }))
vi.mock('@/lib/admin/api', () => ({
  adminApi,
  ApiError: class extends Error {
    status: number
    body: unknown
    constructor(status: number, message: string, body?: unknown) {
      super(message)
      this.status = status
      this.body = body
    }
  },
}))

import PilotoDeLasInmobiliariasPage from './page'

const LAB = {
  tenant_id: '54d558b4-0ab9-445b-aa87-bfd7f53e1f34',
  legal_name: 'Inmobiliaria Laboratorio S.A.S.',
  estado: 'prueba',
  activo: true,
  detalle: 'Encendido · la prueba va hasta el 4 de noviembre de 2026.',
  plan: 'prueba',
  prueba_desde: '2026-10-05T15:00:00.000Z',
  prueba_hasta: '2026-11-04T15:00:00.000Z',
  apagado_en: null,
  motivo_apagado: null,
  updated_by: 'admin@inmobiliaria-lab.example.test',
  updated_at: '2026-10-05T15:00:00.000Z',
}
const OTRA = { ...LAB, tenant_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', legal_name: 'ZZ Otra', estado: 'contratado', activo: false, detalle: 'Contratado, todavía sin encender: lo prende un administrador de la inmobiliaria.' }

let host: HTMLDivElement
let root: Root
const q = (sel: string) => document.querySelector(sel)
const botonCon = (t: string) => [...document.querySelectorAll('button')].find((b) => b.textContent?.includes(t)) as HTMLButtonElement | undefined
const escribir = (el: HTMLTextAreaElement, v: string) => {
  const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!
  set.call(el, v)
  el.dispatchEvent(new Event('input', { bubbles: true }))
}
const esperar = () => act(async () => { await new Promise((r) => setTimeout(r, 0)) })

beforeEach(async () => {
  adminApi.mockReset()
  adminApi.mockImplementation(async (ruta: string, opciones?: { method?: string }) => {
    if (ruta === '/piloto' && !opciones?.method) return [LAB, OTRA]
    throw new Error(`inesperado ${ruta}`)
  })
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => root.render(<PilotoDeLasInmobiliariasPage />))
  await esperar()
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

describe('/admin/piloto — el Piloto automático de cada inmobiliaria', () => {
  it('lista cada inmobiliaria con su estado, si está encendido y cómo está hoy', () => {
    expect(q('[data-testid="admin-piloto-conteo"]')!.textContent).toBe(
      '2 inmobiliarias · 1 con el Piloto encendido · 1 en prueba · 1 contratado · 0 apagado por Leasefy',
    )
    const fila = q(`[data-testid="admin-piloto-fila-${LAB.tenant_id}"]`)!
    expect(fila.textContent).toContain('Inmobiliaria Laboratorio S.A.S.')
    expect(fila.textContent).toContain('En prueba')
    expect(fila.textContent).toContain('encendido')
    expect(q(`[data-testid="admin-piloto-detalle-${OTRA.tenant_id}"]`)!.textContent).toContain('Contratado, todavía sin encender')
  })

  it('🔴 apagarla pide un motivo y dice qué va a pasar; el PATCH lleva el estado y el motivo recortado', async () => {
    adminApi.mockImplementation(async (ruta: string, opciones?: { method?: string; body?: unknown }) => {
      if (opciones?.method === 'PATCH') return { ...LAB, estado: 'apagado', activo: false, detalle: 'Apagado por Leasefy: la inmobiliaria no lo puede prender.' }
      return [LAB, OTRA]
    })
    await act(async () => (q(`[data-testid="admin-piloto-apagado-${LAB.tenant_id}"]`) as HTMLButtonElement).click())
    const dialogo = q('[data-testid="admin-piloto-confirmar"]')!
    expect(dialogo.textContent).toContain('¿Dejar el Piloto de Inmobiliaria Laboratorio S.A.S. en «Apagado por Leasefy»?')
    expect(dialogo.textContent).toContain('su administrador no lo puede volver a prender')
    const guardar = q('[data-testid="admin-piloto-guardar"]') as HTMLButtonElement
    expect(guardar.disabled).toBe(true)
    await act(async () => escribir(q('[data-testid="admin-piloto-motivo"]') as HTMLTextAreaElement, '  No pagó el Piloto.  '))
    expect(guardar.disabled).toBe(false)
    await act(async () => guardar.click())
    await esperar()
    expect(adminApi).toHaveBeenCalledWith(`/piloto/${LAB.tenant_id}`, { method: 'PATCH', body: { estado: 'apagado', motivo: 'No pagó el Piloto.' } })
    expect(q('[data-testid="admin-piloto-hecho"]')!.textContent).toContain('Apagado por Leasefy: la inmobiliaria no lo puede prender.')
    expect(q('[data-testid="admin-piloto-confirmar"]')).toBeNull()
  })

  it('si el back no lo guarda, lo dice dentro del diálogo y no lo cierra', async () => {
    adminApi.mockImplementation(async (_ruta: string, opciones?: { method?: string }) => {
      if (opciones?.method === 'PATCH') {
        const e = new Error('No se cambió el Piloto automático: no pudimos guardarlo junto con el registro de quién lo cambió.') as Error & { status: number }
        e.status = 503
        throw e
      }
      return [LAB, OTRA]
    })
    await act(async () => (q(`[data-testid="admin-piloto-contratado-${LAB.tenant_id}"]`) as HTMLButtonElement).click())
    await act(async () => escribir(q('[data-testid="admin-piloto-motivo"]') as HTMLTextAreaElement, 'Firmó el contrato del Piloto.'))
    await act(async () => (q('[data-testid="admin-piloto-guardar"]') as HTMLButtonElement).click())
    await esperar()
    expect(q('[data-testid="admin-piloto-fallo"]')).not.toBeNull()
    expect(q('[data-testid="admin-piloto-confirmar"]')).not.toBeNull()
    expect(botonCon('Cancelar')).toBeDefined()
  })
})
