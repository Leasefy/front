/**
 * La Bandeja del Piloto (auditoría del Piloto, 23-09-2026). Lo que se fija:
 *
 *  1. **Un solo camino.** Si la acción PREGUNTA algo (campos o una
 *     advertencia), el botón de la fila no ejecuta: abre el cajón con esa
 *     acción lista. Antes «Registrar el envío» salía sin datos (400) y
 *     «Aprobar y llamar» sin la advertencia (hallazgo 9).
 *  2. **P-9.** Si el micro dice que ESTE rol no puede (`permitida: false`),
 *     el botón se ve apagado y el porqué se lee debajo — no un botón que
 *     termina en 403 (hallazgo 10).
 *  3. **El total es el real.** «100 en total» era el tope de la consulta:
 *     con el total del micro dice «Mostrando 100 de 446» (hallazgo 6).
 *  4. **El toast dice lo que pasó** («programé la llamada para mañana a las
 *     8:00»), no «listo» (hallazgo 2).
 *  5. **Cada bloque dice qué es** (EL MOLDE, regla 6).
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const { estado } = vi.hoisted(() => ({
  estado: {
    corridas: [] as unknown[],
    respuesta: { ok: true, mensaje: 'Aprobada: Laura llama a Ana en cuanto el marcador tome el turno.' } as {
      ok: boolean
      mensaje?: string
      error?: string
    },
    toasts: [] as string[],
  },
}))

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (k: string, vars?: Record<string, string>) => (vars ? `${k}(${Object.values(vars).join(',')})` : k),
    locale: 'es',
  }),
}))
vi.mock('sonner', () => ({
  toast: {
    success: (m: string) => estado.toasts.push(m),
    error: (m: string) => estado.toasts.push(m),
  },
}))
vi.mock('@/lib/api/piloto', async () => {
  const real = await vi.importActual<typeof import('@/lib/api/piloto')>('@/lib/api/piloto')
  return {
    ...real,
    runInboxAccion: async (accion: unknown) => {
      estado.corridas.push(accion)
      return estado.respuesta
    },
  }
})
vi.mock('@/components/inmobiliaria/ai/ColaHumana', () => ({ relativeTime: () => 'hace 2 h' }))
vi.mock('@/lib/format', () => ({ formatCurrency: (n: number) => `$${n}` }))

import { PilotoBandeja } from './PilotoBandeja'
import type { InboxItem } from '@/lib/api/piloto'

const base = (extra: Partial<InboxItem> = {}): InboxItem => ({
  id: 'hold:r-1',
  fuente: 'retenido',
  agente: 'cobranza',
  prioridad: 'media',
  titulo: 'Llamar a Ana María Gómez',
  resumen: '22 días de mora · debe $1.430.502 hoy (1 cuota) · retenida en Copiloto.',
  desde: '2026-09-20T10:00:00.000-05:00',
  href: '/panel/inmobiliaria/piloto',
  ...extra,
})

let container: HTMLDivElement
let root: Root

function render(props: Partial<React.ComponentProps<typeof PilotoBandeja>> & { items: InboxItem[] }) {
  const onAbrir = vi.fn()
  const onRefetch = vi.fn(async () => {})
  act(() => {
    root.render(
      <PilotoBandeja isLoading={false} error={null} onRefetch={onRefetch} onAbrir={onAbrir} {...props} />,
    )
  })
  return { onAbrir, onRefetch }
}

beforeEach(() => {
  estado.corridas = []
  estado.toasts = []
  estado.respuesta = { ok: true, mensaje: 'Aprobada: Laura llama a Ana en cuanto el marcador tome el turno.' }
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

const boton = (id: string) =>
  container.querySelector(`[data-testid="piloto-bandeja-accion-${id}"]`) as HTMLButtonElement | null

describe('PilotoBandeja', () => {
  it('🔴 una acción con advertencia NO se ejecuta desde la fila: abre el cajón con esa acción lista', async () => {
    const item = base({
      accion: {
        label: 'Aprobar y llamar',
        method: 'POST',
        path: '/api/agency/a/ai-hub/retenidos/r-1/aprobar',
        body: {},
        confirmacion: 'Laura va a llamar a Ana María Gómez, que debe $1.430.502 hoy.',
      },
    })
    const { onAbrir } = render({ items: [item] })
    await act(async () => boton(item.id)!.click())
    expect(estado.corridas).toHaveLength(0)
    expect(onAbrir).toHaveBeenCalledWith('hold:r-1', 'Aprobar y llamar')
  })

  it('🔴 una acción con campos (registrar el envío a centrales) tampoco se salta el formulario', async () => {
    const item = base({
      id: 'aviso:1',
      fuente: 'aviso_centrales',
      accion: {
        label: 'Registrar el envío',
        method: 'POST',
        path: '/x',
        campos: [{ id: 'canal', label: '¿Por dónde salió?', tipo: 'opcion', requerido: true }],
      },
    })
    const { onAbrir } = render({ items: [item] })
    await act(async () => boton(item.id)!.click())
    expect(estado.corridas).toHaveLength(0)
    expect(onAbrir).toHaveBeenCalledWith('aviso:1', 'Registrar el envío')
  })

  it('una acción de un clic sin advertencia se ejecuta y el toast dice lo que pasó (no «listo»)', async () => {
    const item = base({
      id: 'esc:1',
      fuente: 'escalacion',
      accion: { label: 'Tomar el caso', method: 'POST', path: '/claim', body: {} },
    })
    render({ items: [item] })
    await act(async () => boton(item.id)!.click())
    expect(estado.corridas).toHaveLength(1)
    expect(estado.toasts[0]).toBe('Aprobada: Laura llama a Ana en cuanto el marcador tome el turno.')
  })

  it('🔴 P-9: si el micro dice que este rol no puede, el botón se ve apagado y el porqué se lee', () => {
    const item = base({
      accion: {
        label: 'Aprobar y llamar',
        method: 'POST',
        path: '/x',
        confirmacion: 'x',
        permitida: false,
        porQueNo: 'Sólo un administrador de la inmobiliaria puede decidir esto.',
      },
    })
    render({ items: [item] })
    expect(boton(item.id)!.disabled).toBe(true)
    expect(container.querySelector(`[data-testid="piloto-bandeja-porqueno-${item.id}"]`)?.textContent).toContain(
      'Sólo un administrador',
    )
  })

  it('🔴 el total es el real: con más decisiones de las que caben dice «Mostrando N de M»', () => {
    render({ items: [base(), base({ id: 'hold:r-2' })], total: 446 })
    expect(container.textContent).toContain('inmobiliaria.piloto.bandeja.contadorParcial(2,446)')
  })

  it('dice qué es el bloque (EL MOLDE, regla 6)', () => {
    render({ items: [base()] })
    expect(container.textContent).toContain('inmobiliaria.piloto.bandeja.queEs')
  })
})
