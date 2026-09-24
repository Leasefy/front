/**
 * W4 — el asistente de publicación se puede retomar donde quedó.
 *
 * Antes de esto, salirse a la mitad (cerrar la pestaña, un F5, quedarse sin
 * red) borraba las seis pantallas, y quien volvía a empezar después de un
 * fallo tardío terminaba con DOS inmuebles cargados.
 *
 * Lo que este archivo protege, en el asistente completo y no sólo en el hook:
 *  · lo guardado se OFRECE y no se aplica solo;
 *  · retomarlo devuelve los datos y el paso;
 *  · descartarlo lo borra;
 *  · crear el inmueble limpia el borrador — que es lo que impide el duplicado.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import type { Propietario, Agente } from '@/lib/types/inmobiliaria'
import {
  almacenEnMemoria,
  usarAlmacen,
  VERSION_DEL_FORMATO,
  type AlmacenDeBorradores,
} from '@/lib/inmuebles/borrador-de-publicacion'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const {
  authState,
  permissionsState,
  pushMock,
  propertiesApiMock,
  consignacionesApiMock,
  propietariosApiMock,
  uploadPropertyPhotosMock,
  ubicarDireccionMock,
} = vi.hoisted(() => ({
  authState: {
    user: { id: 'user-1', email: 'user1@test.com', name: 'Test User' } as
      | { id: string; email: string; name: string }
      | null,
    agency: { id: 'ag-1' } as { id: string } | null,
  },
  permissionsState: { isAdmin: true },
  pushMock: vi.fn(),
  propertiesApiMock: { create: vi.fn(), assignAgent: vi.fn(), update: vi.fn() },
  consignacionesApiMock: { create: vi.fn() },
  propietariosApiMock: { create: vi.fn(), update: vi.fn() },
  uploadPropertyPhotosMock: vi.fn(),
  ubicarDireccionMock: vi.fn(),
}))

vi.mock('@/lib/inmuebles/ubicar-direccion', () => ({ ubicarDireccion: ubicarDireccionMock }))

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string, params?: Record<string, unknown>) =>
      params ? `${k}::${JSON.stringify(params)}` : k,
    locale: 'es',
  }),
}))

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock }) }))
vi.mock('@/lib/auth/use-auth', () => ({ useAuth: () => authState }))
vi.mock('@/lib/hooks/usePermissions', () => ({ usePermissions: () => permissionsState }))
vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}))
vi.mock('@/lib/api/properties.service', () => ({ propertiesApi: propertiesApiMock }))
vi.mock('@/lib/api/property-photos', () => ({ uploadPropertyPhotos: uploadPropertyPhotosMock }))
vi.mock('@/lib/api/inmobiliaria.service', () => ({
  consignacionesApi: consignacionesApiMock,
  propietariosApi: propietariosApiMock,
}))

// Memoizado por etiqueta: sin esto `motion.div` cambia de identidad en cada
// render y el árbol del paso se re-monta para siempre (el porqué largo está
// en ConsignacionWizard.test.tsx).
vi.mock('framer-motion', () => {
  const cache = new Map<string, (props: Record<string, unknown>) => React.ReactElement>()
  const motion = new Proxy(
    {},
    {
      get: (_t, tag: string) => {
        if (!cache.has(tag)) {
          cache.set(
            tag,
            ({
              children,
              whileHover,
              whileTap,
              initial,
              animate,
              exit,
              transition,
              ...rest
            }: Record<string, unknown> & { children?: React.ReactNode }) =>
              React.createElement(tag, rest, children),
          )
        }
        return cache.get(tag)
      },
    },
  )
  return { motion, AnimatePresence: ({ children }: { children?: React.ReactNode }) => children }
})

/**
 * Los pasos NO se autorrellenan acá (al revés que en ConsignacionWizard.test):
 * lo que se está midiendo es qué datos tiene el formulario, y un paso que se
 * llena solo taparía justamente eso. Cada paso muestra el título que lleve.
 */
vi.mock('./ConsignacionWizardSteps', () => {
  const espia = (id: string) => {
    const Paso = ({ formData }: { formData: { propertyTitle?: string; photos?: File[] } }) =>
      React.createElement(
        'div',
        { 'data-testid': id },
        `${formData.propertyTitle ?? 'sin-titulo'}|fotos:${(formData.photos ?? []).length}`,
      )
    Paso.displayName = id
    return Paso
  }
  return {
    StepSelectPropietario: espia('step-1'),
    StepPropertyData: espia('step-2'),
    StepCommissionTerms: espia('step-3'),
    StepAssignAgent: espia('step-4'),
    StepActaEntrega: espia('step-5'),
    StepConfirmation: espia('step-6'),
  }
})

import { ConsignacionWizard } from './ConsignacionWizard'

const LLAVE = 'ag-1:user-1'
const PROPIETARIOS: Propietario[] = [{ id: 'prop-1' } as Propietario]
const AGENTES: Agente[] = []

let container: HTMLDivElement
let root: Root
let almacen: AlmacenDeBorradores

function borradorGuardado(parcial: Record<string, unknown> = {}) {
  return {
    llave: LLAVE,
    datos: { propietarioId: 'prop-1', propertyTitle: 'Apartamento en Laureles' },
    fotos: [] as File[],
    paso: 3,
    actualizadoEn: Date.now() - 60_000,
    version: VERSION_DEL_FORMATO,
    ...parcial,
  }
}

beforeEach(() => {
  almacen = almacenEnMemoria()
  usarAlmacen(almacen)
  authState.user = { id: 'user-1', email: 'user1@test.com', name: 'Test User' }
  authState.agency = { id: 'ag-1' }
  permissionsState.isAdmin = true
  pushMock.mockClear()
  propertiesApiMock.create.mockReset().mockResolvedValue({ id: 'property-1' })
  propertiesApiMock.assignAgent.mockReset().mockResolvedValue(undefined)
  propertiesApiMock.update.mockReset().mockResolvedValue({ id: 'property-1', status: 'AVAILABLE' })
  consignacionesApiMock.create.mockReset().mockResolvedValue({ id: 'consignacion-1' })
  uploadPropertyPhotosMock.mockReset().mockResolvedValue({ uploaded: 0, failed: [] })
  ubicarDireccionMock.mockReset().mockResolvedValue({ lat: 4.6, lng: -74, precision: 'direccion' })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => root.unmount())
  container.remove()
  usarAlmacen(null)
  vi.clearAllMocks()
})

async function montar() {
  await act(async () => {
    root.render(React.createElement(ConsignacionWizard, { propietarios: PROPIETARIOS, agentes: AGENTES }))
  })
  await act(async () => {
    await Promise.resolve()
  })
}

/** El diálogo de Radix vive en un portal: se busca en todo el `body`. */
function boton(texto: string): HTMLButtonElement {
  const encontrado = Array.from(document.body.querySelectorAll('button')).find((b) =>
    b.textContent?.includes(texto),
  )
  if (!encontrado) throw new Error(`No hay botón con "${texto}"`)
  return encontrado
}

function hayBoton(texto: string): boolean {
  return Array.from(document.body.querySelectorAll('button')).some((b) =>
    b.textContent?.includes(texto),
  )
}

function pasoVisible(): string {
  const paso = container.querySelector('[data-testid^="step-"]')
  return paso?.getAttribute('data-testid') ?? 'ninguno'
}

describe('<ConsignacionWizard> — el borrador reanudable (W4)', () => {
  it('sin borrador no muestra ningún aviso y arranca en el paso 1', async () => {
    await montar()
    expect(hayBoton('borrador.continuar')).toBe(false)
    expect(pasoVisible()).toBe('step-1')
  })

  /**
   * Lo más importante: el asistente NO aparece lleno. Un formulario que se
   * rellena solo hace que alguien publique el inmueble anterior creyendo que
   * es el que vino a cargar.
   */
  it('lo guardado se ofrece, no se aplica solo', async () => {
    await almacen.guardar(borradorGuardado())
    await montar()

    expect(hayBoton('borrador.continuar')).toBe(true)
    expect(pasoVisible()).toBe('step-1')
    expect(container.textContent).toContain('sin-titulo')
  })

  it('«continuar» devuelve los datos y el paso donde quedó', async () => {
    await almacen.guardar(borradorGuardado())
    await montar()

    await act(async () => {
      boton('borrador.continuar').click()
    })

    expect(pasoVisible()).toBe('step-3')
    expect(container.textContent).toContain('Apartamento en Laureles')
    expect(hayBoton('borrador.continuar')).toBe(false)
  })

  /**
   * Las fotos se REEMPLAZAN. Si se sumaran a las que hubiera, retomar dejaría
   * la misma imagen repetida en el inmueble publicado.
   */
  it('las fotos guardadas vuelven, una sola vez', async () => {
    const foto = new File([new Uint8Array(3)], 'sala.jpg', { type: 'image/jpeg', lastModified: 1 })
    await almacen.guardar(borradorGuardado({ fotos: [foto, foto], paso: 5 }))
    await montar()

    await act(async () => {
      boton('borrador.continuar').click()
    })

    expect(pasoVisible()).toBe('step-5')
    expect(container.textContent).toContain('fotos:1')
  })

  it('«descartar» lo borra del navegador después de confirmar', async () => {
    await almacen.guardar(borradorGuardado())
    await montar()

    await act(async () => {
      boton('borrador.descartar').click()
    })
    await act(async () => {
      boton('borrador.dialogo.descartar').click()
    })

    expect(await almacen.leer(LLAVE)).toBeNull()
    expect(hayBoton('borrador.continuar')).toBe(false)
    expect(pasoVisible()).toBe('step-1')
  })

  /**
   * El borrador muere cuando el inmueble EXISTE, no al final del todo: de ahí
   * en adelante retomarlo cargaría el mismo inmueble por segunda vez, que es
   * el daño que W4 describe.
   */
  it('crear el inmueble limpia el borrador', async () => {
    await almacen.guardar(
      borradorGuardado({
        // El paso 6 sólo deja confirmar con el inmueble completo: es
        // justamente lo que el borrador tiene que haber conservado.
        datos: {
          propietarioId: 'prop-1',
          propertyTitle: 'Apartamento en Laureles',
          propertyAddress: 'Calle 1',
          propertyCity: 'Medellín',
          propertyZone: 'Laureles',
          department: 'Antioquia',
          propertyType: 'apartment',
          monthlyRent: 1_800_000,
          bedrooms: 2,
          bathrooms: 1,
          area: 60,
          propertyDescription: 'Descripción suficientemente larga para pasar la validación.',
        },
        paso: 6,
      }),
    )
    await montar()

    await act(async () => {
      boton('borrador.continuar').click()
    })
    expect(pasoVisible()).toBe('step-6')

    await act(async () => {
      boton('wizard.confirmConsignment').click()
    })
    // Sin fotos el asistente pregunta antes (W2): se publica igual.
    await act(async () => {
      boton('sinFotosDialog.publishAnyway').click()
    })

    expect(propertiesApiMock.create).toHaveBeenCalledTimes(1)
    expect(await almacen.leer(LLAVE)).toBeNull()
  })

  /**
   * Cancelar es abandonar, no pausar: el diálogo dice que se pierde todo, y
   * dejar el borrador vivo después de eso sería mentirle a quien dijo que no.
   */
  it('cancelar el asistente borra el borrador', async () => {
    await almacen.guardar(borradorGuardado())
    await montar()

    await act(async () => {
      boton('borrador.continuar').click()
    })
    await act(async () => {
      boton('wizard.cancel').click()
    })
    await act(async () => {
      boton('cancelDialog.yesCancel').click()
    })

    expect(await almacen.leer(LLAVE)).toBeNull()
    expect(pushMock).toHaveBeenCalled()
  })

  /**
   * El dueño lo pueden borrar mientras el borrador duerme. Mandar ese id al
   * back sería morir en el último paso con un 400 que no explica nada.
   */
  it('si el propietario del borrador ya no existe, vuelve al paso 1 con todo lo demás', async () => {
    await almacen.guardar(
      borradorGuardado({
        datos: { propietarioId: 'prop-borrado', propertyTitle: 'Apartamento en Laureles' },
        paso: 5,
      }),
    )
    await montar()

    await act(async () => {
      boton('borrador.continuar').click()
    })

    expect(pasoVisible()).toBe('step-1')
    expect(container.textContent).toContain('Apartamento en Laureles')
  })
})
