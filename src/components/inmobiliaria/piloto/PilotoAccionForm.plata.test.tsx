/**
 * QA-IA-95 (05-10-2026, PI-16 en el cajón de la conciliación): el botón y las opciones decían
 * «Conciliar $1.950.000 del 2026-10-02» y «Juan P. · octubre de 2026 · saldo $1.950.000» — la plata
 * pegada que escribe el micro, al lado de «$ 1.950.000» del resto de la pantalla. Se pinta con el
 * espacio de la casa (`conLaPlataPegada`), sin tocar el valor que viaja.
 */
import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, locale: 'es' }),
  useOptionalI18n: () => ({ t: (k: string) => k, locale: 'es' }),
}))

import { PilotoAccionForm } from './PilotoAccionForm'
import type { InboxAccion } from '@/lib/api/piloto'

const CONCILIAR: InboxAccion = {
  label: 'Conciliar $1.950.000 del 2026-10-02',
  method: 'POST',
  path: '/api/agency/a/piloto/conciliacion/movimientos/m-1/conciliar',
  campos: [
    {
      id: 'tenantId',
      label: '¿De quién es el pago?',
      tipo: 'opcion',
      requerido: true,
      opciones: [{ valor: 't-1', label: 'Juan P. · octubre de 2026 · saldo $1.950.000 · seguro' }],
    },
  ],
} as InboxAccion

let container: HTMLDivElement
let root: Root
beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

describe('PilotoAccionForm — la plata con el espacio de la casa (PI-16)', () => {
  it('el botón y la opción dicen «$ 1.950.000», no «$1.950.000»', () => {
    act(() => root.render(<PilotoAccionForm accion={CONCILIAR} onEnviar={() => {}} onCancelar={() => {}} enVuelo={false} />))
    const texto = container.textContent ?? ''
    expect(texto).not.toMatch(/\$1\.950\.000/)
    expect(texto).toContain('Conciliar $ 1.950.000 del 2026-10-02')
    expect(texto).toContain('saldo $ 1.950.000')
  })
})
