/**
 * page.test.tsx — the contract detail header (T-0040).
 *
 * The consecutive number replaces the raw UUID in the most visible slot of the
 * detail screen. VERIFY reverted that branch along with the rest of the front
 * deliverable and the suite stayed green end to end, so this file exists to
 * make the header's two states observable:
 *
 *   * `Contrato #{code}` when the number is there;
 *   * `ID: {uuid}` when it is not — which only happens against a `back` older
 *     than T-0040. The UUID is not deleted from the product, it is demoted.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import type { Contract } from '@/lib/types/contract'

void React // jsx-preserve

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { useContractMock, permisos, accionesDelContrato } = vi.hoisted(() => ({
  useContractMock: vi.fn(),
  permisos: { puede: false },
  // Las acciones RELANZAN el fallo del back (C5-C7): cada caso decide si
  // resuelven o rechazan.
  accionesDelContrato: {
    isSubmitting: false,
    lastError: null,
    send: vi.fn(),
    activate: vi.fn(),
    remind: vi.fn(),
    cancel: vi.fn(),
  },
}))

/**
 * El preview del contrato. Mutable porque la sección «Documento» tiene tres
 * salidas distintas y hay que poder pararse en cada una: documento, contrato
 * SIN documento (el migrado) y fallo de verdad.
 */
const { previewDelContrato } = vi.hoisted(() => ({
  previewDelContrato: {
    valor: {
      preview: null as unknown,
      isLoading: false,
      error: null as string | null,
      errorCrudo: null as unknown,
      sinDocumento: false,
      refetch: () => {},
    },
  },
}))

// La tarjeta de cobros: puede fallar, y anota si la ficha le pidió un resumen
// (🔴 no debe: ningún número del arriendo sale de los cobros).
const { cobrosDelDoble } = vi.hoisted(() => ({
  cobrosDelDoble: { fallan: false, lePidieronResumen: false },
}))

/**
 * Lo que la ficha sabe del estado de cuenta de ESTE contrato. Se dobla el hook
 * —no la red— para que cada caso se pare en un estado; el hook tiene sus
 * propias pruebas (`use-cuenta-del-contrato.test.tsx`).
 */
const { cuentaDelDoble } = vi.hoisted(() => ({
  cuentaDelDoble: { valor: null as unknown },
}))

const { paramsDeBusqueda } = vi.hoisted(() => ({
  // Mutable para que un caso pueda entrar «desde» otra pantalla. Sin `volver`
  // el enlace de arriba sigue diciendo «Contratos», como siempre.
  paramsDeBusqueda: { valor: new URLSearchParams() },
}))

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'contract-1' }),
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => paramsDeBusqueda.valor,
}))

vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children?: React.ReactNode }) => children,
}))

vi.mock('@/lib/hooks/useContracts', () => ({
  useContract: () => useContractMock(),
  useContractPreview: () => previewDelContrato.valor,
  useContractRejections: () => ({ rejections: [] }),
  useContractActions: () => accionesDelContrato,
  useSignedPdfUrl: () => ({ url: null, isLoading: false }),
  isPermissionError: () => false,
}))

vi.mock('@/lib/hooks/usePermissions', () => ({
  usePermissions: () => ({ canAccess: () => permisos.puede }),
}))

vi.mock('@/lib/auth/useAgencyAccess', () => ({
  useAgencyAccess: () => ({ isManager: false }),
}))

vi.mock('@/lib/inmobiliaria/respaldo', () => ({
  leerRespaldo: () => null,
  etiquetaDeTipo: (t: string) => t,
}))

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

// ── Presentational leaves ─────────────────────────────────────────────────
vi.mock('@/components/ui/button', () => ({
  // Forwards every prop EXCEPT the component-level ones React would warn about
  // on a DOM node. Keeping the rest matters: a mock that filters props can pass
  // a button that is unreachable by keyboard.
  Button: ({ children, variant, size, hideArrow, asChild, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => {
    void variant; void size; void hideArrow; void asChild
    return React.createElement('button', props, children)
  },
}))

vi.mock('@/components/ui', () => ({
  Spinner: () => React.createElement('div', { 'data-testid': 'spinner' }),
  Badge: ({ children, variant }: { children?: React.ReactNode; variant?: string }) =>
    React.createElement('span', { 'data-testid': 'badge', 'data-variant': variant }, children),
}))

// Each factory builds its own element: `vi.mock` is hoisted above every
// top-level binding, so a shared helper defined here is not initialised yet
// when the factory runs.
vi.mock('@/components/contract/AuditTrail', () => ({
  AuditTrail: () => React.createElement('div', { 'data-testid': 'audit-trail' }),
}))
vi.mock('@/components/contract/RejectionsHistory', () => ({
  RejectionsHistory: () =>
    React.createElement('div', { 'data-testid': 'rejections-history' }),
}))
// El doble expone la confirmación: C7 prueba qué pasa DESPUÉS de confirmar.
vi.mock('@/components/contract/CancelContractModal', () => ({
  CancelContractModal: ({ onConfirm }: { onConfirm: (r: string | undefined) => unknown }) =>
    React.createElement(
      'div',
      { 'data-testid': 'cancel-modal' },
      React.createElement(
        'button',
        { 'data-testid': 'confirmar-cancelacion', onClick: () => onConfirm('El propietario desistió') },
        'Confirmar cancelación',
      ),
    ),
}))
vi.mock('@/components/contract/DownloadContractPdfButton', () => ({
  DownloadContractPdfButton: () =>
    React.createElement('div', { 'data-testid': 'download-pdf' }),
}))
// El `role="alert"` del cartel real va también en el doble: es lo que una
// prueba puede mirar para decir «acá NO hay un error pintado».
// Expone lo que recibe (C14): a dónde vuelve, si hay reintentar y si le llegó
// el error ENTERO —con su status— o sólo el texto.
vi.mock('@/components/estado/FalloDeCarga', () => ({
  FalloDeCarga: ({
    error,
    onReintentar,
    volverA,
  }: {
    error?: unknown
    onReintentar?: () => unknown
    volverA?: { href: string }
  }) =>
    React.createElement('div', {
      'data-testid': 'fallo-carga',
      role: 'alert',
      'data-volver': volverA?.href,
      'data-reintentar': onReintentar ? 'si' : 'no',
      'data-status':
        error && typeof error === 'object' && 'status' in error
          ? String((error as { status: unknown }).status)
          : 'sin-status',
    }),
}))
vi.mock('@/components/contratos/AdministracionDelContrato', () => ({
  AdministracionDelContrato: () =>
    React.createElement('div', { 'data-testid': 'administracion' }),
}))
vi.mock('@/components/contratos/ConceptosDelContrato', () => ({
  ConceptosDelContrato: ({ puedeEditar }: { puedeEditar?: boolean }) =>
    React.createElement('div', {
      'data-testid': 'conceptos',
      'data-puede-editar': puedeEditar ? 'si' : 'no',
    }),
}))
vi.mock('@/components/contratos/InvitarInquilino', () => ({
  InvitarInquilino: () =>
    React.createElement('div', { 'data-testid': 'invitar-inquilino' }),
}))
vi.mock('@/components/contratos/ReglasDeMoraDelContrato', () => ({
  ReglasDeMoraDelContrato: () =>
    React.createElement('div', { 'data-testid': 'reglas-de-mora' }),
}))
vi.mock('@/components/contratos/CobrosDelContrato', () => ({
  CobrosDelContrato: ({ onResumen }: { onResumen?: (r: unknown) => void }) => {
    if (onResumen) cobrosDelDoble.lePidieronResumen = true
    React.useEffect(() => {
      // Un saldo de cobros que NO cuadra con el estado de cuenta: si la ficha
      // lo pintara en algún lado, se vería.
      onResumen?.(cobrosDelDoble.fallan ? 'fallo' : { total: 3, saldo: 999_999, enMora: 2, pendientes: 1 })
    }, [onResumen])
    return React.createElement('div', { 'data-testid': 'cobros' })
  },
}))
vi.mock('@/lib/hooks/use-cuenta-del-contrato', () => ({
  useCuentaDelContrato: () => cuentaDelDoble.valor,
}))
// El seguimiento de PQRS del contrato (Nico, 2026-09-12). Acá sólo importa
// que la sección esté montada: lo que muestra se prueba en su propio archivo.
vi.mock('@/components/contratos/PqrsDelContrato', () => ({
  PqrsDelContrato: () => React.createElement('div', { 'data-testid': 'pqrs-del-contrato' }),
}))
vi.mock('@/components/contratos/VincularInmueble', () => ({
  VincularInmueble: ({ puedeVincular }: { puedeVincular: boolean }) =>
    puedeVincular
      ? React.createElement('button', { 'data-testid': 'vincular-inmueble' }, 'Vincular inmueble')
      : null,
}))
// El inventario y el historial del inmueble desde el contrato (2026-09-12):
// acá sólo importa CUÁNDO se monta y con qué inmueble y contrato.
vi.mock('@/components/contratos/InmuebleDelContrato', () => ({
  InmuebleDelContrato: ({ propertyId, contratoId }: { propertyId: string | null; contratoId: string }) =>
    React.createElement(
      'div',
      { 'data-testid': 'inmueble-del-contrato', 'data-contrato': contratoId },
      propertyId ?? 'sin-inmueble',
    ),
}))

// ── Import page AFTER mocks ───────────────────────────────────────────────
import ContratoDetallePage from './page'

const CONTRACT_ID = '7f3c1d2e-5a6b-4c7d-8e9f-0a1b2c3d4e5f'

function contract(overrides: Partial<Contract>): Contract {
  return {
    id: CONTRACT_ID,
    propertyId: 'prop-1',
    tenantId: 'tenant-1',
    status: 'active',
    landlordName: 'Luis Pérez',
    tenantName: 'Ana Díaz',
    propertyAddress: 'Cra 76 # 32-11',
    propertyCity: 'Medellín',
    monthlyRent: 2_000_000,
    startDate: '2026-03-01',
    endDate: '2027-02-28',
    customClauses: [],
    ...overrides,
  } as Contract
}

/** El estado de cuenta de ESTE contrato: seis cuotas, las dos primeras pagadas. */
function estadoDeCuenta() {
  const arriendos = Array.from({ length: 6 }, (_, i) => {
    const fecha = `2099-0${i + 1}-05`
    return {
      concepto: `Arriendo ${fecha}`,
      estado: i < 2 ? 'CANCELADA' : 'PENDIENTE',
      fechaDePago: i < 2 ? fecha : null,
      valorBruto: 2_000_000,
      iva: 0,
      retencion: 0,
      reteIva: 0,
      reteIca: 0,
      valorNeto: 2_000_000,
      fechaVencimiento: fecha,
      documentoDePago: null,
      parcial: false,
      cuotaId: `q-${i}`,
    }
  })
  return {
    id: CONTRACT_ID,
    numero: '99',
    rol: 'INQUILINO',
    inmueble: { direccion: 'Cra 76 # 32-11' },
    vigente: true,
    secciones: { arriendos, otrosConceptos: [] },
    totales: { cancelado: 4_000_000, pendiente: 0, restaPorPagar: 8_000_000 },
    cortes: [],
  }
}

function withContract(c: Contract) {
  useContractMock.mockReturnValue({
    contract: c,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    setContract: vi.fn(),
  })
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  useContractMock.mockReset()
  cobrosDelDoble.fallan = false
  cobrosDelDoble.lePidieronResumen = false
  cuentaDelDoble.valor = {
    cuenta: { estado: 'listo', contrato: estadoDeCuenta(), tenantRef: 'tenant-1' },
    agencia: null,
    esperandoAgencia: false,
    reintentar: () => {},
  }
  previewDelContrato.valor = {
    preview: null,
    isLoading: false,
    error: null,
    errorCrudo: null,
    sinDocumento: false,
    refetch: () => {},
  }
})

afterEach(() => {
  act(() => { root.unmount() })
  container.remove()
  vi.clearAllMocks()
})

async function renderPage() {
  await act(async () => {
    root.render(React.createElement(ContratoDetallePage))
  })
}

/**
 * 🔴 C5 · C6 · C7 — las acciones de la ficha dicen el motivo del back.
 *
 * `useContractActions.run()` se tragaba el error: enviar decía «La operación
 * falló», TODO fallo del recordatorio decía «Ya enviaste un recordatorio
 * recientemente», y cancelar leía `actions.lastError` del render viejo (un 403
 * salía «No se pudo cancelar»). Ahora la acción relanza y la ficha reparte.
 */
describe('ContratoDetallePage — el fallo de una acción, en palabras', () => {
  // `toast` sale de `@/components/ui/toast`, que reexporta el de sonner (mockeado arriba).
  let toast: { error: ReturnType<typeof vi.fn>; success: ReturnType<typeof vi.fn> }

  beforeEach(async () => {
    toast = (await import('sonner')).toast as unknown as typeof toast
    permisos.puede = true
    accionesDelContrato.send.mockReset()
    accionesDelContrato.remind.mockReset()
    accionesDelContrato.cancel.mockReset()
  })
  afterEach(() => {
    permisos.puede = false
  })

  function boton(texto: string): HTMLButtonElement {
    const b = [...container.querySelectorAll('button')].find((x) => x.textContent?.includes(texto))
    if (!b) throw new Error(`No está el botón «${texto}»`)
    return b as HTMLButtonElement
  }
  async function clic(b: HTMLElement) {
    await act(async () => {
      b.click()
      await Promise.resolve()
      await Promise.resolve()
    })
  }

  it('C5 · enviar con un 400 → el motivo del back, no «La operación falló»', async () => {
    const { ApiError } = await import('@/lib/api/client')
    accionesDelContrato.send.mockRejectedValue(
      new ApiError(400, 'El contrato no tiene documento: súbelo antes de enviarlo.'),
    )
    withContract(contract({ status: 'draft' }))
    await renderPage()
    await clic(boton('Enviar al inquilino'))

    expect(container.textContent).toContain('El contrato no tiene documento: súbelo antes de enviarlo.')
    expect(container.textContent).not.toContain('La operación falló')
  })

  it('C5 · enviar con un 403 → dice que es de permisos, no el texto crudo', async () => {
    const { ApiError } = await import('@/lib/api/client')
    accionesDelContrato.send.mockRejectedValue(new ApiError(403, 'Forbidden resource'))
    withContract(contract({ status: 'draft' }))
    await renderPage()
    await clic(boton('Enviar al inquilino'))

    expect(container.textContent).toContain('No tienes permiso para esta acción.')
    expect(container.textContent).not.toContain('Forbidden resource')
  })

  it('C6 · recordar con un 429 → «ya enviaste uno en las últimas 24 horas»', async () => {
    const { ApiError } = await import('@/lib/api/client')
    accionesDelContrato.remind.mockRejectedValue(new ApiError(429, 'ThrottlerException'))
    withContract(contract({ status: 'pending_tenant' }))
    await renderPage()
    await clic(boton('Recordar firma'))

    expect(container.textContent).toContain('Ya enviaste un recordatorio en las últimas 24 horas.')
  })

  it('C6 · recordar con un 500 → su motivo, NUNCA «ya enviaste un recordatorio»', async () => {
    const { ApiError } = await import('@/lib/api/client')
    accionesDelContrato.remind.mockRejectedValue(new ApiError(500, 'El proveedor de correo no respondió.'))
    withContract(contract({ status: 'pending_tenant' }))
    await renderPage()
    await clic(boton('Recordar firma'))

    expect(container.textContent).toContain('El proveedor de correo no respondió.')
    expect(container.textContent).not.toContain('Ya enviaste')
  })

  it('C6 · recordar que sale bien lo confirma', async () => {
    accionesDelContrato.remind.mockResolvedValue({ remindedAt: 'x', nextAllowedAt: 'y' })
    withContract(contract({ status: 'pending_tenant' }))
    await renderPage()
    await clic(boton('Recordar firma'))

    expect(toast.success).toHaveBeenCalledWith('Recordatorio enviado.')
  })

  it('C7 · cancelar con un 403 → «no tienes permisos», leído del error que vino', async () => {
    const { ApiError } = await import('@/lib/api/client')
    accionesDelContrato.cancel.mockRejectedValue(new ApiError(403, 'Forbidden resource'))
    withContract(contract({ status: 'draft' }))
    await renderPage()
    await clic(container.querySelector('[data-testid="confirmar-cancelacion"]') as HTMLElement)

    expect(accionesDelContrato.cancel).toHaveBeenCalledWith(CONTRACT_ID, { reason: 'El propietario desistió' })
    expect(toast.error).toHaveBeenCalledWith('No tienes permisos para esta acción.', { description: undefined })
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('C7 · cancelar con un 409 → el motivo del back en la descripción', async () => {
    const { ApiError } = await import('@/lib/api/client')
    accionesDelContrato.cancel.mockRejectedValue(
      new ApiError(409, 'El contrato ya está firmado: no se puede cancelar.'),
    )
    withContract(contract({ status: 'draft' }))
    await renderPage()
    await clic(container.querySelector('[data-testid="confirmar-cancelacion"]') as HTMLElement)

    expect(toast.error).toHaveBeenCalledWith('No se pudo cancelar el contrato.', {
      description: 'El contrato ya está firmado: no se puede cancelar.',
    })
  })
})

/**
 * 🔴 2026-09-12. La ficha del inmueble ahora ofrece «Ver contrato» —el
 * inquilino trae su `contractId`—, así que a esta pantalla se llega desde dos
 * lugares. El «Volver» de arriba decía «Contratos» y llevaba al listado
 * viniera de donde viniera: quien entraba desde un inmueble quedaba parado en
 * una lista de 1.836 filas buscando de dónde había salido.
 */
describe('ContratoDetallePage — a dónde vuelve', () => {
  const enlaceDeVuelta = () =>
    [...container.querySelectorAll('a')].find((a) =>
      a.textContent?.trim().startsWith('Volver') || a.textContent?.trim() === 'Contratos',
    )

  it('sin «volver» sigue llevando al listado, como siempre', async () => {
    paramsDeBusqueda.valor = new URLSearchParams()
    withContract(contract({ code: 14 }))

    await renderPage()

    const a = enlaceDeVuelta()
    expect(a?.getAttribute('href')).toBe('/panel/inmobiliaria/contratos')
    expect(a?.textContent).toContain('Contratos')
  })

  it('🔴 quien vino del inmueble vuelve al inmueble, y el enlace lo dice', async () => {
    paramsDeBusqueda.valor = new URLSearchParams({
      volver: '/panel/inmobiliaria/inmuebles/consig-1',
    })
    withContract(contract({ code: 14 }))

    await renderPage()

    const a = enlaceDeVuelta()
    expect(a?.getAttribute('href')).toBe('/panel/inmobiliaria/inmuebles/consig-1')
    expect(a?.textContent).toContain('Volver al inmueble')
  })

  /* Un «volver» que sale del panel es un open redirect con otro nombre. */
  it('un destino de afuera se ignora', async () => {
    paramsDeBusqueda.valor = new URLSearchParams({ volver: 'https://otro-sitio.com' })
    withContract(contract({ code: 14 }))

    await renderPage()

    expect(enlaceDeVuelta()?.getAttribute('href')).toBe('/panel/inmobiliaria/contratos')
  })
})

describe('ContratoDetallePage — the header identifier', () => {
  /*
   * Proven red by reverting the `Contrato #{code}` branch: the header falls
   * back to `ID: {uuid}` and the number disappears from the screen entirely.
   */
  it('shows `Contrato #{code}` and not the raw UUID', async () => {
    withContract(contract({ code: 14 }))

    await renderPage()

    expect(container.textContent).toContain('Contrato #14')
    expect(container.textContent).not.toContain(CONTRACT_ID)
  })

  it('falls back to the UUID when there is no number', async () => {
    // Only a `back` older than T-0040 produces this. The UUID line is the
    // frozen degradation — never `#0`, never `#undefined`.
    withContract(contract({ code: undefined }))

    await renderPage()

    expect(container.textContent).toContain(`ID: ${CONTRACT_ID}`)
    expect(container.textContent).not.toContain('#undefined')
    expect(container.textContent).not.toContain('Contrato #')
  })
})

describe('ContratoDetallePage — la cuenta del contrato', () => {
  /*
   * Nico (2026-09-02): «sigo sin ver que yo le pueda sumar conceptos a un
   * contrato y adicional que pueda ver los cobros que ha tenido ese
   * contrato». Los conceptos estaban abajo del pliegue en la columna
   * angosta; los cobros no estaban. Ahora los dos van en la columna ancha,
   * antes que el documento cuando el contrato ya está activo.
   */
  it('en un contrato activo, conceptos y cobros van ANTES del documento', async () => {
    withContract(contract({ status: 'active' }))

    await renderPage()

    const conceptos = container.querySelector('[data-testid="conceptos"]')
    const cobros = container.querySelector('[data-testid="cobros"]')
    const documento = Array.from(container.querySelectorAll('h3')).find(
      (h) => h.textContent === 'Documento',
    )
    expect(conceptos).not.toBeNull()
    expect(cobros).not.toBeNull()
    expect(documento).toBeDefined()
    // `compareDocumentPosition`: 4 = el otro nodo viene DESPUÉS.
    expect(conceptos!.compareDocumentPosition(documento!) & 4).toBe(4)
    expect(cobros!.compareDocumentPosition(documento!) & 4).toBe(4)
  })

  it('mientras se firma, el documento manda: va antes que la cuenta', async () => {
    withContract(contract({ status: 'pending_tenant' }))

    await renderPage()

    const cobros = container.querySelector('[data-testid="cobros"]')!
    const documento = Array.from(container.querySelectorAll('h3')).find(
      (h) => h.textContent === 'Documento',
    )!
    expect(documento.compareDocumentPosition(cobros) & 4).toBe(4)
  })

  it('sin inmueble, la tarjeta Propiedad ofrece vincularlo y dice que no genera cobros', async () => {
    withContract(contract({ propertyId: null }))
    permisos.puede = true

    await renderPage()
    permisos.puede = false

    expect(container.textContent).toContain('Sin inmueble vinculado: este contrato no genera cobros.')
    expect(container.querySelector('[data-testid="vincular-inmueble"]')).not.toBeNull()
  })

  it('con inmueble, no hay nada que vincular', async () => {
    withContract(contract({ propertyId: 'prop-1' }))

    await renderPage()

    expect(container.querySelector('[data-testid="vincular-inmueble"]')).toBeNull()
    expect(container.textContent).not.toContain('Sin inmueble vinculado')
    expect(container.querySelector('[data-testid="ver-inmueble"]')?.getAttribute('href')).toBe(
      '/panel/inmobiliaria/inmuebles/prop-1',
    )
  })
})

describe('ContratoDetallePage — el propietario', () => {
  it('es el de la consignación (ficha con documento), nunca landlordName', async () => {
    withContract(
      contract({
        contractOrigin: 'MIGRATED',
        landlordName: 'victor ortiz',
        propietarioDeLaConsignacion: { id: 'po-9', name: 'Jorge Restrepo', documentNumber: '71234567' },
      }),
    )

    await renderPage()

    const ficha = container.querySelector('[data-testid="propietario-ficha"]')
    expect(ficha?.textContent).toBe('Jorge Restrepo')
    // Lleva `?volver=` con este contrato: la ficha del propietario vuelve acá.
    expect(ficha?.getAttribute('href')).toBe(
      `/panel/inmobiliaria/propietarios/po-9?volver=${encodeURIComponent(`/panel/inmobiliaria/contratos/${CONTRACT_ID}`)}`,
    )
    expect(container.textContent).toContain('71234567')
    expect(container.textContent).not.toContain('victor ortiz')
  })

  it('un contrato migrado sin consignación lo dice en vez de mostrar al usuario que migró', async () => {
    withContract(
      contract({ contractOrigin: 'MIGRATED', landlordName: 'victor ortiz', propertyId: null, propietarioDeLaConsignacion: null }),
    )

    await renderPage()

    expect(container.querySelector('[data-testid="propietario-sin-consignacion"]')?.textContent).toBe(
      'Se vincula con el inmueble.',
    )
    expect(container.textContent).not.toContain('victor ortiz')
  })

  it('un contrato nativo sin consignación sigue mostrando landlordName', async () => {
    withContract(contract({ contractOrigin: 'GENERATED', landlordName: 'Luis Pérez', propietarioDeLaConsignacion: null }))

    await renderPage()

    expect(container.textContent).toContain('Luis Pérez')
  })
})

/**
 * 🔴 EL ARRIENDO, en un solo bloque (Nico, 2026-09-16). Antes eran tres cajas
 * —una franja de cuatro números, el resumen del estado de cuenta y una caja
 * verde de «Arriendo en curso»— que se contradecían: «Saldo del inquilino —
 * sin cobros todavía» (de los COBROS) encima de «Resta por pagar $19.214.516»
 * (del estado de cuenta).
 */
describe('ContratoDetallePage — el bloque del arriendo', () => {
  afterEach(() => {
    permisos.puede = false
  })

  const bloque = () => container.querySelector('[data-testid="arriendo-del-contrato"]')!
  const $ = (testid: string) => container.querySelector(`[data-testid="${testid}"]`)

  it('el número es el título, y el bloque dice canon, ritmo y fechas en palabras', async () => {
    withContract(
      contract({
        code: 99,
        monthlyRent: 2_100_000,
        startDate: '2099-01-01T00:00:00.000Z',
        endDate: '2099-12-31T00:00:00.000Z',
        paymentDueDay: 5,
        diasDePlazo: 3,
      }),
    )

    await renderPage()

    expect(container.querySelector('h1')!.textContent).toBe('Contrato #99')
    expect($('canon-del-arriendo')!.textContent).toContain('$2.100.000')
    expect($('ritmo-de-pago')!.textContent).toBe('Paga el 5 de cada mes, con 3 días de plazo.')
    expect($('fecha-de-fin')!.textContent).toBe('31 dic 2099')
    // Las tres cajas de antes ya no están.
    expect($('resumen-del-contrato')).toBeNull()
    expect($('resumen-en-la-ficha')).toBeNull()
    expect(container.textContent).not.toContain('Día 5')
    expect(container.textContent).not.toContain('+3 de plazo')
  })

  it('🔴 ningún número sale de los cobros: la ficha ni siquiera les pide el resumen', async () => {
    withContract(contract({ startDate: '2099-01-01', endDate: '2099-12-31' }))

    await renderPage()

    expect(cobrosDelDoble.lePidieronResumen).toBe(false)
    expect(container.textContent).not.toContain('999.999')
    expect(container.textContent).not.toContain('Saldo del inquilino')
    expect(container.textContent).not.toContain('sin cobros todavía')
    // Lo que resta sale del estado de cuenta de ESTE contrato.
    expect($('resta-por-pagar')!.textContent).toBe('$8.000.000')
    expect($('cuotas-pagadas')!.textContent).toBe('2 de 6 cuotas pagadas')
  })

  it('con los cobros caídos, el bloque sigue diciendo lo del estado de cuenta', async () => {
    cobrosDelDoble.fallan = true
    withContract(contract({ startDate: '2099-01-01', endDate: '2099-12-31' }))

    await renderPage()

    expect($('resta-por-pagar')!.textContent).toBe('$8.000.000')
    expect(container.textContent).not.toContain('No se pudo traer el saldo')
  })

  it('un contrato en curso: sus decisiones van al pie y en voz baja, sin caja verde', async () => {
    permisos.puede = true
    withContract(contract({ status: 'active', endDate: '2099-12-31' }))

    await renderPage()

    expect($('etapa-del-arriendo')!.textContent).toBe('Arriendo en curso')
    expect($('aviso-del-contrato')).toBeNull()
    const pie = $('acciones-del-arriendo')!
    expect(pie.textContent).toContain('Terminar el arriendo')
    expect(pie.textContent).toContain('El propietario vendió el inmueble')
    expect(bloque().innerHTML).not.toMatch(/success/)
    expect(container.textContent).not.toContain('Vigente hasta el')
  })

  it('sin permiso de editar, el bloque se lee igual pero no ofrece decisiones', async () => {
    permisos.puede = false
    withContract(contract({ status: 'active', endDate: '2099-12-31' }))

    await renderPage()

    expect(bloque()).not.toBeNull()
    expect($('acciones-del-arriendo')).toBeNull()
    expect($('aviso-del-contrato')).toBeNull()
  })

  it('🔴 un contrato vencido: la etapa, el chip y el aviso lo dicen, con sus dos caminos', async () => {
    permisos.puede = true
    withContract(contract({ endDate: '2020-01-31T00:00:00.000Z', startDate: '2019-02-01' }))

    await renderPage()

    expect($('etapa-del-arriendo')!.textContent).toBe('Vencido sin renovar')
    const chip = container.querySelector('[data-testid="badge"]')!
    expect(chip.textContent).toBe('Vencido')
    expect(chip.getAttribute('data-variant')).toBe('warning')

    const aviso = $('aviso-del-contrato')!
    expect(aviso.getAttribute('data-tono')).toBe('atencion')
    expect(aviso.textContent).toContain('Vencido desde el 31 ene 2020')
    expect(aviso.textContent).toContain('Renovar contrato')
    expect(aviso.textContent).toContain('Terminar el arriendo')
    expect($('acciones-del-arriendo')!.textContent).toContain('El propietario vendió el inmueble')
    expect(container.textContent).not.toMatch(/2020-01-31/)
  })

  it('los pasos de la firma siguen: cada estado con su acción principal', async () => {
    permisos.puede = true
    const casos = [
      ['draft', 'Contrato en borrador', 'Enviar al inquilino'],
      ['pending_tenant', 'Esperando firma del inquilino', 'Recordar firma'],
      ['pending_landlord', 'El inquilino ya firmó — firma para cerrar', 'Firmar como propietario'],
      ['rejected_pending_modifications', 'El inquilino solicitó cambios', 'Corregir contrato'],
      ['signed', 'Contrato firmado', 'Activar contrato'],
    ] as const
    for (const [status, titulo, accion] of casos) {
      cuentaDelDoble.valor = { ...(cuentaDelDoble.valor as object), cuenta: { estado: 'no-aplica' } }
      withContract(contract({ status }))
      await renderPage()
      const aviso = $('aviso-del-contrato')
      expect(aviso?.textContent, status).toContain(titulo)
      expect(aviso?.textContent, status).toContain(accion)
    }
  })

  it('un borrador ofrece cancelarlo al pie', async () => {
    permisos.puede = true
    withContract(contract({ status: 'draft' }))

    await renderPage()

    expect($('acciones-del-arriendo')!.textContent).toContain('Cancelar contrato')
  })

  it('la vigencia ya no se repite en una tarjeta aparte', async () => {
    withContract(contract({}))

    await renderPage()

    const titulos = Array.from(container.querySelectorAll('h3')).map((h) => h.textContent)
    expect(titulos).not.toContain('Vigencia')
  })
})

describe('ContratoDetallePage — el contrato que no llega', () => {
  it('C14: sin contrato y sin error, el cartel de la casa con reintentar y a dónde volver', async () => {
    useContractMock.mockReturnValue({
      contract: null,
      isLoading: false,
      error: null,
      errorCrudo: null,
      refetch: vi.fn(),
      setContract: vi.fn(),
    })

    await renderPage()

    const fallo = container.querySelector('[data-testid="fallo-carga"]')
    expect(fallo).not.toBeNull()
    expect(fallo!.getAttribute('data-reintentar')).toBe('si')
    expect(fallo!.getAttribute('data-volver')).toBe('/panel/inmobiliaria/contratos')
    // La tarjeta roja hecha a mano ya no existe.
    expect(container.textContent).not.toContain('Contrato no encontrado')
  })

  it('C14: al cartel le llega el error ENTERO del hook, con su status, no sólo el texto', async () => {
    useContractMock.mockReturnValue({
      contract: null,
      isLoading: false,
      error: 'Contract not found',
      errorCrudo: { status: 404, message: 'Contract not found' },
      refetch: vi.fn(),
      setContract: vi.fn(),
    })

    await renderPage()

    expect(container.querySelector('[data-testid="fallo-carga"]')!.getAttribute('data-status')).toBe('404')
  })
})

describe('ContratoDetallePage — un contrato que ya terminó', () => {
  it('C13: cancelado o vencido, los conceptos se leen pero no se editan', async () => {
    permisos.puede = true
    try {
      for (const status of ['cancelled', 'expired'] as const) {
        withContract(contract({ status }))
        await renderPage()
        expect(container.querySelector('[data-testid="conceptos"]')!.getAttribute('data-puede-editar')).toBe('no')
      }

      withContract(contract({ status: 'active' }))
      await renderPage()
      expect(container.querySelector('[data-testid="conceptos"]')!.getAttribute('data-puede-editar')).toBe('si')
    } finally {
      permisos.puede = false
    }
  })

  it('C15: un estado que no conocemos va con la variante gris del Badge, no con una que no existe', async () => {
    withContract(contract({ status: 'algo_nuevo_del_back' as Contract['status'] }))

    await renderPage()

    expect(container.querySelector('[data-testid="badge"]')!.getAttribute('data-variant')).toBe('secondary')
  })
})

/*
 * 🔴 Nico, 2026-09-12: «estás tergiversando los números de contrato». El
 * #1839 que vio es NUESTRO consecutivo; el suyo es 1686. El título lee el
 * suyo, y debajo dice cuál es el nuestro.
 */
describe('ContratoDetallePage — el número de la inmobiliaria en el título', () => {
  it('un contrato migrado se titula con SU número y dice cuál es el de Leasefy', async () => {
    withContract(contract({ code: 1839, externalId: '1686', contractOrigin: 'MIGRATED' }))

    await renderPage()

    expect(container.querySelector('h1')?.textContent).toBe('Contrato 1686')
    const nota = container.querySelector('[data-testid="numero-de-leasefy"]')
    expect(nota?.textContent).toContain('1686 es el número de tu sistema anterior')
    expect(nota?.textContent).toContain('en Leasefy es el #1839')
    expect(container.textContent).not.toContain('Contrato #1839')
  })

  it('un contrato nativo sigue titulándose con el nuestro, sin nota', async () => {
    withContract(contract({ code: 14, externalId: null }))

    await renderPage()

    expect(container.querySelector('h1')?.textContent).toBe('Contrato #14')
    expect(container.querySelector('[data-testid="numero-de-leasefy"]')).toBeNull()
  })
})

/*
 * Nico, 2026-09-12: «el historial que hoy vive en el inmueble debe asociarse
 * al contrato» y «el inventario debe verse también desde el contrato».
 * Nico, 2026-09-13: «desde el contrato también debería de agregar todo lo que
 * se pueda agregar del inventario» — y para eso el componente necesita saber
 * DESDE QUÉ contrato se abrió: es lo que se guarda en el borrador y la página
 * que se prepara para trabajar sin señal.
 */
describe('ContratoDetallePage — inventario e historial del inmueble', () => {
  it('con inmueble, se montan sobre ESE inmueble y dicen desde qué contrato', async () => {
    withContract(contract({ propertyId: 'prop-7' }))

    await renderPage()

    const montado = container.querySelector('[data-testid="inmueble-del-contrato"]')
    expect(montado?.textContent).toBe('prop-7')
    expect(montado?.getAttribute('data-contrato')).toBe(CONTRACT_ID)
  })

  /*
   * Antes no se montaba nada y el hueco no decía nada. Ahora se monta igual y
   * es el componente el que dice «este contrato no tiene inmueble asociado»:
   * un inventario sin inmueble no tiene dónde vivir, y eso hay que decirlo.
   */
  it('sin inmueble se monta igual, para poder decirlo', async () => {
    withContract(contract({ propertyId: null }))

    await renderPage()

    expect(container.querySelector('[data-testid="inmueble-del-contrato"]')?.textContent).toBe(
      'sin-inmueble',
    )
  })
})

/*
 * 🔴 Pasada de QA del 2026-09-12: en TODA ficha de un contrato migrado salía
 * un cartel rojo. `GET /contracts/:id/preview` responde 400 «Contract HTML not
 * generated» porque esos contratos se cargaron desde el archivo de la
 * inmobiliaria —ya firmados en papel— y nunca tuvieron documento en Leasefy.
 * No tener documento no es un fallo; un 400 con otro motivo, o un 500, sí.
 */
describe('ContratoDetallePage — el documento de un contrato migrado', () => {
  it('🔴 sin documento lo dice en tono neutro, sin pintar un error', async () => {
    previewDelContrato.valor = {
      ...previewDelContrato.valor,
      sinDocumento: true,
    }
    withContract(contract({ contractOrigin: 'MIGRATED', externalId: '1686' }))

    await renderPage()

    expect(
      container.querySelector('[data-testid="contrato-sin-documento"]')?.textContent,
    ).toContain('Este contrato se cargó desde tu sistema anterior y no tiene documento generado en Leasefy')
    // Ni cartel de fallo ni nada que se anuncie como alerta.
    expect(container.querySelector('[data-testid="fallo-carga"]')).toBeNull()
    expect(container.querySelector('[role="alert"]')).toBeNull()
  })

  it('un 400 con OTRO motivo, o un 500, sí se pinta como fallo', async () => {
    previewDelContrato.valor = {
      ...previewDelContrato.valor,
      errorCrudo: new Error('Boom'),
      error: 'Boom',
    }
    withContract(contract({ contractOrigin: 'MIGRATED' }))

    await renderPage()

    expect(container.querySelector('[data-testid="fallo-carga"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="contrato-sin-documento"]')).toBeNull()
  })
})
