import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as React from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { usePilotoAutonomia } from './use-piloto-autonomia'
import { ApiError } from '@/lib/api/client'
import { camposDelError, mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'
import es from '@/lib/i18n/locales/es.json'
import en from '@/lib/i18n/locales/en.json'

void React

/**
 * T-0076 decía «nunca más de 4 peticiones de autonomía en vuelo». Desde la
 * auditoría del Piloto (23-09-2026) es una sola: la de la flota, que trae
 * los doce agentes (y el chat) con todo lo que el panel necesita.
 */

// ── Auth mock ────────────────────────────────────────────────────────────────

const mockAgency = { id: 'AGY-TEST' as string | null }

vi.mock('@/lib/auth', () => ({
  useAuth: () => ({
    agency: mockAgency.id ? { id: mockAgency.id } : null,
    user: null,
    isAuthenticated: true,
    isLoading: false,
  }),
}))

const AGENT_URL = 'http://localhost:4000'

type HookResult = ReturnType<typeof usePilotoAutonomia>

function makeOkResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

function make404Response(): Response {
  return new Response(JSON.stringify({ error: 'not_found' }), { status: 404 })
}

function make500Response(): Response {
  return new Response(null, { status: 500 })
}

let container: HTMLDivElement
let root: Root
let result: HookResult | undefined

function TestWrapper() {
  result = usePilotoAutonomia()
  return null
}

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  result = undefined
  vi.stubEnv('NEXT_PUBLIC_AGENT_URL', AGENT_URL)
  mockAgency.id = 'AGY-TEST'
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  root?.unmount()
  container.remove()
})

async function mount() {
  await act(async () => {
    root = createRoot(container)
    root.render(React.createElement(TestWrapper))
  })
}

const flota = {
  activo: true,
  modo: 'copiloto',
  distintos: [],
  actuan: 2,
  resumen: { sombra: 0, copiloto: 2, autonomo: 0 },
  enVivo: { llamadas: 0, conciliando: 0, esperando: 0 },
  tomadoAt: '2026-09-23T10:00:00.000-05:00',
  agentes: [
    {
      agente: 'cobranza',
      modo: 'copiloto',
      origen: 'piloto',
      corre: true,
      porQueNoCorre: null,
      gobierna: true,
      actua: true,
      efectoReal: 'Laura prepara cada llamada…',
      valla: [{ id: 'ley2300', label: 'Ley 2300', value: 'x', estado: 'regla' }],
      t323: true,
    },
    {
      agente: 'chat',
      modo: 'copiloto',
      origen: 'default',
      corre: true,
      porQueNoCorre: null,
      gobierna: false,
      actua: false,
      efectoReal: 'El chat todavía no lee esta perilla…',
      valla: [],
      t323: false,
    },
    {
      agente: 'pagos',
      modo: 'copiloto',
      origen: 'default',
      corre: false,
      porQueNoCorre: 'Apagado en el servidor: lo enciende el equipo técnico.',
      gobierna: true,
      actua: false,
      efectoReal: 'Payu prepara el cobro…',
      valla: [],
      t323: true,
    },
  ],
}

describe('🔴 usePilotoAutonomia — UNA petición para toda la flota (auditoría del Piloto, 23-09)', () => {
  it('lee la flota con un solo GET (antes eran 12 GET por agente)', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => makeOkResponse(flota))
    await mount()
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(String(fetchSpy.mock.calls[0]![0])).toContain('/ai-hub/autonomia')
    expect(String(fetchSpy.mock.calls[0]![0])).not.toContain('/agentes/')
  })

  it('trae la frase de la tabla de verdad, si corre y si el modo lo gobierna — y el chat', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => makeOkResponse(flota))
    await mount()
    expect(result?.isLoading).toBe(false)
    expect(result?.rows.map((r) => r.agente)).toEqual(['cobranza', 'chat', 'pagos'])
    const chat = result?.rows.find((r) => r.agente === 'chat')
    expect(chat).toMatchObject({ gobierna: false, corre: true })
    expect(chat?.efectoReal).toContain('todavía no lee esta perilla')
    const pagos = result?.rows.find((r) => r.agente === 'pagos')
    expect(pagos).toMatchObject({ corre: false, porQueNoCorre: 'Apagado en el servidor: lo enciende el equipo técnico.' })
    expect(result?.rows.find((r) => r.agente === 'cobranza')?.valla).toHaveLength(1)
  })

  it('lista a Contabilidad con su propio modo (Nico, 24-09), después de los dueños de la operación', async () => {
    const conContabilidad = {
      ...flota,
      agentes: [
        ...flota.agentes,
        {
          agente: 'contabilidad',
          modo: 'sombra',
          origen: 'piloto',
          corre: true,
          porQueNoCorre: null,
          gobierna: true,
          actua: true,
          efectoReal: 'No hace nada solo: cada paso te lo propone…',
          valla: [],
          t323: false,
        },
      ],
    }
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => makeOkResponse(conContabilidad))
    await mount()
    expect(result?.rows.map((r) => r.agente)).toEqual(['cobranza', 'chat', 'contabilidad', 'pagos'])
    expect(result?.rows.find((r) => r.agente === 'contabilidad')).toMatchObject({ modo: 'sombra', gobierna: true, corre: true })
    expect(es.inmobiliaria.ai.workspace.agente.contabilidad).toBe('Contabilidad')
    expect(en.inmobiliaria.ai.workspace.agente.contabilidad).toBe('Accounting')
  })

  it('si la flota no contesta, error queda seteado y no se inventan filas', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(make500Response())
    await mount()
    expect(result?.isLoading).toBe(false)
    expect(result?.rows).toHaveLength(0)
    expect(result?.error).toBeTruthy()
  })

  it('404 (micro viejo): sin filas y sin error inventado', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(make404Response())
    await mount()
    expect(result?.rows).toHaveLength(0)
    expect(result?.error).toBeNull()
  })
})

/*
 * Tanda 2 de errores (02-10-2026): `setModo` devolvía `{ ok: false, error:
 * '403' }` y la pantalla pintaba «No se pudo cambiar el modo: 403». Ahora
 * `lib/api/piloto.ts` lee el sobre del micro y el hook deja pasar `fallo`.
 */
describe('usePilotoAutonomia — setModo no se traga el error', () => {
  async function cambiarConRespuesta(respuesta: () => Promise<Response>) {
    vi.spyOn(globalThis, 'fetch')
      .mockImplementationOnce(async () => makeOkResponse(flota))
      .mockImplementationOnce(respuesta)
      .mockImplementation(async () => makeOkResponse(flota))
    await mount()
    let r: Awaited<ReturnType<HookResult['setModo']>> | undefined
    await act(async () => {
      r = await result!.setModo('cobranza', 'autonomo')
    })
    return r!
  }

  it('un 400 del sobre llega como `fallo` con sus `campos`, y el modo vuelve atrás', async () => {
    const r = await cambiarConRespuesta(
      async () =>
        new Response(
          JSON.stringify({
            statusCode: 400,
            code: 'DATOS_INVALIDOS',
            message: ['El modo debe ser Manual, Copiloto o Automático.'],
            campos: [{ campo: 'modo', regla: 'opcion', mensaje: 'El modo debe ser Manual, Copiloto o Automático.' }],
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } },
        ),
    )
    expect(r.ok).toBe(false)
    expect(r.fallo).toBeInstanceOf(ApiError)
    expect(camposDelError(r.fallo)).toHaveLength(1)
    expect(mensajeParaLaPersona(r.fallo)).toBe('El modo debe ser Manual, Copiloto o Automático.')
    expect(result?.rows.find((x) => x.agente === 'cobranza')?.modo).toBe('copiloto')
  })

  it('un 5xx dice «de nuestro lado» con la referencia; nunca el status', async () => {
    const r = await cambiarConRespuesta(
      async () => new Response(JSON.stringify({ error: 'boom', requestId: 'feedface-0002' }), { status: 500 }),
    )
    const texto = mensajeParaLaPersona(r.fallo, { accion: 'cambiar el modo' })
    expect(texto).toContain('No pudimos cambiar el modo: algo falló de nuestro lado')
    expect(texto).toContain('feedface')
  })

  // 🔴 03-10-2026: el micro caído con el back sano es capa 2 («el asistente de
  // Leasefy no está disponible»), no la red de la persona (`agent-fetch.ts`).
  it('un `fetch` al micro que ni salió, con el back respondiendo, es el asistente caído (capa 2), no «conexión»', async () => {
    const r = await cambiarConRespuesta(async () => {
      throw new TypeError('Failed to fetch')
    })
    expect(r.fallo).toBeInstanceOf(ApiError)
    expect((r.fallo as ApiError).status).toBe(503)
    const texto = mensajeParaLaPersona(r.fallo)
    expect(texto).toMatch(/asistente de Leasefy no está disponible/)
    expect(texto).not.toMatch(/conexi[oó]n/i)
  })

  it('sin red en el navegador, el `fetch` que ni salió llega TAL CUAL (status 0 = conexión)', async () => {
    const enLinea = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    try {
      const red = new TypeError('Failed to fetch')
      const r = await cambiarConRespuesta(async () => {
        throw red
      })
      expect(r.fallo).toBe(red)
      expect(mensajeParaLaPersona(r.fallo)).toMatch(/conexión/)
    } finally {
      enLinea.mockRestore()
    }
  })
})

