/**
 * El diálogo de «Generar documento», de punta a punta con la API mockeada.
 *
 * Lo que se prueba es lo que Nico va a apretar: elegir un tipo, elegir el
 * contrato, ver los campos ya llenos con datos reales, y que un incremento por
 * encima del tope legal no deje generar.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { api, toastMock } = vi.hoisted(() => ({
  api: {
    plantillasLegales: vi.fn(),
    preparar: vi.fn(),
    generar: vi.fn(),
    pdf: vi.fn(),
    documentos: vi.fn(),
    plantillas: vi.fn(),
  },
  toastMock: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

vi.mock('sonner', () => ({ toast: toastMock }))
vi.mock('@/lib/api/documentos.service', () => ({ documentosLegalesApi: api }))
vi.mock('@/lib/hooks/useContracts', () => ({
  useContracts: () => ({
    contracts: [
      {
        id: 'c-1',
        code: 111,
        status: 'active',
        propertyAddress: 'Calle 100 # 15-20',
        tenantName: 'Ana Pérez',
      },
      { id: 'c-2', code: 112, status: 'cancelled', propertyAddress: 'X', tenantName: 'Y' },
    ],
    isLoading: false,
  }),
}))
vi.mock('@/lib/hooks/useInmobiliaria', () => ({
  useConsignaciones: () => ({
    consignaciones: [{ id: 'g-1', propertyTitle: 'Casa Envigado', propertyAddress: 'Cra 43' }],
    isLoading: false,
  }),
}))

// El Combobox de cadence se reemplaza por un <select>: lo que importa acá son
// las opciones que recibe y el valor que devuelve, no el popover.
vi.mock('@/components/ui/combobox', () => ({
  Combobox: ({
    options,
    value,
    onChange,
    disabled,
    ...rest
  }: {
    options: { value: string; label: string }[]
    value?: string
    onChange: (v: string | undefined) => void
    disabled?: boolean
  }) =>
    React.createElement(
      'select',
      {
        'data-testid': (rest as Record<string, string>)['data-testid'],
        value: value ?? '',
        disabled,
        onChange: (e: React.ChangeEvent<HTMLSelectElement>) => onChange(e.target.value || undefined),
      },
      [React.createElement('option', { key: '', value: '' }, '—')].concat(
        options.map((o) => React.createElement('option', { key: o.value, value: o.value }, o.label)),
      ),
    ),
}))

import { GenerarDocumentoDialog } from './GenerarDocumentoDialog'

const PLANTILLAS = [
  {
    codigo: 'CARTA_INCREMENTO',
    nombre: 'Carta de incremento del canon',
    descripcion: 'Aviso del reajuste anual.',
    categoria: 'CARTA',
    version: '1.0',
    requiere: 'contrato',
    campos: [],
  },
  {
    codigo: 'INVENTARIO',
    nombre: 'Inventario del inmueble',
    descripcion: 'Relación de ítems.',
    categoria: 'INVENTARIO',
    version: '1.0',
    requiere: 'contrato-o-inmueble',
    campos: [],
  },
]

const PREPARACION_CARTA = {
  codigo: 'CARTA_INCREMENTO',
  nombre: 'Carta de incremento del canon',
  descripcion: 'Aviso del reajuste anual.',
  categoria: 'CARTA',
  nombreSugerido: 'Carta de incremento del canon — Apartamento en Chicó',
  contrato: {
    id: 'c-1',
    codigo: 111,
    direccion: 'Calle 100 # 15-20',
    arrendatario: 'Ana Pérez',
    arrendador: 'Carlos Ruiz',
    canon: 2_000_000,
    uso: 'VIVIENDA',
  },
  inmueble: null,
  itemsDeInventario: 3,
  campos: [
    {
      nombre: 'porcentajeIncremento',
      etiqueta: 'Incremento propuesto',
      tipo: 'porcentaje',
      requerida: true,
      valor: '5.1',
    },
    {
      // La fecha decide qué IPC es el tope (art. 20), así que el backend la
      // manda como campo editable y el diálogo tiene que repreguntar al tocarla.
      nombre: 'fechaDeVigencia',
      etiqueta: 'Rige a partir de',
      tipo: 'fecha',
      requerida: true,
      valor: '2026-03-01',
    },
    {
      nombre: 'canalDeNotificacion',
      etiqueta: 'Canal de envío',
      tipo: 'texto',
      requerida: true,
      valor: 'Servicio postal autorizado',
    },
    {
      nombre: 'mensajeAdicional',
      etiqueta: 'Mensaje adicional',
      tipo: 'parrafo',
      requerida: false,
      valor: '',
    },
  ],
  incremento: {
    ipcAno: 2025,
    ipcValor: 5.1,
    topeLegal: 5.1,
    canonVigente: 2_000_000,
    canonEnElTope: 2_102_000,
    mesesBajoElMismoPrecio: 19,
    cumpleLosDoceMeses: true,
    fuente: 'https://www.dane.gov.co/…',
  },
}

const q = <T extends Element>(sel: string) => document.body.querySelector<T>(sel)

function escribir(input: HTMLInputElement | HTMLTextAreaElement, valor: string) {
  const proto =
    input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(proto, 'value')!.set!.call(input, valor)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

function elegir(select: HTMLSelectElement, valor: string) {
  Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!.call(select, valor)
  select.dispatchEvent(new Event('change', { bubbles: true }))
}

describe('GenerarDocumentoDialog', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    api.plantillasLegales.mockResolvedValue(PLANTILLAS)
    api.preparar.mockResolvedValue(PREPARACION_CARTA)
    api.generar.mockReset()
    toastMock.success.mockReset()
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    vi.clearAllMocks()
  })

  async function abrir(onGenerado = vi.fn()) {
    await act(async () => {
      root.render(
        <GenerarDocumentoDialog open onOpenChange={vi.fn()} onGenerado={onGenerado} />,
      )
    })
    return onGenerado
  }

  it('lista los tipos que sabe armar el backend, no una lista clavada en el front', async () => {
    await abrir()
    const tipo = q<HTMLSelectElement>('[data-testid="doc-tipo"]')!
    expect([...tipo.options].map((o) => o.value)).toEqual([
      '',
      'INVENTARIO',
      'CARTA_INCREMENTO',
    ])
  })

  it('la carta exige un contrato: sin elegirlo no se prepara nada y el botón no se puede apretar', async () => {
    await abrir()
    await act(async () => elegir(q<HTMLSelectElement>('[data-testid="doc-tipo"]')!, 'CARTA_INCREMENTO'))

    expect(api.preparar).not.toHaveBeenCalled()
    expect(q<HTMLButtonElement>('[data-testid="doc-generar"]')!.disabled).toBe(true)
    // Y no ofrece elegir un inmueble, porque no serviría.
    expect(q('[data-testid="doc-inmueble"]')).toBeNull()
  })

  it('el inventario sí acepta un inmueble suelto', async () => {
    api.preparar.mockResolvedValue({
      ...PREPARACION_CARTA,
      codigo: 'INVENTARIO',
      contrato: null,
      inmueble: { id: 'g-1', titulo: 'Casa Envigado', direccion: 'Cra 43' },
      campos: [],
      incremento: null,
    })
    await abrir()
    await act(async () => elegir(q<HTMLSelectElement>('[data-testid="doc-tipo"]')!, 'INVENTARIO'))
    const inmueble = q<HTMLSelectElement>('[data-testid="doc-inmueble"]')!
    expect(inmueble).not.toBeNull()

    await act(async () => elegir(inmueble, 'g-1'))
    expect(api.preparar).toHaveBeenCalledWith({
      codigo: 'INVENTARIO',
      contractId: undefined,
      consignacionId: 'g-1',
    })
  })

  it('los contratos cancelados no se ofrecen', async () => {
    await abrir()
    await act(async () => elegir(q<HTMLSelectElement>('[data-testid="doc-tipo"]')!, 'CARTA_INCREMENTO'))
    const contrato = q<HTMLSelectElement>('[data-testid="doc-contrato"]')!
    expect([...contrato.options].map((o) => o.value)).toEqual(['', 'c-1'])
    expect([...contrato.options][1].textContent).toContain('#111')
  })

  it('con el contrato elegido llegan los campos ya llenos y el tope legal', async () => {
    await abrir()
    await act(async () => elegir(q<HTMLSelectElement>('[data-testid="doc-tipo"]')!, 'CARTA_INCREMENTO'))
    await act(async () => elegir(q<HTMLSelectElement>('[data-testid="doc-contrato"]')!, 'c-1'))

    expect(q<HTMLInputElement>('[data-testid="doc-campo-porcentajeIncremento"]')!.value).toBe('5.1')
    expect(q<HTMLInputElement>('[data-testid="doc-campo-canalDeNotificacion"]')!.value).toBe(
      'Servicio postal autorizado',
    )
    // El párrafo se pinta como textarea, no como input de una línea.
    expect(q('textarea[data-testid="doc-campo-mensajeAdicional"]')).not.toBeNull()

    const aviso = q('[data-testid="doc-aviso-incremento"]')!
    expect(aviso.textContent).toContain('5,10 %')
    expect(aviso.textContent).toContain('2025')
    expect(q<HTMLButtonElement>('[data-testid="doc-generar"]')!.disabled).toBe(false)
  })

  it('un incremento por encima del tope bloquea el botón y dice por qué', async () => {
    await abrir()
    await act(async () => elegir(q<HTMLSelectElement>('[data-testid="doc-tipo"]')!, 'CARTA_INCREMENTO'))
    await act(async () => elegir(q<HTMLSelectElement>('[data-testid="doc-contrato"]')!, 'c-1'))

    act(() => escribir(q<HTMLInputElement>('[data-testid="doc-campo-porcentajeIncremento"]')!, '9'))

    const aviso = q('[data-testid="doc-aviso-incremento"]')!
    expect(aviso.textContent).toContain('supera el tope legal')
    expect(aviso.textContent).toContain('art. 20')
    expect(q<HTMLButtonElement>('[data-testid="doc-generar"]')!.disabled).toBe(true)
  })

  it('🔴 cambiar «Rige a partir de» vuelve a pedir el tope: el IPC depende de ese año', async () => {
    await abrir()
    await act(async () => elegir(q<HTMLSelectElement>('[data-testid="doc-tipo"]')!, 'CARTA_INCREMENTO'))
    await act(async () => elegir(q<HTMLSelectElement>('[data-testid="doc-contrato"]')!, 'c-1'))
    api.preparar.mockClear()

    await act(async () =>
      escribir(q<HTMLInputElement>('[data-testid="doc-campo-fechaDeVigencia"]')!, '2026-12-01'),
    )

    // El tope legal es el IPC del año calendario ANTERIOR a la vigencia
    // (Ley 820 de 2003, art. 20): quien lo sabe es el backend, así que hay que
    // volver a preguntárselo con la fecha nueva.
    expect(api.preparar).toHaveBeenCalledWith(
      expect.objectContaining({ codigo: 'CARTA_INCREMENTO', fechaDeVigencia: '2026-12-01' }),
    )
  })

  it('🔴 al repreguntar el tope no se pierde lo que la persona ya escribió', async () => {
    await abrir()
    await act(async () => elegir(q<HTMLSelectElement>('[data-testid="doc-tipo"]')!, 'CARTA_INCREMENTO'))
    await act(async () => elegir(q<HTMLSelectElement>('[data-testid="doc-contrato"]')!, 'c-1'))

    act(() => escribir(q<HTMLInputElement>('[data-testid="doc-campo-porcentajeIncremento"]')!, '3'))
    await act(async () =>
      escribir(q<HTMLInputElement>('[data-testid="doc-campo-fechaDeVigencia"]')!, '2026-12-01'),
    )

    expect(q<HTMLInputElement>('[data-testid="doc-campo-porcentajeIncremento"]')!.value).toBe('3')
    expect(q<HTMLInputElement>('[data-testid="doc-campo-fechaDeVigencia"]')!.value).toBe('2026-12-01')
  })

  it('vaciar un campo requerido bloquea el botón', async () => {
    await abrir()
    await act(async () => elegir(q<HTMLSelectElement>('[data-testid="doc-tipo"]')!, 'CARTA_INCREMENTO'))
    await act(async () => elegir(q<HTMLSelectElement>('[data-testid="doc-contrato"]')!, 'c-1'))

    act(() => escribir(q<HTMLInputElement>('[data-testid="doc-campo-canalDeNotificacion"]')!, ''))
    expect(q<HTMLButtonElement>('[data-testid="doc-generar"]')!.disabled).toBe(true)
  })

  it('generar manda lo elegido y devuelve el documento a la tabla', async () => {
    const creado = { id: 'd-9', name: 'Carta de incremento' }
    api.generar.mockResolvedValue(creado)
    const onGenerado = await abrir()

    await act(async () => elegir(q<HTMLSelectElement>('[data-testid="doc-tipo"]')!, 'CARTA_INCREMENTO'))
    await act(async () => elegir(q<HTMLSelectElement>('[data-testid="doc-contrato"]')!, 'c-1'))
    act(() => escribir(q<HTMLInputElement>('[data-testid="doc-campo-porcentajeIncremento"]')!, '4,5'))

    await act(async () => q<HTMLButtonElement>('[data-testid="doc-generar"]')!.click())

    expect(api.generar).toHaveBeenCalledWith({
      codigo: 'CARTA_INCREMENTO',
      contractId: 'c-1',
      consignacionId: undefined,
      overrides: {
        porcentajeIncremento: '4,5',
        fechaDeVigencia: '2026-03-01',
        canalDeNotificacion: 'Servicio postal autorizado',
        mensajeAdicional: '',
      },
      name: 'Carta de incremento del canon — Apartamento en Chicó',
    })
    expect(onGenerado).toHaveBeenCalledWith(creado)
  })

  it('un 400 del backend se muestra tal cual, sin traducirlo ni tragarlo', async () => {
    api.generar.mockRejectedValue(
      new Error('Faltan datos para generar el documento: Garantía del contrato.'),
    )
    await abrir()
    await act(async () => elegir(q<HTMLSelectElement>('[data-testid="doc-tipo"]')!, 'CARTA_INCREMENTO'))
    await act(async () => elegir(q<HTMLSelectElement>('[data-testid="doc-contrato"]')!, 'c-1'))
    await act(async () => q<HTMLButtonElement>('[data-testid="doc-generar"]')!.click())

    expect(q('[data-testid="doc-error"]')!.textContent).toContain('Garantía del contrato')
  })
})
