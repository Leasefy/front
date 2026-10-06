/**
 * «Crear contrato» — las dos tarjetas que estaban muertas.
 *
 * Lo que se prueba acá y no en el panel:
 *   · que «Generar con IA» quede DESHABILITADA cuando el backend dice que no
 *     está configurada, y que lo diga en vez de prometer un «próximamente»;
 *   · que el `uploadedPdfPath` del contrato armado por el sistema llegue al
 *     submit EXACTAMENTE igual que el del PDF subido a mano. Es la razón por la
 *     que el backend devuelve esa forma: de ahí para abajo no hay rama nueva.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { post, acciones, router, busqueda, inquilinoElegido } = vi.hoisted(() => ({
  post: vi.fn(),
  busqueda: { valor: 'modo=manual' },
  // Qué «inquilino existente» elige el botón de `elegir-partes`.
  inquilinoElegido: {
    actual: { modo: 'existente', tenantId: '3f2b8c1e-5d4a-4b6e-9a7c-1d2e3f4a5b6c' } as unknown,
  },
  acciones: {
    uploadPdf: vi.fn(),
    create: vi.fn(),
    createManual: vi.fn(),
    isSubmitting: false,
    lastError: null as Error | null,
  },
  router: { push: vi.fn(), replace: vi.fn(), back: vi.fn() },
}))

vi.mock('@/lib/api/client', async () => {
  const real = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client')
  return { ...real, apiClient: { post } }
})
// 🔴 Inventario del inmueble (Nico y Juan Camilo, 2026-09-16): al elegir el
// inmueble se pregunta si su inventario permite iniciar. Acá no se exige
// (como sin la migración del back), salvo en la prueba del bloqueo.
const paraIniciar = vi.fn()
vi.mock('@/lib/api/inventario-del-inmueble.service', () => ({
  inventarioDelInmuebleApi: { paraIniciar: (id: string) => paraIniciar(id) },
}))
vi.mock('@/components/inmobiliaria/inventario/BloqueoPorInventario', () => ({
  BloqueoPorInventario: ({ bloqueo }: { bloqueo: { consignacionId: string | null } }) =>
    React.createElement('div', { 'data-testid': 'bloqueo-por-inventario' }, `inventario:${bloqueo.consignacionId}`),
}))
vi.mock('next/navigation', () => ({
  useRouter: () => router,
  useSearchParams: () => new URLSearchParams(busqueda.valor),
}))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))
vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))
// Los helpers que leen el error (`inmuebleOcupado`, `mensajeDelFallo`…) van
// REALES: son lo que decide qué ve el usuario cuando el back rechaza.
vi.mock('@/lib/hooks/useContracts', async () => {
  const real = await vi.importActual<typeof import('@/lib/hooks/useContracts')>('@/lib/hooks/useContracts')
  return { ...real, useContractActions: () => acciones }
})
vi.mock('@/lib/api/contracts.service', () => ({
  contractsApi: { getByApplicationId: vi.fn().mockResolvedValue(null) },
}))
vi.mock('@/lib/api/applications.service', () => ({
  landlordApplicationsApi: { getDetail: vi.fn(), getEvaluationResult: vi.fn() },
}))
vi.mock('@/lib/api/properties.service', () => ({ propertiesApi: { getById: vi.fn() } }))
vi.mock('@/components/inmobiliaria/recorrido/RecorridoHilo', () => ({
  RecorridoHilo: () => null,
}))
vi.mock('@/components/inmobiliaria/RespaldoDelArriendo', () => ({
  RespaldoDelArriendo: () => null,
}))

// El bloque de partes se reemplaza por un botón que elige un inmueble y un
// inquilino válidos de una: lo que importa acá es el origen del PDF, no el
// selector de inquilinos (que ya tiene su propio test).
vi.mock('@/components/contratos/PartesDelContratoManual', async () => {
  const real = await vi.importActual<
    typeof import('@/components/contratos/PartesDelContratoManual')
  >('@/components/contratos/PartesDelContratoManual')
  return {
    ...real,
    PartesDelContratoManual: ({
      onCambio,
      onInmuebleElegido,
      errores,
    }: {
      onCambio: (p: { propertyId: string; inquilino: unknown }) => void
      onInmuebleElegido?: (c: unknown) => void
      errores?: Record<string, string>
    }) => (
      <>
      {/* Lo que el componente real pinta debajo del selector de inmueble. */}
      <span data-testid="error-propertyId">{errores?.propertyId}</span>
      <button
        type="button"
        data-testid="elegir-partes"
        onClick={() => {
          onCambio({ propertyId: 'p-1', inquilino: inquilinoElegido.actual })
          onInmuebleElegido?.({
            id: 'g-1',
            propertyTitle: 'Apto 302',
            propertyAddress: 'Calle 100 # 15-20',
            monthlyRent: 2_500_000,
          })
        }}
      >
        elegir
      </button>
      </>
    ),
  }
})

import NuevoContratoPage from './page'
import { landlordApplicationsApi } from '@/lib/api/applications.service'
import { propertiesApi } from '@/lib/api/properties.service'
import { ApiError } from '@/lib/api/client'
import type { PreparacionDeContrato } from '@/lib/api/contratos-plantilla.service'

// ─── Datos ───────────────────────────────────────────────────────────────────

function preparacion(iaDisponible: boolean): PreparacionDeContrato {
  return {
    codigo: 'CONTRATO_VIVIENDA',
    nombre: 'Contrato de arrendamiento de vivienda urbana',
    descripcion: 'Ley 820 de 2003.',
    uso: 'VIVIENDA',
    nombreSugerido: 'Contrato — Calle 100 # 15-20',
    inmueble: { id: 'g-1', titulo: 'Apto 302', direccion: 'Calle 100 # 15-20' },
    campos: [],
    clausulas: [],
    iaDisponible,
    topes: {
      canonMaximo: null,
      valorComercialMaximo: null,
      ipcAno: 2025,
      ipcValor: 5.2,
      fuente: 'https://www.dane.gov.co/',
    },
  }
}

const ARMADO = {
  uploadedPdfPath: 'contracts/uploads/u-1/1770000000000-abc123.pdf',
  contractOrigin: 'UPLOADED_PDF' as const,
  codigo: 'CONTRATO_VIVIENDA' as const,
  uso: 'VIVIENDA' as const,
  nombreSugerido: 'Contrato — Calle 100 # 15-20',
  clausulas: [],
}

// ─── Arnés ───────────────────────────────────────────────────────────────────

let contenedor: HTMLDivElement
let raiz: Root

function porTestId(id: string): HTMLElement | null {
  return contenedor.querySelector<HTMLElement>(`[data-testid="${id}"]`)
}

function porTexto(selector: string, texto: string): HTMLElement | null {
  return (
    Array.from(contenedor.querySelectorAll<HTMLElement>(selector)).find((el) =>
      el.textContent?.includes(texto),
    ) ?? null
  )
}

function clic(el: Element | null) {
  if (!el) throw new Error('No existe el elemento a clickear')
  act(() => {
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
  })
}

async function esperar() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 500))
  })
}

beforeEach(() => {
  busqueda.valor = 'modo=manual'
  inquilinoElegido.actual = { modo: 'existente', tenantId: '3f2b8c1e-5d4a-4b6e-9a7c-1d2e3f4a5b6c' }
  post.mockReset()
  paraIniciar.mockReset()
  paraIniciar.mockResolvedValue({ exigible: false, motivoNoExigible: 'MIGRACION_PENDIENTE', consignacionId: null, vigencia: null })
  acciones.uploadPdf.mockReset()
  acciones.create.mockReset()
  acciones.createManual.mockReset()
  acciones.createManual.mockResolvedValue({
    contract: { id: 'c-1' },
    inquilino: { invitado: false },
  })
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  raiz = createRoot(contenedor)
})

afterEach(() => {
  act(() => raiz.unmount())
  contenedor.remove()
})

async function montar(iaDisponible = true) {
  post.mockImplementation((ruta: string) => {
    if (ruta.endsWith('/preparar')) return Promise.resolve(preparacion(iaDisponible))
    if (ruta.endsWith('/generar')) return Promise.resolve(ARMADO)
    return Promise.resolve({})
  })
  await act(async () => {
    raiz.render(<NuevoContratoPage />)
  })
  await esperar()
}

function tarjeta(titulo: string): HTMLButtonElement {
  const el = porTexto('button[aria-pressed]', titulo)
  if (!el) throw new Error(`No está la tarjeta «${titulo}»`)
  return el as HTMLButtonElement
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('las tres formas de traer el contrato', () => {
  it('«Usar plantilla» ya no está deshabilitada ni dice «Próximamente»', async () => {
    await montar()
    const plantilla = tarjeta('Usar plantilla')
    expect(plantilla.disabled).toBe(false)
    expect(contenedor.textContent).not.toContain('Próximamente')
  })

  it('«Generar con IA» queda DESHABILITADA cuando iaDisponible es false, y dice por qué', async () => {
    await montar(false)
    const ia = tarjeta('Generar con IA')
    expect(ia.disabled).toBe(true)
    // La verdad, no un «próximamente»: la clave no está configurada en esta cuenta.
    expect(ia.textContent).toContain('No está configurada en tu cuenta')
    expect(ia.textContent).not.toContain('Próximamente')

    // Y no se puede entrar al modo aunque se le haga clic.
    clic(ia)
    expect(porTestId('armar-contrato-desde-plantilla')).toBeNull()
  })

  it('«Generar con IA» se habilita cuando el backend dice que sí', async () => {
    await montar(true)
    const ia = tarjeta('Generar con IA')
    expect(ia.disabled).toBe(false)

    clic(ia)
    await act(async () => {
      await Promise.resolve()
    })
    expect(porTestId('armar-contrato-desde-plantilla')).not.toBeNull()
    expect(porTestId('plantilla-instrucciones')).not.toBeNull()
  })

  it('mientras no se sabe, la tarjeta de IA está apagada y lo dice', async () => {
    // La preparación no vuelve nunca: `iaDisponible` se queda en null.
    post.mockImplementation(() => new Promise(() => {}))
    await act(async () => {
      raiz.render(<NuevoContratoPage />)
    })
    await esperar()
    const ia = tarjeta('Generar con IA')
    expect(ia.disabled).toBe(true)
    expect(ia.textContent).toContain('Comprobando')
  })
})

describe('el PDF armado por el sistema llega al submit igual que el subido a mano', () => {
  async function elegirPartes() {
    clic(porTestId('elegir-partes'))
    await act(async () => {
      await Promise.resolve()
    })
  }

  function botonDeCrear(): HTMLButtonElement {
    const el = porTexto('button[type="submit"]', 'Crear contrato')
    if (!el) throw new Error('No está el botón de crear')
    return el as HTMLButtonElement
  }

  it('subido a mano: uploadPdf → { contractOrigin, uploadedPdfPath }', async () => {
    acciones.uploadPdf.mockResolvedValue({ uploadedPdfPath: 'contracts/uploads/u-1/mano.pdf' })
    await montar()
    await elegirPartes()

    const input = contenedor.querySelector<HTMLInputElement>('#pdf-upload')!
    const archivo = new File(['%PDF-1.4'], 'contrato.pdf', { type: 'application/pdf' })
    Object.defineProperty(input, 'files', { value: [archivo], configurable: true })
    await act(async () => {
      input.dispatchEvent(new Event('change', { bubbles: true }))
    })

    expect(botonDeCrear().disabled).toBe(false)
    clic(botonDeCrear())
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    const enviado = acciones.createManual.mock.calls[0][0]
    expect(enviado.contractOrigin).toBe('UPLOADED_PDF')
    expect(enviado.uploadedPdfPath).toBe('contracts/uploads/u-1/mano.pdf')
  })

  it('armado desde la plantilla: el mismo par de campos, sin ninguna rama nueva', async () => {
    await montar()
    await elegirPartes()

    clic(tarjeta('Usar plantilla'))
    await esperar()

    // Sin armar el contrato no se puede crear: un contrato sin su documento no
    // se manda a firmar.
    expect(botonDeCrear().disabled).toBe(true)

    clic(porTestId('plantilla-generar'))
    await act(async () => {
      await Promise.resolve()
    })
    expect(porTestId('plantilla-contrato-listo')).not.toBeNull()

    expect(botonDeCrear().disabled).toBe(false)
    clic(botonDeCrear())
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    const enviado = acciones.createManual.mock.calls[0][0]
    expect(enviado.contractOrigin).toBe('UPLOADED_PDF')
    expect(enviado.uploadedPdfPath).toBe(ARMADO.uploadedPdfPath)
    // El PDF no se sube dos veces: lo produjo el backend al generar.
    expect(acciones.uploadPdf).not.toHaveBeenCalled()
    // Y nada de la plantilla se cuela en el cuerpo de `POST /contracts`.
    expect(enviado).not.toHaveProperty('clausulas')
    expect(enviado).not.toHaveProperty('valores')
  })
})

/**
 * 🔴 C17 — el back dice «Ese inmueble ya tiene un contrato en curso (#1234).
 * Cancélalo o esperá a que termine.»; el usuario leía «No se pudo crear el
 * contrato. Verifica los datos e intenta de nuevo.» y se ponía a revisar
 * fechas y cánones que estaban bien.
 */
describe('crear un contrato que el back rechaza: el motivo, al lado del campo', () => {
  async function crearConPdf() {
    acciones.uploadPdf.mockResolvedValue({ uploadedPdfPath: 'contracts/uploads/u-1/mano.pdf' })
    await montar()
    clic(porTestId('elegir-partes'))
    await act(async () => {
      await Promise.resolve()
    })
    const input = contenedor.querySelector<HTMLInputElement>('#pdf-upload')!
    const archivo = new File(['%PDF-1.4'], 'contrato.pdf', { type: 'application/pdf' })
    Object.defineProperty(input, 'files', { value: [archivo], configurable: true })
    await act(async () => {
      input.dispatchEvent(new Event('change', { bubbles: true }))
    })
    clic(porTexto('button[type="submit"]', 'Crear contrato'))
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
      await Promise.resolve()
    })
  }

  beforeEach(() => {
    router.push.mockReset()
  })

  it('409 inmueble ocupado → el mensaje del back al lado del selector de inmueble, no «Verifica los datos»', async () => {
    const motivo = 'Ese inmueble ya tiene un contrato en curso (#1234). Cancélalo o esperá a que termine.'
    acciones.createManual.mockRejectedValue(
      new ApiError(409, motivo, undefined, { statusCode: 409, message: motivo }),
    )
    await crearConPdf()

    expect(acciones.createManual).toHaveBeenCalledTimes(1)
    expect(porTestId('error-propertyId')?.textContent).toBe(motivo)
    expect(contenedor.textContent).not.toContain('Verifica los datos')
    expect(router.push).not.toHaveBeenCalled()
    // Sin el id del contrato en el cuerpo, no se inventa un enlace.
    expect(porTexto('a', 'que estorba')).toBeNull()
  })

  it('cuando el back nombra el contrato que estorba, hay enlace a él', async () => {
    acciones.createManual.mockRejectedValue(
      new ApiError(409, 'Ese inmueble ya tiene un contrato en curso (#1234).', undefined, {
        contratoId: 'c-9',
        contratoCode: 1234,
      }),
    )
    await crearConPdf()

    const enlace = porTexto('a', 'que estorba')
    expect(enlace?.getAttribute('href')).toBe('/panel/inmobiliaria/contratos/c-9')
    expect(enlace?.textContent).toContain('#1234')
  })

  it('400 del ValidationPipe → la lista de motivos del back, no un genérico', async () => {
    acciones.createManual.mockRejectedValue(
      new ApiError(400, ['El canon debe ser positivo', 'La fecha de fin es inválida']),
    )
    await crearConPdf()

    expect(contenedor.textContent).toContain('El canon debe ser positivo · La fecha de fin es inválida')
    // No es un problema del inmueble: el campo queda limpio.
    expect(porTestId('error-propertyId')?.textContent).toBe('')
  })

  it('409 INVENTARIO_NO_VIGENTE → el bloqueo con enlace al inventario, no un mensaje suelto', async () => {
    acciones.createManual.mockRejectedValue(
      new ApiError(409, 'El inmueble no tiene inventario.', 'INVENTARIO_NO_VIGENTE', {
        motivo: 'SIN_INVENTARIO',
        consignacionId: 'cons-9',
      }),
    )
    await crearConPdf()
    expect(porTestId('bloqueo-por-inventario')?.textContent).toBe('inventario:cons-9')
    expect(contenedor.textContent).not.toContain('No se pudo crear el contrato')
  })

  it('403 → dice que es de permisos', async () => {
    acciones.createManual.mockRejectedValue(new ApiError(403, 'Forbidden resource'))
    await crearConPdf()
    expect(contenedor.textContent).toContain('No tienes permiso para crear contratos.')
  })
})

// ─── T-0145: el arrendatario sale de la postulación o del inquilino elegido ──

function cuerposDePreparar(): Record<string, unknown>[] {
  return post.mock.calls
    .filter((c) => String(c[0]).endsWith('/preparar'))
    .map((c) => c[1] as Record<string, unknown>)
}

function ultimoCuerpo(ruta: string): Record<string, unknown> {
  const todos = post.mock.calls.filter((c) => String(c[0]).endsWith(ruta))
  return todos[todos.length - 1][1] as Record<string, unknown>
}

function escribirEn(el: HTMLInputElement, valor: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  act(() => {
    setter.call(el, valor)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

describe('contrato desde una postulación (T-0145)', () => {
  function detalle(tenant: Record<string, unknown> | undefined, extra: Record<string, unknown> = {}) {
    return {
      id: 'a-1',
      status: 'APPROVED',
      tenantEmail: 'ana@correo.co',
      tenant,
      property: { id: 'p-1', title: 'Apto 302', monthlyRent: 2_500_000 },
      ...extra,
    }
  }

  beforeEach(() => {
    busqueda.valor = 'applicationId=a-1'
    vi.mocked(landlordApplicationsApi.getEvaluationResult).mockResolvedValue(undefined as never)
    vi.mocked(propertiesApi.getById).mockResolvedValue({
      id: 'p-1',
      title: 'Apto 302',
      monthlyRent: 2_500_000,
    } as never)
  })

  it('el encabezado dice el nombre del candidato, que el back manda en `tenant`', async () => {
    vi.mocked(landlordApplicationsApi.getDetail).mockResolvedValue(
      detalle({ id: 't-1', firstName: 'Ana', lastName: 'Pérez', email: 'ana@correo.co' }) as never,
    )
    await montar()
    const encabezado = porTexto('p', 'Candidato:')
    expect(encabezado?.textContent).toContain('Candidato: Ana Pérez')
  })

  it('sin nombre registrado, el encabezado nunca queda vacío', async () => {
    vi.mocked(landlordApplicationsApi.getDetail).mockResolvedValue(
      detalle({ id: 't-1', firstName: '', lastName: '', email: 'ana@correo.co' }) as never,
    )
    await montar()
    const encabezado = porTexto('p', 'Candidato:')
    expect(encabezado?.textContent?.replace('Candidato:', '').trim().length).toBeGreaterThan(0)
    expect(encabezado?.textContent).toContain('Sin nombre registrado')
  })

  it('manda applicationId y el nombre conocido al preparar con la plantilla', async () => {
    vi.mocked(landlordApplicationsApi.getDetail).mockResolvedValue(
      detalle({ id: 't-1', firstName: 'Ana', lastName: 'Pérez', email: 'ana@correo.co' }) as never,
    )
    await montar()
    clic(tarjeta('Usar plantilla'))
    await esperar()

    const cuerpo = ultimoCuerpo('/preparar')
    expect(cuerpo.applicationId).toBe('a-1')
    expect(cuerpo.arrendatarioNombre).toBe('Ana Pérez')
    expect(cuerpo).not.toHaveProperty('tenantId')
  })

  it('lo que la agencia escribe en la identificación viaja como arrendatario* al generar', async () => {
    vi.mocked(landlordApplicationsApi.getDetail).mockResolvedValue(
      detalle({ id: 't-1', firstName: 'Ana', lastName: 'Pérez', email: 'ana@correo.co' }) as never,
    )
    await montar()
    clic(tarjeta('Usar plantilla'))
    await esperar()

    escribirEn(porTestId('plantilla-arrendatario-documento') as HTMLInputElement, '79123456')
    escribirEn(porTestId('plantilla-arrendatario-nombre') as HTMLInputElement, 'Ana María Pérez')
    await esperar()
    clic(porTestId('plantilla-generar'))
    await act(async () => {
      await Promise.resolve()
    })

    const cuerpo = ultimoCuerpo('/generar')
    expect(cuerpo.applicationId).toBe('a-1')
    expect(cuerpo.arrendatarioNombre).toBe('Ana María Pérez')
    expect(cuerpo.arrendatarioDocumento).toBe('79123456')
    expect(cuerpo.arrendatarioTipoDocumento).toBe('CC')
  })

  it('el contrato se crea con la postulación, igual que antes', async () => {
    vi.mocked(landlordApplicationsApi.getDetail).mockResolvedValue(
      detalle({ id: 't-1', firstName: 'Ana', lastName: 'Pérez', email: 'ana@correo.co' }) as never,
    )
    acciones.create.mockResolvedValue({ id: 'c-7' })
    await montar()
    clic(tarjeta('Usar plantilla'))
    await esperar()
    clic(porTestId('plantilla-generar'))
    await act(async () => {
      await Promise.resolve()
    })
    clic(porTexto('button[type="submit"]', 'Crear contrato'))
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(acciones.create.mock.calls[0][0].applicationId).toBe('a-1')
  })
})

describe('contrato manual con un inquilino existente (T-0145)', () => {
  async function prepararConPlantilla() {
    await montar()
    clic(porTestId('elegir-partes'))
    await act(async () => {
      await Promise.resolve()
    })
    clic(tarjeta('Usar plantilla'))
    await esperar()
    return ultimoCuerpo('/preparar')
  }

  it('con un id que es un UUID real, manda tenantId (y no applicationId) al preparar', async () => {
    const cuerpo = await prepararConPlantilla()
    expect(cuerpo.tenantId).toBe('3f2b8c1e-5d4a-4b6e-9a7c-1d2e3f4a5b6c')
    expect(cuerpo).not.toHaveProperty('applicationId')
    // El back los completa desde el perfil: no se adelanta nada.
    expect(cuerpo).not.toHaveProperty('arrendatarioDocumento')
  })

  it('con una llave sintética (doc:…) NO manda tenantId: manda los datos de la lista como arrendatario*', async () => {
    inquilinoElegido.actual = {
      modo: 'existente',
      tenantId: 'doc:79123456',
      datos: { nombre: 'Beatriz Rojas', documento: '79123456', correo: 'b@x.co', telefono: '3001112233' },
    }
    const cuerpo = await prepararConPlantilla()
    expect(cuerpo).not.toHaveProperty('tenantId')
    expect(cuerpo.arrendatarioNombre).toBe('Beatriz Rojas')
    expect(cuerpo.arrendatarioDocumento).toBe('79123456')
    expect(cuerpo.arrendatarioTipoDocumento).toBe('CC')
    expect(cuerpo.arrendatarioEmail).toBe('b@x.co')
    expect(cuerpo.arrendatarioTelefono).toBe('3001112233')
  })

  it('la identificación editable se prellena con el nombre y el documento de la lista', async () => {
    inquilinoElegido.actual = {
      modo: 'existente',
      tenantId: 'doc:79123456',
      datos: { nombre: 'Beatriz Rojas', documento: '79123456', correo: '', telefono: '' },
    }
    await prepararConPlantilla()
    expect((porTestId('plantilla-arrendatario-nombre') as HTMLInputElement).value).toBe('Beatriz Rojas')
    expect((porTestId('plantilla-arrendatario-documento') as HTMLInputElement).value).toBe('79123456')
  })
})
