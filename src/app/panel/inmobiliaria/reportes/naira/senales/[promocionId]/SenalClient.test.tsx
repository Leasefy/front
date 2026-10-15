/**
 * @vitest-environment happy-dom
 *
 * SenalClient — la ficha de una señal congelada, de la lectura al DOM (13-03, Tarea 4; FG13-1, FG13-5, FG13-6,
 * FG13-10, FG13-13, UI-01, E13-2, E13-3).
 *
 * Qué prueba: el estado entra una vez a VistaDeNaira (tras un ok, pasar a una señal sin permiso no deja nada); la cifra
 * con su corte pegado; con datos de ejemplo todo se marca y no se vota; la causa sin clase se oculta y la que trae su
 * clase se ve con su chip; cada causa no citable por su razón; las entidades afectadas SIEMPRE, las del contrato; votos
 * por sección y por acción; 404 con su copy; ningún enlace sale de un campo del agente; la vuelta al MISMO día; ninguna
 * persona en el DOM; la ranura de la línea de seguimiento de 13-04.
 *
 * Arnés: el de BriefingClient.test.tsx con `leerSenal`. Los fixtures pasan el esquema ESTRICTO del contrato (con
 * `entidades`, `valorRenderizado`, `nombreDeMetrica` y `citasConClase` del mismo largo que `citas`). Marcador [N13:*] en
 * el TÍTULO.
 */

import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const red = vi.hoisted(() => {
  const estado: { responder: (promocionId: string) => Promise<unknown> } = { responder: async () => ({ kind: 'no_disponible' }) }
  return {
    estado,
    leerSenal: vi.fn((_agencyId: string, promocionId: string) => estado.responder(promocionId)),
    votarSenal: vi.fn(() => new Promise<unknown>(() => undefined)),
  }
})
const permisos = vi.hoisted(() => ({ conjunto: new Set<string>() }))

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: React.PropsWithChildren<{ href: string } & Record<string, unknown>>) =>
    React.createElement('a', { href, ...rest }, children),
}))
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(''),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/panel/inmobiliaria/reportes/naira/senales/P-1',
}))
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ agency: { id: 'AGY-1' } }) }))
vi.mock('@/lib/api/naira/cliente', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/naira/cliente')>()),
  leerSenal: red.leerSenal,
  votarSenal: red.votarSenal,
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
  Popover: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
  PopoverTrigger: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
  PopoverContent: ({ children }: { children?: React.ReactNode }) => <span data-testid="popover">{children}</span>,
}))
vi.mock('@/components/ui/toast', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

import {
  RAZONES_DE_CAUSA_NO_CITABLE,
  RESPUESTA_ESTRICTA_POR_ENDPOINT,
  type NairaBriefingItem,
  type NairaSignalDetail,
} from '@/lib/api/naira/contrato'
import { USER_IDS_DE_EJEMPLO } from '@/lib/data/mock-naira'
import es from '@/lib/i18n/locales/es.json'
import { RUTA_DE_LA_METRICA, RUTA_POR_FUENTE } from '@/lib/naira/fuente-a-ruta'
import { RUTA_DE_NAIRA, rutaDelBriefing } from '@/lib/nav/rutas-de-naira'
import { ProveedorDeOrigen } from '@/components/inmobiliaria/naira/OrigenDeNaira'

import { SenalClient } from './SenalClient'
import { SeccionDeEntidades, SenalView } from './SenalView'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const PROMOCION = '00000000-0000-4000-8000-000000000001'
const INMUEBLE = '00000000-0000-4000-8000-000000000009'
const TOKEN = 'TOKEN-SENAL-200'

const ITEM: NairaBriefingItem = {
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
  promocion: { kind: 'promovida', promocionId: PROMOCION },
  causa: { kind: 'investigada', razon: 'Razón del ítem (ejemplo)' },
  entidades: { kind: 'agregada' },
  valorRenderizado: '12,5%',
  nombreDeMetrica: 'Morosidad de la cartera (ejemplo)',
}

const SENAL: NairaSignalDetail = {
  promocionId: PROMOCION,
  dia: '2026-10-06',
  corte: '2026-10-06T11:00:00.000Z',
  congeladaEn: '2026-10-06T11:45:00.000Z',
  item: ITEM,
  causa: {
    kind: 'citada',
    investigacionId: '00000000-0000-4000-8000-000000000002',
    citas: ['CITA-SIN-CLASE-1', 'CITA-SIN-CLASE-2'],
    citasConClase: [
      { texto: 'CITA-SIN-CLASE-1', claimClass: null, hipotesis: null },
      { texto: 'CITA-SIN-CLASE-2', claimClass: null, hipotesis: null },
    ],
  },
}

const CON_CLASE: NairaSignalDetail = {
  ...SENAL,
  causa: {
    kind: 'citada',
    investigacionId: '00000000-0000-4000-8000-000000000002',
    citas: ['CITA-CON-CLASE-1', 'CITA-SIN-CLASE-2'],
    citasConClase: [
      { texto: 'CITA-CON-CLASE-1', claimClass: 'aritmetica', hipotesis: null },
      { texto: 'CITA-SIN-CLASE-2', claimClass: null, hipotesis: null },
    ],
  },
}

const CON_LISTA: NairaSignalDetail = { ...SENAL, item: { ...ITEM, entidades: { kind: 'lista', items: [{ tipo: 'inmueble', id: INMUEBLE }] } } }
const noCitable = (razon: (typeof RAZONES_DE_CAUSA_NO_CITABLE)[number]): NairaSignalDetail => ({ ...SENAL, causa: { kind: 'no_citable', razon } })
const SIN_INVESTIGACION: NairaSignalDetail = { ...SENAL, causa: { kind: 'investigacion_no_disponible' } }

const ok = (data: NairaSignalDetail, origen: 'agente' | 'ejemplo' = 'agente') => ({ kind: 'ok', data, origen }) as const

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

async function montar(promocionId = 'P-1'): Promise<void> {
  act(() => {
    root.render(<SenalClient promocionId={promocionId} />)
  })
  await asentar()
}

function nuevoRoot(): void {
  act(() => root.unmount())
  root = createRoot(container)
}

const texto = () => (container.textContent ?? '').replace(/\s+/g, ' ')
const leerEs = (clave: string): string => {
  const v = clave
    .split('.')
    .reduce<unknown>((a, p) => (a !== null && typeof a === 'object' ? (a as Record<string, unknown>)[p] : undefined), es)
  return typeof v === 'string' ? v : ''
}
const hrefDeVolver = () => {
  const v = container.querySelector('[data-testid="volver-a-la-lista"]')
  return v?.getAttribute('href') ?? v?.querySelector('a')?.getAttribute('href') ?? null
}

beforeEach(() => {
  red.leerSenal.mockClear()
  red.votarSenal.mockClear()
  responderSiempre({ kind: 'no_disponible' })
  permisos.conjunto = new Set(['cobros:view', 'cobranza:view', 'portafolio:view', 'pipeline:view', 'naira:signal-feedback'])
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

describe('SenalClient', () => {
  it('[N13:fixture-es-contrato] cada fixture del archivo pasa el esquema estricto del contrato', () => {
    const estricto = RESPUESTA_ESTRICTA_POR_ENDPOINT['senal.detalle']
    for (const fixture of [SENAL, CON_CLASE, CON_LISTA, SIN_INVESTIGACION, ...RAZONES_DE_CAUSA_NO_CITABLE.map(noCitable)]) {
      const r = estricto.safeParse(fixture)
      expect(r.success, JSON.stringify(r.success ? null : r.error.issues)).toBe(true)
    }
  })

  it('[N13:control-positivo] la ficha con su título, su vuelta, su cifra y sus entidades', async () => {
    responderSiempre(ok(SENAL))
    await montar('P-1')
    expect(red.leerSenal).toHaveBeenCalledWith('AGY-1', 'P-1')
    expect(container.querySelector('[data-naira-vista="senal"][data-naira-estado="ok"]')).not.toBeNull()
    const h1s = container.querySelectorAll('h1')
    expect(h1s.length).toBe(1)
    expect(h1s[0]!.textContent).toContain(TOKEN)
    expect(container.querySelector('[data-testid="volver-a-la-lista"]')).not.toBeNull()
    expect(container.querySelector('[data-naira-numero]')).not.toBeNull()
    expect(container.querySelector('[data-naira-entidades="agregada"]')).not.toBeNull()
  })

  it('[N13:403-sin-residuo] tras un ok, pasar a una señal sin permiso no deja nada de la anterior', async () => {
    red.estado.responder = async (id) => (id === 'P-1' ? ok(SENAL) : { kind: 'sin_permiso' })
    await montar('P-1')
    expect(texto()).toContain(TOKEN)

    await montar('P-2')
    expect(red.leerSenal).toHaveBeenLastCalledWith('AGY-1', 'P-2')
    expect(container.querySelector('[data-testid="naira-sin-permiso"]')).not.toBeNull()
    expect(texto()).not.toContain(TOKEN)
    expect(container.querySelector('[data-naira-numero]')).toBeNull()
    expect(container.querySelector('h1')).toBeNull()
    const volver = [...container.querySelectorAll('a')].find((a) => (a.textContent ?? '').includes('Volver al briefing'))
    expect(volver?.getAttribute('href')).toBe(RUTA_DE_NAIRA)
  })

  it('[N13:asof-pegado] el corte vive en el mismo contenedor que el número', async () => {
    responderSiempre(ok(SENAL))
    await montar()
    const cifra = container.querySelector('[data-naira-numero]')?.closest('[data-naira-cifra]')
    expect(cifra).not.toBeNull()
    expect(cifra!.querySelector('[data-naira-asof]')?.getAttribute('data-naira-asof')).toBe('2026-10-06T11:15:00.000Z')
  })

  it('[N13:simulado-visible] con datos de ejemplo todo se marca y no se vota', async () => {
    responderSiempre(ok(SENAL, 'ejemplo'))
    await montar()
    expect(container.querySelector('[data-testid="aviso-datos-de-ejemplo"]')).not.toBeNull()
    expect(container.querySelector('[data-sample="true"]')).not.toBeNull()
    expect(container.querySelector('[data-naira-numero]')?.getAttribute('data-naira-ejemplo')).toBe('true')
    expect(texto()).toContain('Congelada (fecha de ejemplo): es lo que Naira te envió ese día.')
    const botones = [...container.querySelectorAll('[data-naira-voto] [role="group"] button')] as HTMLButtonElement[]
    expect(botones.length).toBe(3)
    for (const b of botones) expect(b.disabled).toBe(true)
  })

  it('[N13:causa-fail-closed] las citas sin clase no se pintan: se ocultan y se declara una vez', async () => {
    responderSiempre(ok(SENAL))
    await montar()
    expect(texto()).not.toContain('CITA-SIN-CLASE-1')
    expect(texto()).not.toContain('CITA-SIN-CLASE-2')
    const inferencia = container.querySelector('[data-categoria="inferencia"]')
    expect(inferencia?.querySelectorAll('[data-naira-causa-oculta]').length).toBe(1)
    expect(container.querySelectorAll('[data-naira-causa-oculta]').length).toBe(1)
    expect(container.querySelector('[data-claim-class]')).toBeNull()
  })

  it('[N13:causa-con-clase] una cita con su clase se ve con su chip; la que no, se oculta', async () => {
    responderSiempre(ok(CON_CLASE))
    await montar()
    const inferencia = container.querySelector('[data-categoria="inferencia"]')
    const conClase = inferencia?.querySelector('p[data-claim-class="aritmetica"]')
    expect(conClase?.textContent).toContain('CITA-CON-CLASE-1')
    expect(texto()).not.toContain('CITA-SIN-CLASE-2')
    expect(container.querySelectorAll('[data-naira-causa-oculta]').length).toBe(1)

    nuevoRoot()
    const sinCitasConClase: NairaSignalDetail = {
      ...SENAL,
      causa: { kind: 'citada', investigacionId: '00000000-0000-4000-8000-000000000002', citas: ['CITA-A', 'CITA-B'] },
    }
    responderSiempre(ok(sinCitasConClase))
    await montar()
    expect(texto()).not.toContain('CITA-A')
    expect(texto()).not.toContain('CITA-B')
    expect(container.querySelectorAll('[data-naira-causa-oculta]').length).toBe(1)
  })

  it('[N13:causa-no-citable] cada razón por su texto, dentro de la inferencia', async () => {
    for (const razon of RAZONES_DE_CAUSA_NO_CITABLE) {
      nuevoRoot()
      responderSiempre(ok(noCitable(razon)))
      await montar()
      const esperado = leerEs('inmobiliaria.ai.naira.senal.causaNoCitable.' + razon)
      expect(esperado.length, razon).toBeGreaterThan(0)
      expect(container.querySelector('[data-categoria="inferencia"]')?.textContent, razon).toContain(esperado)
    }
    nuevoRoot()
    responderSiempre(ok(SIN_INVESTIGACION))
    await montar()
    expect(container.querySelector('[data-categoria="inferencia"]')?.textContent).toContain(
      'Naira todavía no había investigado esta señal cuando la congeló.',
    )
  })

  it('[N13:entidades-siempre] la sección de entidades está con toda causa y con datos de ejemplo', async () => {
    const casos: [NairaSignalDetail, 'agente' | 'ejemplo'][] = [
      [SENAL, 'agente'],
      [SIN_INVESTIGACION, 'agente'],
      ...RAZONES_DE_CAUSA_NO_CITABLE.map((r) => [noCitable(r), 'agente'] as [NairaSignalDetail, 'agente']),
      [SENAL, 'ejemplo'],
    ]
    for (const [detalle, origen] of casos) {
      nuevoRoot()
      responderSiempre(ok(detalle, origen))
      await montar()
      const seccion = container.querySelector('[data-naira-entidades="agregada"]')
      const nombre = detalle.causa.kind + ' ' + origen
      expect(seccion, nombre).not.toBeNull()
      expect(seccion!.textContent, nombre).toContain('ENTIDADES AFECTADAS')
      expect(seccion!.textContent, nombre).toContain(leerEs('inmobiliaria.ai.naira.senal.entidades.agregada'))
      expect(seccion!.querySelector('[data-naira-enlace]'), nombre).not.toBeNull()
    }
  })

  it('[N13:entidades-del-contrato] las entidades que trae el ítem, por tipo e id, sin enlace por entidad', async () => {
    responderSiempre(ok(CON_LISTA))
    await montar()
    const seccion = container.querySelector('[data-naira-entidades="lista"]')
    expect(seccion).not.toBeNull()
    const lis = [...seccion!.querySelectorAll('li')]
    expect(lis.length).toBe(1)
    expect(lis[0]!.textContent).toBe('inmueble · ' + INMUEBLE)
    expect(lis[0]!.className).toContain('font-mono')
    expect(lis[0]!.querySelector('a')).toBeNull()
  })

  it('[N13:entidades-lista] hasta cincuenta, sin enlaces por entidad y sin decir cuántas hay de más', () => {
    const muchas = Array.from({ length: 51 }, (_, i) => ({ tipo: 'consignacion', id: 'C-' + (i + 1) }))
    act(() => {
      root.render(
        <ProveedorDeOrigen origen="agente">
          <SeccionDeEntidades entidades={{ kind: 'lista', items: muchas }} metricId="cartera.morosidad_rate" />
        </ProveedorDeOrigen>,
      )
    })
    const lis = [...container.querySelectorAll('li')]
    expect(lis.length).toBe(50)
    for (const li of lis) {
      expect(li.className).toContain('font-mono')
      expect(li.querySelector('a')).toBeNull()
    }
    expect(texto()).toContain('Hay más: míralas todas en la fuente.')
    expect(container.querySelector('[data-naira-enlace]')).not.toBeNull()
    const sinLaLista = container.cloneNode(true) as HTMLElement
    for (const n of sinLaLista.querySelectorAll('li')) n.remove()
    expect(/\d/.test(sinLaLista.textContent ?? ''), sinLaLista.textContent ?? '').toBe(false)

    act(() => {
      root.render(
        <ProveedorDeOrigen origen="agente">
          <SeccionDeEntidades entidades={{ kind: 'lista', items: muchas.slice(0, 3) }} metricId="cartera.morosidad_rate" />
        </ProveedorDeOrigen>,
      )
    })
    expect(container.querySelectorAll('li').length).toBe(3)
    expect(texto()).not.toContain('Hay más')
  })

  it('[N13:feedback-por-seccion] vota un ítem de atención; uno de estado no; sin la acción, ninguno', async () => {
    responderSiempre(ok(SENAL))
    await montar()
    expect(container.querySelector('[data-naira-voto]')).not.toBeNull()

    nuevoRoot()
    responderSiempre(ok({ ...SENAL, item: { ...ITEM, seccion: 'estado' } }))
    await montar()
    expect(container.querySelector('[data-naira-numero]')).not.toBeNull()
    expect(container.querySelector('[data-naira-voto]')).toBeNull()

    nuevoRoot()
    permisos.conjunto.delete('naira:signal-feedback')
    responderSiempre(ok(SENAL))
    await montar()
    expect(container.querySelector('[data-naira-numero]')).not.toBeNull()
    expect(container.querySelector('[data-naira-voto]')).toBeNull()
  })

  it('[N13:no-encontrado] un 404 dice que no se encontró o no está disponible para el rol', async () => {
    responderSiempre({ kind: 'no_encontrado' })
    await montar()
    const nf = container.querySelector('[data-testid="naira-no-encontrado"]')
    expect(nf).not.toBeNull()
    expect(nf!.textContent).toContain('No encontramos esta señal, o no está disponible para tu rol')
  })

  it('[N13:sin-href-del-agente] todo enlace es una ruta del panel de un mapa cerrado o de Naira', async () => {
    responderSiempre(ok(SENAL))
    await montar()
    const permitidas = new Set(
      [...Object.values(RUTA_DE_LA_METRICA), ...Object.values(RUTA_POR_FUENTE)].filter((r): r is string => r !== null),
    )
    const hrefs = [...container.querySelectorAll('a[href]')].map((a) => a.getAttribute('href') ?? '')
    expect(hrefs.length).toBeGreaterThan(0)
    for (const href of hrefs) {
      expect(permitidas.has(href) || href.startsWith(RUTA_DE_NAIRA), href).toBe(true)
      expect(href.includes('agent.debtor_states'), href).toBe(false)
      expect(href.includes('cartera.morosidad_rate'), href).toBe(false)
    }
  })

  it('[N13:volver-al-dia] la vuelta lleva al briefing del MISMO día de la señal', async () => {
    responderSiempre(ok(SENAL))
    await montar()
    expect(hrefDeVolver()).toBe(rutaDelBriefing('2026-10-06'))
  })

  it('[N13:b5-sin-persona] ninguna persona del equipo llega al DOM', async () => {
    for (const origen of ['agente', 'ejemplo'] as const) {
      nuevoRoot()
      responderSiempre(ok(SENAL, origen))
      await montar()
      expect(container.querySelector('h1')).not.toBeNull()
      for (const id of USER_IDS_DE_EJEMPLO) expect(container.innerHTML.includes(id), origen + ' ' + id).toBe(false)
    }
  })

  it('[N13:linea-de-seguimiento] la ranura de 13-04 pinta lo que le pasen, y sin nada no pinta nada', () => {
    const ahora = new Date('2026-10-06T15:00:00.000Z')
    act(() => {
      root.render(
        <ProveedorDeOrigen origen="agente">
          <SenalView
            detalle={SENAL}
            origen="agente"
            puedeVotar={false}
            ahora={ahora}
            lineaDeSeguimiento={<p data-prueba="seguimiento">Seguimiento de prueba</p>}
          />
        </ProveedorDeOrigen>,
      )
    })
    expect(container.querySelector('[data-prueba="seguimiento"]')?.textContent).toBe('Seguimiento de prueba')
    act(() => {
      root.render(
        <ProveedorDeOrigen origen="agente">
          <SenalView detalle={SENAL} origen="agente" puedeVotar={false} ahora={ahora} />
        </ProveedorDeOrigen>,
      )
    })
    expect(container.querySelector('[data-prueba="seguimiento"]')).toBeNull()
  })
})
