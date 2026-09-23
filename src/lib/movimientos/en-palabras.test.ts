/**
 * La bitácora de movimientos, en palabras.
 *
 * Lo que fija: la FRASE del resumen (el molde: el resumen es una frase, y habla
 * del filtro puesto); el rol dicho como lo dice el equipo; la hora SIEMPRE en
 * Bogotá; y que lo redactado se vea como redactado.
 */

import { describe, expect, it } from 'vitest'

import {
  cuandoEnBogota,
  fraseDelResumen,
  loEnviadoEnFilas,
  moduloEnPalabras,
  rangoDelMes,
  resultadoDe,
  rolEnPalabras,
} from './en-palabras'

describe('la frase del resumen', () => {
  it('cuenta movimientos, personas, negados y fallidos, en plural o singular', () => {
    expect(
      fraseDelResumen(
        { total: 1234, resumen: { personas: 7, negados: 12, errores: 1 } },
        'en septiembre de 2026',
      ),
    ).toBe(
      'En septiembre de 2026 hubo 1.234 movimientos de 7 personas; 12 fueron negados por permiso y 1 falló.',
    )
    expect(
      fraseDelResumen({ total: 1, resumen: { personas: 1, negados: 0, errores: 0 } }, 'en agosto de 2026'),
    ).toBe('En agosto de 2026 hubo 1 movimiento de 1 persona.')
  })

  it('sin nada no dice «0 movimientos»: dice que no hay, con estos filtros', () => {
    expect(
      fraseDelResumen({ total: 0, resumen: { personas: 0, negados: 0, errores: 0 } }, 'en julio de 2026'),
    ).toBe('No hay movimientos registrados en julio de 2026 con estos filtros.')
  })
})

describe('palabras', () => {
  it('el rol copiado en la fila se dice como en el equipo', () => {
    expect(rolEnPalabras('CONTADOR')).toBe('Contador')
    expect(rolEnPalabras('AGENTE')).toBe('Asesor comercial')
    expect(rolEnPalabras('AUXILIAR_CARTERA')).toBe('Auxiliar de cartera')
    expect(rolEnPalabras(null)).toBe('—')
  })

  it('el módulo de la ruta se traduce; uno desconocido no se inventa', () => {
    expect(moduloEnPalabras('lotes-de-dispersion')).toBe('Lotes de giros')
    expect(moduloEnPalabras('algo-nuevo')).toBe('Algo nuevo')
  })

  it('el código HTTP dice si se hizo, se negó o falló', () => {
    expect(resultadoDe(201)).toBe('exito')
    expect(resultadoDe(403)).toBe('negado')
    expect(resultadoDe(500)).toBe('error')
  })

  it('la hora es la de Bogotá, no la del navegador', () => {
    // 02:30 UTC del 23 = 21:30 del 22 en Bogotá.
    const texto = cuandoEnBogota('2026-09-23T02:30:00.000Z')
    expect(texto).toMatch(/22/)
    expect(texto).toMatch(/9:30/)
  })

  it('el mes se vuelve el rango de días que pide el back', () => {
    expect(rangoDelMes('2026-02')).toEqual({ desde: '2026-02-01', hasta: '2026-02-28' })
    expect(rangoDelMes('2026-09')).toEqual({ desde: '2026-09-01', hasta: '2026-09-30' })
  })
})

describe('lo enviado', () => {
  it('se aplana un nivel y lo redactado se marca como tal', () => {
    expect(
      loEnviadoEnFilas({
        motivo: 'Ya revisé',
        codigoDeAprobacion: '«redactado»',
        cuentaBancaria: { numero: '«redactado»', tipoCuenta: 'AHORROS' },
        activo: true,
      }),
    ).toEqual([
      { campo: 'motivo', valor: 'Ya revisé', redactado: false },
      { campo: 'codigoDeAprobacion', valor: '«redactado»', redactado: true },
      { campo: 'cuentaBancaria.numero', valor: '«redactado»', redactado: true },
      { campo: 'cuentaBancaria.tipoCuenta', valor: 'AHORROS', redactado: false },
      { campo: 'activo', valor: 'sí', redactado: false },
    ])
    expect(loEnviadoEnFilas(null)).toEqual([])
  })
})
