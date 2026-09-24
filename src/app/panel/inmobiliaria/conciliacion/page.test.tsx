/**
 * La Sala de conciliación, con los hooks mockeados.
 *
 * Auditoría de casos de error 13-09. Lo que se protege:
 *   · K1 — cuando el resumen no llega, la pantalla lo DICE, con reintento; no
 *     se queda como una cuenta sin pendientes. Y un refresco que falla no borra
 *     los números: los marca como de la lectura anterior.
 *   · K2 — «Conciliar» no se ofrece mientras no se sabe qué hay, y dice por qué.
 *   · K3 — el sondeo de la corrida corta al primer fallo de lectura y avisa UNA
 *     vez.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

import type {
  ConciliacionSummaryResponse,
  LecturaDelResumen,
} from '@/lib/hooks/conciliacion/use-conciliacion-summary'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { resumen, corrida, toastMock, delBack } = vi.hoisted(() => ({
  resumen: {
    data: null as ConciliacionSummaryResponse | null,
    isLoading: false,
    error: null as string | null,
    notAvailable: false,
    refetch: vi.fn<() => Promise<LecturaDelResumen>>(),
  },
  corrida: {
    isRunning: false,
    requestRun: vi.fn<() => Promise<{ ok: boolean; enqueued?: boolean; reason?: string }>>(),
  },
  toastMock: { success: vi.fn(), error: vi.fn() },
  /*
   * 🔴 20-09 · El resumen del BACK, que es quien sabe si hay extracto cargado.
   * Antes esta pantalla decidía con los totales del AGENTE y afirmaba «todavía
   * no cargaste ningún extracto» con tres movimientos esperando en la pestaña
   * de al lado.
   */
  delBack: {
    valor: {
      pendientes: 0,
      ignorados: 0,
      conciliadosEsteMes: 0,
      ultimoExtracto: null as { nombre: string | null; cargadoAt: string } | null,
    },
  },
}))

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))
vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children?: React.ReactNode }) => children,
}))
vi.mock('@/lib/hooks/ai/use-agent-overview', () => ({
  useAgentOverview: () => ({ data: null }),
}))
vi.mock('@/lib/hooks/conciliacion/use-conciliacion-summary', () => ({
  useConciliacionSummary: () => resumen,
}))
vi.mock('@/lib/hooks/conciliacion/use-conciliacion-run', () => ({
  useConciliacionRun: () => corrida,
}))
vi.mock('@/components/ui/toast', () => ({ toast: toastMock }))
vi.mock('@/lib/api/conciliacion-bancaria.service', () => ({
  conciliacionBancariaApi: { resumen: () => Promise.resolve(delBack.valor) },
}))
vi.mock('@/components/inmobiliaria/ai/ColaHumana', () => ({ relativeTime: () => '' }))
vi.mock('@/components/inmobiliaria/ai/TrazaCaso', () => ({
  actorLabel: () => '',
  actorMeta: () => ({ cls: '' }),
}))

import ConciliacionSalaPage from './page'

function datos(movimientos = 10, conciliados = 2): ConciliacionSummaryResponse {
  return {
    tenantId: 't-1',
    generatedAt: '2026-09-13T00:00:00.000Z',
    taxonomy: {
      parciales: 0,
      duplicados: 0,
      diferencias_monto: 0,
      fuera_de_fecha: 0,
      sin_identificar: 0,
    },
    totals: { movimientos, conciliados, en_cola: 0, monto_conciliado_cop: 0 },
    tasa_conciliacion: 20,
  }
}

let host: HTMLDivElement
let root: Root

async function esperar() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0))
  })
}

async function montar() {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  await act(async () => {
    root.render(<ConciliacionSalaPage />)
  })
}

function $(selector: string): HTMLElement {
  const el = document.querySelector<HTMLElement>(selector)
  if (!el) throw new Error(`No se encontró ${selector}`)
  return el
}

async function clic(el: HTMLElement) {
  await act(async () => {
    el.click()
  })
  await esperar()
}

beforeEach(() => {
  resumen.data = null
  resumen.isLoading = false
  resumen.error = null
  resumen.notAvailable = false
  resumen.refetch.mockReset().mockResolvedValue({ data: null, error: null })
  corrida.isRunning = false
  corrida.requestRun.mockReset()
  toastMock.success.mockReset()
  toastMock.error.mockReset()
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
  document.body.innerHTML = ''
  vi.useRealTimers()
})

describe('/panel/inmobiliaria/conciliacion — cuando el resumen no llega', () => {
  it('🔴 K1: resumen caído y nada que mostrar → se dice que no cargó, con reintento', async () => {
    resumen.error = '500'
    await montar()

    const bloque = $('[data-testid="conciliacion-resumen-fallo"]')
    const fallo = bloque.querySelector('[data-testid="fallo-de-carga"]')
    expect(fallo).not.toBeNull()
    // Va dentro de su propia tarjeta: sin doble marco.
    expect(fallo!.getAttribute('data-enmarcado')).toBe('no')
    // Nada que se lea como «todo en orden».
    expect(document.querySelector('[data-testid="conciliacion-hallazgos"]')).toBeNull()

    await clic(bloque.querySelector('[data-testid="reintentar"]') as HTMLElement)
    expect(resumen.refetch).toHaveBeenCalledTimes(1)
  })

  it('K1: si falla un refresco, los números se quedan y se marcan como de la lectura anterior', async () => {
    resumen.data = datos()
    resumen.error = '503'
    await montar()

    expect($('[data-testid="conciliacion-resumen-desactualizado"]').textContent).toContain(
      'estos números son de la última lectura',
    )
    expect(document.querySelector('[data-testid="conciliacion-resumen"]')).not.toBeNull()
    expect(document.querySelector('[data-testid="conciliacion-resumen-fallo"]')).toBeNull()
  })

  it('la ruta no desplegada (404) sigue siendo silenciosa: no es un fallo de hoy', async () => {
    resumen.notAvailable = true
    await montar()
    expect(document.querySelector('[data-testid="conciliacion-resumen-fallo"]')).toBeNull()
  })

  it('K2: mientras lee el resumen, «Conciliar» está apagado y dice por qué', async () => {
    resumen.isLoading = true
    await montar()
    const boton = $('[data-testid="conciliacion-run-cta"]') as HTMLButtonElement
    expect(boton.disabled).toBe(true)
    expect(boton.getAttribute('title')).toContain('leyendo el resumen')
  })

  it('K2: con el resumen caído, «Conciliar» está apagado y dice por qué', async () => {
    resumen.error = '500'
    await montar()
    const boton = $('[data-testid="conciliacion-run-cta"]') as HTMLButtonElement
    expect(boton.disabled).toBe(true)
    expect(boton.getAttribute('title')).toContain('No pude leer el resumen')
  })

  it('con datos, «Conciliar» se ofrece con el número', async () => {
    resumen.data = datos(10, 2)
    await montar()
    const boton = $('[data-testid="conciliacion-run-cta"]') as HTMLButtonElement
    expect(boton.disabled).toBe(false)
    expect(boton.textContent).toContain('Conciliar 8 movimientos')
  })
})

describe('«¿Cómo funciona?» — ayuda, no dato (21-09)', () => {
  it('los tres pasos no están puestos sobre la pantalla: se piden', async () => {
    /* Estaba plegado al pie en un `<details>`, y desplegarlo empujaba hacia
       abajo las sugerencias que la persona vino a revisar. Ahora se abre encima
       y la pantalla queda intacta al cerrarlo. */
    await montar()
    expect(document.querySelector('[data-testid="conciliacion-como-funciona"]')).toBeNull()
    const boton = [...document.querySelectorAll('[data-testid="para-entender-mas"]')]
    expect(boton.length).toBe(1)
  })
})

describe('/panel/inmobiliaria/conciliacion — el sondeo de la corrida (K3)', () => {
  async function pedirCorrida() {
    await clic($('[data-testid="conciliacion-run-cta"]'))
    const dialogo = $('[role="alertdialog"]')
    const accion = Array.from(dialogo.querySelectorAll('button')).find((b) =>
      (b.textContent ?? '').includes('Conciliar ahora'),
    )
    if (!accion) throw new Error('no hay botón «Conciliar ahora» en el diálogo')
    await clic(accion)
  }

  it.each([
    ['la lectura vuelve con error', () => resumen.refetch.mockResolvedValue({ data: null, error: '500' })],
    ['la lectura revienta', () => resumen.refetch.mockRejectedValue(new Error('boom'))],
  ])('🔴 si %s, corta el sondeo y avisa UNA sola vez', async (_caso, preparar) => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    resumen.data = datos()
    corrida.requestRun.mockResolvedValue({ ok: true, enqueued: true })
    preparar()
    await montar()

    await pedirCorrida()
    expect(corrida.requestRun).toHaveBeenCalledTimes(1)

    await act(async () => {
      vi.advanceTimersByTime(5000)
    })
    await esperar()
    expect(toastMock.error).toHaveBeenCalledTimes(1)
    expect($('[data-testid="conciliacion-resultado-corrida"]').getAttribute('data-estado')).toBe(
      'sinLectura',
    )

    // Pasa medio minuto más: no vuelve a pedir ni a avisar.
    await act(async () => {
      vi.advanceTimersByTime(30_000)
    })
    await esperar()
    expect(resumen.refetch).toHaveBeenCalledTimes(1)
    expect(toastMock.error).toHaveBeenCalledTimes(1)
  })

  it('si la lectura trae cambios, dice cuánto cambió y corta', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    resumen.data = datos(10, 2)
    corrida.requestRun.mockResolvedValue({ ok: true, enqueued: true })
    resumen.refetch.mockResolvedValue({ data: datos(10, 5), error: null })
    await montar()

    await pedirCorrida()
    await act(async () => {
      vi.advanceTimersByTime(5000)
    })
    await esperar()

    const resultado = $('[data-testid="conciliacion-resultado-corrida"]')
    expect(resultado.getAttribute('data-estado')).toBe('lista')
    expect(resultado.textContent).toContain('3 movimientos conciliados')

    await act(async () => {
      vi.advanceTimersByTime(30_000)
    })
    await esperar()
    expect(resumen.refetch).toHaveBeenCalledTimes(1)
  })
})

describe('🔴 el Resumen no puede contradecir a Movimientos', () => {
  /*
   * 20-09, con las dos pestañas abiertas en el navegador a la vez:
   *
   *   Resumen     → «Todavía no cargaste ningún extracto, así que no hay
   *                  movimientos que cruzar.»
   *   Movimientos → «Último extracto: 2 de sept de 2026,
   *                  movimientos-bancolombia-2026-09.csv · Pendientes: 3»
   *
   * Dos pestañas del mismo módulo, el mismo momento, dos verdades opuestas —
   * y la que se ve al entrar es la que afirma que no hay nada que hacer.
   *
   * La causa: el Resumen decidía con los totales del AGENTE, y quien sabe si
   * hay un extracto cargado es el BACK, porque es quien lo recibe.
   */
  afterEach(() => {
    delBack.valor = {
      pendientes: 0,
      ignorados: 0,
      conciliadosEsteMes: 0,
      ultimoExtracto: null,
    }
  })

  it('con extracto cargado en el back, NO dice que no cargaste ninguno', async () => {
    resumen.data = datos(0, 0) // el agente, en cero
    delBack.valor = {
      pendientes: 3,
      ignorados: 0,
      conciliadosEsteMes: 3,
      ultimoExtracto: { nombre: 'movimientos-bancolombia-2026-09.csv', cargadoAt: '2026-09-02' },
    }
    await montar()

    const linea = $('[data-testid="conciliacion-hero-linea"]').textContent ?? ''
    expect(linea).not.toContain('Todavía no cargaste ningún extracto')
    expect(linea).toContain('3')
  })

  it('sin extracto en el back sí lo dice: la frase no se perdió', async () => {
    resumen.data = datos(0, 0)
    delBack.valor = {
      pendientes: 0,
      ignorados: 0,
      conciliadosEsteMes: 0,
      ultimoExtracto: null,
    }
    await montar()

    expect($('[data-testid="conciliacion-hero-linea"]').textContent).toContain(
      'Todavía no cargaste ningún extracto',
    )
  })

  it('🔴 y «Conciliar ahora» deja de mandar a subir un extracto ya subido', async () => {
    resumen.data = datos(0, 0)
    delBack.valor = {
      pendientes: 3,
      ignorados: 0,
      conciliadosEsteMes: 0,
      ultimoExtracto: { nombre: 'extracto.csv', cargadoAt: '2026-09-02' },
    }
    await montar()

    const boton = $('[data-testid="conciliacion-run-cta"]')
    expect(boton.getAttribute('title')).not.toContain('sube el extracto del banco primero')
    expect(boton.getAttribute('title')).toContain('Movimientos')
  })
})
