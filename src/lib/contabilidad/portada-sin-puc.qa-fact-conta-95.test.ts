/**
 * 🔴 QA-FACT-CONTA-95 r2 · CB-A-07: la portada de una inmobiliaria SIN plan de
 * cuentas decía «Todavía no hay ningún asiento en el libro. El plan de cuentas
 * tiene 0 cuentas activas y está listo para recibirlos.» y mandaba a «Completar
 * el mapeo» y «Mapear los rubros», donde no hay cuentas que elegir. El vacío
 * tiene que decir qué hacer: primero el plan de cuentas.
 */
import { describe, expect, it } from 'vitest'

import { alertasDeContabilidad, describirAlerta } from './alertas'
import { elLibroEnUnaFrase } from './el-libro-en-una-frase'

const pesos = (n: number) => `$ ${n}`

describe('CB-A-07 · portada sin plan de cuentas', () => {
  it('la frase del libro no dice «listo para recibirlos» con 0 cuentas: dice qué hacer', () => {
    const frase = elLibroEnUnaFrase({ cuentasActivas: 0, asientosEnElLibro: 0, asientosDelMes: 0, ultimoDia: null })
      .map((t) => (t.tipo === 'texto' ? t.texto : String(t.valor)))
      .join('')
    expect(frase).not.toMatch(/listo para recibirlos/)
    expect(frase).toMatch(/Todavía no hay plan de cuentas/)
    expect(frase).toMatch(/Siembra el PUC base o sube el de tu sistema/)
  })

  it('la primera alerta lleva al plan de cuentas; las del mapeo y los rubros se callan hasta que haya cuentas', () => {
    const alertas = alertasDeContabilidad({
      faltantes: { recibos: 0, lotes: 0, cobros: 0, total: 0, mapeoCompleto: false, eventosSinCuenta: ['RECIBO_BANCOS', 'RECIBO_CAJA'] } as never,
      balance: null,
      cierre: null,
      mesAnterior: null,
      rubros: { completo: false, faltantes: ['Comisiones de administración'] },
      cuentasActivas: 0,
    }).map((a) => describirAlerta(a, pesos))
    expect(alertas.map((a) => a.clave)).toEqual(['sin-plan-de-cuentas'])
    expect(alertas[0]).toMatchObject({
      titulo: 'Todavía no hay plan de cuentas',
      accion: { tipo: 'ir', label: 'Ir al plan de cuentas', href: '/panel/inmobiliaria/contabilidad/puc' },
    })
  })

  it('con plan de cuentas (o sin saberlo) todo sigue como antes', () => {
    const entrada = {
      faltantes: { recibos: 0, lotes: 0, cobros: 0, total: 0, mapeoCompleto: false, eventosSinCuenta: ['RECIBO_BANCOS'] } as never,
      balance: null,
      cierre: null,
      mesAnterior: null,
      rubros: { completo: false, faltantes: ['Comisiones de administración'] },
    }
    for (const cuentasActivas of [105, null, undefined]) {
      const claves = alertasDeContabilidad({ ...entrada, cuentasActivas }).map((a) => describirAlerta(a, pesos).clave)
      expect(claves).toEqual(['mapeo-incompleto', 'rubros-incompletos'])
    }
    const frase = elLibroEnUnaFrase({ cuentasActivas: 105, asientosEnElLibro: 0, asientosDelMes: 0, ultimoDia: null })
      .map((t) => (t.tipo === 'texto' ? t.texto : String(t.valor)))
      .join('')
    expect(frase).toMatch(/listo para recibirlos/)
  })
})
