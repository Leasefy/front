/**
 * NuevaCotizacionPage — Phase 33 plan 33-06 re-quote pre-fill flow unit tests.
 *
 * Uses createRoot + act + happy-dom (matches repo convention).
 * Mocks: useAuth, useSearchParams, useRouter, useQuoteMetadata,
 *        useWizardDraft, PermissionsContext, i18n, PageGuard.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as React from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

// ---------------------------------------------------------------------------
// Mock state (mutable per-test)
// ---------------------------------------------------------------------------

const PARENT_UUID = '11111111-2222-3333-4444-555555555555'
const FULL_HASH = 'a'.repeat(64)

let mockFromParam: string | null = null
let mockMetadata: {
  data: {
    quoteId: string
    cedulaHashPrefix8: string
    canonCop: number
    ciudad: string
    tipoInmueble: string
    status: string
    createdAt: string
    completedAt: string | null
    cedulaHash?: string
  } | null
  isLoading: boolean
  error: string | null
} = { data: null, isLoading: false, error: null }
let mockHasDraft = false

const routerPush = vi.fn()
const routerBack = vi.fn()
const routerReplace = vi.fn()

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    agency: { id: 'agency-001' },
    user: null,
    isAuthenticated: true,
    isLoading: false,
  }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPush, back: routerBack, replace: routerReplace }),
  useSearchParams: () => ({
    get: (key: string) => (key === 'from' ? mockFromParam : null),
  }),
  usePathname: () => '/',
}))

vi.mock('@/lib/context/PermissionsContext', () => ({
  usePermissionsContext: () => ({
    permissions: null,
    isLoading: false,
    error: null,
    canAccess: () => true,
    isAdmin: true,
    agencyRole: null,
    refetch: vi.fn(),
  }),
  usePermissionsContextSafe: () => null,
}))

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    locale: 'es',
    setLocale: vi.fn(),
  }),
}))

vi.mock('@/lib/hooks/cotizador/use-wizard-draft', () => ({
  DRAFT_KEY: 'cotizador.draft.wizard',
  DRAFT_TTL_MS: 24 * 60 * 60 * 1000,
  useWizardDraft: () => ({
    draft: null,
    hasDraft: mockHasDraft,
    save: vi.fn(),
    clear: vi.fn(),
  }),
}))

vi.mock('@/lib/hooks/cotizador/use-quote-metadata', () => ({
  useQuoteMetadata: (_qid: string) => mockMetadata,
}))

vi.mock('@/lib/api/client', async (importOriginal) => ({
  // `ApiError` de verdad: `falloDeLaRespuesta` lo arma con el status y el cuerpo.
  ...(await importOriginal<typeof import('@/lib/api/client')>()),
  getAccessToken: () => 'test-token',
}))

vi.mock('@/lib/cotizador/hash-cedula', () => ({
  hashCedula: vi.fn(async (raw: string) => 'b'.repeat(64) + `_${raw}`),
  CedulaValidationError: class CedulaValidationError extends Error {},
}))

vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children: React.ReactNode }) => children,
}))

// Stub the wizard step components so test focuses on page-level re-quote logic.
vi.mock('@/components/inmobiliaria/cotizador/WizardStepIndicator', () => ({
  WizardStepIndicator: () => null,
}))
vi.mock('@/components/inmobiliaria/cotizador/WizardStep1Candidato', () => ({
  WizardStep1Candidato: ({ value, errors, onNext, onChange }: any) => (
    <div data-testid="step1">
      <input
        data-testid="step1-cedula"
        value={value.cedula}
        onChange={(e) => onChange('cedula', e.target.value)}
      />
      <input
        id="cotizador-nombre"
        data-testid="step1-nombre"
        value={value.nombre}
        onChange={(e) => onChange('nombre', e.target.value)}
      />
      <span data-testid="step1-nombre-error">{errors?.nombre ?? ''}</span>
      <input
        data-testid="step1-ciudad"
        value={value.ciudad}
        onChange={(e) => onChange('ciudad', e.target.value)}
      />
      <span data-testid="step1-cedula-error">{errors?.cedula ?? ''}</span>
      <button data-testid="step1-next" type="button" onClick={onNext}>
        next
      </button>
    </div>
  ),
}))
vi.mock('@/components/inmobiliaria/cotizador/WizardStep2Propiedad', () => ({
  WizardStep2Propiedad: ({ onNext, onBack, errors }: any) => (
    <div data-testid="step2">
      <input id="cotizador-canon" data-testid="step2-canon" />
      <span data-testid="step2-canon-error">{errors?.canonCop ?? ''}</span>
      <button data-testid="step2-next" type="button" onClick={onNext}>
        next
      </button>
      <button data-testid="step2-back" type="button" onClick={onBack}>
        back
      </button>
    </div>
  ),
}))
vi.mock('@/components/inmobiliaria/cotizador/WizardStep3Config', () => ({
  WizardStep3Config: ({ onNext, onBack }: any) => (
    <div data-testid="step3-config">
      <button data-testid="step3-config-next" type="button" onClick={onNext}>
        next
      </button>
      <button data-testid="step3-config-back" type="button" onClick={onBack}>
        back
      </button>
    </div>
  ),
  EMPTY_WIZARD_CONFIG: {
    carrierMode: 'recomendar',
    selectedCarriers: [],
    priority: 'probabilidad',
    runMode: 'automatico',
  },
}))
vi.mock('@/components/inmobiliaria/cotizador/WizardStep3Review', () => ({
  WizardStep3Review: ({ onSubmit }: any) => (
    <div data-testid="step3">
      <button data-testid="step3-submit" type="button" onClick={onSubmit}>
        submit
      </button>
    </div>
  ),
}))
vi.mock('@/components/inmobiliaria/cotizador/WizardRestoreBanner', () => ({
  WizardRestoreBanner: () => null,
}))

// ---------------------------------------------------------------------------
// Import under test (AFTER mocks)
// ---------------------------------------------------------------------------

import NuevaCotizacionPage from './page'

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

interface Harness {
  root: Root
  container: HTMLDivElement
}

function mount(): Harness {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => {
    root.render(<NuevaCotizacionPage />)
  })
  return { root, container }
}

function unmount(h: Harness): void {
  act(() => {
    h.root.unmount()
  })
  h.container.remove()
}

function getText(container: HTMLElement, sel: string): string {
  return (container.querySelector(sel)?.textContent ?? '').trim()
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

// Polyfill localStorage if missing/incomplete under happy-dom
function ensureLocalStorage(): void {
  const ls = window.localStorage
  if (!ls || typeof ls.setItem !== 'function') {
    const store: Record<string, string> = {}
    const mock = {
      getItem: (k: string) => (k in store ? store[k] : null),
      setItem: (k: string, v: string) => {
        store[k] = String(v)
      },
      removeItem: (k: string) => {
        delete store[k]
      },
      clear: () => {
        for (const k of Object.keys(store)) delete store[k]
      },
      key: (i: number) => Object.keys(store)[i] ?? null,
      get length() {
        return Object.keys(store).length
      },
    }
    Object.defineProperty(window, 'localStorage', {
      value: mock,
      writable: true,
      configurable: true,
    })
  }
}

describe('NuevaCotizacionPage — Phase 33 re-quote flow', () => {
  beforeEach(() => {
    ensureLocalStorage()
    mockFromParam = null
    mockMetadata = { data: null, isLoading: false, error: null }
    mockHasDraft = false
    routerPush.mockReset()
    routerBack.mockReset()
    routerReplace.mockReset()
    // Reset env
    ;(process.env as Record<string, string>).NEXT_PUBLIC_AGENT_URL = 'http://agent.test'
    // Clear localStorage between tests (happy-dom localStorage may lack clear())
    try {
      window.localStorage.clear?.()
    } catch {
      /* ignore */
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('(a) normal mode: no re-quote UI when ?from absent', () => {
    const h = mount()
    // No cédula notice
    const notice = h.container.querySelector('[aria-label="inmobiliaria.ai.cotizador.reQuote.cedulaNotice.ariaLabel"]')
    expect(notice).toBeNull()
    // Step 1 renders
    expect(h.container.querySelector('[data-testid="step1"]')).not.toBeNull()
    unmount(h)
  })

  it('(b) valid ?from UUID: pre-fill notice renders when metadata returns cedulaHash', () => {
    mockFromParam = PARENT_UUID
    mockMetadata = {
      data: {
        quoteId: PARENT_UUID,
        cedulaHashPrefix8: 'aaaaaaaa',
        canonCop: 1500000,
        ciudad: 'Bogotá',
        tipoInmueble: 'apartamento',
        status: 'completed',
        createdAt: '2026-05-20',
        completedAt: '2026-05-20',
        cedulaHash: FULL_HASH,
      },
      isLoading: false,
      error: null,
    }
    const h = mount()
    const notice = h.container.querySelector(
      '[aria-label="inmobiliaria.ai.cotizador.reQuote.cedulaNotice.ariaLabel"]'
    )
    expect(notice).not.toBeNull()
    expect(notice?.textContent).toContain('inmobiliaria.ai.cotizador.reQuote.cedulaNotice.message')
    expect(h.container.querySelector('[data-testid="step1"]')).not.toBeNull()
    unmount(h)
  })

  it('(c) invalid ?from value: console.warn called and no pre-fill notice', () => {
    mockFromParam = 'not-a-uuid'
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const h = mount()
    expect(warnSpy).toHaveBeenCalled()
    const notice = h.container.querySelector(
      '[aria-label="inmobiliaria.ai.cotizador.reQuote.cedulaNotice.ariaLabel"]'
    )
    expect(notice).toBeNull()
    unmount(h)
  })

  it('(d) pre-fill GET failure: prefillFailed banner renders with Volver + Continuar', () => {
    mockFromParam = PARENT_UUID
    mockMetadata = { data: null, isLoading: false, error: '404' }
    const h = mount()
    const banner = h.container.querySelector('[role="alert"]')
    expect(banner).not.toBeNull()
    expect(banner?.textContent).toContain('inmobiliaria.ai.cotizador.reQuote.prefillFailed.banner')
    const buttons = h.container.querySelectorAll('button')
    const labels = Array.from(buttons).map((b) => b.textContent?.trim() ?? '')
    expect(labels).toContain('inmobiliaria.ai.cotizador.reQuote.prefillFailed.volver')
    expect(labels).toContain('inmobiliaria.ai.cotizador.reQuote.prefillFailed.continuar')
    unmount(h)
  })

  it('(e) "Cambiar candidato" click removes the notice', () => {
    mockFromParam = PARENT_UUID
    mockMetadata = {
      data: {
        quoteId: PARENT_UUID,
        cedulaHashPrefix8: 'aaaaaaaa',
        canonCop: 1500000,
        ciudad: 'Bogotá',
        tipoInmueble: 'apartamento',
        status: 'completed',
        createdAt: '2026-05-20',
        completedAt: '2026-05-20',
        cedulaHash: FULL_HASH,
      },
      isLoading: false,
      error: null,
    }
    const h = mount()
    const noticeBefore = h.container.querySelector(
      '[aria-label="inmobiliaria.ai.cotizador.reQuote.cedulaNotice.ariaLabel"]'
    )
    expect(noticeBefore).not.toBeNull()
    const changeBtn = Array.from(h.container.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'inmobiliaria.ai.cotizador.reQuote.cedulaNotice.changeButton'
    )
    expect(changeBtn).toBeDefined()
    act(() => {
      changeBtn!.click()
    })
    const noticeAfter = h.container.querySelector(
      '[aria-label="inmobiliaria.ai.cotizador.reQuote.cedulaNotice.ariaLabel"]'
    )
    expect(noticeAfter).toBeNull()
    unmount(h)
  })

  it('(f) re-quote draft key written when advancing from step 1', () => {
    mockFromParam = PARENT_UUID
    mockMetadata = {
      data: {
        quoteId: PARENT_UUID,
        cedulaHashPrefix8: 'aaaaaaaa',
        canonCop: 1500000,
        ciudad: 'Bogotá',
        tipoInmueble: 'apartamento',
        status: 'completed',
        createdAt: '2026-05-20',
        completedAt: '2026-05-20',
        cedulaHash: FULL_HASH,
      },
      isLoading: false,
      error: null,
    }
    const setItemSpy = vi.spyOn(window.localStorage, 'setItem')
    const h = mount()
    // Fill nombre (ciudad pre-filled from metadata)
    const nombreInput = h.container.querySelector('[data-testid="step1-nombre"]') as HTMLInputElement
    const nativeInputSetter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value'
    )?.set
    act(() => {
      nativeInputSetter?.call(nombreInput, 'Juan')
      nombreInput.dispatchEvent(new Event('input', { bubbles: true }))
    })
    // Click next
    const nextBtn = h.container.querySelector('[data-testid="step1-next"]') as HTMLButtonElement
    act(() => {
      nextBtn.click()
    })
    const calls = setItemSpy.mock.calls.map((c) => c[0])
    expect(calls).toContain(`cotizador.draft.wizard:${PARENT_UUID}`)
    unmount(h)
  })

  it('(g) POST body includes re_quote_of + cedulaHash; NEVER contains bare "cedula" field', async () => {
    mockFromParam = PARENT_UUID
    mockMetadata = {
      data: {
        quoteId: PARENT_UUID,
        cedulaHashPrefix8: 'aaaaaaaa',
        canonCop: 1500000,
        ciudad: 'Bogotá',
        tipoInmueble: 'apartamento',
        status: 'completed',
        createdAt: '2026-05-20',
        completedAt: '2026-05-20',
        cedulaHash: FULL_HASH,
      },
      isLoading: false,
      error: null,
    }
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ quoteId: 'new-quote-id' }),
      } as unknown as Response)

    const h = mount()
    // Fill nombre
    const nombreInput = h.container.querySelector('[data-testid="step1-nombre"]') as HTMLInputElement
    const nativeInputSetter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value'
    )?.set
    act(() => {
      nativeInputSetter?.call(nombreInput, 'Juan')
      nombreInput.dispatchEvent(new Event('input', { bubbles: true }))
    })
    act(() => {
      ;(h.container.querySelector('[data-testid="step1-next"]') as HTMLButtonElement).click()
    })
    act(() => {
      ;(h.container.querySelector('[data-testid="step2-next"]') as HTMLButtonElement).click()
    })
    // Step 3 is now the config step (WizardStep3Config); advance to the review step.
    act(() => {
      ;(h.container.querySelector('[data-testid="step3-config-next"]') as HTMLButtonElement).click()
    })
    await act(async () => {
      ;(h.container.querySelector('[data-testid="step3-submit"]') as HTMLButtonElement).click()
    })
    // Allow promise microtasks
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(fetchSpy).toHaveBeenCalled()
    const body = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string)
    expect(body.re_quote_of).toBe(PARENT_UUID)
    expect(body.cedulaHash).toBe(FULL_HASH)
    // D-08 INVARIANT: no bare 'cedula' field in submit body
    expect(body).not.toHaveProperty('cedula')
    unmount(h)
  })

  it('(h) 429 submit response renders sessionCapHit error block', async () => {
    mockFromParam = PARENT_UUID
    mockMetadata = {
      data: {
        quoteId: PARENT_UUID,
        cedulaHashPrefix8: 'aaaaaaaa',
        canonCop: 1500000,
        ciudad: 'Bogotá',
        tipoInmueble: 'apartamento',
        status: 'completed',
        createdAt: '2026-05-20',
        completedAt: '2026-05-20',
        cedulaHash: FULL_HASH,
      },
      isLoading: false,
      error: null,
    }
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({}),
    } as unknown as Response)

    const h = mount()
    const nombreInput = h.container.querySelector('[data-testid="step1-nombre"]') as HTMLInputElement
    const nativeInputSetter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value'
    )?.set
    act(() => {
      nativeInputSetter?.call(nombreInput, 'Juan')
      nombreInput.dispatchEvent(new Event('input', { bubbles: true }))
    })
    act(() => {
      ;(h.container.querySelector('[data-testid="step1-next"]') as HTMLButtonElement).click()
    })
    act(() => {
      ;(h.container.querySelector('[data-testid="step2-next"]') as HTMLButtonElement).click()
    })
    // Step 3 is now the config step (WizardStep3Config); advance to the review step.
    act(() => {
      ;(h.container.querySelector('[data-testid="step3-config-next"]') as HTMLButtonElement).click()
    })
    await act(async () => {
      ;(h.container.querySelector('[data-testid="step3-submit"]') as HTMLButtonElement).click()
    })
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0))
    })

    expect(h.container.textContent).toContain('inmobiliaria.ai.cotizador.reQuote.sessionCapHit')
    unmount(h)
  })
})

// ---------------------------------------------------------------------------
// 02-10-2026 · El sistema de errores: lo que responde el micro al enviar
// ---------------------------------------------------------------------------

/** Monta la página con el `fetch` que responde lo que se le pase y llena el paso 1. */
async function enviarConLaRespuesta(respuesta: () => Promise<unknown>): Promise<Harness> {
  vi.spyOn(globalThis, 'fetch').mockImplementationOnce(() => respuesta() as Promise<Response>)
  const h = mount()
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  const escribir = (testid: string, valor: string) => {
    const input = h.container.querySelector(`[data-testid="${testid}"]`) as HTMLInputElement
    act(() => {
      setter?.call(input, valor)
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
  }
  escribir('step1-cedula', '1017234567')
  escribir('step1-nombre', 'Ana Restrepo')
  escribir('step1-ciudad', 'Medellín')
  act(() => {
    ;(h.container.querySelector('[data-testid="step1-next"]') as HTMLButtonElement).click()
  })
  return h
}

/** Perezosa: el `fetch` doble la llama recién cuando la página envía. */
function respuesta(status: number, cuerpo: unknown) {
  return () => Promise.resolve({ ok: status < 400, status, json: async () => cuerpo })
}

const METADATA_PARA_ENVIAR = {
  data: {
    quoteId: PARENT_UUID,
    cedulaHashPrefix8: 'aaaaaaaa',
    canonCop: 1500000,
    ciudad: 'Bogotá',
    tipoInmueble: 'apartamento',
    status: 'completed',
    createdAt: '2026-05-20',
    completedAt: '2026-05-20',
  },
  isLoading: false,
  error: null,
}

/**
 * Re-cotizar SIN la huella de la cédula: el paso 1 pide la cédula escrita (así
 * su error tiene dónde pintarse) y el paso 2 ya trae el canon y el tipo de la
 * cotización original (el doble del paso 2 no escribe).
 */
async function enviar(respuestaDelMicro: () => Promise<unknown>): Promise<Harness> {
  mockFromParam = PARENT_UUID
  mockMetadata = METADATA_PARA_ENVIAR
  const h = await enviarConLaRespuesta(respuestaDelMicro)
  act(() => {
    ;(h.container.querySelector('[data-testid="step2-next"]') as HTMLButtonElement).click()
  })
  act(() => {
    ;(h.container.querySelector('[data-testid="step3-config-next"]') as HTMLButtonElement).click()
  })
  await act(async () => {
    ;(h.container.querySelector('[data-testid="step3-submit"]') as HTMLButtonElement).click()
  })
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0))
  })
  return h
}

describe('NuevaCotizacionPage — lo que dice cuando el micro no acepta la consulta (02-10-2026)', () => {
  beforeEach(() => {
    ensureLocalStorage()
    mockHasDraft = false
    routerPush.mockReset()
    ;(process.env as Record<string, string>).NEXT_PUBLIC_AGENT_URL = 'http://agent.test'
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('🔴 un 400 con `campos` vuelve al paso del campo, lo pinta debajo y le da el foco', async () => {
    const h = await enviar(
      respuesta(400, {
        statusCode: 400,
        code: 'DATOS_INVALIDOS',
        message: ['El nombre no puede tener más de 200 caracteres.'],
        campos: [{ campo: 'nombre', regla: 'longitud_maxima', mensaje: 'El nombre no puede tener más de 200 caracteres.' }],
        success: false,
        error: 'Validation error',
      }),
    )
    expect(h.container.querySelector('[data-testid="step1"]')).not.toBeNull()
    expect(getText(h.container, '[data-testid="step1-nombre-error"]')).toBe(
      'El nombre no puede tener más de 200 caracteres.',
    )
    expect(document.activeElement?.id).toBe('cotizador-nombre')
    // Nada suelto: el error ya está en su campo.
    expect(h.container.querySelector('.bg-danger-soft')).toBeNull()
    expect(routerPush).not.toHaveBeenCalled()
    unmount(h)
  })

  it('un 400 en el canon vuelve al paso 2 y lo dice bajo el canon', async () => {
    const h = await enviar(
      respuesta(400, {
        statusCode: 400,
        code: 'DATOS_INVALIDOS',
        message: ['Este dato no puede ser mayor que 1.000.000.000.000.'],
        campos: [{ campo: 'canonCop', regla: 'maximo', mensaje: 'Este dato no puede ser mayor que 1.000.000.000.000.' }],
      }),
    )
    expect(h.container.querySelector('[data-testid="step2"]')).not.toBeNull()
    expect(getText(h.container, '[data-testid="step2-canon-error"]')).toContain('1.000.000.000.000')
    expect(document.activeElement?.id).toBe('cotizador-canon')
    unmount(h)
  })

  it('🔴 un 5xx dice «de nuestro lado» con la referencia del micro, sin culpar a la conexión', async () => {
    const h = await enviar(
      respuesta(500, {
        statusCode: 500,
        code: 'ERROR_INTERNO',
        message: 'Error interno del servidor',
        requestId: 'abcd1234-ffff-4fff-8fff-000000000000',
      }),
    )
    const texto = h.container.textContent ?? ''
    expect(texto).toContain('de nuestro lado')
    expect(texto).toContain('abcd1234')
    expect(texto).not.toMatch(/conexi[oó]n/i)
    expect(texto).not.toContain('Error 500')
    unmount(h)
  })

  it('🔴 sin respuesta (el `fetch` no salió) habla de la conexión', async () => {
    const h = await enviar(() => Promise.reject(new TypeError('Failed to fetch')))
    expect(h.container.textContent ?? '').toMatch(/conexi[oó]n/i)
    unmount(h)
  })

  it('un 403 del micro (en inglés, sin `message`) dice que no tienes permiso', async () => {
    const h = await enviar(respuesta(403, { error: 'Forbidden — no membership row' }))
    const texto = h.container.textContent ?? ''
    expect(texto).toContain('No tienes permiso para crear consultas de asegurabilidad')
    expect(texto).not.toContain('Forbidden')
    unmount(h)
  })
})

