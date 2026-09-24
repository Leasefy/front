/**
 * @vitest-environment happy-dom
 *
 * La barra de acciones masivas: la pieza de la que cuelgan cinco pantallas
 * (Facturación, Conciliación, Egresos, Candidatos y Vencimientos).
 *
 * Lo que fija este archivo son las tres reglas que se ganaron a golpes:
 *
 * 1. **No se esconde cuando no hay nada marcado.** Esconder un control se lee
 *    como «falta la función». Lo que sí desaparece es «Quitar la selección»,
 *    porque sin selección no tiene nada que quitar.
 * 2. **Una selección que puso el sistema lo DICE.** «Preseleccionamos», no
 *    «marcaste» — y con la salida en el mismo renglón.
 * 3. **Ni un participio ni un «ninguna».** El primer intento decía «1 factura
 *    marcada», y la primera tabla que no era de facturas escupió «1 cruce
 *    marcada». Un componente compartido no puede fijar el género del
 *    sustantivo de otro.
 */

import * as React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'

void React
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

import { BarraDeAccionesMasivas } from './acciones-masivas'

let container: HTMLDivElement
let root: Root

function montar(props: Partial<React.ComponentProps<typeof BarraDeAccionesMasivas>> = {}) {
  act(() => {
    root.render(
      <BarraDeAccionesMasivas
        testid="barra"
        marcadas={3}
        queSon={['cruce', 'cruces']}
        onQuitar={vi.fn()}
        {...props}
      >
        <button type="button" data-testid="la-accion">
          Hacer
        </button>
      </BarraDeAccionesMasivas>,
    )
  })
}

const q = (s: string) => container.querySelector(s) as HTMLElement | null
const resumen = () => q('[data-testid="barra-resumen"]')!.textContent ?? ''

beforeEach(() => {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

describe('BarraDeAccionesMasivas', () => {
  it('🔴 sin nada marcado NO se esconde: la acción sigue a la vista', () => {
    montar({ marcadas: 0 })
    expect(q('[data-testid="barra"]')).not.toBeNull()
    expect(q('[data-testid="la-accion"]')).not.toBeNull()
    // Sin selección no hay nada que quitar.
    expect(q('[data-testid="barra-quitar"]')).toBeNull()
  })

  it('🔴 no dice «ninguna» ni un participio: no hay género que equivocar', () => {
    montar({ marcadas: 0 })
    expect(resumen()).toBe('Todavía no has marcado nada.')

    montar({ marcadas: 1 })
    expect(resumen()).toContain('Marcaste')
    expect(resumen()).toContain('1 cruce')
    expect(resumen()).not.toMatch(/marcad[oa]s?\b/)

    montar({ marcadas: 3 })
    expect(resumen()).toContain('3 cruces')
  })

  it('🔴 una selección que pusimos nosotros lo DICE, y ofrece la salida', () => {
    montar({ sugerida: true, deDonde: 'de septiembre de 2026' })
    expect(resumen()).toContain('Preseleccionamos')
    expect(resumen()).toContain('3 cruces de septiembre de 2026')
    expect(q('[data-testid="barra-es-sugerencia"]')!.textContent).toContain('Es una sugerencia')
    expect(q('[data-testid="barra-quitar"]')).not.toBeNull()
  })

  it('con la selección puesta por la persona, no se anuncia como sugerencia', () => {
    montar({ sugerida: false })
    expect(resumen()).toContain('Marcaste')
    expect(q('[data-testid="barra-es-sugerencia"]')).toBeNull()
  })

  it('«Quitar la selección» llama a quien la puso, y se apaga mientras corre', () => {
    const onQuitar = vi.fn()
    montar({ onQuitar })
    act(() => {
      q('[data-testid="barra-quitar"]')!.click()
    })
    expect(onQuitar).toHaveBeenCalledTimes(1)

    montar({ onQuitar, ocupado: true })
    expect((q('[data-testid="barra-quitar"]') as HTMLButtonElement).disabled).toBe(true)
  })

  it('la plata de lo marcado se muestra tal cual se la pasen', () => {
    montar({ monto: '$ 400.499.376' })
    expect(resumen()).toContain('$ 400.499.376')
    // Sin monto, no se inventa un «$ 0».
    montar({ monto: null })
    expect(resumen()).not.toContain('$')
  })

  it('el texto propio del vacío manda sobre el de la casa', () => {
    montar({ marcadas: 0, cuandoNoHayNada: 'Marca los de alta confianza.' })
    expect(resumen()).toBe('Marca los de alta confianza.')
  })

  describe('🔴 dónde vive la barra', () => {
    it('suelta: tarjeta propia, para cuando no hay una tabla que la contenga', () => {
      montar({ variant: 'suelta' })
      const barra = q('[data-testid="barra"]')!
      expect(barra.className).toContain('rounded-lg')
      expect(barra.className).toContain('shadow-lg')
    })

    it('pie: sin marco propio, porque es el último renglón de la tabla', () => {
      /*
       * Nico, 19-09: «mira que dejaste separado lo de acciones masivas con
       * donde se seleccionan, y sabes que cuando hay acciones masivas deben
       * quedar también en la tabla». Una caja con borde debajo de otra caja
       * con borde son dos objetos.
       */
      montar({ variant: 'pie' })
      const barra = q('[data-testid="barra"]')!
      expect(barra.className).not.toContain('rounded-lg')
      expect(barra.className).toContain('border-t')
    })

    it('en las dos formas se queda pegada al borde de abajo', () => {
      for (const variant of ['suelta', 'pie'] as const) {
        montar({ variant })
        const barra = q('[data-testid="barra"]')!
        expect(barra.className, variant).toContain('sticky')
        expect(barra.className, variant).toContain('bottom-0')
      }
    })
  })
})
