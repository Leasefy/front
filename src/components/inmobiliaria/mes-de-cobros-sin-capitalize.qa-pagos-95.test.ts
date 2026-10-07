/**
 * N-14 (QA-PAGOS-95, 05-10-2026): Cobros emitidos decía «Oct De 2026» en cada
 * fila y «Octubre De 2026» en el selector del mes: la clase `capitalize` de CSS
 * sube CADA palabra. El mes sale de `mesEnTitulo` (sólo la inicial).
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { mesEnTitulo } from '@/lib/utils/mes'

const leer = (ruta: string) => readFileSync(join(process.cwd(), 'src', ruta), 'utf8')

describe('N-14 · el mes de Cobros emitidos sin «De» con mayúscula', () => {
  it('🔴 la tabla y el filtro no ponen `capitalize` sobre el mes', () => {
    const tabla = leer('components/inmobiliaria/CobroTable.tsx')
    expect(tabla).not.toMatch(/capitalize">\s*\{formatMonth\(cobro\.month\)\}/)
    expect(tabla).toMatch(/mesEnTitulo\(month, 'es', 'short'\)/)
    const filtro = leer('components/inmobiliaria/CobroFilters.tsx')
    expect(filtro).not.toMatch(/SelectTrigger className="gap-2 capitalize"/)
    expect(filtro).toMatch(/mesEnTitulo\(value\)/)
  })

  it('🔴 el botón «Generar los cobros de …» lleva el mes en minúscula (va en la frase)', () => {
    const pagina = leer('app/panel/inmobiliaria/pagos/cartera/cobros/page.tsx')
    expect(pagina).toMatch(/Generar los cobros de \{mesEnLaFrase\}/)
    expect(pagina).not.toMatch(/Generar los cobros de \{monthDisplay\}/)
  })

  it('las etiquetas', () => {
    expect(mesEnTitulo('2026-10')).toBe('Octubre de 2026')
    expect(mesEnTitulo('2026-10', 'es', 'short')).not.toMatch(/ De /)
  })
})
