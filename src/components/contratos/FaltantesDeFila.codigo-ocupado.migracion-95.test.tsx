/**
 * CO-27 (QA-MIGRACION-95, 06-10-2026). Visto en el navegador con un archivo
 * Siigo (C08) cuya columna «Inmueble» trae sólo el código («9001»): las filas
 * pegan por código, pero si el inmueble ya está ocupado la fila decía «Sin
 * inmueble el contrato no se activa… créalo desde la dirección del archivo» y
 * ofrecía «El inmueble no está cargado — crearlo» con «9001» como dirección.
 * El inmueble SÍ estaba cargado: crearlo lo duplicaba sin dirección.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

vi.mock('@/lib/api/inmobiliaria.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/inmobiliaria.service')>(
    '@/lib/api/inmobiliaria.service',
  )
  return {
    ...actual,
    propietariosApi: { ...actual.propietariosApi, getAll: vi.fn() },
  }
})

vi.mock('@/lib/api/contracts.service', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/contracts.service')>(
    '@/lib/api/contracts.service',
  )
  return {
    ...actual,
    contractsApi: {
      migracion: {
        resolver: vi.fn(),
        crearInmueble: vi.fn(),
        registrarPropietario: vi.fn(),
        // El buscador manual del inmueble: `<ElegirInmueble>` lo pide al
        // montar para llenar el desplegable de «búscalo entre todos tus
        // inmuebles». Sin él acá, el mock devolvería `undefined` y la fila
        // entera reventaría en el render.
        buscarInmuebles: vi.fn().mockResolvedValue([]),
      },
    },
  }
})

import { type FilaDeMigracion } from '@/lib/api/contracts.service'
import { FaltantesDeFila } from './FaltantesDeFila'

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
  vi.restoreAllMocks()
})

function filaBase(over: Partial<FilaDeMigracion> = {}): FilaDeMigracion {
  return {
    id: 'f-1',
    lote: 'lote-1',
    fila: 0,
    datos: { direccion: 'Cra 1', inquilino: { nombre: 'Ana', correo: 'ana@x.co' } },
    propertyId: 'prop-1',
    propietarioId: null,
    tenantId: null,
    candidatos: [],
    estado: 'PENDIENTE',
    faltantes: [],
    contractId: null,
    overrides: [],
    ...over,
  }
}

function render(fila: FilaDeMigracion) {
  act(() => {
    root.render(<FaltantesDeFila fila={fila} onResuelta={() => {}} />)
  })
}


const boton = (texto: string) =>
  Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes(texto))

describe('CO-27 · inmueble ocupado y código suelto', () => {
  it('ocupado: no dice «sin inmueble» ni ofrece crearlo; ofrece elegir otro o seguir igual', () => {
    render(filaBase({ faltantes: ['inmueble_ocupado'], datos: { direccion: '9001', inquilino: { nombre: 'Valentina' } } as FilaDeMigracion['datos'] }))
    const ayuda = container.querySelector('[data-testid="elegir-inmueble-ayuda"]')?.textContent ?? ''
    expect(ayuda).toContain('Si este contrato es de OTRO inmueble')
    expect(ayuda).not.toContain('Sin inmueble el contrato no se activa')
    expect(boton('El inmueble no está cargado')).toBeUndefined()
    expect(boton('seguir igual')).toBeTruthy()
  })

  it('sin inmueble y con sólo un código: lo dice y no ofrece crear un inmueble con dirección «9001»', () => {
    render(filaBase({ faltantes: ['inmueble'], propertyId: null, datos: { direccion: '9001', inquilino: { nombre: 'Valentina' } } as FilaDeMigracion['datos'] }))
    const ayuda = container.querySelector('[data-testid="elegir-inmueble-ayuda"]')?.textContent ?? ''
    expect(ayuda).toContain('«9001»: es un código, no una dirección')
    expect(boton('El inmueble no está cargado')).toBeUndefined()
  })

  it('sin inmueble y con una dirección de verdad: crearlo sigue ahí', () => {
    render(filaBase({ faltantes: ['inmueble'], propertyId: null, datos: { direccion: 'CR 43A 1 50 AP 801', inquilino: { nombre: 'Valentina' } } as FilaDeMigracion['datos'] }))
    expect(boton('El inmueble no está cargado')).toBeTruthy()
  })
})
