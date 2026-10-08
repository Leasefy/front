/**
 * La frase del mes de Payu, con Payu apagado y prendido.
 *
 * Lo que no puede volver: la pantalla vieja del agente pintaba «Apagado» y un
 * tablero en rayas. Con Payu apagado la frase lo dice con las palabras de Nico
 * y no pone ni una cifra que el back no haya mandado.
 */
import { describe, expect, it } from 'vitest'

import { fraseDelMesDePayu, PAYU_APAGADO } from './frases'
import type { ResumenDeLinksDePago } from '@/lib/types/payu'

const resumen = (parcial: Partial<ResumenDeLinksDePago>): ResumenDeLinksDePago => ({
  mes: '2026-10',
  payuActivo: true,
  cuotas: 105,
  linksEnviados: 40,
  pagadosPorLink: 12,
  montoCobradoPorLinkCop: 18_000_000,
  pendientesCop: 42_000_000,
  ...parcial,
})

describe('fraseDelMesDePayu — Payu apagado', () => {
  it('🔴 sin links enviados: dice que está apagado y quién lo prende, sin un solo número de plata', () => {
    const frase = fraseDelMesDePayu(
      resumen({ payuActivo: false, linksEnviados: 0, pagadosPorLink: 0, montoCobradoPorLinkCop: 0, pendientesCop: 0 }),
    )
    expect(frase.startsWith(PAYU_APAGADO)).toBe(true)
    expect(frase).toBe('Payu está apagado en el servidor: lo prende Leasefy. No ha mandado ningún link de octubre de 2026.')
    expect(frase).not.toContain('$')
  })

  it('con links que salieron mientras estuvo prendido, los cuenta tal como vienen', () => {
    expect(fraseDelMesDePayu(resumen({ payuActivo: false }))).toBe(
      'Payu está apagado en el servidor: lo prende Leasefy. Mientras estuvo prendido mandó el link de 40 de 105 cuotas de octubre de 2026; 12 se pagaron por link ($ 18.000.000) y quedan $ 42.000.000 pendientes.',
    )
  })
})

describe('fraseDelMesDePayu — Payu prendido', () => {
  it('el mes en una frase: enviados de cuántas, pagados por link y lo pendiente', () => {
    expect(fraseDelMesDePayu(resumen({}))).toBe(
      'En octubre de 2026 Payu mandó el link de 40 de 105 cuotas; 12 se pagaron por link ($ 18.000.000) y quedan $ 42.000.000 pendientes.',
    )
  })

  it('singulares: 1 cuota, 1 se pagó', () => {
    expect(
      fraseDelMesDePayu(resumen({ cuotas: 1, linksEnviados: 1, pagadosPorLink: 1, montoCobradoPorLinkCop: 1_500_000, pendientesCop: 0 })),
    ).toBe('En octubre de 2026 Payu mandó el link de 1 de 1 cuota; 1 se pagó por link ($ 1.500.000) y quedan $ 0 pendientes.')
  })

  it('con links enviados y ninguno pagado, no pinta «0 se pagaron ($ 0)»', () => {
    const frase = fraseDelMesDePayu(resumen({ pagadosPorLink: 0, montoCobradoPorLinkCop: 0 }))
    expect(frase).toContain('ninguna se ha pagado por link todavía')
    expect(frase).not.toContain('0 se pagaron')
  })

  it('prendido pero sin avisos todavía: dice cuándo sale el primero', () => {
    expect(fraseDelMesDePayu(resumen({ linksEnviados: 0, pagadosPorLink: 0 }))).toBe(
      'Payu está prendido y todavía no ha mandado links de las 105 cuotas de octubre de 2026: el primer aviso de cada cuota sale 3 días antes de su vencimiento.',
    )
  })

  it('un mes sin cuotas no se lee como «0 de 0»', () => {
    const frase = fraseDelMesDePayu(resumen({ cuotas: 0, linksEnviados: 0, pagadosPorLink: 0 }))
    expect(frase).toBe('Payu está prendido, pero octubre de 2026 no tiene cuotas por cobrar.')
  })
})
