/**
 * /admin/chat-preguntas — las preguntas al chat vistas por Leasefy (Nico,
 * 04-10-2026): resumen arriba, sugerencias con sus ejemplos, tabla con filtros
 * en la URL y el detalle del turno en un cajón. Sin el correo de quién
 * preguntó. 🔴 NO está en el menú del admin hasta que se apruebe la cláusula.
 *
 * createRoot + act (convención del repo, sin RTL).
 */
import * as React from 'react'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

import type { ChatPreguntasResponse, TurnoDelChat } from '@/lib/admin/agent-api'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const estado = vi.hoisted(() => ({
  search: '' as string,
  replace: vi.fn(),
  pedidos: [] as unknown[],
  respuesta: null as unknown,
  falla: null as Error | null,
}))

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(estado.search),
  useRouter: () => ({ replace: estado.replace, push: vi.fn() }),
  usePathname: () => '/admin/chat-preguntas',
}))

vi.mock('@/lib/admin/agent-api', () => ({
  getChatPreguntas: vi.fn(async (f: unknown) => {
    estado.pedidos.push(f)
    if (estado.falla) throw estado.falla
    return estado.respuesta
  }),
}))

import ChatPreguntasPage from './page'

const AG = '11111111-1111-4111-8111-111111111111'

function turno(over: Partial<TurnoDelChat> = {}): TurnoDelChat {
  return {
    turnoId: '00000000-0000-4000-8000-000000000001',
    agencyId: AG,
    inmobiliaria: 'Portofino',
    fecha: '2026-10-01T15:00:00.000Z',
    pregunta: '¿cuánto debe la cédula ••••••••89?',
    respuesta: 'No tengo ese dato.',
    sinRespuesta: true,
    falla: null,
    especialistas: ['reportes'],
    fuentes: ['cartera_erp'],
    reformulada: true,
    corregida: false,
    abandonada: false,
    pulgar: 'abajo',
    comentario: 'esperaba el saldo',
    cifraContradicha: false,
    metricasContradichas: [],
    propusoAccion: false,
    pideAccion: false,
    ms: 3200,
    modelo: 'claude-sonnet-5-5',
    camino: 'dato',
    rol: 'ADMIN',
    tokensEntrada: 1200,
    tokensSalida: 300,
    costoUsd: 0.0123,
    temas: ['cartera'],
    ...over,
  }
}

function respuesta(over: Partial<ChatPreguntasResponse> = {}): ChatPreguntasResponse {
  const t = turno()
  return {
    ventana: { desde: '2026-08-09T05:00:00.000Z', hasta: '2026-10-04T05:00:00.000Z', truncado: false },
    totales: {
      preguntas: 8,
      inmobiliarias: 1,
      sinRespuesta: 3,
      porcentajeSinRespuesta: 37.5,
      reformulaciones: 1,
      abandonos: 0,
      fallas: 1,
      pulgarAbajo: 1,
      cifrasContradichas: 0,
      costoUsd: 0.09,
      turnosConCosto: 7,
    },
    filas: [t, turno({ turnoId: '00000000-0000-4000-8000-000000000002', pregunta: '¿cómo va la cartera?', sinRespuesta: false, pulgar: null, reformulada: false })],
    total: 2,
    pagina: 1,
    limite: 50,
    resumen: [
      {
        semana: '2026-09-28',
        agencyId: AG,
        inmobiliaria: 'Portofino',
        preguntas: 8,
        sinRespuesta: 3,
        porcentajeSinRespuesta: 37.5,
        reformulaciones: 1,
        abandonos: 0,
        fallas: 1,
        pulgarAbajo: 1,
        costoUsd: 0.09,
        temas: [{ tema: 'cartera', nombre: 'cartera', preguntas: 8 }],
      },
    ],
    temas: [{ tema: 'cartera', nombre: 'cartera', preguntas: 8 }],
    especialistas: [{ nombre: 'reportes', veces: 4 }],
    fuentes: [{ nombre: 'cartera_erp', veces: 6 }],
    sugerencias: [
      {
        id: 'sin_respuesta:cartera',
        tipo: 'sin_respuesta',
        severidad: 'media',
        hallazgo: '38 % de las preguntas sobre cartera no tuvieron respuesta (3 de 8).',
        accion: 'Falta una herramienta o un dato de cartera: mira los ejemplos y dale al chat de dónde sacarlo.',
        conteo: 3,
        total: 8,
        tema: 'cartera',
        ejemplos: [t],
      },
    ],
    inmobiliarias: [{ agencyId: AG, nombre: 'Portofino', preguntas: 8 }],
    generadoEn: '2026-10-04T09:00:00.000Z',
    ...over,
  }
}

let container: HTMLDivElement
let root: Root

async function montar() {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  await act(async () => {
    root.render(<ChatPreguntasPage />)
  })
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0))
  })
}

const texto = () => document.body.textContent ?? ''
const boton = (t: string) =>
  [...document.querySelectorAll('button')].find((b) => (b.textContent ?? '').trim().startsWith(t)) as HTMLButtonElement | undefined

beforeEach(() => {
  estado.search = ''
  estado.replace.mockReset()
  estado.pedidos = []
  estado.respuesta = respuesta()
  estado.falla = null
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  document.body.innerHTML = ''
})

describe('/admin/chat-preguntas', () => {
  it('muestra el resumen, las sugerencias y la tabla, sin correos', async () => {
    await montar()
    expect(texto()).toContain('Preguntas al chat')
    expect(texto()).toContain('37,5 %')
    expect(texto()).toContain('38 % de las preguntas sobre cartera no tuvieron respuesta (3 de 8).')
    expect(texto()).toContain('¿cuánto debe la cédula ••••••••89?')
    expect(texto()).toContain('US$0,09')
    expect(texto()).toContain('Portofino')
    expect(texto()).toContain('no está en el menú')
    expect(texto()).not.toMatch(/@/)
  })

  it('los filtros viven en la URL y viajan al micro', async () => {
    estado.search = `agencia=${AG}&sinRespuesta=1&tema=cartera&q=saldo&page=1`
    await montar()
    expect(estado.pedidos[0]).toMatchObject({ agencyId: AG, sinRespuesta: true, tema: 'cartera', q: 'saldo', pagina: 2, limite: 50 })
    act(() => {
      boton('sólo pulgar abajo')!.click()
    })
    expect(estado.replace).toHaveBeenCalledWith(expect.stringContaining('pulgarAbajo=1'))
    expect(String(estado.replace.mock.calls.at(-1)?.[0])).not.toContain('page=')
  })

  it('un ejemplo de la sugerencia abre el detalle del turno en el cajón', async () => {
    await montar()
    act(() => {
      boton('ver el ejemplo')!.click()
    })
    const ejemplo = [...document.querySelectorAll('li button')][0] as HTMLButtonElement
    await act(async () => {
      ejemplo.click()
    })
    expect(texto()).toContain('Detalle de la pregunta')
    expect(texto()).toContain('esperaba el saldo')
    expect(texto()).toContain('especialista de reportes')
    expect(texto()).toContain('cartera del ERP')
    expect(texto()).toContain('1.200 / 300')
  })

  it('sin preguntas dice por qué, sin ceros que mienten', async () => {
    estado.respuesta = respuesta({ totales: { ...respuesta().totales, preguntas: 0 }, filas: [], total: 0, sugerencias: [] })
    await montar()
    expect(texto()).toContain('Sin preguntas en estas fechas')
  })

  it('un error del micro se muestra', async () => {
    estado.falla = new Error('La búsqueda no acepta números largos: en las preguntas están ocultos.')
    await montar()
    expect(texto()).toContain('La búsqueda no acepta números largos')
  })
})

describe('🔴 sin enlace en el menú del admin hasta que se apruebe la cláusula', () => {
  it('Nav.tsx no enlaza /admin/chat-preguntas', () => {
    const nav = readFileSync(resolve(__dirname, '../../../../components/admin/Nav.tsx'), 'utf8')
    expect(nav).not.toContain('chat-preguntas')
  })
})
