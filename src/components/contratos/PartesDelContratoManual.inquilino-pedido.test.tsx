/**
 * QA-INQ I-29 (03-10-2026): «Crear su contrato» desde Inquilinos llega con la
 * persona (`?inquilino=`). Con cuenta queda elegida en «Ya es inquilino»; sin
 * cuenta (el contrato pide una cuenta para eso) pasa a «Nuevo» con sus datos
 * escritos, sin contar como «tocado» (no pinta errores de lo demás).
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { lista } = vi.hoisted(() => ({ lista: { inquilinos: [] as unknown[], cargando: false } }))
vi.mock('@/lib/api/inmobiliaria.service', () => ({ consignacionesApi: { getAll: vi.fn().mockResolvedValue([]) } }))
vi.mock('@/lib/hooks/use-inquilinos', () => ({
  useInquilinos: () => ({ inquilinos: lista.inquilinos, cargando: lista.cargando }),
}))
vi.mock('@/components/ui/combobox', () => ({ Combobox: () => null }))

import { PARTES_VACIAS, PartesDelContratoManual, type PartesManuales } from './PartesDelContratoManual'

const CUENTA = '5b0c8a64-1d1e-4c39-9d0f-3f2b9a1c7e21'
let host: HTMLDivElement
let root: Root

beforeEach(() => {
  lista.inquilinos = [
    { tenantId: CUENTA, nombre: 'Sofía Vélez', email: 's@correo.co', telefono: null, documento: '1', arriendos: [] },
    { tenantId: 'doc:55', nombre: 'Tomás Gil', email: null, telefono: '3001234567', documento: '55', arriendos: [] },
  ]
  lista.cargando = false
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

function montar(pedido: string) {
  const onCambio = vi.fn()
  const valor: PartesManuales = { ...PARTES_VACIAS, inquilino: { modo: 'existente', tenantId: pedido } }
  act(() => {
    root.render(<PartesDelContratoManual valor={valor} onCambio={onCambio} inquilinoPedido={pedido} />)
  })
  return onCambio
}

describe('PartesDelContratoManual · la persona pedida', () => {
  it('con cuenta, queda elegida tal cual (no se cambia nada)', () => {
    const onCambio = montar(CUENTA)
    expect(onCambio).not.toHaveBeenCalled()
  })

  it('🔴 sin cuenta, pasa a «Nuevo» con sus datos escritos, como cambio automático', () => {
    const onCambio = montar('doc:55')
    expect(onCambio).toHaveBeenCalledWith(
      {
        propertyId: '',
        inquilino: { modo: 'nuevo', nombre: 'Tomás Gil', documento: '55', correo: '', telefono: '3001234567' },
      },
      { automatico: true },
    )
  })

  it('si no está en la lista, no deja elegido a alguien que no se ve', () => {
    const onCambio = montar('doc:no-existe')
    expect(onCambio).toHaveBeenCalledWith(
      { propertyId: '', inquilino: { modo: 'existente', tenantId: '' } },
      { automatico: true },
    )
  })
})
