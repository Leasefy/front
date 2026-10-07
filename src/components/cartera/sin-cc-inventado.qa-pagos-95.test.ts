/**
 * 🔴 N-01 (QA-PAGOS-95, 05-10-2026): la Deuda del mes, el cajón del inquilino
 * en Cartera y Cartera por concepto escribían «CC <documento>» aunque el
 * contrato no traiga el tipo: una empresa con NIT salía «CC 900555666». El
 * estado de cuenta ya decía el tipo real o «NIT/CC» (`documentoDelCliente`,
 * P-19); las tres pantallas usan ahora esa misma regla.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { documentoDelCliente } from '@/components/estado-de-cuenta/filas'

const leer = (ruta: string) => readFileSync(join(process.cwd(), 'src', ruta), 'utf8')
const PANTALLAS = [
  'components/inmobiliaria/pagos/CuotasDelMesTabla.tsx',
  'components/cartera/InquilinoEnCarteraCajon.tsx',
  'components/cartera/CarteraPorConcepto.tsx',
]

describe('N-01 · el documento del inquilino sin «CC» inventado', () => {
  it.each(PANTALLAS)('🔴 %s no pega «CC» delante del documento', (ruta) => {
    const s = leer(ruta)
    expect(s).not.toMatch(/`CC \$\{/)
    expect(s).toMatch(/documentoDelCliente\(/)
  })

  it('la regla: el tipo si lo hay; si no, «NIT/CC»', () => {
    expect(documentoDelCliente({ documento: '901444555' })).toBe('NIT/CC 901444555')
    expect(documentoDelCliente({ documento: '901444555', tipoDocumento: 'NIT' })).toBe('NIT 901444555')
    expect(documentoDelCliente({ documento: null })).toBeNull()
  })
})
