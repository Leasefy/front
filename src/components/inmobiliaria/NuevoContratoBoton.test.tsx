/**
 * «Nuevo contrato» sólo aparece si se puede crear.
 *
 * 🔴 C4: el back exige `contratos:create` para crear un contrato. El botón se
 * dibujaba igual para un CONTADOR o un VIEWER, que armaban el contrato entero
 * y recién al enviar se comían un 403. El gate vive dentro del botón, así que
 * vale en todas las pantallas que lo montan.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { permisos, canAccess } = vi.hoisted(() => {
  const permisos = { puede: false }
  return { permisos, canAccess: vi.fn(() => permisos.puede) }
})

vi.mock('@/lib/hooks/usePermissions', () => ({
  usePermissions: () => ({ canAccess, isLoading: false }),
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}))
// El selector no se abre en estas pruebas; igual no sale a la red.
vi.mock('@/lib/api/applications.service', () => ({
  landlordApplicationsApi: { getAllCandidates: vi.fn().mockResolvedValue([]) },
}))
vi.mock('@/lib/api/contracts.service', () => ({
  contractsApi: { getMine: vi.fn().mockResolvedValue([]) },
}))

import { NuevoContratoBoton } from './SelectorPostulacion'

let contenedor: HTMLDivElement
let raiz: Root

beforeEach(() => {
  canAccess.mockClear()
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  raiz = createRoot(contenedor)
})

afterEach(() => {
  act(() => raiz.unmount())
  contenedor.remove()
})

function botonNuevo() {
  return [...contenedor.querySelectorAll('button')].find((b) => b.textContent?.includes('Nuevo contrato')) ?? null
}

describe('NuevoContratoBoton — gate de `contratos:create`', () => {
  it('sin permiso de crear (CONTADOR, VIEWER) no se dibuja', async () => {
    permisos.puede = false
    await act(async () => {
      raiz.render(<NuevoContratoBoton />)
    })
    expect(botonNuevo()).toBeNull()
    expect(canAccess).toHaveBeenCalledWith('contratos', 'create')
  })

  it('con permiso de crear, está', async () => {
    permisos.puede = true
    await act(async () => {
      raiz.render(<NuevoContratoBoton />)
    })
    expect(botonNuevo()).not.toBeNull()
  })
})
