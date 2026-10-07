/**
 * `Pressable` de Cadence pinta lo MISMO en el servidor y en un cliente con
 * movimiento reducido (MOV-VERIFICA Q1 a, ARREGLOS-8, 03-10-2026).
 *
 * 🔴 El defecto: framer-motion le pone `tabIndex={0}` a todo lo que tiene
 * `whileTap`, y `Pressable` sólo pasaba `whileTap` cuando NO había movimiento
 * reducido. En el servidor la preferencia no se conoce (vale «no»), así que el
 * HTML salía con `tabindex="0"`; el navegador de quien pidió movimiento
 * reducido lo pintaba sin él, y React avisaba de un error de hidratación en
 * `/pricing` (las cuatro tarjetas de planes).
 *
 * La prueba vive en el front (Cadence no tiene corredor de pruebas) y mira la
 * copia de Cadence que consume el front, como `table.movimiento.test.tsx`.
 */
import * as React from 'react'
import { act } from 'react'
import { describe, it, expect, afterEach, vi } from 'vitest'
import { renderToString } from 'react-dom/server'
import { hydrateRoot, type Root } from 'react-dom/client'
import { MotionConfig } from 'framer-motion'
import { Pressable } from '@leasefy/cadence'
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

/** Como la ve quien pidió movimiento reducido (el `MotionProvider` del front usa `user`). */
const conMovimientoReducido = (el: React.ReactElement) => (
  <MotionConfig reducedMotion="always">{el}</MotionConfig>
)

const tarjeta = (props: Partial<React.ComponentProps<typeof Pressable>> = {}) => (
  <Pressable as="button" className="rounded-[20px] border p-5" {...props}>
    Administración completa
  </Pressable>
)

let host: HTMLDivElement | null = null
let root: Root | null = null

afterEach(() => {
  if (root) act(() => root!.unmount())
  host?.remove()
  host = null
  root = null
  vi.restoreAllMocks()
})

describe('Pressable — el mismo HTML con y sin movimiento reducido', () => {
  it('🔴 el servidor (sin saber la preferencia) y el cliente con movimiento reducido pintan el mismo HTML', () => {
    const delServidor = renderToString(tarjeta())
    const reducido = renderToString(conMovimientoReducido(tarjeta()))
    expect(reducido).toBe(delServidor)
  })

  it('🔴 hidratar con movimiento reducido no da error de hidratación', async () => {
    host = document.createElement('div')
    host.innerHTML = renderToString(tarjeta({ onClick: () => {} }))
    document.body.appendChild(host)
    const errores = vi.spyOn(console, 'error').mockImplementation(() => {})

    await act(async () => {
      root = hydrateRoot(host!, conMovimientoReducido(tarjeta({ onClick: () => {} })))
    })

    const deHidratacion = errores.mock.calls
      .map((args) => args.map(String).join(' '))
      .filter((m) => /hydrat|tabindex/i.test(m))
    expect(deHidratacion).toEqual([])
  })

  it('con movimiento reducido sigue sin hundirse ni subir: sólo el tabindex es el mismo', () => {
    // Un `tabIndex` propio se respeta tal cual, con o sin preferencia.
    expect(renderToString(conMovimientoReducido(tarjeta({ tabIndex: -1 })))).toContain(
      'tabindex="-1"',
    )
    expect(renderToString(tarjeta({ tabIndex: -1 }))).toContain('tabindex="-1"')
    // Sin presión (`press="none"`) no hay `whileTap`: ni el servidor ni el
    // cliente le ponen tabindex.
    expect(renderToString(tarjeta({ press: 'none' }))).not.toContain('tabindex')
    expect(renderToString(conMovimientoReducido(tarjeta({ press: 'none' })))).not.toContain(
      'tabindex',
    )
  })
})
