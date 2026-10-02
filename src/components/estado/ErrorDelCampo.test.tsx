/**
 * 02-10-2026 · El error bajo un campo, con su entrada suave. Desde Cadence
 * v1.1.1 el movimiento vive en su `FormError` y `ErrorDelCampo` es un
 * adaptador fino. En las pruebas las animaciones de framer saltan a su valor
 * final (`vitest.setup.ts`), así que se mira el estado, no el viaje.
 */
import * as React from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react'
import { FormControl, FormField, FormLabel } from '@leasefy/cadence'
import { Input } from '@/components/ui/input'
import { ErrorDelCampo, type ErrorDelCampoProps } from './ErrorDelCampo'

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
})

function pintar(props: ErrorDelCampoProps) {
  act(() => root.render(<ErrorDelCampo {...props} />))
}

const alerta = () => container.querySelector('[role="alert"]')

/** Espera a que termine una salida de AnimatePresence (un par de cuadros). */
async function esperarLaSalida() {
  for (let i = 0; i < 10; i++) {
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20))
    })
  }
}

describe('<ErrorDelCampo>', () => {
  it('sin mensaje no pinta nada', () => {
    pintar({ id: 'budgetMax-error', mensaje: undefined })
    expect(container.textContent).toBe('')
    expect(alerta()).toBeNull()
  })

  it('con mensaje: un alert con el id que nombra el campo y el estilo de error', () => {
    pintar({ id: 'budgetMax-error', mensaje: 'El presupuesto no puede pasar de $2.000.000.000 al mes.' })
    expect(alerta()?.id).toBe('budgetMax-error')
    expect(alerta()?.textContent).toBe('El presupuesto no puede pasar de $2.000.000.000 al mes.')
    expect(alerta()?.className).toContain('text-danger')
  })

  it('al corregirse, el error se va', async () => {
    pintar({ id: 'x-error', mensaje: 'Falta el nombre.' })
    expect(alerta()).not.toBeNull()
    pintar({ id: 'x-error', mensaje: null })
    await esperarLaSalida()
    expect(alerta()).toBeNull()
  })

  it('con pista: la ayuda sin error; el error la reemplaza y al corregirse vuelve la ayuda', async () => {
    const pista = 'En pesos colombianos, lo que pagarías al mes.'
    pintar({ id: 'presupuesto-error', pista, mensaje: null })
    expect(container.textContent).toBe(pista)
    expect(alerta()).toBeNull()

    pintar({ id: 'presupuesto-error', pista, mensaje: 'El máximo no puede ser menor que el mínimo.' })
    await esperarLaSalida()
    expect(alerta()?.textContent).toBe('El máximo no puede ser menor que el mínimo.')
    expect(container.textContent).not.toContain(pista)

    pintar({ id: 'presupuesto-error', pista, mensaje: null })
    await esperarLaSalida()
    expect(container.textContent).toBe(pista)
    expect(alerta()).toBeNull()
  })

  it('un mensaje que cambia se lee nuevo (el del servidor reemplaza al del cliente)', () => {
    pintar({ id: 'x-error', mensaje: 'Uno' })
    pintar({ id: 'x-error', mensaje: 'Otro' })
    expect(alerta()?.textContent).toBe('Otro')
  })

  it('es UN solo <p> (el de Cadence), con el aire de arriba de siempre', () => {
    pintar({ id: 'x-error', mensaje: 'Falta el nombre.' })
    expect(alerta()?.tagName).toBe('P')
    expect(alerta()?.parentElement).toBe(container)
    expect(alerta()?.className).toContain('mt-1.5')
    expect(alerta()?.className).toContain('text-caption')
  })

  it('la pista no es una alerta: el lector anuncia sólo el error', () => {
    pintar({ id: 'p-error', pista: 'En pesos colombianos.', mensaje: null })
    const pista = container.querySelector('p')
    expect(pista?.getAttribute('role')).toBeNull()
    expect(pista?.className).toContain('text-fg-subtle')
  })

  it('dentro de un FormField de Cadence: el control lo nombra en aria-describedby', () => {
    act(() =>
      root.render(
        <FormField id="displayName" required invalid>
          <FormLabel>¿Cómo te llamas?</FormLabel>
          <FormControl>
            <Input />
          </FormControl>
          <ErrorDelCampo id="displayName-error" mensaje="Escribe tu nombre." className="mt-0" />
        </FormField>,
      ),
    )
    const campo = container.querySelector('input')
    expect(campo?.getAttribute('aria-describedby')?.split(' ')).toContain('displayName-error')
    expect(campo?.getAttribute('aria-invalid')).toBe('true')
    const error = document.getElementById('displayName-error')
    expect(error?.getAttribute('role')).toBe('alert')
    expect(error?.textContent).toBe('Escribe tu nombre.')
    // el `className` del uso manda sobre el aire por defecto
    expect(error?.className).toContain('mt-0')
    expect(error?.className).not.toContain('mt-1.5')
  })

  it('se ve por el mensaje, aunque el FormField todavía no esté en rojo', () => {
    act(() =>
      root.render(
        <FormField id="rut">
          <FormControl>
            <Input />
          </FormControl>
          <ErrorDelCampo id="rut-error" mensaje="El documento no es válido." />
        </FormField>,
      ),
    )
    expect(alerta()?.textContent).toBe('El documento no es válido.')
  })
})

/**
 * 02-10-2026 (Nico): la `pista` lleva id (`${id}-pista`) para que un campo
 * FUERA de un `FormField` la nombre en `aria-describedby`. La API y el aspecto
 * no cambian.
 */
describe('<ErrorDelCampo> — la pista con id', () => {
  it('🔴 fuera de un FormField, la pista tiene `${id}-pista` y el campo la puede nombrar', () => {
    act(() =>
      root.render(
        <>
          <input id="codigo" aria-describedby="codigo-error-pista codigo-error" />
          <ErrorDelCampo id="codigo-error" pista="Son los 6 números de la app." mensaje={null} />
        </>,
      ),
    )
    const pista = document.getElementById('codigo-error-pista')
    expect(pista?.textContent).toBe('Son los 6 números de la app.')
    // Sigue siendo UN `<p>` con el estilo de la ayuda.
    expect(container.querySelectorAll('p')).toHaveLength(1)
    expect(container.querySelector('p')?.className).toContain('text-fg-subtle')
  })

  it('con error, se ve el error con su id (la pista se va)', async () => {
    pintar({ id: 'codigo-error', pista: 'Son los 6 números de la app.', mensaje: 'El código no es correcto.' })
    await esperarLaSalida()
    expect(document.getElementById('codigo-error')?.textContent).toBe('El código no es correcto.')
    expect(document.getElementById('codigo-error-pista')).toBeNull()
  })

  it('sin pista no se agrega nada', () => {
    pintar({ id: 'x-error', mensaje: 'Algo.' })
    expect(document.getElementById('x-error-pista')).toBeNull()
  })
})
