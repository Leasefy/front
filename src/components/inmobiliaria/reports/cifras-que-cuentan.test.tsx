/**
 * @vitest-environment happy-dom
 *
 * Las cifras que cambian en Inmuebles, Mantenimientos, Reportes, Postulaciones
 * y el centro de procesos cuentan con el `AnimatedNumber` de Cadence
 * (movimiento ola 2, 03-10-2026). Este archivo fija su contrato desde el front:
 *
 * 1. Con las animaciones APAGADAS (`skipAnimations` de `vitest.setup.ts`, o
 *    movimiento reducido) la cifra final se escribe DE UNA, antes de pintar:
 *    ni un cuadro con la cifra vieja (D-MOV 5 a). Antes había que esperar un
 *    cuadro, y las pruebas de la barra de acciones masivas esperaban 50 ms.
 * 2. Con las animaciones prendidas, CUENTA: el primer cuadro no es la cifra
 *    final, y al terminar sí.
 */
import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { MotionConfig, MotionGlobalConfig } from 'framer-motion'
import { AnimatedNumber } from '@leasefy/cadence'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const entero = (n: number) => String(Math.round(n))

let host: HTMLDivElement
let root: Root
const pintar = (el: React.ReactElement) => act(() => root.render(el))
const cifra = () => host.querySelector('[data-testid="cifra"]')!.textContent

beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
  MotionGlobalConfig.skipAnimations = true
})

describe('AnimatedNumber — la cifra que cambia', () => {
  it('🔴 con las animaciones apagadas escribe la cifra final de una, sin esperar un cuadro', () => {
    pintar(<AnimatedNumber data-testid="cifra" value={1} format={entero} />)
    expect(cifra()).toBe('1')
    pintar(<AnimatedNumber data-testid="cifra" value={3} format={entero} />)
    // Sin `await`, sin `setTimeout`: lo que se lee justo después del render.
    expect(cifra()).toBe('3')
  })

  it('🔴 lo que llega con `from` (cuenta desde 0 al cargar) también queda en la final de una', () => {
    pintar(<AnimatedNumber data-testid="cifra" value={37} from={0} format={entero} />)
    expect(cifra()).toBe('37')
  })

  it('🔴 con movimiento reducido salta a la cifra final de una', () => {
    MotionGlobalConfig.skipAnimations = false
    pintar(
      <MotionConfig reducedMotion="always">
        <AnimatedNumber data-testid="cifra" value={10} format={entero} />
      </MotionConfig>,
    )
    pintar(
      <MotionConfig reducedMotion="always">
        <AnimatedNumber data-testid="cifra" value={250} format={entero} />
      </MotionConfig>,
    )
    expect(cifra()).toBe('250')
  })

  it('con las animaciones prendidas CUENTA: primero no es la final, al terminar sí', async () => {
    MotionGlobalConfig.skipAnimations = false
    pintar(<AnimatedNumber data-testid="cifra" value={0} format={entero} />)
    pintar(<AnimatedNumber data-testid="cifra" value={100} format={entero} />)
    expect(cifra()).not.toBe('100')
    // `reveal` = 500 ms; con margen para el reloj de happy-dom.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 800))
    })
    expect(cifra()).toBe('100')
  })
})
