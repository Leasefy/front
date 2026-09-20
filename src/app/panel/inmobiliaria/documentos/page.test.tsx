/**
 * page.test.tsx — Documentos: los dos permisos y el error que se tragaba.
 *
 * Tres cosas que esta pantalla afirmaba sin que fueran ciertas:
 *
 *  1. Las actas se leen de `GET /inmobiliaria/actas`, que pide
 *     `portafolio:view` — NO `documentos:view`, que es lo que abre la pantalla.
 *     Un CONTADOR (`documentos: ['view']`, `portafolio: []`) recibía un 403 y
 *     la pantalla lo pintaba como «Todavía no hay actas».
 *  2. El vacío de documentos ofrecía «Generar documento» a quien no tiene
 *     `documentos:create` — el botón de la cabecera SÍ estaba detrás del gate,
 *     el del vacío no.
 *  3. El vacío de actas ofrecía «Nueva acta» a quien no tiene
 *     `portafolio:create`: el formulario entero para terminar en un 403.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { canAccessMock, useDocumentosLegalesMock, useActasEntregaMock, useConsignacionesMock } = vi.hoisted(() => ({
  canAccessMock: vi.fn(),
  useDocumentosLegalesMock: vi.fn(),
  useActasEntregaMock: vi.fn(),
  useConsignacionesMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/panel/inmobiliaria/documentos',
}))

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ locale: 'es', t: (k: string) => k }),
}))

vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children?: React.ReactNode }) => children,
}))

vi.mock('@/lib/hooks/usePermissions', () => ({
  usePermissions: () => ({ canAccess: canAccessMock, isLoading: false }),
}))

vi.mock('@/components/auth/PermissionGate', () => ({
  PermissionGate: ({
    module,
    action,
    children,
    fallback,
  }: {
    module: string
    action: string
    children?: React.ReactNode
    fallback?: React.ReactNode
  }) => (canAccessMock(module, action) ? children : (fallback ?? null)),
}))

vi.mock('@/components/documentos/useDocumentosLegales', () => ({
  useDocumentosLegales: () => useDocumentosLegalesMock(),
}))

vi.mock('@/lib/hooks/useInmobiliaria', () => ({
  useActasEntrega: () => useActasEntregaMock(),
  useConsignaciones: () => useConsignacionesMock(),
  actasApi: { create: vi.fn() },
}))

vi.mock('@/lib/api/documentos.service', () => ({
  documentosLegalesApi: { pdf: vi.fn() },
}))

vi.mock('@/components/documentos/GenerarDocumentoDialog', () => ({
  GenerarDocumentoDialog: () => null,
}))

vi.mock('@/components/inmobiliaria', () => ({
  // Deja guardar desde el test: `onSave` es `guardarActa` de la página.
  ActaEntregaForm: ({ onSave }: { onSave: (d: unknown) => Promise<void> }) =>
    React.createElement(
      'button',
      {
        'data-testid': 'acta-form-guardar',
        onClick: () => void onSave({ type: 'entrega' }).catch(() => undefined),
      },
      'guardar',
    ),
  ActaEntregaViewer: () => null,
}))

vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

// El vacío: lo único que importa acá es SI le llegó un botón de crear.
vi.mock('@/components/estado/SinDatos', () => ({
  SinDatos: ({ crear, titulo }: { crear?: { label: string; onClick?: () => void }; titulo?: string }) =>
    React.createElement(
      'div',
      { 'data-testid': 'sin-datos' },
      titulo,
      crear
        ? React.createElement('button', { 'data-testid': 'sin-datos-crear', onClick: crear.onClick }, crear.label)
        : null,
    ),
}))

// El fallo: se pinta con el error crudo, así que basta saber que apareció.
vi.mock('@/components/estado/FalloDeCarga', () => ({
  FalloDeCarga: ({ queEs }: { queEs?: string }) =>
    React.createElement('div', { 'data-testid': 'fallo-de-carga' }, queEs),
}))

// Parcial: `@/components/ui` reexporta media docena de primitivas del DS y un
// mock total las borra a todas.
vi.mock('@leasefy/cadence', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  SearchInput: (props: Record<string, unknown>) =>
    React.createElement('input', { 'data-testid': props['data-testid'] }),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    variant,
    size,
    hideArrow,
    asChild,
    ...props
  }: Record<string, unknown> & { children?: React.ReactNode }) => {
    void variant
    void size
    void hideArrow
    void asChild
    return React.createElement('button', props, children)
  },
}))

vi.mock('@/components/ui/spinner', () => ({
  Spinner: () => React.createElement('div', { 'data-testid': 'spinner' }),
}))

vi.mock('@/components/ui/pagination', () => ({
  TablePagination: () => React.createElement('div', { 'data-testid': 'pagination' }),
}))

vi.mock('@/components/ui/select', () => {
  const passthrough = (testid: string) =>
    function MockSelect({ children }: { children?: React.ReactNode }) {
      return React.createElement('div', { 'data-testid': testid }, children)
    }
  return {
    Select: passthrough('select'),
    SelectContent: passthrough('select-content'),
    SelectItem: passthrough('select-item'),
    SelectTrigger: passthrough('select-trigger'),
    SelectValue: passthrough('select-value'),
  }
})

/*
 * El Sheet del DS, con la parte que importa acá: Radix mantiene el contenido
 * montado mientras dura la animación de salida. El mock lo imita — se queda
 * montado un ciclo tras `open: false` — para que el test pueda ver si el cuerpo
 * del cajón se vació de golpe.
 */
vi.mock('@/components/ui/sheet', () => {
  const passthrough = (tag: string) =>
    function MockSheetPart({ children }: { children?: React.ReactNode }) {
      return React.createElement(tag, null, children)
    }
  return {
    Sheet: ({
      children,
      open,
      onOpenChange,
    }: {
      children?: React.ReactNode
      open?: boolean
      onOpenChange?: (o: boolean) => void
    }) => {
      const [seVio, setSeVio] = React.useState(false)
      React.useEffect(() => {
        if (open) setSeVio(true)
      }, [open])
      if (!open && !seVio) return null
      return React.createElement(
        'div',
        null,
        React.createElement(
          'button',
          { 'data-testid': 'sheet-close', onClick: () => onOpenChange?.(false) },
          'x',
        ),
        children,
      )
    },
    SheetContent: passthrough('div'),
    SheetHeader: passthrough('div'),
    SheetTitle: passthrough('h2'),
  }
})

vi.mock('@/components/ui/tabs', () => {
  const Ctx = React.createContext<(v: string) => void>(() => {})
  return {
    Tabs: ({
      children,
      onValueChange,
    }: {
      children?: React.ReactNode
      onValueChange?: (v: string) => void
    }) => React.createElement(Ctx.Provider, { value: onValueChange ?? (() => {}) }, children),
    TabsList: ({ children }: { children?: React.ReactNode }) =>
      React.createElement('div', null, children),
    TabsTrigger: ({ children, value }: { children?: React.ReactNode; value: string }) => {
      const set = React.useContext(Ctx)
      return React.createElement(
        'button',
        { 'data-testid': `tab-${value}`, onClick: () => set(value) },
        children,
      )
    },
  }
})

vi.mock('@/components/ui/table', () => {
  const el = (tag: string) => {
    const MockEl = ({ children, ...props }: { children?: React.ReactNode }) =>
      React.createElement(tag, props, children)
    MockEl.displayName = `MockTable_${tag}`
    return MockEl
  }
  return {
    Table: el('table'),
    TableHeader: el('thead'),
    TableBody: el('tbody'),
    TableRow: el('tr'),
    TableHead: el('th'),
    TableCell: el('td'),
  }
})

// ── Import page AFTER mocks ───────────────────────────────────────────────
import DocumentosPage from './page'
import { toast } from '@/components/ui/toast'
import { actasApi } from '@/lib/hooks/useInmobiliaria'
import { ApiError } from '@/lib/api/client'

const SIN_DOCUMENTOS = {
  documentos: [],
  plantillas: [],
  cargando: false,
  error: null,
  recargar: vi.fn(),
  agregar: vi.fn(),
}

const SIN_ACTAS = {
  actas: [],
  isLoading: false,
  errorCrudo: null,
  refetch: vi.fn(),
}

/** El permiso tal como lo resuelve `AGENCY_ROLE_DEFAULTS` para cada rol. */
function permisosDe(rol: 'ADMIN' | 'AGENTE' | 'CONTADOR' | 'VIEWER') {
  const matriz: Record<string, Record<string, string[]>> = {
    ADMIN: { documentos: ['view', 'create'], portafolio: ['view', 'create'] },
    AGENTE: { documentos: ['view', 'create'], portafolio: ['view', 'create'] },
    CONTADOR: { documentos: ['view'], portafolio: [] },
    VIEWER: { documentos: ['view'], portafolio: ['view'] },
  }
  return (modulo: string, accion: string) =>
    (matriz[rol][modulo] ?? []).includes(accion)
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  canAccessMock.mockReset()
  useDocumentosLegalesMock.mockReset()
  useActasEntregaMock.mockReset()
  useDocumentosLegalesMock.mockReturnValue(SIN_DOCUMENTOS)
  useActasEntregaMock.mockReturnValue(SIN_ACTAS)
  useConsignacionesMock.mockReset()
  useConsignacionesMock.mockReturnValue({ consignaciones: [], isLoading: false, errorCrudo: null })
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
  vi.clearAllMocks()
})

async function renderPage() {
  await act(async () => {
    root.render(React.createElement(DocumentosPage))
  })
}

function abrirPestana(valor: string) {
  const tab = container.querySelector<HTMLButtonElement>(`[data-testid="tab-${valor}"]`)
  expect(tab).not.toBeNull()
  act(() => {
    tab!.click()
  })
}

describe('Documentos — la pestaña de actas no puede mentir un vacío', () => {
  it('un 403 sobre las actas se pinta como fallo, no como «todavía no hay actas»', async () => {
    canAccessMock.mockImplementation(permisosDe('CONTADOR'))
    useActasEntregaMock.mockReturnValue({
      ...SIN_ACTAS,
      errorCrudo: Object.assign(new Error('Forbidden'), { status: 403 }),
    })

    await renderPage()
    abrirPestana('actas')

    expect(container.querySelector('[data-testid="fallo-de-carga"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="sin-datos"]')).toBeNull()
  })

  it('sin error, la pestaña de actas sigue mostrando su vacío', async () => {
    canAccessMock.mockImplementation(permisosDe('ADMIN'))

    await renderPage()
    abrirPestana('actas')

    expect(container.querySelector('[data-testid="fallo-de-carga"]')).toBeNull()
    expect(container.querySelector('[data-testid="sin-datos"]')).not.toBeNull()
  })

  it('un fallo de los documentos NO contamina la pestaña de actas', async () => {
    canAccessMock.mockImplementation(permisosDe('ADMIN'))
    useDocumentosLegalesMock.mockReturnValue({
      ...SIN_DOCUMENTOS,
      error: Object.assign(new Error('boom'), { status: 500 }),
    })

    await renderPage()
    expect(container.querySelector('[data-testid="fallo-de-carga"]')).not.toBeNull()

    abrirPestana('actas')
    expect(container.querySelector('[data-testid="fallo-de-carga"]')).toBeNull()
    expect(container.querySelector('[data-testid="sin-datos"]')).not.toBeNull()
  })
})

describe('Documentos — los cajones no se van en blanco', () => {
  const PLANTILLA = {
    id: 'p-1',
    name: 'Contrato de vivienda urbana',
    category: 'CONTRATO' as const,
    version: '1.0',
    variables: ['ciudad'],
    codigo: 'CONTRATO_VIVIENDA' as const,
    isActive: true,
    updatedAt: '2026-09-01T00:00:00Z',
    content: '<p>{{ciudad}}</p>',
  }

  it('al cerrar, el contenido sigue montado mientras el cajón sale', async () => {
    canAccessMock.mockImplementation(permisosDe('ADMIN'))
    useDocumentosLegalesMock.mockReturnValue({ ...SIN_DOCUMENTOS, plantillas: [PLANTILLA] })

    await renderPage()
    abrirPestana('plantillas')

    const ver = container.querySelector<HTMLButtonElement>('[data-testid="plantilla-ver"]')
    expect(ver).not.toBeNull()
    act(() => { ver!.click() })
    expect(container.querySelector('iframe')).not.toBeNull()

    // Cerrar: `plantillaAbierta` vuelve a null pero el iframe tiene que seguir
    // ahí — es lo que Radix desliza hacia afuera.
    const cerrar = container.querySelector<HTMLElement>('[data-testid="sheet-close"]')
    expect(cerrar).not.toBeNull()
    act(() => { cerrar!.click() })
    expect(container.querySelector('iframe')).not.toBeNull()
  })
})

describe('Documentos — los botones del vacío piden el permiso que el backend exige', () => {
  it('un VIEWER no ve «Generar documento» en el vacío de documentos', async () => {
    canAccessMock.mockImplementation(permisosDe('VIEWER'))
    await renderPage()

    expect(container.querySelector('[data-testid="sin-datos"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="sin-datos-crear"]')).toBeNull()
    // Y tampoco el de la cabecera, que ya estaba detrás del gate.
    expect(container.querySelector('[data-testid="documentos-generar"]')).toBeNull()
  })

  it('un AGENTE sí ve «Generar documento» en el vacío', async () => {
    canAccessMock.mockImplementation(permisosDe('AGENTE'))
    await renderPage()

    expect(container.querySelector('[data-testid="sin-datos-crear"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="documentos-generar"]')).not.toBeNull()
  })

  it('un VIEWER no ve «Nueva acta»: crear un acta pide portafolio:create', async () => {
    canAccessMock.mockImplementation(permisosDe('VIEWER'))
    await renderPage()
    abrirPestana('actas')

    expect(container.querySelector('[data-testid="sin-datos"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="sin-datos-crear"]')).toBeNull()
  })

  it('un AGENTE sí ve «Nueva acta»', async () => {
    canAccessMock.mockImplementation(permisosDe('AGENTE'))
    await renderPage()
    abrirPestana('actas')

    expect(container.querySelector('[data-testid="sin-datos-crear"]')).not.toBeNull()
  })
})

describe('Documentos — contadores, errores del acta y consignaciones caídas (D1 · D2 · D3)', () => {
  const chipActas = () => container.querySelector('[data-testid="chip-actas"]')

  async function abrirNuevaActa() {
    abrirPestana('actas')
    const crear = container.querySelector<HTMLButtonElement>('[data-testid="sin-datos-crear"]')
    expect(crear).not.toBeNull()
    await act(async () => {
      crear!.click()
    })
  }

  it('🔴 con las actas en 403 el chip dice «—», no «0»', async () => {
    canAccessMock.mockImplementation(permisosDe('CONTADOR'))
    useActasEntregaMock.mockReturnValue({ ...SIN_ACTAS, errorCrudo: new ApiError(403, 'Forbidden resource') })
    await renderPage()

    expect(chipActas()?.textContent).toBe('—')
  })

  it('sin error el chip cuenta las actas', async () => {
    canAccessMock.mockImplementation(permisosDe('AGENTE'))
    await renderPage()

    expect(chipActas()?.textContent).toBe('0')
  })

  it('🔴 guardar un acta que el back rechaza muestra LO QUE DIJO el back, no una clave fija', async () => {
    canAccessMock.mockImplementation(permisosDe('AGENTE'))
    vi.mocked(actasApi.create).mockRejectedValue(
      new ApiError(409, 'El inmueble ya tiene un acta de entrega abierta'),
    )
    // Hace falta un inmueble ARRENDADO: sin ninguno el cajón ya no abre el
    // formulario, lo dice (D3).
    useConsignacionesMock.mockReturnValue({
      consignaciones: [{ id: 'c-1', availability: 'rented', propertyTitle: 'Inmueble c-1' }],
      isLoading: false,
      errorCrudo: null,
    })
    await renderPage()
    await abrirNuevaActa()

    const guardar = container.querySelector<HTMLButtonElement>('[data-testid="acta-form-guardar"]')
    expect(guardar).not.toBeNull()
    await act(async () => {
      guardar!.click()
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(toast.error).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ description: 'El inmueble ya tiene un acta de entrega abierta' }),
    )
  })

  it('🔴 con las consignaciones caídas no abre un formulario con el selector vacío: lo dice antes', async () => {
    canAccessMock.mockImplementation(permisosDe('AGENTE'))
    useConsignacionesMock.mockReturnValue({
      consignaciones: [],
      isLoading: false,
      errorCrudo: new ApiError(500, 'Internal server error'),
    })
    await renderPage()
    await abrirNuevaActa()

    expect(toast.error).toHaveBeenCalledWith(
      'No se pudieron traer los inmuebles arrendados',
      expect.objectContaining({ description: expect.any(String) }),
    )
    expect(container.querySelector('[data-testid="acta-form-guardar"]')).toBeNull()
  })

  /** Un inmueble del portafolio, arrendado o no. */
  const inmueble = (id: string, availability: string) =>
    ({ id, availability, propertyTitle: `Inmueble ${id}` }) as never

  it('con un inmueble arrendado, «Nueva acta» abre el formulario', async () => {
    canAccessMock.mockImplementation(permisosDe('AGENTE'))
    useConsignacionesMock.mockReturnValue({
      consignaciones: [inmueble('c-1', 'rented')],
      isLoading: false,
      errorCrudo: null,
    })
    await renderPage()
    await abrirNuevaActa()

    expect(container.querySelector('[data-testid="acta-form-guardar"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="acta-solo-arrendados"]')).toBeNull()
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('🔴 D3: el selector esconde los inmuebles NO arrendados y ahora lo dice, con los dos números', async () => {
    canAccessMock.mockImplementation(permisosDe('AGENTE'))
    useConsignacionesMock.mockReturnValue({
      consignaciones: [
        inmueble('c-1', 'rented'),
        inmueble('c-2', 'available'),
        inmueble('c-3', 'available'),
      ],
      isLoading: false,
      errorCrudo: null,
    })
    await renderPage()
    await abrirNuevaActa()

    const aviso = container.querySelector('[data-testid="acta-solo-arrendados"]')
    expect(aviso).not.toBeNull()
    // Los dos números: cuántos se listan y cuántos se escondieron, y por qué.
    expect(aviso!.textContent).toContain('1')
    expect(aviso!.textContent).toContain('2')
    expect(container.querySelector('[data-testid="acta-form-guardar"]')).not.toBeNull()
  })

  it('🔴 D3: sin ningún inmueble arrendado lo dice, en vez de abrir un selector vacío', async () => {
    canAccessMock.mockImplementation(permisosDe('AGENTE'))
    useConsignacionesMock.mockReturnValue({
      consignaciones: [inmueble('c-2', 'available')],
      isLoading: false,
      errorCrudo: null,
    })
    await renderPage()
    await abrirNuevaActa()

    expect(container.querySelector('[data-testid="acta-sin-arrendados"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="acta-form-guardar"]')).toBeNull()
  })
})
