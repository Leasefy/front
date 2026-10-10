/**
 * T-0156 / WU-2 — todo faltante que el back puede emitir en la migración de
 * contratos se explica en español, dice qué fila afecta y tiene salida en el
 * lugar (o dice con claridad que sólo se arregla en el archivo).
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
  return { ...actual, propietariosApi: { ...actual.propietariosApi, getAll: vi.fn() } }
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
        buscarInmuebles: vi.fn().mockResolvedValue([]),
        descartar: vi.fn().mockResolvedValue({}),
      },
    },
  }
})

import { contractsApi, type FilaDeMigracion } from '@/lib/api/contracts.service'
import { celdaDelFaltante, explicacionDe, FaltantesDeFila } from './FaltantesDeFila'

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
    fila: 4,
    datos: { direccion: 'Cra 1 # 2-3', inquilino: { nombre: 'Ana', correo: 'ana@x.co' } },
    propertyId: 'prop-1',
    propietarioId: null,
    tenantId: null,
    candidatos: [],
    estado: 'PENDIENTE',
    faltantes: [],
    contractId: null,
    overrides: [],
    ...over,
  } as FilaDeMigracion
}

function render(fila: FilaDeMigracion) {
  act(() => {
    root.render(<FaltantesDeFila fila={fila} onResuelta={() => {}} />)
  })
}

/** Cada código de `MOTIVOS_DE_BLOQUEO` del back (origin/main, T-0155). */
const CODIGOS_DEL_BACK = [
  'inmueble',
  'inmueble_ambiguo',
  'inmueble_codigo',
  'inmueble_en_venta',
  'inmueble_ocupado',
  'propietario',
  'inquilino_correo',
  'inquilino_correo_invalido',
  'inquilino_nombre',
  'inquilino_documento_ajeno',
  'fechas',
  'cartera_antes_del_inicio',
  'canon',
  'canon_con_centavos',
  'dia_de_pago',
  'uso',
  'reparto_del_canon',
  'consecutivo_repetido',
  'verificacion_difiere',
  'otros',
]

describe('T-0156 — cada faltante del back se explica', () => {
  it.each(CODIGOS_DEL_BACK)('%s tiene título y explicación propios, no el código crudo', (codigo) => {
    const e = explicacionDe(filaBase(), codigo)
    expect(e?.titulo).toBeTruthy()
    expect(e?.titulo).not.toBe(codigo)
    expect(e?.porque.length ?? 0).toBeGreaterThan(10)
  })

  it('un código que nadie conoce no se pinta crudo: se dice y se nombra', () => {
    render(filaBase({ faltantes: ['algo_nuevo' as never] }))
    expect(container.textContent).toContain('Falta un dato que esta versión todavía no sabe nombrar')
    expect(container.textContent).toContain('algo_nuevo')
  })

  it('verificacion_difiere explica que nada se corrigió solo', () => {
    render(filaBase({ faltantes: ['verificacion_difiere' as never], estado: 'ACTIVADO' }))
    expect(container.textContent).toContain('no coincide con el archivo')
  })
})

describe('T-0156 — consecutivo_repetido se puede resolver en el lugar', () => {
  it('«Descartar esta fila» descarta la fila', () => {
    render(
      filaBase({
        faltantes: ['consecutivo_repetido'],
        datos: { direccion: 'x', externalId: '1234', inquilino: { nombre: 'A', correo: 'a@x.co' } } as never,
      }),
    )
    expect(container.querySelector('[data-testid="celda-de-consecutivo_repetido"]')?.textContent).toContain('1234')
    const boton = container.querySelector('[data-testid="descartar-fila-repetida"]') as HTMLButtonElement
    expect(boton).toBeTruthy()
    act(() => {
      boton.click()
    })
    expect(contractsApi.migracion.descartar).toHaveBeenCalledWith('f-1')
  })
})

describe('T-0156 — reparto_del_canon sin lista de dueños no es un callejón', () => {
  it('dice que sólo se arregla en el archivo o quitando la columna', () => {
    render(filaBase({ faltantes: ['reparto_del_canon'], asociacion: undefined } as never))
    const aviso = container.querySelector('[data-testid="reparto-sin-lista"]')
    expect(aviso?.textContent).toContain('archivo')
    expect(aviso?.textContent).toContain('Volver a cruzar')
  })
})

describe('T-0156 — «El archivo dice» para los faltantes que antes no lo traían', () => {
  it('canon_con_centavos muestra la celda tal cual', () => {
    const f = filaBase({
      datos: { direccion: 'x', canonConCentavosDelArchivo: '1.500.000,50', inquilino: { nombre: 'A', correo: 'a@x.co' } } as never,
    })
    expect(celdaDelFaltante(f, 'canon_con_centavos')).toBe('1.500.000,50')
  })

  it('cartera_antes_del_inicio muestra las dos fechas', () => {
    const f = filaBase({
      datos: {
        direccion: 'x',
        startDate: '2026-03-01',
        fechaDeCartera: '2026-02-01',
        inquilino: { nombre: 'A', correo: 'a@x.co' },
      } as never,
    })
    const celda = celdaDelFaltante(f, 'cartera_antes_del_inicio') ?? ''
    expect(celda).toContain('cartera')
    expect(celda).toContain('inicio')
  })

  it('inmueble_en_venta e inmueble_ocupado muestran la dirección del archivo', () => {
    const f = filaBase()
    expect(celdaDelFaltante(f, 'inmueble_en_venta')).toBe('Cra 1 # 2-3')
    expect(celdaDelFaltante(f, 'inmueble_ocupado')).toBe('Cra 1 # 2-3')
  })
})
