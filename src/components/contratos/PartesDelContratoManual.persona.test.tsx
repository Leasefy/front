/**
 * QA-CONT-95 (04-10-2026) — «Usar plantilla» con «Ya es inquilino».
 *
 * 🔴 En el navegador, con Iván elegido en «Ya es inquilino», la plantilla nunca
 * armaba: «Falta el contenido mínimo del literal a)… arrendatarioNombre,
 * arrendatarioDocumento». El borrador sólo llevaba los datos de un inquilino
 * «Nuevo». Las partes ahora le cuentan a la página quién es la persona elegida.
 */
import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

vi.mock('@/lib/api/inmobiliaria.service', () => ({
  consignacionesApi: { getAll: vi.fn().mockResolvedValue([]) },
}))
vi.mock('@/lib/hooks/use-inquilinos', () => ({
  useInquilinos: () => ({
    inquilinos: [
      { tenantId: 't-ivan', nombre: 'Iván Pérez', email: 'ivan@x.co', telefono: '300', documento: '1037111222', tieneCuentaDelPortal: true, arriendos: [] },
    ],
    cargando: false,
  }),
}))
vi.mock('@/lib/api/inquilinos.service', () => ({ cuentaDelPortal: (q: { tenantId: string }) => q.tenantId }))

import { PartesDelContratoManual, PARTES_VACIAS } from './PartesDelContratoManual'

void React
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
})

describe('QA-CONT-95 · la persona de «Ya es inquilino» llega a la página', () => {
  it('🔴 con un inquilino elegido, cuenta su nombre y su documento (los pide la plantilla)', () => {
    const onPersona = vi.fn()
    act(() =>
      root.render(
        <PartesDelContratoManual
          valor={{ ...PARTES_VACIAS, inquilino: { modo: 'existente', tenantId: 't-ivan' } }}
          onCambio={vi.fn()}
          onPersonaDelInquilino={onPersona}
        />,
      ),
    )
    expect(onPersona).toHaveBeenLastCalledWith({ nombre: 'Iván Pérez', documento: '1037111222', correo: 'ivan@x.co', telefono: '300' })
  })
})
