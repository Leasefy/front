/**
 * 🔴 QA-FACT-CONTA-95 (05-10-2026) · FA-R28 / CB-J-05: la plata en Facturación
 * y Contabilidad se escribe «$ 1.234.567». Las frases que arma el back
 * (`pesosEnFrase`: «reversa $500.000 de la causación…», «El desfase de hasta
 * $1.000…», las descripciones de los asientos) llegaban pegadas: el barrido de
 * la sección las encontró en Notas, la portada, el libro y el mapeo. Al
 * pintarlas, el «$» va con su cifra y el espacio duro de `formatCurrency`.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import * as React from 'react'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it } from 'vitest'

import { ExplicacionDelEvento } from './mapeo/ExplicacionDelEvento'

const RAIZ = join(__dirname, '..')

describe('🔴 FA-R28 · las frases del back con plata se pintan «$ 1.234.567»', () => {
  it('la explicación de un evento del mapeo', () => {
    void React
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)
    act(() => {
      root.render(<ExplicacionDelEvento texto="El desfase de hasta $1.000 de un pago de más." testId="x" />)
    })
    expect(container.textContent).toContain('$ 1.000')
    expect(container.textContent).not.toMatch(/\$\d/)
    act(() => root.unmount())
    container.remove()
  })

  it.each([
    ['facturacion/FacturasEmitidas.tsx', /conLaPlataPegada\(n\.notaContable\)/],
    ['facturacion/FacturasEmitidas.tsx', /conLaPlataPegada\(nota\.notaContable\)/],
    ['facturacion/FacturasEmitidas.tsx', /conLaPlataPegada\(nota\.deuda\?\.explicacion\)/],
    ['facturacion/CorregirFactura.tsx', /conLaPlataPegada\(r\.deuda\.explicacion\)/],
    ['contabilidad/asientos/LibroDeAsientos.tsx', /\{conLaPlataPegada\(asiento\.descripcion\)\}/],
    ['contabilidad/HubDeContabilidad.tsx', /\{conLaPlataPegada\(a\.descripcion\)\}/],
    ['contabilidad/asientos/DetalleDeAsiento.tsx', /conLaPlataPegada\(m\.descripcion\)/],
  ])('%s pega el «$» de lo que viene del back', (archivo, patron) => {
    expect(readFileSync(join(RAIZ, archivo), 'utf8')).toMatch(patron)
  })
})
