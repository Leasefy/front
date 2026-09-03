/**
 * La lista del process view: en vivo arriba, filtros con conteos reales, y
 * la honestidad de fuente («no hay» ≠ «no pudimos leer»).
 */

import * as React from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string, vars?: Record<string, string>) => (vars ? `${k}(${Object.values(vars).join(',')})` : k),
    locale: 'es',
  }),
}))
vi.mock('@/components/inmobiliaria/ai/ColaHumana', () => ({ relativeTime: () => 'hace 3 s' }))
vi.mock('@/lib/format', () => ({ formatCurrency: (n: number) => `$${n}` }))
vi.mock('@leasefy/cadence', () => ({
  Chip: ({ children, selected, onClick, ...props }: Record<string, unknown> & { children?: React.ReactNode; selected?: boolean; onClick?: () => void }) => {
    const { size, icon, ...rest } = props
    void size; void icon
    return (
      <button type="button" aria-pressed={Boolean(selected)} onClick={onClick} {...(rest as object)}>
        {children}
      </button>
    )
  },
  MonoLabel: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
}))
// Los estados de datos y la alerta traen medio DS adentro; acá se pintan planos.
vi.mock('@/components/estado/EstadoDeDatos', () => ({
  EstadoDeDatos: ({ cargando, vacio, cuandoVacio, esqueleto, children }: { cargando: boolean; vacio?: boolean; cuandoVacio?: React.ReactNode; esqueleto?: React.ReactNode; children?: React.ReactNode }) =>
    cargando ? <div>{esqueleto}</div> : vacio ? <div>{cuandoVacio}</div> : <div>{children}</div>,
}))
vi.mock('@/components/estado/SinDatos', () => ({
  SinDatos: ({ titulo, descripcion }: { titulo: string; descripcion?: string }) => <div data-testid="sin-datos">{titulo} {descripcion}</div>,
}))
vi.mock('@/components/estado/EsqueletoTabla', () => ({ EsqueletoTarjetas: () => <div data-testid="esqueleto" /> }))
vi.mock('@/components/ui/alerta-accionable', () => ({
  AlertaAccionable: ({ titulo, children, ...props }: Record<string, unknown> & { titulo: string; children?: React.ReactNode }) => {
    const { severidad, accion, secundaria, icon, ...rest } = props
    void severidad; void accion; void secundaria; void icon
    return <div {...(rest as object)}><strong>{titulo}</strong>{children}</div>
  },
}))
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children?: React.ReactNode; className?: string }) => <div className={className}>{children}</div>,
}))
vi.mock('@/components/ui/pagination', () => ({
  TablePagination: ({ total }: { total: number }) => <div data-testid="pagination">{total}</div>,
}))
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, asChild, hideArrow, variant, size, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => {
    void asChild; void hideArrow; void variant; void size
    return <button {...(props as object)}>{children}</button>
  },
}))

import { PilotoProcesos } from './PilotoProcesos'
import type { PilotoProcesosResponse, Proceso } from '@/lib/api/piloto'

function proceso(extra: Partial<Proceso>): Proceso {
  return {
    id: 'mov:x',
    tipo: 'deposito',
    agente: 'conciliacion',
    estado: 'hecho',
    titulo: 'Detecté un depósito de $1',
    resumen: null,
    resultado: 'Conciliado',
    quien: null,
    montoCop: 1,
    inicioAt: '2026-09-02T01:14:54.381-05:00',
    ultimoAt: '2026-09-02T01:14:54.381-05:00',
    pasos: [{ at: '2026-09-02T01:14:54.381-05:00', titulo: 'Depósito detectado', estado: 'hecho' }],
    enVivo: false,
    enlace: null,
    ...extra,
  }
}

const DATA: PilotoProcesosResponse = {
  procesos: [
    proceso({ id: 'call:viva', tipo: 'llamada', estado: 'en_curso', titulo: 'Estoy hablando con Nicolás G.', enVivo: true, resultado: 'En curso' }),
    proceso({ id: 'mov:1', estado: 'hecho', titulo: 'Detecté un depósito de $2.400.000' }),
    proceso({ id: 'mov:2', estado: 'esperando', titulo: 'Detecté un depósito de $2.100.000', resultado: 'Hay que elegir' }),
    proceso({ id: 'call:1', tipo: 'llamada', estado: 'hecho', titulo: 'Llamé a Deudora d.', resultado: 'No contestó' }),
    proceso({ id: 'call:2', tipo: 'llamada', estado: 'sin_resultado', titulo: 'Llamé a Nicolás G.', resultado: 'Sin resultado' }),
  ],
  totales: { deposito: 5, llamada: 651, whatsapp: 7 },
  enVivo: 1,
  fuentes: { deposito: 'ok', llamada: 'ok', whatsapp: 'ok' },
  tomadoAt: '2026-09-02T20:00:00Z',
}

let container: HTMLDivElement
let root: Root
function render(props: Partial<React.ComponentProps<typeof PilotoProcesos>> = {}) {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => {
    root.render(
      <PilotoProcesos
        data={DATA}
        isLoading={false}
        error={null}
        notAvailable={false}
        tipo="todos"
        onTipo={() => {}}
        {...props}
      />,
    )
  })
}
afterEach(() => {
  act(() => root.unmount())
  container.remove()
})
const q = (s: string) => container.querySelector(s)

describe('PilotoProcesos', () => {
  it('lo vivo va arriba, expandido, y no se repite en la lista', () => {
    render()
    const vivo = q('[data-testid="procesos-en-vivo"]')!
    expect(vivo.querySelector('[data-testid="proceso-call:viva"]')).not.toBeNull()
    expect(vivo.querySelector('[data-testid="proceso-detalle-call:viva"]')).not.toBeNull()
    const lista = q('[data-testid="procesos-lista"]')!
    expect(lista.querySelector('[data-testid="proceso-call:viva"]')).toBeNull()
    expect(lista.querySelectorAll('article')).toHaveLength(4)
  })

  it('los chips de tipo llevan el TOTAL real (no el de la página) y llaman a onTipo', async () => {
    const tipos: string[] = []
    render({ onTipo: (t) => tipos.push(t) })
    expect(q('[data-testid="procesos-tipo-llamada"]')?.textContent).toContain('651')
    expect(q('[data-testid="procesos-tipo-todos"]')?.textContent).toContain('663')
    await act(async () => {
      ;(q('[data-testid="procesos-tipo-whatsapp"]') as HTMLButtonElement).click()
    })
    expect(tipos).toEqual(['whatsapp'])
  })

  it('el filtro por estado deja solo esos (y «te esperan» cuenta lo que espera)', async () => {
    render()
    expect(q('[data-testid="procesos-estado-esperando"]')?.textContent).toContain('1')
    await act(async () => {
      ;(q('[data-testid="procesos-estado-sin_resultado"]') as HTMLButtonElement).click()
    })
    const lista = q('[data-testid="procesos-lista"]')!
    expect(lista.querySelectorAll('article')).toHaveLength(1)
    expect(lista.textContent).toContain('Llamé a Nicolás G.')
  })

  it('sin fuente no dice «no hay procesos»: dice que no se pudo consultar', () => {
    render({ data: null, notAvailable: true })
    expect(container.textContent).toContain('inmobiliaria.piloto.procesos.sinFuente')
    expect(container.textContent).not.toContain('inmobiliaria.piloto.procesos.vacioHint')
  })

  it('una fuente caída se avisa arriba de la lista, con lo que sí se leyó abajo', () => {
    render({ data: { ...DATA, fuentes: { deposito: 'sin_back', llamada: 'ok', whatsapp: 'error' } } })
    const aviso = q('[data-testid="procesos-aviso-fuente"]')!
    expect(aviso.textContent).toContain('inmobiliaria.piloto.procesos.sinBack')
    expect(aviso.textContent).toContain('inmobiliaria.piloto.procesos.fuenteCaida(inmobiliaria.piloto.procesos.fuente.whatsapp)')
    expect(q('[data-testid="procesos-lista"]')?.querySelectorAll('article').length).toBe(4)
  })

  it('vacío de verdad: la invitación, sin filtros', () => {
    render({ data: { ...DATA, procesos: [], totales: { deposito: 0, llamada: 0, whatsapp: 0 }, enVivo: 0 } })
    expect(container.textContent).toContain('inmobiliaria.piloto.procesos.vacio')
    expect(container.textContent).toContain('inmobiliaria.piloto.procesos.enVivoVacio')
  })
})
