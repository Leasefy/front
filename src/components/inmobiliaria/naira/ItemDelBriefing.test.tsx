/**
 * @vitest-environment happy-dom
 *
 * ItemDelBriefing — un ítem congelado: título tal cual, cifra con su corte pegado, urgencia con texto, causa sin clase
 * oculta y declarada, votos solo donde la sección vota (13-03, Tarea 2; FG13-5, D13-10, D13-15, E13-13).
 *
 * Arnés: createRoot + act, i18n contra el es.json real (stub), `next/link` → `<a href>`, agencia AGY-1, el cliente
 * mockeado solo en `votarSenal`/`responderRecall` (promesas que controla el test), permisos que dejan pasar, popover
 * plano y toast mockeado. Marcador [N13:*] en el TÍTULO.
 */

import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const red = vi.hoisted(() => ({
  votarSenal: vi.fn(() => new Promise<unknown>(() => undefined)),
  responderRecall: vi.fn(() => new Promise<unknown>(() => undefined)),
}))

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: React.PropsWithChildren<{ href: string } & Record<string, unknown>>) =>
    React.createElement('a', { href, ...rest }, children),
}))
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ agency: { id: 'AGY-1' } }) }))
vi.mock('@/lib/api/naira/cliente', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/naira/cliente')>()),
  votarSenal: red.votarSenal,
  responderRecall: red.responderRecall,
}))
vi.mock('@/lib/context/PermissionsContext', () => ({
  usePermissionsContext: () => ({ canAccess: () => true, isAdmin: false, agencyRole: 'ADMIN' }),
  usePermissionsContextSafe: () => null,
}))
vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  PopoverContent: ({ children }: { children?: React.ReactNode }) => <div data-testid="popover">{children}</div>,
}))
vi.mock('@/components/ui/toast', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

import es from '@/lib/i18n/locales/es.json'
import { SECCIONES_DEL_BRIEFING, URGENCY_CLASSES, type NairaBriefingItem } from '@/lib/api/naira/contrato'
import { formatearValorDeNaira } from '@/lib/naira/formato'

import { ItemDelBriefing, type ItemDelBriefingProps } from './ItemDelBriefing'
import { ProveedorDeOrigen } from './OrigenDeNaira'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const PROMOCION = '00000000-0000-4000-8000-000000000001'
const TITULO = 'La morosidad subió 12,5 % (ejemplo) TOKEN-ITEM'

const ITEM: NairaBriefingItem = {
  seccion: 'atencion',
  posicion: 1,
  metricId: 'cartera.morosidad_rate',
  valor: '12.5',
  unidad: 'pct',
  asOf: '2026-10-05T11:15:00.000Z',
  fuente: 'agent.debtor_states',
  trust: 'system',
  clave: 'morosidad@1:cartera.morosidad_rate:2026-10-05',
  urgencyClass: 'ventana_legal',
  titulo: TITULO,
  promocion: { kind: 'promovida', promocionId: PROMOCION },
  causa: { kind: 'investigada', razon: 'TEXTO-CAUSAL-SIN-CLASE' },
  entidades: { kind: 'agregada' },
}

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  red.votarSenal.mockClear()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

function montar(props: Partial<ItemDelBriefingProps> = {}, origen: 'agente' | 'ejemplo' = 'agente'): void {
  act(() => {
    root.render(
      <ProveedorDeOrigen origen={origen}>
        <ItemDelBriefing item={ITEM} hrefDeLaSenal="/prueba/senal-1" puedeVotar {...props} />
      </ProveedorDeOrigen>,
    )
  })
}

const texto = () => (container.textContent ?? '').replace(/\s+/g, ' ')
const leerEs = (clave: string): unknown =>
  clave.split('.').reduce<unknown>((a, p) => (a !== null && typeof a === 'object' ? (a as Record<string, unknown>)[p] : undefined), es)

describe('ItemDelBriefing', () => {
  it('[N13:control-positivo] un ítem de atención con su título, su cifra, su urgencia, su enlace y sus votos', () => {
    montar()
    const article = container.querySelector('article[data-naira-item="atencion"]')
    expect(article).not.toBeNull()
    const idTitulo = article!.getAttribute('aria-labelledby')
    expect(idTitulo).toBeTruthy()
    const h3 = container.querySelector('h3')
    expect(h3?.id).toBe(idTitulo)
    expect(h3?.textContent).toContain('TOKEN-ITEM')
    expect(container.querySelector('[data-categoria="dato"]')).not.toBeNull()
    expect(container.querySelector('[data-naira-numero]')).not.toBeNull()
    expect(texto()).toContain('Plazo legal')
    const enlace = container.querySelector('a[href="/prueba/senal-1"]')
    expect(enlace?.textContent).toContain('Ver la señal')
    expect(container.querySelector('[data-naira-voto]')).not.toBeNull()
  })

  it('[N13:asof-pegado] el corte vive en el MISMO contenedor que su número', () => {
    montar()
    const numero = container.querySelector('[data-naira-numero]')
    const cifra = numero?.closest('[data-naira-cifra]')
    expect(cifra).not.toBeNull()
    expect(cifra!.querySelector('[data-naira-asof]')?.getAttribute('data-naira-asof')).toBe('2026-10-05T11:15:00.000Z')
  })

  it('[N13:feedback-por-seccion] solo atención e informativo votan; sin la acción o sin promoción, nadie', () => {
    for (const seccion of SECCIONES_DEL_BRIEFING) {
      montar({ item: { ...ITEM, seccion } })
      const vota = seccion === 'atencion' || seccion === 'informativo'
      expect(container.querySelector('[data-naira-voto]') !== null, seccion).toBe(vota)
    }
    montar({ puedeVotar: false })
    expect(container.querySelector('[data-naira-voto]')).toBeNull()
    montar({ item: { ...ITEM, promocion: { kind: 'sin_promocion' } }, hrefDeLaSenal: null })
    expect(container.querySelector('[data-naira-voto]')).toBeNull()
    expect(texto()).not.toContain('Ver la señal')
    expect([...container.querySelectorAll('a')].some((a) => (a.textContent ?? '').includes('Ver la señal'))).toBe(false)
  })

  it('[N13:causa-fail-closed] la razón sin clase no se pinta: se oculta y se declara una vez', () => {
    montar()
    expect(texto()).not.toContain('TEXTO-CAUSAL-SIN-CLASE')
    const inferencia = container.querySelector('[data-categoria="inferencia"]')
    expect(inferencia).not.toBeNull()
    expect(inferencia!.querySelectorAll('[data-naira-causa-oculta]').length).toBe(1)
    expect(container.querySelectorAll('[data-naira-causa-oculta]').length).toBe(1)
    expect(container.querySelector('[data-claim-class]')).toBeNull()

    montar({ item: { ...ITEM, causa: { kind: 'investigacion_no_disponible' } } })
    expect(container.querySelector('[data-categoria="inferencia"]')?.textContent).toContain(
      'Naira todavía no había investigado esta señal cuando armó el briefing.',
    )
  })

  it('[N13:urgencia-cerrada] cada urgencia del contrato se dice con su texto, sin cobalto', () => {
    for (const urgencyClass of URGENCY_CLASSES) {
      montar({ item: { ...ITEM, urgencyClass } })
      const etiqueta = container.querySelector(`[data-naira-urgencia="${urgencyClass}"]`)
      expect(etiqueta, urgencyClass).not.toBeNull()
      const esperado = leerEs('inmobiliaria.ai.naira.briefing.urgencia.' + urgencyClass)
      expect(typeof esperado === 'string' && esperado.trim().length > 0, urgencyClass).toBe(true)
      expect(etiqueta!.textContent?.trim()).toBe(esperado)
      expect(etiqueta!.textContent?.trim()).not.toBe(urgencyClass)
      const clases = [etiqueta!, ...etiqueta!.querySelectorAll('*')].map((n) => n.getAttribute('class') ?? '').join(' ')
      expect(clases).not.toMatch(/\bbg-primary\b|\btext-primary\b/)
    }
  })

  it('[N13:simulado-visible] con datos de ejemplo el número se marca, el corte dice DATO DE EJEMPLO y no se vota', () => {
    montar({}, 'ejemplo')
    const numero = container.querySelector('[data-naira-numero]')
    expect(numero?.getAttribute('data-naira-ejemplo')).toBe('true')
    expect(container.querySelector('[data-naira-asof]')?.textContent).toContain('DATO DE EJEMPLO')
    const botones = [...container.querySelectorAll('[data-naira-voto] [role="group"] button')] as HTMLButtonElement[]
    expect(botones.length).toBe(3)
    for (const b of botones) expect(b.disabled).toBe(true)
  })

  it('[N13:titulo-tal-cual] el título se pinta exactamente como lo manda el servidor', () => {
    montar()
    expect(container.querySelector('h3')?.textContent).toBe(TITULO)
  })

  it('[N13:valor-renderizado] con el valor ya escrito por el agente se pinta ése; sin él, el del formateador', () => {
    montar({ item: { ...ITEM, valorRenderizado: 'VALOR-DEL-AGENTE (ejemplo)' } })
    expect(container.querySelector('[data-naira-numero]')?.textContent).toBe('VALOR-DEL-AGENTE (ejemplo)')
    montar()
    expect(container.querySelector('[data-naira-numero]')?.textContent).toBe(formatearValorDeNaira('12.5', 'pct'))
  })
})
