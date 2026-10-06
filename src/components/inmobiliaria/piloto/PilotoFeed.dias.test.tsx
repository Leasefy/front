/**
 * QA-IA-95 (05-10-2026, IA95-04): la Actividad en vivo decía «AYER» dos veces
 * seguidas. La clave del grupo era el día UTC y la etiqueta el día local: lo de
 * ayer después de las 7 p. m. de Colombia (ya «mañana» en UTC) abría otro grupo
 * con la misma etiqueta. El día va en la hora de Colombia para las dos cosas.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
void React

vi.mock('@/lib/i18n', async () => await import('@/lib/i18n/i18n-test-stub'))

import { PilotoFeed } from './PilotoFeed'
import type { ActivityItem } from '@/lib/api/piloto'

let container: HTMLDivElement
let root: Root
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  // «Hoy» = lunes 5 de octubre de 2026, 11:00 a. m. en Colombia.
  vi.setSystemTime(new Date('2026-10-05T16:00:00Z'))
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.useRealTimers()
})

const hecho = (id: string, at: string, titulo: string): ActivityItem => ({ id, at, agente: 'contratos', tipo: 'piloto', titulo })

describe('la Actividad agrupa por el día de Colombia (QA-IA-95)', () => {
  it('lo de ayer a las 8:59 p. m. y lo de ayer a las 10 a. m. van bajo UN solo «Ayer»', () => {
    const items = [
      hecho('a', '2026-10-05T01:59:42Z', 'Hecho: Paula escogió a Mónica'), // 4-oct 8:59 p. m. en Colombia (5-oct en UTC)
      hecho('b', '2026-10-04T15:00:00Z', 'Pusiste contratos en Copiloto'), // 4-oct 10:00 a. m.
    ]
    act(() => root.render(<PilotoFeed items={items} isLoading={false} error={null} />))
    const t = container.textContent ?? ''
    expect(t.match(/Ayer/g)?.length).toBe(1)
    expect(t).not.toContain('Hoy')
    expect(t).toContain('Hecho: Paula escogió a Mónica')
    expect(t).toContain('Pusiste contratos en Copiloto')
  })

  it('lo de hoy por la mañana es «Hoy», no «Ayer»', () => {
    act(() => root.render(<PilotoFeed items={[hecho('c', '2026-10-05T13:30:00Z', 'Pusiste matching en Copiloto')]} isLoading={false} error={null} />))
    expect(container.textContent).toContain('Hoy')
    expect(container.textContent).not.toContain('Ayer')
  })
})
