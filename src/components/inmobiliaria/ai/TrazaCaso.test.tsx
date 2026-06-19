/**
 * TrazaCaso.test.tsx — F6 workspace primitives.
 *
 * Covers the 4 render states (loading / error / empty / happy), the action
 * label map + raw-slug fallback, actor badges and the collapsible JSON details.
 */

import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

import { TrazaCaso } from './TrazaCaso'
import type { TrazaEntry } from '@/lib/api/agent-workspace'

const ENTRIES: TrazaEntry[] = [
  {
    id: 't1',
    action: 'aprobado',
    actorType: 'user',
    actorId: 'ana@inmobiliaria.co',
    occurredAt: new Date().toISOString(),
    details: { matchId: 'm1' },
  },
  {
    id: 't2',
    action: 'custom_backend_action',
    actorType: 'agent',
    actorId: 'conciliacion',
    occurredAt: new Date().toISOString(),
    details: {},
  },
]

let container: HTMLDivElement
let root: Root

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => {
    root.unmount()
  })
  container.remove()
})

function render(props: Partial<React.ComponentProps<typeof TrazaCaso>> = {}) {
  act(() => {
    root.render(React.createElement(TrazaCaso, { entries: [], ...props }))
  })
}

describe('TrazaCaso — states', () => {
  it('renders the loading skeleton', () => {
    render({ isLoading: true })
    expect(container.querySelector('[data-testid="traza-caso-loading"]')).not.toBeNull()
  })

  it('renders the error banner', () => {
    render({ error: '500' })
    const err = container.querySelector('[data-testid="traza-caso-error"]')
    expect(err).not.toBeNull()
    expect(err!.textContent).toContain('500')
  })

  it('renders the empty state', () => {
    render({ entries: [] })
    const empty = container.querySelector('[data-testid="traza-caso-empty"]')
    expect(empty).not.toBeNull()
    expect(empty!.textContent).toContain('Sin actividad registrada')
  })
})

describe('TrazaCaso — entries', () => {
  it('maps known action slugs to es-CO labels and humanizes unknown slugs', () => {
    render({ entries: ENTRIES })
    const list = container.querySelector('[data-testid="traza-caso"]')
    expect(list).not.toBeNull()
    expect(list!.textContent).toContain('Aprobado')
    // raw-slug fallback: underscores → spaces
    expect(list!.textContent).toContain('custom backend action')
  })

  it('renders actor badges per actorType', () => {
    render({ entries: ENTRIES })
    expect(container.textContent).toContain('Humano')
    expect(container.textContent).toContain('Agente')
  })

  it('shows collapsible JSON details only when details is non-empty', () => {
    render({ entries: ENTRIES })
    const e1 = container.querySelector('[data-testid="traza-entry-t1"]')!
    const e2 = container.querySelector('[data-testid="traza-entry-t2"]')!
    expect(e1.querySelector('details')).not.toBeNull()
    expect(e1.querySelector('pre')!.textContent).toContain('matchId')
    expect(e2.querySelector('details')).toBeNull()
  })
})
