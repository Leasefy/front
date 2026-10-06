/**
 * 🔴 QA-FACT-CONTA-95 r2 (05-10-2026) — decisión de Nico («la a», TAL CUAL):
 * sin el tipo de documento GUARDADO del inquilino, su factura no se numera. La
 * fila lo dice en palabras y lleva a la persona en Inquilinos para completarlo.
 */
import { describe, expect, it } from 'vitest'

import { motivoCorto, rutaDelInquilino } from './por-facturar'
import type { FacturaDelMes } from '@/lib/api/facturacion-por-mes.service'

const fila = (over: Partial<FacturaDelMes>) =>
  ({ codigoNoEmitible: 'INQUILINO_SIN_TIPO_DE_DOCUMENTO', terceroDocumento: '1037612345', ...over }) as FacturaDelMes

describe('la factura del inquilino sin tipo de documento guardado', () => {
  it('🔴 la fila dice qué falta', () => {
    expect(motivoCorto(fila({}))).toBe('Falta el tipo de documento del inquilino')
  })

  it('🔴 «Completar en el inquilino» lleva a la persona en Inquilinos y vuelve a Facturación', () => {
    expect(rutaDelInquilino(fila({}))).toBe(
      '/panel/inmobiliaria/inquilinos?persona=doc%3A1037612345&volver=%2Fpanel%2Finmobiliaria%2Ffacturacion%3Ftab%3Dnueva',
    )
  })

  it('sin documento no hay a dónde llevar', () => {
    expect(rutaDelInquilino(fila({ terceroDocumento: null }))).toBeNull()
  })
})
