/**
 * El cajón de una PQRS no se vacía mientras se va.
 *
 * 🔴 La pantalla cierra con `setSeleccionada(null)`, así que `open` y `pqrs`
 * se apagan en el MISMO render. Con `{pqrs && …}` adentro de un `<Sheet open>`
 * que anima la salida, el cuerpo desaparecía en el primer frame y el cajón
 * salía deslizándose EN BLANCO — el mismo defecto que `useUltimoPresente`
 * arregló en otros diez cajones del panel.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React // jsx-preserve

vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ locale: 'es', t: (k: string) => k, formatDate: () => '1 sept 2026' }),
}))
vi.mock('@/lib/hooks/useInmobiliaria', () => ({ useAgentes: () => ({ agentes: [] }) }))
vi.mock('@/components/ui/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

import { PqrsDrawer } from './PqrsDrawer'
import type { Pqrs } from '@/lib/api/pqrs-agencia.types'

const SOLICITUD = {
  id: 'q-1',
  numero: 7,
  radicado: 'PQRS-0007',
  tipo: 'QUEJA',
  solicitanteTipo: 'INQUILINO',
  solicitanteNombre: 'Camila Restrepo',
  solicitanteContacto: null,
  asunto: 'Gotera en el baño principal',
  descripcion: null,
  consignacionId: null,
  inmuebleLabel: null,
  asignadoAUserId: null,
  asignadoANombre: null,
  estado: 'RECIBIDA',
  slaVenceAt: '2026-09-25T12:00:00.000Z',
  resueltaAt: null,
  cerradaAt: null,
  createdAt: '2026-09-01T12:00:00.000Z',
  updatedAt: '2026-09-01T12:00:00.000Z',
} as unknown as Pqrs

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

function pintar(props: { pqrs: Pqrs | null; open: boolean }) {
  act(() => {
    root.render(
      React.createElement(PqrsDrawer, {
        ...props,
        onOpenChange: () => undefined,
        onActualizado: () => undefined,
      }),
    )
  })
}

describe('PqrsDrawer — cierre', () => {
  it('el cuerpo sobrevive a que la solicitud se vuelva null', () => {
    pintar({ pqrs: SOLICITUD, open: true })
    expect(document.body.textContent).toContain('PQRS-0007')

    // El instante exacto del defecto: la pantalla ya hizo `setSeleccionada(null)`
    // y el cajón todavía está en pantalla, saliendo. Sin `useUltimoPresente` el
    // cuerpo se vacía acá y el cajón se va EN BLANCO.
    pintar({ pqrs: null, open: true })

    expect(document.body.textContent).toContain('PQRS-0007')
    expect(document.body.textContent).toContain('Gotera en el baño principal')
  })

  it('vuelto a abrir con otra solicitud muestra la NUEVA, no la anterior', () => {
    pintar({ pqrs: SOLICITUD, open: true })
    pintar({ pqrs: null, open: false })
    pintar({
      pqrs: { ...SOLICITUD, id: 'q-2', radicado: 'PQRS-0008', asunto: 'Ruido' },
      open: true,
    })

    expect(document.body.textContent).toContain('PQRS-0008')
    expect(document.body.textContent).not.toContain('PQRS-0007')
  })
})
