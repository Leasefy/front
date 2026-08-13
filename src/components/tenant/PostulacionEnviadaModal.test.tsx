/**
 * El código de seguimiento es lo que más fácil se rompe sin que se note:
 * un identificador inventado se ve igual de bien que el de verdad.
 *
 * Antes de esto, esta pantalla mostraba `APP-` + `Math.random()`. La persona
 * leía "guardá este código para consultar el estado" y guardaba un número que
 * no correspondía a nada — en su panel la postulación aparecía con otro,
 * derivado del id. Los tests de acá fijan que el que se muestra es EL de la
 * postulación, y que es estable.
 */

import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react-dom/test-utils'

import { PostulacionEnviadaModal } from './PostulacionEnviadaModal'
import type { Property } from '@/lib/types/property'

const empujar = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: empujar, replace: vi.fn(), prefetch: vi.fn() }),
}))

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const INMUEBLE = {
  id: 'prop-1',
  title: 'Apartamento en Laureles',
  neighborhood: 'Laureles',
  city: 'Medellín',
  monthlyRent: 2_400_000,
} as unknown as Property

/** El id real de una postulación creada. */
const ID = '624847bc-1fde-48ae-a037-51c32399096a'

let contenedor: HTMLDivElement | null = null
let root: Root | null = null

function pintar(props: Partial<React.ComponentProps<typeof PostulacionEnviadaModal>> = {}) {
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  root = createRoot(contenedor)
  act(() =>
    root!.render(
      <PostulacionEnviadaModal property={INMUEBLE} applicationId={ID} {...props} />,
    ),
  )
  // El diálogo se monta en un portal, fuera del contenedor.
  return document.body
}

beforeEach(() => {
  empujar.mockClear()
})

afterEach(() => {
  act(() => root?.unmount())
  contenedor?.remove()
  contenedor = null
  root = null
})

describe('el aviso de postulación enviada', () => {
  it('muestra el código derivado del id de la postulación, no uno inventado', () => {
    const cuerpo = pintar()
    const codigo = cuerpo.querySelector('[data-testid="codigo-seguimiento"]')
    // 'AF-' + los primeros 6 del uuid sin guiones, en mayúscula. Es la MISMA
    // fórmula que usa el back para las postulaciones de invitado.
    expect(codigo?.textContent).toBe('AF-624847')
  })

  it('da el mismo código en dos renders — no cambia al repintar', () => {
    const primero = pintar().querySelector('[data-testid="codigo-seguimiento"]')?.textContent
    act(() => root?.unmount())
    contenedor?.remove()
    const segundo = pintar().querySelector('[data-testid="codigo-seguimiento"]')?.textContent
    expect(segundo).toBe(primero)
  })

  it('no inventa un código cuando no hay id', () => {
    const cuerpo = pintar({ applicationId: '' })
    expect(cuerpo.querySelector('[data-testid="codigo-seguimiento"]')).toBeNull()
    // Y tampoco deja la etiqueta huérfana anunciando algo que no está.
    expect(cuerpo.textContent).not.toContain('Código de seguimiento')
  })

  it('dice a qué inmueble se postuló', () => {
    const t = pintar().textContent ?? ''
    expect(t).toContain('Apartamento en Laureles')
    expect(t).toContain('Laureles')
  })

  it('ofrece las dos salidas: seguir buscando y ver la postulación', () => {
    const botones = [...pintar().querySelectorAll('button')].map((b) => b.textContent?.trim())
    expect(botones).toContain('Seguir buscando')
    expect(botones).toContain('Ver mi postulación')
  })

  it('lleva a la postulación recién creada, no a la lista', () => {
    const cuerpo = pintar()
    const ver = [...cuerpo.querySelectorAll('button')].find(
      (b) => b.textContent?.trim() === 'Ver mi postulación',
    )
    act(() => ver?.click())
    expect(empujar).toHaveBeenCalledWith(`/inquilino/aplicaciones/${ID}`)
  })

  it('a un invitado no le ofrece el panel, al que todavía no puede entrar', () => {
    const cuerpo = pintar({ esInvitado: true, correoInvitado: 'ana@correo.co' })
    const botones = [...cuerpo.querySelectorAll('button')].map((b) => b.textContent?.trim())
    expect(botones).not.toContain('Ver mi postulación')
    // Su siguiente paso real está en el correo, y se lo decimos con el correo.
    expect(cuerpo.textContent).toContain('ana@correo.co')
  })

  it('cerrar navega en vez de dejar a la persona sobre el formulario ya enviado', () => {
    const cuerpo = pintar()
    const cerrar = cuerpo.querySelector<HTMLButtonElement>('[data-testid="dialog-close"]')
    expect(cerrar).not.toBeNull()
    act(() => cerrar?.click())
    // Volver atrás sería volver al botón "Postularme" y chocar con un 409.
    expect(empujar).toHaveBeenCalledWith(`/inquilino/aplicaciones/${ID}`)
  })

  it('anuncia que postularse a otro ya no cuesta llenar nada', () => {
    expect(pintar().textContent).toContain('sin volver a llenar nada')
  })
})
