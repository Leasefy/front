/**
 * @vitest-environment happy-dom
 *
 * BriefingClient — la superficie del Briefing entera, de la URL al DOM (13-03, Tarea 3; FG13-1, FG13-5, FG13-6,
 * FG13-9, FG13-10, FG13-13, INV-06, E13-1).
 *
 * Qué prueba: el estado entra una vez a VistaDeNaira (tras un ok, un 403 AL VOLVER AL FOCO no deja nada); cada cifra con
 * su corte pegado y en hora de Bogotá; con datos de ejemplo todo se marca y nada se escribe; el silencio sin inventario
 * se declara; cada `sin_entrega` por su razón; `?dia=` enlazable y validado; votos por sección y por acción; ningún
 * enlace sale de un campo del agente; la causa sin clase se oculta; ocultos sin numeral; la pregunta del lunes; ninguna
 * persona en el DOM; el inventario plegado en móvil.
 *
 * Arnés: createRoot + act, i18n contra el es.json real (stub), `next/link` → `<a href>`, `next/navigation` con la
 * consulta del test, agencia AGY-1, el cliente mockeado solo en leerBriefing / votarSenal / responderRecall, permisos por
 * conjunto, popover plano, toast mockeado, `matchMedia` stubeado y la hora del sistema fija (solo `Date`). Los fixtures
 * pasan el esquema ESTRICTO del contrato. Marcador [N13:*] en el TÍTULO.
 */

import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const nav = vi.hoisted(() => ({ consulta: '' }))
const red = vi.hoisted(() => {
  const estado: { responder: (dia?: string) => Promise<unknown> } = { responder: async () => ({ kind: 'no_disponible' }) }
  return {
    estado,
    leerBriefing: vi.fn((_agencyId: string, dia?: string) => estado.responder(dia)),
    votarSenal: vi.fn(() => new Promise<unknown>(() => undefined)),
    responderRecall: vi.fn(() => new Promise<unknown>(() => undefined)),
  }
})
const permisos = vi.hoisted(() => ({ conjunto: new Set<string>() }))
const pantalla = vi.hoisted(() => ({ escritorio: true }))

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: React.PropsWithChildren<{ href: string } & Record<string, unknown>>) =>
    React.createElement('a', { href, ...rest }, children),
}))
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(nav.consulta),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/panel/inmobiliaria/reportes/naira',
}))
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ agency: { id: 'AGY-1' } }) }))
vi.mock('@/lib/api/naira/cliente', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/naira/cliente')>()),
  leerBriefing: red.leerBriefing,
  votarSenal: red.votarSenal,
  responderRecall: red.responderRecall,
}))
vi.mock('@/lib/context/PermissionsContext', () => ({
  usePermissionsContext: () => ({
    canAccess: (m: string, a: string) => permisos.conjunto.has(m + ':' + a),
    isAdmin: false,
    agencyRole: 'ADMIN',
  }),
  usePermissionsContextSafe: () => null,
}))
vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  PopoverContent: ({ children }: { children?: React.ReactNode }) => <div data-testid="popover">{children}</div>,
}))
vi.mock('@/components/ui/toast', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

import {
  RAZONES_SIN_BRIEFING,
  RESPUESTA_ESTRICTA_POR_ENDPOINT,
  type NairaBriefingDay,
  type NairaBriefingItem,
} from '@/lib/api/naira/contrato'
import { USER_IDS_DE_EJEMPLO } from '@/lib/data/mock-naira'
import { formatearDia } from '@/lib/naira/briefing-y-senal'
import { formatearCorte } from '@/lib/naira/formato'
import { RUTA_DE_LA_METRICA, RUTA_POR_FUENTE } from '@/lib/naira/fuente-a-ruta'
import { RUTA_DE_NAIRA, rutaDeLaSenal } from '@/lib/nav/rutas-de-naira'

import { BriefingClient } from './BriefingClient'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const P_ATENCION = '00000000-0000-4000-8000-000000000001'
const P_INFORMATIVO = '00000000-0000-4000-8000-000000000002'
const P_SEGUIMIENTO = '00000000-0000-4000-8000-000000000003'
const P_LUNES = '00000000-0000-4000-8000-000000000004'
const TOKEN = 'TOKEN-BRIEFING-200'
const FRASE = 'Hoy no hay nada que requiera tu atención'
const NO_SABEMOS = 'No podemos mostrarte qué revisó Naira hoy, así que no sabemos si este silencio es un día tranquilo.'

function item(parcial: Partial<NairaBriefingItem>): NairaBriefingItem {
  return {
    seccion: 'atencion',
    posicion: 1,
    metricId: 'cartera.morosidad_rate',
    valor: '12.5',
    unidad: 'pct',
    asOf: '2026-10-06T11:15:00.000Z',
    fuente: 'agent.debtor_states',
    trust: 'system',
    clave: 'morosidad@1:cartera.morosidad_rate:2026-10-06',
    urgencyClass: 'ventana_legal',
    titulo: 'La morosidad subió y hay un plazo legal corriendo (ejemplo) ' + TOKEN,
    promocion: { kind: 'promovida', promocionId: P_ATENCION },
    causa: { kind: 'investigada', razon: 'TEXTO-CAUSAL-SIN-CLASE' },
    entidades: { kind: 'agregada' },
    valorRenderizado: '12,5%',
    nombreDeMetrica: 'Morosidad de la cartera (ejemplo)',
    ...parcial,
  }
}

const ITEM_ATENCION = item({})
const ITEM_INFORMATIVO = item({
  seccion: 'informativo',
  posicion: 2,
  metricId: 'cartera.recovered_cop_30d',
  valor: '1500000',
  unidad: 'cop',
  asOf: '2026-10-06T10:00:00.000Z',
  fuente: 'agent.payments',
  clave: 'recaudo@1:cartera.recovered_cop_30d:2026-10-06',
  urgencyClass: 'reversible',
  titulo: 'El recaudo quedó por debajo de lo usual (ejemplo)',
  promocion: { kind: 'promovida', promocionId: P_INFORMATIVO },
  causa: { kind: 'investigacion_no_disponible' },
  valorRenderizado: '$ 1.500.000',
  nombreDeMetrica: 'Recaudo de los últimos 30 días (ejemplo)',
})
const ITEM_ESTADO = item({
  seccion: 'estado',
  posicion: 3,
  metricId: 'portafolio.available_units_count',
  valor: '4',
  unidad: 'count',
  asOf: '2026-10-06T09:00:00.000Z',
  fuente: 'public.consignaciones',
  clave: 'estado:portafolio.available_units_count:2026-10-06',
  urgencyClass: 'reversible',
  titulo: 'Inmuebles disponibles (ejemplo)',
  promocion: { kind: 'sin_promocion' },
  causa: { kind: 'investigacion_no_disponible' },
  valorRenderizado: '4',
  nombreDeMetrica: 'Inmuebles disponibles (ejemplo)',
})
const ITEM_SEGUIMIENTO = item({
  seccion: 'seguimiento',
  posicion: 4,
  metricId: 'cartera.escalations_open_count',
  valor: '3',
  unidad: 'count',
  asOf: '2026-10-06T08:00:00.000Z',
  fuente: 'agent.escalations',
  clave: 'escalaciones@1:cartera.escalations_open_count:2026-10-06',
  urgencyClass: 'reversible',
  titulo: 'Sigue abierto el seguimiento de las escalaciones (ejemplo)',
  promocion: { kind: 'promovida', promocionId: P_SEGUIMIENTO },
  causa: { kind: 'investigacion_no_disponible' },
  valorRenderizado: '3',
  nombreDeMetrica: 'Escalaciones abiertas (ejemplo)',
})

const ITEMS_DEL_DIA = [ITEM_ATENCION, ITEM_INFORMATIVO, ITEM_ESTADO, ITEM_SEGUIMIENTO]

function entregado(dia: string, items: NairaBriefingItem[], conWhatsapp = true, ocultosPorRol = 0): NairaBriefingDay {
  const porCorreo = { canal: 'email', tipo: 'briefing', congeladaEn: dia + 'T11:45:00.000Z', estadoDelEnvio: 'enviado', items } as const
  const porWhatsapp = { canal: 'whatsapp', tipo: 'briefing', congeladaEn: dia + 'T11:46:00.000Z', estadoDelEnvio: 'enviado', items } as const
  return {
    dia,
    corte: dia + 'T11:00:00.000Z',
    resultado: { kind: 'entregado', entregas: conWhatsapp ? [porWhatsapp, porCorreo] : [porCorreo], ocultosPorRol },
  }
}

const DIA_ENTREGADO = entregado('2026-10-06', ITEMS_DEL_DIA, true, 2)
const DIA_SIN_ATENCION = entregado('2026-10-06', [ITEM_INFORMATIVO], false)
const DIA_LUNES = entregado(
  '2000-01-03',
  [
    item({
      asOf: '2000-01-03T11:15:00.000Z',
      clave: 'morosidad@1:cartera.morosidad_rate:2000-01-03',
      titulo: 'La morosidad subió (ejemplo)',
      promocion: { kind: 'promovida', promocionId: P_LUNES },
    }),
  ],
  false,
)
const sinEntrega = (razon: (typeof RAZONES_SIN_BRIEFING)[number]): NairaBriefingDay => ({
  dia: '2026-10-06',
  corte: '2026-10-06T11:00:00.000Z',
  resultado: { kind: 'sin_entrega', razon },
})

const ok = (data: NairaBriefingDay, origen: 'agente' | 'ejemplo' = 'agente') => ({ kind: 'ok', data, origen }) as const

let container: HTMLDivElement
let root: Root

function responderSiempre(r: unknown): void {
  red.estado.responder = async () => r
}

async function asentar(): Promise<void> {
  await act(async () => {
    for (let i = 0; i < 6; i += 1) await Promise.resolve()
  })
}

async function montar(consulta = ''): Promise<void> {
  nav.consulta = consulta
  act(() => {
    root.render(<BriefingClient />)
  })
  await asentar()
}

function nuevoRoot(): void {
  act(() => root.unmount())
  root = createRoot(container)
}

const texto = () => (container.textContent ?? '').replace(/\s+/g, ' ')
const enlaces = () => [...container.querySelectorAll('a[href]')].map((a) => a.getAttribute('href') ?? '')
const enlaceCon = (fragmento: string) =>
  [...container.querySelectorAll('a')].find((a) => (a.textContent ?? '').includes(fragmento)) as HTMLAnchorElement | undefined
const botonCon = (fragmento: string) =>
  [...container.querySelectorAll('button')].find((b) => (b.textContent ?? '').includes(fragmento)) as HTMLButtonElement | undefined
const articulo = (seccion: string) => [...container.querySelectorAll(`article[data-naira-item="${seccion}"]`)]

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-06T15:00:00.000Z'))
  nav.consulta = ''
  red.leerBriefing.mockClear()
  red.votarSenal.mockClear()
  red.responderRecall.mockClear()
  responderSiempre({ kind: 'no_disponible' })
  permisos.conjunto = new Set(['cobros:view', 'cobranza:view', 'portafolio:view', 'pipeline:view', 'naira:signal-feedback', 'naira:recall-answer'])
  pantalla.escritorio = true
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: pantalla.escritorio,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  )
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  delete (document as { visibilityState?: unknown }).visibilityState
})

describe('BriefingClient', () => {
  it('[N13:fixture-es-contrato] cada fixture del archivo pasa el esquema estricto del contrato', () => {
    const estricto = RESPUESTA_ESTRICTA_POR_ENDPOINT['briefing.dia']
    for (const fixture of [DIA_ENTREGADO, DIA_SIN_ATENCION, DIA_LUNES, ...RAZONES_SIN_BRIEFING.map(sinEntrega)]) {
      const r = estricto.safeParse(fixture)
      expect(r.success, JSON.stringify(r.success ? null : r.error.issues)).toBe(true)
    }
  })

  it('[N13:control-positivo] el briefing de hoy con su título, su bajada, sus cifras y el aviso de WhatsApp', async () => {
    responderSiempre(ok(DIA_ENTREGADO))
    await montar()
    expect(red.leerBriefing).toHaveBeenCalledWith('AGY-1', undefined)
    expect(container.querySelector('[data-naira-vista="briefing"][data-naira-estado="ok"]')).not.toBeNull()
    expect(texto()).toContain(TOKEN)
    expect(container.querySelectorAll('[data-naira-numero]').length).toBeGreaterThan(0)
    const h1s = container.querySelectorAll('h1')
    expect(h1s.length).toBe(1)
    expect(h1s[0]!.textContent).toBe('Briefing de hoy')
    const momento = formatearCorte('2026-10-06T11:45:00.000Z', new Date())!.absoluto
    expect(texto()).toContain(('Lo que Naira te envió el ' + momento).replace(/\s+/g, ' '))
    expect(texto()).toContain('También te llegó por WhatsApp.')
  })

  it('[N13:403-sin-residuo] tras un ok, un 403 al volver al foco deja solo el cartel de sin permiso', async () => {
    let respuesta: unknown = ok(DIA_ENTREGADO)
    red.estado.responder = async () => respuesta
    await montar()
    expect(texto()).toContain(TOKEN)

    respuesta = { kind: 'sin_permiso' }
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await asentar()
    expect(red.leerBriefing).toHaveBeenCalledTimes(2)
    expect(container.querySelector('[data-testid="naira-sin-permiso"]')).not.toBeNull()
    expect(texto()).not.toContain(TOKEN)
    expect(texto()).not.toContain('Briefing de hoy')
    expect(container.querySelector('[data-naira-numero]')).toBeNull()
    expect(container.querySelector('article')).toBeNull()
  })

  it('[N13:asof-pegado] cada número tiene su corte en el mismo contenedor, el de SU ítem', async () => {
    responderSiempre(ok(DIA_ENTREGADO))
    await montar()
    const arts = [...container.querySelectorAll('article[data-naira-item]')]
    expect(arts.length).toBe(ITEMS_DEL_DIA.length)
    for (const art of arts) {
      const titulo = art.querySelector('h3')?.textContent ?? ''
      const delFixture = ITEMS_DEL_DIA.find((i) => i.titulo === titulo)
      expect(delFixture, titulo).toBeDefined()
      const numero = art.querySelector('[data-naira-numero]')
      const cifra = numero?.closest('[data-naira-cifra]')
      expect(cifra, titulo).not.toBeNull()
      expect(cifra!.querySelector('[data-naira-asof]')?.getAttribute('data-naira-asof'), titulo).toBe(delFixture!.asOf)
    }
  })

  describe('en hora de Bogotá aunque el proceso esté en otra zona', () => {
    let tzPrevia: string | undefined
    beforeAll(() => {
      tzPrevia = process.env.TZ
      process.env.TZ = 'Asia/Tokyo'
    })
    afterAll(() => {
      if (tzPrevia === undefined) delete process.env.TZ
      else process.env.TZ = tzPrevia
    })

    it('[N13:asof-bogota] a las 03:30 Z del 7 en Bogotá todavía es el 6: hoy, sin día siguiente y el corte en hora de Colombia', async () => {
      // Control: la zona del proceso SÍ cambió (en Tokio ese instante ya es el día 5).
      expect(new Date('2026-10-05T03:30:00.000Z').getDate()).toBe(5)
      vi.setSystemTime(new Date('2026-10-07T03:30:00.000Z'))
      const conCorteDeMadrugada = entregado('2026-10-06', [item({ asOf: '2026-10-06T03:30:00.000Z' })], false)
      responderSiempre(ok(conCorteDeMadrugada))
      await montar()
      expect(container.querySelector('h1')?.textContent).toBe('Briefing de hoy')
      const siguiente = botonCon('Día siguiente')
      expect(siguiente?.disabled).toBe(true)
      expect(enlaceCon('Día siguiente')).toBeUndefined()
      const marca = container.querySelector('[data-naira-asof="2026-10-06T03:30:00.000Z"]')
      const absoluto = formatearCorte('2026-10-06T03:30:00.000Z', new Date())!.absoluto
      expect((marca?.textContent ?? '').replace(/\s+/g, ' ')).toContain(absoluto.replace(/\s+/g, ' '))
    })
  })

  it('[N13:simulado-visible] con datos de ejemplo todo se marca y no se escribe nada', async () => {
    responderSiempre(ok(DIA_ENTREGADO, 'ejemplo'))
    await montar()
    expect(container.querySelector('[data-testid="aviso-datos-de-ejemplo"]')).not.toBeNull()
    expect(container.querySelector('[data-sample="true"]')).not.toBeNull()
    const numeros = [...container.querySelectorAll('[data-naira-numero]')]
    expect(numeros.length).toBeGreaterThan(0)
    for (const n of numeros) expect(n.getAttribute('data-naira-ejemplo')).toBe('true')
    expect(texto()).toContain('(fecha de ejemplo)')
    const voto = container.querySelector('[data-naira-voto] [role="group"] button') as HTMLButtonElement | null
    expect(voto?.disabled).toBe(true)
    await act(async () => {
      voto?.click()
    })
    expect(red.votarSenal).not.toHaveBeenCalled()

    nuevoRoot()
    responderSiempre(ok(DIA_LUNES, 'ejemplo'))
    await montar()
    const campo = container.querySelector('#recall textarea') as HTMLTextAreaElement | null
    expect(campo?.disabled).toBe(true)
    expect(botonCon('Enviar respuesta')?.disabled).toBe(true)
    expect(texto()).toContain('Datos de ejemplo: no se puede responder.')
    await act(async () => {
      container.querySelector('#recall form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    })
    expect(red.responderRecall).not.toHaveBeenCalled()
  })

  it('[N13:silencio-sin-inventario] sin nada en atención y sin inventario, se declara que no se sabe', async () => {
    responderSiempre(ok(DIA_SIN_ATENCION))
    await montar()
    const atencion = container.querySelector('section[data-naira-seccion="atencion"]')
    expect(atencion).not.toBeNull()
    expect((atencion!.textContent ?? '').replace(/\s+/g, ' ')).toContain(NO_SABEMOS)
    expect(texto()).not.toContain(FRASE)
    expect(container.querySelectorAll('[data-naira-inventario]').length).toBe(1)
  })

  it('[N13:sin-entrega] cada razón sin entrega se dice por su nombre, sin cifras', async () => {
    for (const razon of RAZONES_SIN_BRIEFING) {
      nuevoRoot()
      responderSiempre(ok(sinEntrega(razon)))
      await montar()
      expect(container.querySelector('[data-naira-numero]'), razon).toBeNull()
      switch (razon) {
        case 'briefing_apagado':
          expect(container.querySelector('[data-testid="naira-apagada"]')).not.toBeNull()
          break
        case 'antes_del_corte': {
          expect(texto()).toContain('El briefing de hoy sale a las 6:45 a. m. (hora de Colombia).')
          // «Día anterior» lleva al mismo día: se busca el enlace por su texto y se mide su destino.
          const ayer = enlaceCon('Ver el de ayer')
          expect(ayer?.getAttribute('href')).toBe('/panel/inmobiliaria/reportes/naira?dia=2026-10-05')
          break
        }
        case 'sin_entregas_del_tenant':
          expect(texto()).toContain('Naira no envió briefing este día.')
          break
        case 'sin_entrega_para_el_llamador':
          expect(texto()).toContain('Este día no te llegó briefing a ti.')
          break
      }
    }
  })

  it('[N13:deep-link-dia] ?dia= válido se pide y se navega; uno inválido pide el de hoy', async () => {
    responderSiempre(ok(entregado('2026-10-04', [ITEM_ATENCION], false)))
    await montar('dia=2026-10-04')
    expect(red.leerBriefing).toHaveBeenCalledWith('AGY-1', '2026-10-04')
    expect(container.querySelector('h1')?.textContent).toContain(formatearDia('2026-10-04'))
    expect(enlaceCon('Día anterior')?.getAttribute('href')).toBe('/panel/inmobiliaria/reportes/naira?dia=2026-10-03')
    expect(enlaceCon('Día siguiente')?.getAttribute('href')).toBe('/panel/inmobiliaria/reportes/naira?dia=2026-10-05')

    for (const invalido of ['dia=2026-02-30', 'dia=hola']) {
      nuevoRoot()
      red.leerBriefing.mockClear()
      await montar(invalido)
      expect(red.leerBriefing, invalido).toHaveBeenCalledWith('AGY-1', undefined)
    }
  })

  it('[N13:feedback-por-seccion] votan atención e informativo; estado y seguimiento no; sin la acción, nadie', async () => {
    responderSiempre(ok(DIA_ENTREGADO))
    await montar()
    for (const s of ['atencion', 'informativo']) {
      expect(articulo(s).length, s).toBe(1)
      expect(articulo(s)[0]!.querySelector('[data-naira-voto]'), s).not.toBeNull()
    }
    for (const s of ['estado', 'seguimiento']) {
      expect(articulo(s).length, s).toBe(1)
      expect(articulo(s)[0]!.querySelector('[data-naira-voto]'), s).toBeNull()
    }
    nuevoRoot()
    permisos.conjunto.delete('naira:signal-feedback')
    await montar()
    expect(container.querySelector('article')).not.toBeNull()
    expect(container.querySelector('[data-naira-voto]')).toBeNull()
  })

  it('[N13:sin-href-del-agente] todo enlace es una ruta del panel de un mapa cerrado o de Naira', async () => {
    responderSiempre(ok(DIA_ENTREGADO))
    await montar()
    const permitidas = new Set(
      [...Object.values(RUTA_DE_LA_METRICA), ...Object.values(RUTA_POR_FUENTE)].filter((r): r is string => r !== null),
    )
    const hrefs = enlaces()
    expect(hrefs.length).toBeGreaterThan(0)
    for (const href of hrefs) {
      expect(href.startsWith('/panel/inmobiliaria/'), href).toBe(true)
      expect(permitidas.has(href) || href.startsWith(RUTA_DE_NAIRA), href).toBe(true)
      expect(href.includes('agent.debtor_states'), href).toBe(false)
      expect(href.includes('cartera.morosidad_rate'), href).toBe(false)
    }
    const verLaSenal = [...articulo('atencion')[0]!.querySelectorAll('a')].find((a) => (a.textContent ?? '').includes('Ver la señal'))
    expect(verLaSenal?.getAttribute('href')).toBe(rutaDeLaSenal(P_ATENCION))
  })

  it('[N13:causa-fail-closed] la razón sin clase no aparece: se oculta y se declara', async () => {
    responderSiempre(ok(DIA_ENTREGADO))
    await montar()
    expect(texto()).not.toContain('TEXTO-CAUSAL-SIN-CLASE')
    expect(container.querySelector('[data-naira-causa-oculta]')).not.toBeNull()
    expect(container.querySelector('[data-claim-class]')).toBeNull()
  })

  it('[N13:ocultos-sin-numeral] los ítems ocultos por rol se dicen sin decir cuántos', async () => {
    responderSiempre(ok(DIA_ENTREGADO))
    await montar()
    const p = [...container.querySelectorAll('p')].find((n) => (n.textContent ?? '').includes('Hay elementos que tu rol no puede ver.'))
    expect(p).toBeDefined()
    expect(/\d/.test(p!.textContent ?? '')).toBe(false)
  })

  it('[N13:recall-los-lunes] la pregunta semanal solo el lunes y solo con la acción de responderla', async () => {
    responderSiempre(ok(DIA_LUNES))
    await montar()
    expect(container.querySelector('section#recall textarea')).not.toBeNull()

    nuevoRoot()
    permisos.conjunto.delete('naira:recall-answer')
    await montar()
    expect(container.querySelector('#recall')).toBeNull()

    nuevoRoot()
    permisos.conjunto.add('naira:recall-answer')
    responderSiempre(ok(DIA_ENTREGADO))
    await montar()
    expect(container.querySelector('#recall')).toBeNull()
  })

  it('[N13:b5-sin-persona] ninguna persona del equipo llega al DOM, tampoco con datos de ejemplo', async () => {
    for (const origen of ['agente', 'ejemplo'] as const) {
      nuevoRoot()
      responderSiempre(ok(DIA_ENTREGADO, origen))
      await montar()
      expect(container.querySelector('article')).not.toBeNull()
      for (const id of USER_IDS_DE_EJEMPLO) expect(container.innerHTML.includes(id), origen + ' ' + id).toBe(false)
    }
  })

  it('[N13:inventario-plegado-en-movil] en móvil el inventario va plegado; en escritorio, a la vista', async () => {
    pantalla.escritorio = false
    responderSiempre(ok(DIA_ENTREGADO))
    await montar()
    const abrir = botonCon('Ver qué revisó Naira hoy')
    expect(abrir).toBeDefined()
    expect(container.querySelector('[data-naira-inventario]')).toBeNull()
    await act(async () => {
      abrir!.click()
    })
    expect(container.querySelector('[data-naira-inventario]')).not.toBeNull()

    nuevoRoot()
    pantalla.escritorio = true
    await montar()
    expect(container.querySelector('[data-naira-inventario]')).not.toBeNull()
    expect(botonCon('Ver qué revisó Naira hoy')).toBeUndefined()
  })
})
