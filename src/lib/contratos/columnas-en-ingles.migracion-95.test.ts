/**
 * EN-31 (QA-MIGRACION-95, 06-10-2026; recomendación de main): un export en
 * inglés («Tenant ID», «Monthly rent», «Start date», «End date») no se
 * mapeaba solo. Se suman sinónimos en inglés, sin inventar nada: lo que no
 * tiene sinónimo sigue quedando para mapear a mano.
 */
import { describe, it, expect } from 'vitest'
import { mapearColumnas } from './columnas-de-contrato'

const campos = (encabezados: string[]) =>
  Object.fromEntries(mapearColumnas(encabezados).map((m) => [m.columna, m.campo]))

describe('EN-31 · encabezados en inglés', () => {
  it('el archivo C10 del corpus se mapea solo', () => {
    expect(campos(['Tenant', 'Tenant ID', 'Property code', 'Monthly rent', 'Start date', 'End date'])).toEqual({
      Tenant: 'inquilinoNombre',
      'Tenant ID': 'inquilinoDocumento',
      'Property code': 'codigoInmueble',
      'Monthly rent': 'canon',
      'Start date': 'fechaInicio',
      'End date': 'fechaFin',
    })
  })

  it('más sinónimos comunes de un export en inglés', () => {
    expect(campos(['Landlord ID', 'Tenant email', 'Tenant phone', 'Security deposit', 'Lease start', 'Lease end'])).toEqual({
      'Landlord ID': 'propietarioDocumento',
      'Tenant email': 'inquilinoCorreo',
      'Tenant phone': 'inquilinoTelefono',
      'Security deposit': 'deposito',
      'Lease start': 'fechaInicio',
      'Lease end': 'fechaFin',
    })
  })

  it('«ID inmueble» sigue siendo el código del inmueble, no una cédula', () => {
    expect(campos(['ID inmueble'])['ID inmueble']).toBe('codigoInmueble')
  })

  it('lo que no tiene sinónimo sigue sin campo (a mano, como hoy)', () => {
    expect(campos(['Pet policy'])['Pet policy']).toBeNull()
  })
})

import { NO_SE_MIGRA_EL_CODEUDOR } from './columnas-de-contrato'

describe('CO-18 · la columna del codeudor dice que no se migra', () => {
  it('«Codeudor» queda sin campo y con su porqué, no con un «—» mudo', () => {
    const m = mapearColumnas(['Inquilino', 'Codeudor']).find((x) => x.columna === 'Codeudor')!
    expect(m.campo).toBeNull()
    expect(m.noSeMigra).toBe(NO_SE_MIGRA_EL_CODEUDOR)
    expect(m.noSeMigra).toContain('el codeudor no se migra')
  })
  it('una columna cualquiera sin campo no lleva esa frase', () => {
    expect(mapearColumnas(['Pet policy'])[0].noSeMigra).toBeUndefined()
  })
})
