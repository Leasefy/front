/**
 * Protege la expectativa, que es lo que más fácil se borra en una pasada de
 * copy "para que suene mejor".
 */

import { describe, it, expect, afterEach, vi } from 'vitest'
import { createRoot, type Root } from 'react-dom/client'
import { act } from 'react-dom/test-utils'

import { QueSignificaPostularse } from './QueSignificaPostularse'


// Con `t` devolviendo la clave, `useTf` cae al respaldo — que es el español
// real de la pantalla. Así los tests siguen leyendo la copy que ve el usuario,
// no un identificador.
vi.mock('@/lib/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key, locale: 'es' }),
  useOptionalI18n: () => ({ t: (key: string) => key, locale: 'es' }),
}))

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let contenedor: HTMLDivElement | null = null
let root: Root | null = null

function pintar(): string {
  contenedor = document.createElement('div')
  document.body.appendChild(contenedor)
  root = createRoot(contenedor)
  act(() => root!.render(<QueSignificaPostularse />))
  return contenedor.textContent ?? ''
}

afterEach(() => {
  act(() => root?.unmount())
  contenedor?.remove()
  contenedor = null
  root = null
})

describe('qué significa postularse', () => {
  it('dice explícito que postularse NO entrega la propiedad', () => {
    const t = pintar()
    expect(t).toContain('no reserva la propiedad ni te la entrega')
  })

  it('avisa que lo comparan con otros candidatos', () => {
    expect(pintar()).toContain('otros candidatos')
  })

  it('promete respuesta también cuando es un no', () => {
    // Sin esto la persona queda esperando para siempre, que es peor que el no.
    expect(pintar()).toContain('Si no te eligieron también te lo decimos')
  })

  it('dice que el contrato se firma en línea', () => {
    const t = pintar()
    expect(t).toContain('en línea')
    expect(t).toContain('No tienes que ir a ninguna oficina')
  })

  it('explica POR QUÉ este catálogo es suyo', () => {
    expect(pintar()).toContain('dentro de lo que las aseguradoras te aprobaron')
  })

  it('NO inventa un tiempo de respuesta', () => {
    // No hay SLA definido en el producto. Escribir "en 48 horas" sería prometer
    // en nombre de una inmobiliaria que no lo prometió.
    const t = pintar()
    expect(t).not.toMatch(/\d+\s*(horas|hora|días|dias|día|dia)\b/i)
  })
})
