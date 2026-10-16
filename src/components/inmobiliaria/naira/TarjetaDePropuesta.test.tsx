/**
 * TarjetaDePropuesta.test.tsx — una propuesta en el listado de Aprobaciones (13-05, Tarea 3).
 *
 * Qué prueba: tipo · rol, estado, clase, vencimiento en `<time>` y «Revisar propuesta» dentro de un bloque ACCIÓN; la
 * consecuencia sale SOLO con sus cortes pegados (E13-6, INV-07) y sin un corte válido no aparece en ninguna parte del DOM;
 * la no reproducible lo dice; el enlace a la ficha no pre-carga y ni el cursor ni el foco piden el detalle (FG13-14); el
 * destinatario es un rol u «Otro agente», nunca una persona; sin `href` no hay enlace; y no se pinta cuándo se propuso.
 *
 * Arnés (molde de 13-04): createRoot + act, stub de i18n real (es.json), `next/link` → `<a data-prefetch>`, `useAuth`
 * con AGY-1, el cliente mockeado en `leerPropuesta` (espía), permisos falsos y popover plano. Marcador en el TÍTULO.
 */

import * as React from 'react'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { RESPUESTA_ESTRICTA_POR_ENDPOINT, type NairaActionSummary } from '@/lib/api/naira/contrato'
import { EJEMPLOS_DE_NAIRA, USER_IDS_DE_EJEMPLO } from '@/lib/data/mock-naira'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { leerDetalle } = vi.hoisted(() => ({ leerDetalle: vi.fn(async () => ({ kind: 'no_disponible' as const })) }))

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))
vi.mock('next/link', () => ({
  default: ({
    href,
    prefetch,
    children,
    ...resto
  }: React.PropsWithChildren<{ href: string; prefetch?: boolean } & Record<string, unknown>>) =>
    React.createElement('a', { href, 'data-prefetch': String(prefetch), ...resto }, children),
}))
vi.mock('@/lib/auth', () => ({ useAuth: () => ({ agency: { id: 'AGY-1' } }) }))
vi.mock('@/lib/api/naira/cliente', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/api/naira/cliente')>()),
  leerPropuesta: leerDetalle,
}))
vi.mock('@/lib/context/PermissionsContext', () => ({
  usePermissionsContext: () => ({ canAccess: () => true, isAdmin: false, agencyRole: 'ADMIN' }),
}))
vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  PopoverContent: ({ children }: { children?: React.ReactNode }) => <div data-testid="popover">{children}</div>,
}))

import { TarjetaDePropuesta, type TarjetaDePropuestaProps } from './TarjetaDePropuesta'

const ESTRICTO = RESPUESTA_ESTRICTA_POR_ENDPOINT['acciones.lista']
const LISTA = EJEMPLOS_DE_NAIRA['acciones.lista']

function accionCon(over: Partial<NairaActionSummary> = {}): NairaActionSummary {
  const accion: NairaActionSummary = {
    ...LISTA.acciones[0],
    proposalId: 'PROP-1',
    tipo: 'crear_tarea',
    clase: 'interna_reversible',
    destinatario: { kind: 'rol', rol: 'role:portafolio' },
    estado: 'pendiente',
    venceEn: '2000-01-03T11:35:00.000Z',
    propuestaEn: '2000-01-02T11:35:00.000Z',
    consecuencia: { kind: 'reproducible', texto: 'CONSECUENCIA-CON-CIFRA 98765' },
    asOfs: [],
    ...over,
  }
  return ESTRICTO.parse({ ...LISTA, acciones: [accion] }).acciones[0]
}

let contenedor: HTMLDivElement
let root: Root

function montar(over: Partial<TarjetaDePropuestaProps> = {}) {
  const props: TarjetaDePropuestaProps = { accion: accionCon(), hrefDeLaFicha: '/x/PROP-1', ...over }
  act(() => {
    root.render(<TarjetaDePropuesta {...props} />)
  })
}

beforeEach(() => {
  leerDetalle.mockClear()
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  root = createRoot(contenedor)
})

afterEach(() => {
  act(() => root.unmount())
  contenedor.remove()
})

describe('TarjetaDePropuesta', () => {
  it('[N13:control-positivo] tipo · rol, estado, clase, vencimiento y «Revisar propuesta» en un bloque ACCIÓN', () => {
    montar()
    const raiz = contenedor.querySelector('[data-naira-propuesta="pendiente"]')
    expect(raiz).not.toBeNull()
    const bloque = raiz?.querySelector('[data-categoria="recomendacion"][data-seccion="ACTION"]')
    expect(bloque).not.toBeNull()
    expect(bloque?.querySelector('h3')?.textContent).toBe('Crear una tarea · Rol: Inmuebles')
    expect(bloque?.textContent).toContain('Por decidir')
    expect(bloque?.textContent).toContain('Interna · se puede deshacer')
    expect(bloque?.textContent).toContain('Vence el')
    expect(bloque?.querySelector('time[datetime="2000-01-03T11:35:00.000Z"]')).not.toBeNull()
    const enlace = bloque?.querySelector('a[href="/x/PROP-1"]')
    expect(enlace?.textContent).toContain('Revisar propuesta')
  })

  it('[N13:fixture-es-contrato] la acción con el centinela pasa el esquema estricto y un campo renombrado no', () => {
    const buena = { ...LISTA.acciones[0], proposalId: 'PROP-1' }
    expect(() => ESTRICTO.parse({ ...LISTA, acciones: [buena] })).not.toThrow()
    const { proposalId, ...resto } = buena
    expect(() => ESTRICTO.parse({ ...LISTA, acciones: [{ ...resto, proposalIdd: proposalId }] })).toThrow()
  })

  it('[N13:listado-sin-consecuencia] sin un corte válido la consecuencia no aparece en el DOM', () => {
    for (const asOfs of [[], ['no-es-un-corte']]) {
      montar({ accion: accionCon({ asOfs }) })
      const html = contenedor.innerHTML
      expect(html, JSON.stringify(asOfs)).not.toContain('98765')
      expect(html, JSON.stringify(asOfs)).not.toContain('CONSECUENCIA')
      expect(contenedor.querySelector('[data-naira-numero]')).toBeNull()
      expect(contenedor.querySelector('[data-naira-consecuencia-del-listado]')).toBeNull()
      expect(contenedor.querySelector('[data-naira-cortes-del-listado]')).toBeNull()
    }
  })

  it('[N13:listado-con-corte] con cortes válidos, la consecuencia y justo debajo sus cortes en el orden del servidor', () => {
    const A = '2000-01-02T11:15:00.000Z'
    const B = '2000-01-01T11:15:00.000Z'
    montar({ accion: accionCon({ asOfs: [A, B] }) })
    const texto = contenedor.querySelector('[data-naira-consecuencia-del-listado]')
    expect(texto?.textContent).toBe('CONSECUENCIA-CON-CIFRA 98765')
    const cortes = texto?.nextElementSibling
    expect(cortes?.matches('[data-naira-cortes-del-listado]')).toBe(true)
    expect(cortes?.textContent).toContain('Datos de esta propuesta:')
    const marcas = Array.from(cortes?.querySelectorAll('[data-naira-asof]') ?? []).map((m) => m.getAttribute('data-naira-asof'))
    expect(marcas).toEqual([A, B])
    expect(contenedor.querySelector('[data-naira-numero]')).toBeNull()
  })

  it('[N13:no-reproducible] la no reproducible lo dice y el enlace a la ficha sigue', () => {
    montar({ accion: accionCon({ consecuencia: { kind: 'no_reproducible' }, asOfs: ['2000-01-02T11:15:00.000Z'] }) })
    const linea = contenedor.querySelector('[data-naira-no-reproducible]')
    expect(linea?.textContent).toBe(
      'No podemos mostrarte la consecuencia exacta de esta propuesta, así que no se puede aprobar.',
    )
    expect(contenedor.querySelector('a[href="/x/PROP-1"]')?.textContent).toContain('Revisar propuesta')
  })

  it('[N13:detalle-solo-al-abrir] el enlace no pre-carga y ni el cursor ni el foco piden el detalle', () => {
    montar()
    const enlace = contenedor.querySelector('a[href="/x/PROP-1"]') as HTMLAnchorElement
    expect(enlace.getAttribute('data-prefetch')).toBe('false')
    act(() => {
      for (const tipo of ['mouseover', 'mouseenter', 'pointerenter', 'focus', 'focusin']) {
        enlace.dispatchEvent(new Event(tipo, { bubbles: true }))
      }
      enlace.focus()
    })
    expect(leerDetalle).toHaveBeenCalledTimes(0)
  })

  it('[N13:rol-no-persona] el destinatario es un rol u «Otro agente», nunca una persona', () => {
    montar()
    for (const html of [contenedor.innerHTML]) {
      expect(html).not.toContain('role:')
      for (const id of USER_IDS_DE_EJEMPLO) expect(html).not.toContain(id)
    }
    montar({
      accion: accionCon({ tipo: 'despachar_vertical', destinatario: { kind: 'vertical', evento: 'cotizador/registry.changed' } }),
    })
    expect(contenedor.querySelector('h3')?.textContent).toBe(
      'Pedirle algo a otro agente · Otro agente: cotizador/registry.changed',
    )
    expect(contenedor.innerHTML).not.toContain('role:')
  })

  it('[P6:externa] una acción externa dice a qué grupo le llega y que es externa, nunca a una persona', () => {
    montar({
      accion: accionCon({ tipo: 'recordatorio_de_pago', clase: 'externa', destinatario: { kind: 'externo', aQuien: 'inquilinos_en_mora' } }),
    })
    expect(contenedor.querySelector('h3')?.textContent).toBe('Recordatorio de pago (lo envía Mori) · Para: inquilinos en mora')
    expect(contenedor.textContent).toContain('Externa')
    montar({
      accion: accionCon({ tipo: 'aviso_al_propietario', clase: 'externa', destinatario: { kind: 'externo', aQuien: 'propietarios_de_inmuebles_disponibles' } }),
    })
    expect(contenedor.querySelector('h3')?.textContent).toBe('Aviso a los propietarios · Para: propietarios de inmuebles disponibles')
    for (const id of USER_IDS_DE_EJEMPLO) expect(contenedor.innerHTML).not.toContain(id)
  })

  it('[N13:sin-href-del-agente] sin href de la ficha no hay ningún enlace', () => {
    montar({ hrefDeLaFicha: null })
    expect(contenedor.querySelector('a')).toBeNull()
  })

  it('[N13:sin-latencia] no se pinta cuándo se propuso ni ninguna latencia', () => {
    montar({ accion: accionCon({ asOfs: ['2000-01-02T11:15:00.000Z'] }) })
    expect(contenedor.innerHTML).not.toContain('2000-01-02T11:35:00.000Z')
    expect(contenedor.innerHTML.toLowerCase()).not.toContain('latencia')
  })
})
