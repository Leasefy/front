/**
 * PGR-16 (QA-PAGOS-95, 05-10-2026): el estado de cuenta de Valeria (cuota que
 * vence hoy, dentro del plazo) decía «1 vencida(s) dentro del plazo del
 * contrato». Una cuota: «1 cuota vencida…»; varias: «N cuotas vencidas…»,
 * en la pantalla y en el PDF.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const leer = (ruta: string) => readFileSync(join(process.cwd(), 'src', ruta), 'utf8')
const es = JSON.parse(leer('lib/i18n/locales/es.json')) as { estadoDeCuenta: Record<string, string> }

describe('PGR-16 · «vencida(s)» no sale nunca', () => {
  it('🔴 las frases del vencido en plazo con su número gramatical', () => {
    expect(es.estadoDeCuenta.vencidoEnPlazoDetalle).not.toMatch(/\(s\)/)
    expect(es.estadoDeCuenta.vencidoEnPlazoDetalle).toBe('{{n}} cuotas vencidas dentro del plazo del contrato: todavía no es mora.')
    expect(es.estadoDeCuenta.unaVencidaEnPlazoDetalle).toBe('1 cuota vencida dentro del plazo del contrato: todavía no es mora.')
  })

  it.each(['components/estado-de-cuenta/ResumenDelEstado.tsx', 'components/estado-de-cuenta/estado-de-cuenta-pdf.tsx'])(
    '🔴 %s usa la frase de una cuota cuando es una',
    (ruta) => {
      expect(leer(ruta)).toMatch(/cuotasEnPlazo === 1\s*\n\s*\? \w+\('estadoDeCuenta\.unaVencidaEnPlazoDetalle'\)/)
    },
  )
})
