/**
 * page.test.tsx — el panel de Avalúos no puede ofrecer una acción que no alcanza.
 *
 * Los dos CTA ("Solicitar avalúo" y "Generar link para compartir") terminan en el
 * asistente del MICRO de avalúos, cuyo origen sale de `NEXT_PUBLIC_AVALUO_API_URL`.
 * Sin esa variable no hay URL que componer: `avaluosApi.solicitar()` tira ApiError
 * DESPUÉS de que el back ya firmó un token de agencia. O sea: el clic costaba un
 * viaje al servidor y no abría nada.
 *
 * `wizard-url.ts` deja escrito el contrato — "callers must degrade (hide/disable
 * the CTA)" — y `/avaluo/nuevo` ya lo cumplía. Este panel no.
 *
 * ── Y la pantalla no puede contradecirse a sí misma ───────────────────────
 *
 * Hoy la lista falla de verdad (502: el micro de avalúos no responde). Había
 * DOS bloques leyendo el mismo pedido: «Mis solicitudes» decía «No pudimos
 * cargar los avalúos» y «Actividad reciente», diez centímetros más abajo,
 * decía «Aún no hay actividad reciente» — porque no tenía rama de error y
 * leía la lista vacía que deja `useApiData` cuando algo falla.
 *
 * Cobertura:
 *   (1) sin origen configurado → banner visible y los DOS botones deshabilitados
 *   (2) sin origen configurado → un clic NO llega a la API (no se firma un token)
 *   (3) con origen configurado → sin banner y los dos botones habilitados
 *   (4) si la carga falla, NINGUNA parte de la pantalla dice que no hay nada
 *   (5) el aviso no promete que la lista de abajo sigue funcionando
 *   (6) vacío CON filtro puesto ≠ vacío sin nada creado
 *   (7) la sección no se llama como la pestaña de al lado
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

// ── El origen del micro, controlable por test ─────────────────────────────
// Getter, no valor: la página lee el binding en cada render, así que alcanza
// con mover `_origen` entre casos.
let _origen = ''
vi.mock('@/lib/avaluo/wizard-url', () => ({
  get AVALUO_WIZARD_ORIGIN() {
    return _origen
  },
  get AVALUO_WIZARD_URL() {
    return _origen ? `${_origen}/avaluo` : ''
  },
}))

// ── El guard de permisos no es lo que se prueba acá ───────────────────────
vi.mock('@/components/auth/PageGuard', () => ({
  PageGuard: ({ children }: { children: React.ReactNode }) => children,
}))

// ── La lista, controlable por test ────────────────────────────────────────
// Misma forma que devuelve `useApiData`: `errorCrudo` es el error TAL CUAL
// (lo que <EstadoDeDatos> necesita para clasificar), `error` es su mensaje.
const _lista = {
  data: null as unknown,
  avaluos: [] as unknown[],
  total: 0,
  pageSize: 100,
  isLoading: false,
  error: null as string | null,
  errorCrudo: null as unknown,
  refetch: vi.fn(async () => null),
}
vi.mock('@/lib/hooks/useInmobiliaria', () => ({
  useAgencyAvaluos: () => _lista,
}))

const solicitarMock = vi.fn(async () => ({ wizardUrl: 'http://micro.test/avaluo?agency=t' }))
vi.mock('@/lib/api/inmobiliaria.service', () => ({
  avaluosApi: {
    solicitar: (...args: unknown[]) => solicitarMock(...(args as [])),
  },
}))

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

// ── La página, DESPUÉS de los mocks ───────────────────────────────────────
import AvaluosSalaPage from './page'

let container: HTMLDivElement
let root: Root

const BANNER = '[data-testid="avaluos-servicio-no-configurado"]'
const CTA_DIRECTO = '[data-testid="avaluos-solicitar-directo-cta"]'
const CTA_LINK = '[data-testid="avaluos-generar-link-cta"]'

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  _origen = ''
  _lista.avaluos = []
  _lista.total = 0
  _lista.isLoading = false
  _lista.error = null
  _lista.errorCrudo = null
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
  vi.clearAllMocks()
})

async function montar() {
  await act(async () => {
    root.render(React.createElement(AvaluosSalaPage))
  })
}

describe('Avalúos — servicio sin configurar', () => {
  it('(1) muestra el aviso y deshabilita los dos CTA', async () => {
    await montar()

    expect(container.querySelector(BANNER)).not.toBeNull()

    const directo = container.querySelector<HTMLButtonElement>(CTA_DIRECTO)
    const link = container.querySelector<HTMLButtonElement>(CTA_LINK)
    expect(directo?.disabled).toBe(true)
    expect(link?.disabled).toBe(true)
  })

  it('(2) un clic no llega a la API: no se firma un token para nada', async () => {
    await montar()

    const directo = container.querySelector<HTMLButtonElement>(CTA_DIRECTO)
    await act(async () => {
      directo?.click()
    })

    expect(solicitarMock).not.toHaveBeenCalled()
  })
})

describe('Avalúos — servicio configurado', () => {
  it('(3) sin aviso y con los dos CTA habilitados', async () => {
    _origen = 'http://localhost:3003'
    await montar()

    expect(container.querySelector(BANNER)).toBeNull()

    const directo = container.querySelector<HTMLButtonElement>(CTA_DIRECTO)
    const link = container.querySelector<HTMLButtonElement>(CTA_LINK)
    expect(directo?.disabled).toBe(false)
    expect(link?.disabled).toBe(false)
  })
})

describe('Avalúos — la pantalla no se contradice', () => {
  it('(4) si la carga falla, ninguna parte dice que no hay nada', async () => {
    // Lo que pasa de verdad hoy: el back no alcanza al micro y sintetiza un 502.
    // El error llega como Error con `status` (así lo tira `client.ts`), y
    // `useApiData` guarda el error Y deja la lista en [] — de ahí salía la
    // mentira: cualquier bloque que sólo mire `length === 0` ve un vacío.
    _lista.errorCrudo = Object.assign(new Error('Error 502'), { status: 502 })
    _lista.error = 'Error 502'
    await montar()

    const texto = container.textContent ?? ''

    // Se dice que falló…
    expect(container.querySelector('[data-testid="fallo-de-carga"]')).not.toBeNull()
    // …y no se afirma en ningún lado que no haya nada.
    expect(texto).not.toContain('Aún no hay actividad reciente')
    expect(texto).not.toContain('Todavía no hay avalúos')
    expect(container.querySelector('[data-testid="sin-datos"]')).toBeNull()

    // El código del backend no se LEE: queda sólo en el nodo `sr-only` de
    // diagnóstico que <FalloDeCarga> reserva para eso, nunca en el cartel.
    const cartel = container.querySelector('[data-testid="fallo-de-carga"]')!
    const visible = [...cartel.querySelectorAll('p')].map((p) => p.textContent).join(' ')
    expect(visible).not.toContain('502')
    expect(
      container.querySelector('[data-testid="fallo-detalle-tecnico"]')?.textContent,
    ).toContain('502')
  })

  it('(5) el aviso no promete que los avalúos anteriores se siguen viendo', async () => {
    _lista.errorCrudo = { status: 502, message: 'Avaluo service unreachable' }
    await montar()

    const aviso = container.querySelector(BANNER)?.textContent ?? ''
    expect(aviso).not.toContain('más abajo')
    expect(aviso.length).toBeGreaterThan(0)
  })

  it('(6) vacío con un filtro puesto ofrece quitarlo, no «creá el primero»', async () => {
    await montar()

    // Sin filtro: el vacío de verdad.
    expect(container.querySelector('[data-testid="sin-datos"]')?.getAttribute('data-caso')).toBe(
      'vacio',
    )

    // Con un estado elegido, el mismo cero significa otra cosa.
    const chipRechazado = [...container.querySelectorAll('button')].find(
      (b) => b.textContent?.trim() === 'Rechazado',
    )
    await act(async () => {
      chipRechazado?.click()
    })

    const vacio = container.querySelector('[data-testid="sin-datos"]')
    expect(vacio?.getAttribute('data-caso')).toBe('filtros')
    expect(vacio?.textContent).not.toContain('Todavía no hay avalúos')
  })

  it('(7) la sección no se llama igual que la pestaña de al lado', async () => {
    // «Mis solicitudes» es la pestaña `./cola`, que muestra los work-items del
    // agente: otro servicio, otros datos. Dos lugares con el mismo nombre y
    // contenidos distintos hacen imposible saber cuál estás mirando.
    _lista.avaluos = [
      {
        id: 'av-1',
        state: 'firmado',
        ownerName: 'Ana Ruiz',
        method: 'AVM',
        valueCop: 350_000_000,
        createdAt: '2026-08-01T12:00:00.000Z',
      },
    ]
    _lista.total = 1
    await montar()

    const titulos = [...container.querySelectorAll('h1, h2')].map((h) => h.textContent?.trim())
    expect(titulos).not.toContain('Mis solicitudes')
    expect(titulos).toContain('Avalúos de tu inmobiliaria')
  })
})
