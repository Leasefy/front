/**
 * El panel de «armar el contrato», con el hook de verdad y la red mockeada.
 *
 * Lo que se prueba es lo que sostiene el producto:
 *   · que los motivos del validador se pinten COMPLETOS, con su norma — no
 *     resumidos en «hubo un error, revisá los datos»;
 *   · que una cláusula que propuso la IA se pueda QUITAR antes de generar, y
 *     que al generar ya no viaje;
 *   · que un PDF armado deje de valer cuando cambia algo que va impreso.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { post } = vi.hoisted(() => ({ post: vi.fn() }))

vi.mock('@/lib/api/client', async () => {
  const real = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client')
  return { ...real, apiClient: { post } }
})

import { ApiError } from '@/lib/api/client'
import type {
  BorradorDeContrato,
  PreparacionDeContrato,
  PropuestaDeLaIa,
} from '@/lib/api/contratos-plantilla.service'
import { useContratoDesdePlantilla } from '@/lib/contratos/useContratoDesdePlantilla'
import { ArmarContratoDesdePlantilla } from './ArmarContratoDesdePlantilla'

// ─── Datos ───────────────────────────────────────────────────────────────────

const PREPARACION: PreparacionDeContrato = {
  codigo: 'CONTRATO_VIVIENDA',
  nombre: 'Contrato de arrendamiento de vivienda urbana',
  descripcion: 'Ley 820 de 2003.',
  uso: 'VIVIENDA',
  nombreSugerido: 'Contrato — Calle 100 # 15-20',
  inmueble: { id: 'g-1', titulo: 'Apto 302', direccion: 'Calle 100 # 15-20' },
  campos: [
    {
      nombre: 'lugarDePago',
      etiqueta: 'Lugar de pago',
      tipo: 'texto',
      requerida: true,
      valor: 'Oficina de la inmobiliaria',
    },
  ],
  clausulas: [
    {
      codigo: 'MASCOTAS',
      titulo: 'TENENCIA DE MASCOTAS',
      resumen: 'Autoriza una mascota e identifica cuál.',
      norma: 'Ley 675 de 2001, artículo 18',
      incompatibleCon: [],
      campos: [],
    },
    {
      codigo: 'PARQUEADERO',
      titulo: 'PARQUEADERO',
      resumen: 'Identifica el parqueadero y si va incluido en el canon.',
      norma: 'Ley 820 de 2003, artículos 2.º y 3.º literal e)',
      incompatibleCon: [],
      campos: [],
    },
  ],
  iaDisponible: true,
  topes: {
    canonMaximo: 3_000_000,
    valorComercialMaximo: null,
    ipcAno: 2025,
    ipcValor: 5.2,
    fuente: 'https://www.dane.gov.co/',
  },
}

const PROPUESTA: PropuestaDeLaIa = {
  clausulas: ['MASCOTAS', 'PARQUEADERO'],
  variables: { lugarDePago: 'Cuenta de ahorros Bancolombia 123' },
  estipulacionesEspeciales: 'Las partes acuerdan revisar el jardín cada seis meses.',
  motivos: [],
  pendientes: [
    {
      codigo: 'ARTICULO_3_INCOMPLETO',
      donde: 'literal g',
      mensaje: 'Falta designar quién paga los servicios públicos.',
      norma: 'Ley 820 de 2003, artículo 3.º literal g)',
    },
  ],
  aplicable: true,
}

const BORRADOR: BorradorDeContrato = {
  propertyId: 'p-1',
  uso: 'VIVIENDA',
  canonMensual: 2_500_000,
  fechaInicio: '2026-10-01',
  fechaFin: '2027-09-30',
}

// ─── Arnés ───────────────────────────────────────────────────────────────────

function Arnes({
  modo = 'generate',
  borrador = BORRADOR,
}: {
  modo?: 'template' | 'generate'
  borrador?: BorradorDeContrato
}) {
  const estado = useContratoDesdePlantilla(borrador)
  return <ArmarContratoDesdePlantilla modo={modo} estado={estado} />
}

let contenedor: HTMLDivElement
let raiz: Root

/** El hook espera a que la persona pare de escribir antes de preparar. */
async function esperarPreparacion() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 500))
  })
}

function porTestId(id: string): HTMLElement | null {
  return contenedor.querySelector<HTMLElement>(`[data-testid="${id}"]`)
}

function clic(el: Element | null) {
  if (!el) throw new Error('No existe el elemento a clickear')
  act(() => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
  })
}

function cuerposDe(ruta: string): Record<string, unknown>[] {
  return post.mock.calls
    .filter((c) => String(c[0]).endsWith(ruta))
    .map((c) => c[1] as Record<string, unknown>)
}

beforeEach(() => {
  post.mockReset()
  post.mockImplementation((ruta: string) => {
    if (ruta.endsWith('/preparar')) return Promise.resolve(PREPARACION)
    return Promise.resolve({})
  })
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  raiz = createRoot(contenedor)
})

afterEach(() => {
  act(() => raiz.unmount())
  contenedor.remove()
})

async function montar(props: Parameters<typeof Arnes>[0] = {}) {
  await act(async () => {
    raiz.render(<Arnes {...props} />)
  })
  await esperarPreparacion()
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('preparación', () => {
  it('pinta el catálogo cerrado con la norma de cada cláusula a la vista', async () => {
    await montar({ modo: 'template' })
    const mascotas = porTestId('plantilla-clausula-MASCOTAS')
    expect(mascotas?.textContent).toContain('TENENCIA DE MASCOTAS')
    expect(mascotas?.textContent).toContain('Ley 675 de 2001, artículo 18')
  })

  it('muestra los topes de los artículos 18 y 20 con su norma', async () => {
    await montar({ modo: 'template' })
    const topes = porTestId('plantilla-topes')
    expect(topes?.textContent).toContain('Ley 820 de 2003, art. 18')
    expect(topes?.textContent).toContain('5.2 % (IPC 2025)')
  })

  it('cuando el backend no puede decidir vivienda o comercial, lo dice con SU mensaje', async () => {
    const mensaje =
      'No se puede determinar si el contrato es de vivienda urbana o de local comercial, y de eso depende la ley que lo rige.'
    post.mockImplementation(() =>
      Promise.reject(new ApiError(400, mensaje, 'USO_INDETERMINADO')),
    )
    await montar({ modo: 'template' })
    expect(porTestId('plantilla-uso-indeterminado')?.textContent).toContain(mensaje)
    // No es un fallo genérico: no se pinta como error rojo.
    expect(porTestId('plantilla-error-preparacion')).toBeNull()
  })
})

describe('los motivos del validador', () => {
  it('se pintan COMPLETOS, uno por uno y con su norma', async () => {
    await montar({ modo: 'template' })

    const motivos = [
      {
        codigo: 'DEPOSITO_EN_DINERO',
        donde: 'estipulacionesEspeciales',
        mensaje:
          'No se puede exigir depósito en dinero para garantizar el arrendamiento de vivienda urbana.',
        norma: 'Ley 820 de 2003, artículo 16',
      },
      {
        codigo: 'CANON_SOBRE_EL_TOPE',
        donde: 'canonMensual',
        mensaje: 'El canon pactado supera el 1 % del valor comercial del inmueble.',
        norma: 'Ley 820 de 2003, artículo 18',
      },
    ]
    post.mockImplementation((ruta: string) => {
      if (ruta.endsWith('/preparar')) return Promise.resolve(PREPARACION)
      return Promise.reject(
        new ApiError(400, 'El contrato no se puede emitir así: …', 'CONTRATO_NO_VALIDO', {
          motivos,
        }),
      )
    })

    clic(porTestId('plantilla-generar'))
    await act(async () => {
      await Promise.resolve()
    })

    const caja = porTestId('plantilla-motivos')
    expect(caja).not.toBeNull()
    expect(caja!.querySelectorAll('[data-testid="motivo-del-validador"]')).toHaveLength(2)
    for (const m of motivos) {
      expect(caja!.textContent).toContain(m.mensaje)
      expect(caja!.textContent).toContain(m.norma)
    }
    // El párrafo del backend concatena los mismos motivos: mostrarlo arriba
    // sería decir dos veces lo mismo.
    expect(porTestId('plantilla-error-generar')).toBeNull()
    expect(porTestId('plantilla-contrato-listo')).toBeNull()
  })

  it('un VARIABLES_FALTANTES sale con las etiquetas, no como rechazo', async () => {
    await montar({ modo: 'template' })
    post.mockImplementation((ruta: string) => {
      if (ruta.endsWith('/preparar')) return Promise.resolve(PREPARACION)
      return Promise.reject(
        new ApiError(400, 'Faltan datos', 'VARIABLES_FALTANTES', {
          etiquetasFaltantes: ['Destinación', 'Servicios públicos a cargo de'],
        }),
      )
    })
    clic(porTestId('plantilla-generar'))
    await act(async () => {
      await Promise.resolve()
    })
    expect(porTestId('plantilla-faltantes')?.textContent).toContain('Destinación')
    expect(porTestId('plantilla-motivos')).toBeNull()
  })
})

describe('la propuesta de la IA', () => {
  async function pedirPropuesta(propuesta: PropuestaDeLaIa = PROPUESTA) {
    post.mockImplementation((ruta: string) => {
      if (ruta.endsWith('/preparar')) return Promise.resolve(PREPARACION)
      if (ruta.endsWith('/ia/redactar')) return Promise.resolve(propuesta)
      return Promise.resolve({
        uploadedPdfPath: 'contracts/uploads/u-1/999.pdf',
        contractOrigin: 'UPLOADED_PDF',
        codigo: 'CONTRATO_VIVIENDA',
        uso: 'VIVIENDA',
        nombreSugerido: 'Contrato — Calle 100',
        clausulas: [],
      })
    })
    const textarea = porTestId('plantilla-instrucciones') as HTMLTextAreaElement
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        'value',
      )!.set!
      setter.call(textarea, 'Tiene un perro pequeño y usa el parqueadero 42.')
      textarea.dispatchEvent(new Event('input', { bubbles: true }))
    })
    clic(porTestId('plantilla-pedir-propuesta'))
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
  }

  it('se revisa cláusula por cláusula, con el fundamento legal a la vista', async () => {
    await montar()
    await pedirPropuesta()

    const revision = porTestId('plantilla-revision-propuesta')
    expect(revision).not.toBeNull()
    expect(revision!.textContent).toContain('TENENCIA DE MASCOTAS')
    expect(revision!.textContent).toContain('Ley 675 de 2001, artículo 18')
    expect(revision!.textContent).toContain('PARQUEADERO')
    // Lo que falta del artículo 3 se muestra aparte de lo ilegal.
    expect(porTestId('plantilla-pendientes-propuesta')?.textContent).toContain(
      'Falta designar quién paga los servicios públicos.',
    )
  })

  it('una cláusula que propuso la IA se puede QUITAR antes de generar, y ya no viaja', async () => {
    await montar()
    await pedirPropuesta()

    expect(porTestId('plantilla-propuesta-clausula-MASCOTAS')).not.toBeNull()

    clic(porTestId('plantilla-quitar-MASCOTAS'))
    await act(async () => {
      await Promise.resolve()
    })

    // Desaparece de la revisión: una revisión que sigue mostrando lo descartado
    // no es una revisión.
    expect(porTestId('plantilla-propuesta-clausula-MASCOTAS')).toBeNull()
    expect(porTestId('plantilla-propuesta-clausula-PARQUEADERO')).not.toBeNull()

    clic(porTestId('plantilla-generar'))
    await act(async () => {
      await Promise.resolve()
    })

    const [cuerpo] = cuerposDe('/generar')
    expect(cuerpo.clausulas).toEqual(['PARQUEADERO'])
  })

  it('lo que dedujo el modelo queda editable, y editarlo es lo que se genera', async () => {
    await montar()
    await pedirPropuesta()

    const campo = porTestId('plantilla-campo-lugarDePago') as HTMLInputElement
    // El valor de la propuesta pisó el prellenado del backend.
    expect(campo.value).toBe('Cuenta de ahorros Bancolombia 123')

    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
      setter.call(campo, 'Oficina de la inmobiliaria, Calle 72')
      campo.dispatchEvent(new Event('input', { bubbles: true }))
    })

    clic(porTestId('plantilla-generar'))
    await act(async () => {
      await Promise.resolve()
    })

    const [cuerpo] = cuerposDe('/generar')
    expect((cuerpo.valores as Record<string, string>).lugarDePago).toBe(
      'Oficina de la inmobiliaria, Calle 72',
    )
  })

  it('con la IA caída lo dice con el mensaje del backend y no propone nada', async () => {
    await montar()
    post.mockImplementation((ruta: string) => {
      if (ruta.endsWith('/preparar')) return Promise.resolve(PREPARACION)
      return Promise.reject(
        new ApiError(
          503,
          'No se pudo consultar el asistente de redacción. Probá de nuevo o armá el contrato con las cláusulas del catálogo.',
          'IA_INALCANZABLE',
        ),
      )
    })
    const textarea = porTestId('plantilla-instrucciones') as HTMLTextAreaElement
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        'value',
      )!.set!
      setter.call(textarea, 'Tiene un perro pequeño y usa el parqueadero 42.')
      textarea.dispatchEvent(new Event('input', { bubbles: true }))
    })
    clic(porTestId('plantilla-pedir-propuesta'))
    await act(async () => {
      await Promise.resolve()
    })

    expect(porTestId('plantilla-error-ia')?.textContent).toContain(
      'armá el contrato con las cláusulas del catálogo',
    )
    expect(porTestId('plantilla-revision-propuesta')).toBeNull()
  })
})

describe('un PDF armado deja de valer cuando cambia lo impreso', () => {
  it('avisa después de tocar un campo, y no antes', async () => {
    post.mockImplementation((ruta: string) => {
      if (ruta.endsWith('/preparar')) return Promise.resolve(PREPARACION)
      return Promise.resolve({
        uploadedPdfPath: 'contracts/uploads/u-1/999.pdf',
        contractOrigin: 'UPLOADED_PDF',
        codigo: 'CONTRATO_VIVIENDA',
        uso: 'VIVIENDA',
        nombreSugerido: 'Contrato — Calle 100',
        clausulas: [],
      })
    })
    await montar({ modo: 'template' })

    clic(porTestId('plantilla-generar'))
    await act(async () => {
      await Promise.resolve()
    })
    expect(porTestId('plantilla-contrato-listo')).not.toBeNull()
    expect(porTestId('plantilla-quedo-viejo')).toBeNull()

    const campo = porTestId('plantilla-campo-lugarDePago') as HTMLInputElement
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
      setter.call(campo, 'Otro lugar de pago')
      campo.dispatchEvent(new Event('input', { bubbles: true }))
    })

    expect(porTestId('plantilla-quedo-viejo')).not.toBeNull()
    expect(porTestId('plantilla-contrato-listo')).toBeNull()
  })
})
