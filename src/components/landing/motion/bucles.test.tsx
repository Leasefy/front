/**
 * Los bucles decorativos de la landing (`repeat: Infinity`) sólo corren
 * mientras se ven: fuera de pantalla (o con movimiento reducido) se quedan
 * quietos en su primer fotograma. En happy-dom el `IntersectionObserver`
 * nunca avisa que algo entró, así que todo cuenta como «fuera de pantalla».
 */
import * as React from 'react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { motion, MotionGlobalConfig } from 'framer-motion'
import { Bucle, ZonaDeBucles, poseQuieta } from './bucles'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

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
  MotionGlobalConfig.skipAnimations = true
})

const esperar = (ms: number) =>
  act(async () => {
    await new Promise((r) => setTimeout(r, ms))
  })

describe('poseQuieta', () => {
  it('cada arreglo de fotogramas queda en su primer valor; lo demás, tal cual', () => {
    expect(poseQuieta({ scale: [1, 1.3, 1], opacity: [0.08, 0.14, 0.08], y: 0 })).toEqual({
      scale: 1,
      opacity: 0.08,
      y: 0,
    })
    expect(poseQuieta({ rotate: [0, 360], transition: { duration: 2 } })).toEqual({ rotate: 0 })
    expect(poseQuieta(undefined)).toBeUndefined()
    expect(poseQuieta('visible')).toBe('visible')
  })
})

describe('Bucle', () => {
  it('fuera de pantalla no se mueve (y un motion.div igual sí: la prueba mira algo real)', async () => {
    MotionGlobalConfig.skipAnimations = false
    act(() =>
      root.render(
        <>
          <ZonaDeBucles>
            <Bucle.div
              data-testid="bucle"
              animate={{ x: [0, 200, 0] }}
              transition={{ duration: 0.4, repeat: Infinity }}
            />
          </ZonaDeBucles>
          <motion.div
            data-testid="control"
            animate={{ x: [0, 200, 0] }}
            transition={{ duration: 0.4, repeat: Infinity }}
          />
        </>,
      ),
    )
    await esperar(150)
    const bucle = container.querySelector('[data-testid="bucle"]') as HTMLElement
    const control = container.querySelector('[data-testid="control"]') as HTMLElement
    expect(control.style.transform).toMatch(/translateX\((?!0px)/)
    expect(bucle.style.transform === '' || bucle.style.transform === 'none').toBe(true)
  })

  it('conserva el elemento, sus clases y sus hijos', () => {
    act(() =>
      root.render(
        <ZonaDeBucles className="raiz relative">
          <Bucle.span className="halo" animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity }}>
            Activo
          </Bucle.span>
        </ZonaDeBucles>,
      ),
    )
    const zona = container.querySelector('.raiz') as HTMLElement
    expect(zona.tagName).toBe('DIV')
    const halo = zona.querySelector('span.halo') as HTMLElement
    expect(halo.textContent).toBe('Activo')
  })
})
