/**
 * `/configuracion/agentes` — la vitrina de agentes IA quedó OCULTA (Nico,
 * 2026-09-03: «la sección de Agentes IA ocultala por favor»).
 *
 * Esta página ya no dibuja tarjetas de agentes: manda a Configuración. La ruta
 * no se borra porque hay enlaces guardados y una redirección vieja —el hub
 * `/ai` del panel apunta acá— que si no caerían en un 404.
 *
 * Antes acá vivían los tests de las cuatro tarjetas del hub (KPIs de cobranza
 * y cotizador, NoDataYetBadge, tiempo relativo). Se fueron con la pantalla.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const redirectMock = vi.fn()
vi.mock('next/navigation', () => ({
  redirect: (destino: string) => redirectMock(destino),
}))

import AgentesIaOcultoPage from './page'

beforeEach(() => {
  redirectMock.mockClear()
})

describe('Agentes IA — oculto', () => {
  it('manda a Configuración en vez de mostrar la vitrina', () => {
    AgentesIaOcultoPage()
    expect(redirectMock).toHaveBeenCalledWith('/panel/inmobiliaria/configuracion')
  })

  it('el destino es la raíz, no otra ruta de agentes (si no, vuelve a redirigir)', () => {
    AgentesIaOcultoPage()
    const destino = redirectMock.mock.calls[0]?.[0] as string
    expect(destino).not.toContain('/agentes')
  })
})
