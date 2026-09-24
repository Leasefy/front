import { describe, it, expect } from 'vitest'

import { elLibroEnUnaFrase, type TrozoDeLaFrase } from './el-libro-en-una-frase'

/** La frase leída de corrido, con las cifras en su lugar. */
function comoTexto(trozos: TrozoDeLaFrase[]): string {
  return trozos
    .map((t) =>
      t.tipo === 'texto' ? t.texto : t.valor === null ? '—' : t.valor.toLocaleString('es-CO'),
    )
    .join('')
}

describe('elLibroEnUnaFrase', () => {
  it('🔴 el libro vacío NO se dice como «0 asientos sobre 2.790 cuentas»', () => {
    const frase = comoTexto(
      elLibroEnUnaFrase({
        cuentasActivas: 2790,
        asientosEnElLibro: 0,
        asientosDelMes: 0,
        ultimoDia: null,
      }),
    )
    // Un 0 pegado a un 2.790 se lee como un error; esto se lee como un estado.
    expect(frase).toContain('Todavía no hay ningún asiento en el libro')
    expect(frase).toContain('2.790 cuentas activas')
    expect(frase).toContain('listo para recibirlos')
  })

  it('con libro lleno dice la relación y cuántos son de este mes', () => {
    const frase = comoTexto(
      elLibroEnUnaFrase({
        cuentasActivas: 2790,
        asientosEnElLibro: 12480,
        asientosDelMes: 340,
        ultimoDia: '19 de septiembre',
      }),
    )
    expect(frase).toBe(
      'El libro tiene 12.480 asientos sobre un plan de 2.790 cuentas activas. De este mes son 340.',
    )
  })

  it('🔴 un cero de ESTE MES con libro lleno dice cuándo fue el último', () => {
    const frase = comoTexto(
      elLibroEnUnaFrase({
        cuentasActivas: 2790,
        asientosEnElLibro: 12480,
        asientosDelMes: 0,
        ultimoDia: '31 de agosto',
      }),
    )
    // Sin esto, el 0 se lee como «acá no hay nada» cuando el libro tiene 12.480.
    expect(frase).toContain('Este mes todavía no se ha asentado ninguno')
    expect(frase).toContain('el último fue el 31 de agosto')
  })

  it('un asiento va en singular', () => {
    const frase = comoTexto(
      elLibroEnUnaFrase({
        cuentasActivas: 10,
        asientosEnElLibro: 1,
        asientosDelMes: 1,
        ultimoDia: '1 de enero',
      }),
    )
    expect(frase).toContain('El libro tiene 1 asiento sobre')
  })

  it('🔴 una consulta caída sale con guion, no con un cero inventado', () => {
    const frase = comoTexto(
      elLibroEnUnaFrase({
        cuentasActivas: null,
        asientosEnElLibro: 12480,
        asientosDelMes: 340,
        ultimoDia: null,
      }),
    )
    expect(frase).toContain('un plan de — cuentas activas')
    expect(frase).not.toContain('0 cuentas')
  })
})
