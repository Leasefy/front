/**
 * 🔴 CE-01 (QA-PAGOS-95, 05-10-2026): las frases que arma el back en el Cuadre
 * («3 entradas de plata por $2.500.222.222… IGNORADAS», «($2.535.172.123)») y la
 * alerta de partidas de la Conciliación («…sin conciliar ($9.900.000)») salían
 * con «$X» pegado junto a «$ X» del resto de la pantalla. Al pintarlas pasan por
 * `conLaPlataPegada` (el espacio duro de `formatCurrency`).
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { conLaPlataPegada } from '@/lib/plata/plata-pegada'

const leer = (ruta: string) => readFileSync(join(process.cwd(), 'src', ruta), 'utf8')

describe('CE-01 · la plata de las frases del back con el espacio de la casa', () => {
  it('🔴 el Cuadre pinta avisos y explicaciones con conLaPlataPegada', () => {
    const s = leer('components/finanzas/CuadreDeTerceros.tsx')
    expect(s).toMatch(/avisosQueElVeredictoNoDijo\(datos\)\.map\(\(a\) => conLaPlataPegada\(a\)\)/)
    expect(s).toMatch(/<span>\{conLaPlataPegada\(e\)\}<\/span>/)
  })

  it('🔴 la alerta de partidas de la Conciliación también', () => {
    expect(leer('components/cobros/extracto-bancario/AlertaDePartidas.tsx')).toMatch(/conLaPlataPegada\(alerta\.frase\)/)
  })

  it('la frase queda «$ 9.900.000» con el espacio duro', () => {
    expect(conLaPlataPegada('más de 30 días sin conciliar ($9.900.000)')).toBe('más de 30 días sin conciliar ($ 9.900.000)')
  })
})
