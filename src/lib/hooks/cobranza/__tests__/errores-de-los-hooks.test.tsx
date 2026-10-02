/**
 * Los hooks de cobranza no se tragan el error (02-10-2026, tanda 2 de
 * errores, A6).
 *
 * Antes: `throw new Error(\`${res.status}\`)`, `{ error: 'approve 500' }`, un
 * estado que la pantalla no leía, un `try/finally` sin `catch`, la red caída
 * leída como «Próximamente». Ahora cada acción deja pasar el `ApiError` del
 * micro (status, `code`, `message`, `campos`) o el error de la red TAL CUAL,
 * y lo que se le dice a la persona sale del traductor:
 *   · un 400 con `campos` llega con sus campos;
 *   · un 5xx dice «de nuestro lado» con la referencia;
 *   · un `fetch` que no salió (status 0) habla de la conexión.
 *
 * Convención del repo: createRoot + act, sin RTL.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

import { ApiError } from '@/lib/api/client'
import { camposDelError, mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'

void React

const { agentFetchMock } = vi.hoisted(() => ({ agentFetchMock: vi.fn() }))

vi.mock('@/lib/api/agent-fetch', () => ({
  agentFetch: (...a: unknown[]) => agentFetchMock(...a),
}))
vi.mock('@/lib/api/agent-auth', () => ({
  agentAuthHeaders: (h?: HeadersInit) => new Headers(h),
}))
vi.mock('@/lib/auth', () => ({
  useAuth: () => ({ agency: { id: 'agencia-1' }, user: null, isAuthenticated: true, isLoading: false }),
}))
vi.mock('@/lib/hooks/useRefetchOnVisible', () => ({ useRefetchOnVisible: () => {} }))
vi.mock('@/lib/hooks/useVisibilityPolling', () => ({ useVisibilityPolling: () => {} }))
vi.mock('@/lib/context/PIIRevealContext', () => ({
  usePIIRevealContext: () => ({ debtorId: 'deudor-1', getRevealed: () => undefined, setRevealed: vi.fn() }),
}))

import { useAcuerdosGenerales } from '../use-acuerdos-generales'
import { useAgreementOffer } from '../use-agreement-offer'
import { usePaymentDetail } from '../use-payment-detail'
import { useEscalations } from '../use-escalations'
import { useCobranzaInbox } from '../use-inbox'
import { useCarteraImport } from '../use-cartera-import'
import { usePIIReveal } from '../use-pii-reveal'
import { useThresholds } from '../use-thresholds'
import { useDisputes } from '../use-disputes'
import { useCartaApproval } from '../use-carta-approval'
import { useOwnerReports } from '../use-owner-reports'

// ── Respuestas del micro ─────────────────────────────────────────────────────

function json(status: number, cuerpo: unknown): Response {
  return new Response(JSON.stringify(cuerpo), { status, headers: { 'content-type': 'application/json' } })
}

const SOBRE_400 = {
  statusCode: 400,
  code: 'DATOS_INVALIDOS',
  message: ['El nombre puede tener hasta 120 caracteres.'],
  campos: [{ campo: 'name', regla: 'longitud_maxima', mensaje: 'El nombre puede tener hasta 120 caracteres.' }],
  success: false,
  error: { name: 'ZodError', issues: [] },
}

/** El 500 del micro: el `error` en inglés y el `requestId`. */
const CUERPO_500 = { error: 'Internal Server Error', requestId: '7a1b2c3d-0000-4000-8000-000000000000' }

const SIN_RED = () => new TypeError('Failed to fetch')

/** Un `agentFetch` que contesta según la URL (y el método), con un GET vacío por defecto. */
function contestar(porRuta: (url: string, init?: RequestInit) => Response | Error | undefined) {
  agentFetchMock.mockImplementation(async (url: string, init?: RequestInit) => {
    const r = porRuta(url, init)
    if (r instanceof Error) throw r
    return r ?? json(200, {})
  })
}

// ── renderHook mínimo ────────────────────────────────────────────────────────

let contenedor: HTMLDivElement
let root: Root

beforeEach(() => {
  process.env.NEXT_PUBLIC_AGENT_URL = 'http://micro.test'
  agentFetchMock.mockReset()
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  root = createRoot(contenedor)
})

afterEach(() => {
  act(() => root.unmount())
  contenedor.remove()
})

async function montar<T>(usar: () => T): Promise<{ actual: () => T }> {
  const ref: { valor: T | null } = { valor: null }
  function Sonda() {
    ref.valor = usar()
    return null
  }
  await act(async () => {
    root.render(<Sonda />)
  })
  return { actual: () => ref.valor as T }
}

// ── Acuerdos generales ───────────────────────────────────────────────────────

describe('useAcuerdosGenerales: crear tira el ApiError del micro', () => {
  beforeEach(() => contestar(() => json(200, { acuerdos: [], generatedAt: '' })))

  it('un 400 llega con sus `campos` (para pintarlos en su campo)', async () => {
    const h = await montar(() => useAcuerdosGenerales())
    contestar((_u, init) => (init?.method === 'POST' ? json(400, SOBRE_400) : undefined))
    const error = await h
      .actual()
      .crear({ name: 'x'.repeat(130), conditionEs: 'Paga' } as never)
      .catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(camposDelError(error)).toEqual([
      { campo: 'name', regla: 'longitud_maxima', mensaje: 'El nombre puede tener hasta 120 caracteres.' },
    ])
  })

  it('un 500 dice «de nuestro lado» con la referencia, no «500»', async () => {
    const h = await montar(() => useAcuerdosGenerales())
    contestar((_u, init) => (init?.method === 'POST' ? json(500, CUERPO_500) : undefined))
    const error = await h.actual().crear({} as never).catch((e: unknown) => e)
    const texto = mensajeParaLaPersona(error, { accion: 'guardar el acuerdo' })
    expect(texto).toContain('No pudimos guardar el acuerdo: algo falló de nuestro lado')
    expect(texto).toContain('7a1b2c3d')
  })

  it('un `fetch` que no salió llega tal cual: el traductor habla de la conexión', async () => {
    const h = await montar(() => useAcuerdosGenerales())
    contestar((_u, init) => (init?.method === 'DELETE' ? SIN_RED() : undefined))
    const error = await h.actual().borrar('a-1').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(TypeError)
    expect(mensajeParaLaPersona(error)).toMatch(/conexi[oó]n/i)
  })
})

// ── Ofrecer acuerdo ──────────────────────────────────────────────────────────

describe('useAgreementOffer: el error ya viene traducido', () => {
  const ENTRADA = { debtorId: 'd-1', stage: 'S1' as never, totalDueCop: 1000, interestsCop: 0 }

  it('un 500 dice «de nuestro lado» con la referencia (antes: «500» crudo)', async () => {
    contestar(() => json(500, CUERPO_500))
    const h = await montar(() => useAgreementOffer())
    await act(async () => {
      await h.actual().offer(ENTRADA)
    })
    expect(h.actual().error).toContain('No pudimos guardar la propuesta: algo falló de nuestro lado')
    expect(h.actual().error).toContain('7a1b2c3d')
    expect(h.actual().fallo).toBeInstanceOf(ApiError)
  })

  it('un 4xx con `message` lo dice, no el `error` en inglés ni el status', async () => {
    contestar(() =>
      json(409, { statusCode: 409, code: 'PLAN_ACTIVO', message: 'Este deudor ya tiene un plan activo.', error: 'conflict' }),
    )
    const h = await montar(() => useAgreementOffer())
    await act(async () => {
      await h.actual().offer(ENTRADA)
    })
    expect(h.actual().error).toBe('Este deudor ya tiene un plan activo.')
  })

  it('sólo un `fetch` que no salió habla de la conexión', async () => {
    contestar(() => SIN_RED())
    const h = await montar(() => useAgreementOffer())
    await act(async () => {
      await h.actual().offer(ENTRADA)
    })
    expect(h.actual().error).toMatch(/conexi[oó]n/i)
  })
})

// ── Verificar pago ───────────────────────────────────────────────────────────

describe('usePaymentDetail: verificar deja el fallo donde la pantalla lo lee', () => {
  const PAGO = { payment: { id: 'p-1', status: 'self_reported', debtor: {} }, generatedAt: '' }

  it('un 500 queda en `falloDeVerificacion` y NO ensucia el error de la carga', async () => {
    contestar((url, init) => (init?.method === 'POST' ? json(500, CUERPO_500) : json(200, PAGO)))
    const h = await montar(() => usePaymentDetail({ paymentId: 'p-1' }))
    let salio: boolean | undefined
    await act(async () => {
      salio = await h.actual().verifyPayment('approve')
    })
    expect(salio).toBe(false)
    expect(h.actual().error).toBeNull()
    expect(mensajeParaLaPersona(h.actual().falloDeVerificacion, { accion: 'verificar el pago' })).toContain(
      'No pudimos verificar el pago: algo falló de nuestro lado',
    )
  })

  it('un `fetch` que no salió queda tal cual (conexión)', async () => {
    contestar((url, init) => (init?.method === 'POST' ? SIN_RED() : json(200, PAGO)))
    const h = await montar(() => usePaymentDetail({ paymentId: 'p-1' }))
    await act(async () => {
      await h.actual().verifyPayment('approve')
    })
    expect(h.actual().falloDeVerificacion).toBeInstanceOf(TypeError)
    expect(mensajeParaLaPersona(h.actual().falloDeVerificacion)).toMatch(/conexi[oó]n/i)
  })
})

// ── Escalaciones ─────────────────────────────────────────────────────────────

describe('useEscalations: tomar y asignar no dejan rechazos sin atrapar', () => {
  const LISTA = { open: [], assigned: [], resolved: [], resolvedNextCursor: null, generatedAt: '' }

  it('tomar sin red devuelve el fallo (status 0) en vez de tirar', async () => {
    contestar((url, init) => (init?.method === 'POST' ? SIN_RED() : json(200, LISTA)))
    const h = await montar(() => useEscalations())
    const r = await h.actual().claim('e-1')
    expect(r.ok).toBe(false)
    expect(r.status).toBe(0)
    expect(mensajeParaLaPersona(r.fallo)).toMatch(/conexi[oó]n/i)
  })

  it('asignar con un 409 trae el `message` del micro', async () => {
    contestar((url, init) =>
      init?.method === 'POST'
        ? json(409, { statusCode: 409, code: 'YA_ASIGNADA', message: 'Otra persona ya tomó esta escalación.' })
        : json(200, LISTA),
    )
    const h = await montar(() => useEscalations())
    const r = await h.actual().assign('e-1', 'ana@ejemplo.co')
    expect(r.ok).toBe(false)
    expect(r.status).toBe(409)
    expect(mensajeParaLaPersona(r.fallo)).toBe('Otra persona ya tomó esta escalación.')
  })
})

// ── Bandeja ──────────────────────────────────────────────────────────────────

describe('useCobranzaInbox: marcar leído ya no se traga el error', () => {
  it('un 500 rechaza con el ApiError del micro', async () => {
    contestar((url, init) => (init?.method === 'POST' ? json(500, CUERPO_500) : json(200, { groups: [] })))
    const h = await montar(() => useCobranzaInbox())
    const error = await h.actual().markRead('hilo-1').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(500)
  })
})

// ── Importar cartera ─────────────────────────────────────────────────────────

describe('useCarteraImport: la red caída no es «Próximamente»', () => {
  const ARCHIVO = new File(['cedula,nombre\n1,Ana'], 'cartera.csv', { type: 'text/csv' })

  it('un `fetch` que no salió dice conexión, en estado de error', async () => {
    contestar(() => SIN_RED())
    const h = await montar(() => useCarteraImport())
    await act(async () => {
      await h.actual().importFile(ARCHIVO)
    })
    expect(h.actual().status).toBe('error')
    expect(h.actual().message).toMatch(/conexi[oó]n/i)
    expect(h.actual().message).not.toMatch(/Próximamente/)
  })

  it('un 400 dice qué tiene el archivo (el `message` del sobre), no el código en inglés', async () => {
    contestar(() =>
      json(400, { statusCode: 400, code: 'ARCHIVO_INVALIDO', message: 'El archivo no tiene la columna de la cédula.', error: 'bad_csv' }),
    )
    const h = await montar(() => useCarteraImport())
    await act(async () => {
      await h.actual().importFile(ARCHIVO)
    })
    expect(h.actual().message).toBe('El archivo no tiene la columna de la cédula.')
  })

  it('un 500 dice «de nuestro lado» con la referencia', async () => {
    contestar(() => json(500, CUERPO_500))
    const h = await montar(() => useCarteraImport())
    await act(async () => {
      await h.actual().importFile(ARCHIVO)
    })
    expect(h.actual().message).toContain('No pudimos importar la cartera: algo falló de nuestro lado')
    expect(h.actual().message).toContain('7a1b2c3d')
  })
})

// ── Revelar dato personal ────────────────────────────────────────────────────

describe('usePIIReveal: el 403 dice su `message`, no «403»', () => {
  it('un 403 del sobre llega como frase', async () => {
    contestar(() =>
      json(403, { statusCode: 403, code: 'SIN_PERMISO', message: 'Tu rol no puede ver datos personales.' }),
    )
    const h = await montar(() => usePIIReveal({ field: 'cedula' }))
    await act(async () => {
      await h.actual().mint()
    })
    expect(h.actual().error).toBe('Tu rol no puede ver datos personales.')
  })
})

// ── Umbrales ─────────────────────────────────────────────────────────────────

describe('useThresholds: guardar tira el ApiError con sus campos', () => {
  it('un 400 llega con `campos` (antes: «400: {cuerpo crudo}»)', async () => {
    const UMBRAL = { version: 1, top_n_debtors_in_report: 5, mora_dias_bucket_boundaries: [0, 8], pkr_pct_alert_below: 80, indice_morosidad_pct_alert_above: 10, compliance_violations_critical_at_least: 1, calls_outside_window_critical_at_least: 1 }
    contestar((url, init) =>
      init?.method === 'PUT'
        ? json(400, { ...SOBRE_400, campos: [{ campo: 'top_n_debtors_in_report', regla: 'maximo', mensaje: 'Va de 1 a 50.' }] })
        : json(200, url.includes('history') ? { items: [UMBRAL] } : UMBRAL),
    )
    const h = await montar(() => useThresholds())
    const error = await h.actual().updateThresholds(UMBRAL as never).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(camposDelError(error)[0]?.campo).toBe('top_n_debtors_in_report')
  })
})

// ── Disputas ─────────────────────────────────────────────────────────────────

describe('useDisputes: abrir devuelve el fallo, no sólo el status', () => {
  it('un 400 trae `fallo` con sus campos', async () => {
    contestar((url, init) =>
      init?.method === 'POST'
        ? json(400, { ...SOBRE_400, campos: [{ campo: 'reason', regla: 'longitud_maxima', mensaje: 'El motivo puede tener hasta 2000 caracteres.' }] })
        : json(200, { disputes: [] }),
    )
    const h = await montar(() => useDisputes())
    const r = await h.actual().openDispute({ debtorId: 'd', reason: 'x' } as never)
    expect(r.ok).toBe(false)
    expect(r.status).toBe(400)
    expect(camposDelError(r.fallo)[0]?.campo).toBe('reason')
  })

  it('sin red: status 0 y el TypeError tal cual (no «el servicio no está disponible»)', async () => {
    contestar((url, init) => (init?.method === 'POST' ? SIN_RED() : json(200, { disputes: [] })))
    const h = await montar(() => useDisputes())
    const r = await h.actual().resolveDispute('x', {} as never)
    expect(r.status).toBe(0)
    expect(r.fallo).toBeInstanceOf(TypeError)
    expect(r.error).toBeUndefined()
  })
})

// ── Cartas y reportes a propietarios ─────────────────────────────────────────

describe('aprobar una carta / generar un reporte: el fallo queda para el traductor', () => {
  it('carta: un 500 deja `approveFallo` (antes se pintaba el cuerpo crudo)', async () => {
    contestar(() => json(500, CUERPO_500))
    const h = await montar(() => useCartaApproval())
    await act(async () => {
      await h.actual().approve('c-1', 'servicio_472', 'Calle 1 # 2-3')
    })
    expect(h.actual().approveError).toBe('approve 500')
    expect(mensajeParaLaPersona(h.actual().approveFallo, { accion: 'aprobar la carta' })).toContain(
      'No pudimos aprobar la carta: algo falló de nuestro lado',
    )
  })

  it('reporte: sin red, `generateFallo` es el TypeError (conexión)', async () => {
    contestar((url, init) => (init?.method === 'POST' ? SIN_RED() : json(200, { items: [] })))
    const h = await montar(() => useOwnerReports())
    await act(async () => {
      await h.actual().generate({ debtorId: 'd-1' } as never)
    })
    expect(h.actual().generateFallo).toBeInstanceOf(TypeError)
    expect(mensajeParaLaPersona(h.actual().generateFallo)).toMatch(/conexi[oó]n/i)
  })
})
