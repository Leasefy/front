/**
 * La cuenta de la factura de proveedor, con números en la mano.
 *
 * Lo que estos tests fijan:
 *
 *   1. El IVA se redondea al peso (los montos del libro son `Int`), y el total
 *      calculado es subtotal + IVA de CADA línea, no el IVA del subtotal —con
 *      dos tarifas distintas en la misma factura no da lo mismo.
 *   2. El neto es total − retenciones, y las retenciones que superan el total
 *      son un problema, no un pago negativo.
 *   3. El aviso de descuadre lleva LOS DOS números: sin ellos, «no cuadra» no
 *      dice qué corregir.
 *   4. Una línea a medio llenar NO se traga en silencio: suma 0 y además se
 *      denuncia.
 */

import { describe, it, expect } from 'vitest';

import {
  avisoDeTotalQueNoCuadra,
  diferenciaDelTotal,
  ivaDeLaLinea,
  lineaVacia,
  lineasParaElBack,
  netoAPagar,
  problemasDeLaFactura,
  sumaDeRetenciones,
  totalesDeLasLineas,
  type BorradorDeFactura,
  type LineaEnCurso,
} from './factura-de-proveedor';

const linea = (extra: Partial<LineaEnCurso> = {}): LineaEnCurso => ({
  descripcion: 'Cerradura',
  cuentaId: 'c1',
  baseCop: 400_000,
  ivaPct: 19,
  ...extra,
});

const borrador = (extra: Partial<BorradorDeFactura> = {}): BorradorDeFactura => ({
  proveedorNombre: 'Ferretería El Tornillo SAS',
  proveedorDocumento: '900123456',
  numeroDelProveedor: '4521',
  fecha: '2026-09-05',
  concepto: 'Cerraduras para la oficina',
  lineas: [linea()],
  totalCop: 476_000,
  retefuenteCop: 10_000,
  reteivaCop: 0,
  reteicaCop: 3_040,
  ...extra,
});

describe('ivaDeLaLinea', () => {
  it('19 % de 400.000 son 76.000', () => {
    expect(ivaDeLaLinea(400_000, 19)).toBe(76_000);
  });

  it('redondea al peso, no trunca: el libro no tiene centavos', () => {
    // 19 % de 399.999 = 75.999,81
    expect(ivaDeLaLinea(399_999, 19)).toBe(76_000);
    // 19 % de 400.001 = 76.000,19
    expect(ivaDeLaLinea(400_001, 19)).toBe(76_000);
  });

  it('exento es 0, no una división por cero', () => {
    expect(ivaDeLaLinea(400_000, 0)).toBe(0);
  });

  it('un valor que no es número no inventa un IVA', () => {
    expect(ivaDeLaLinea(Number.NaN, 19)).toBe(0);
    expect(ivaDeLaLinea(400_000, Number.NaN)).toBe(0);
  });
});

describe('totalesDeLasLineas', () => {
  it('suma el IVA de CADA línea, no el IVA del subtotal', () => {
    // Con 19 % y 5 % en la misma factura, aplicar una sola tarifa al subtotal
    // daría otro número: 100.000×19 % + 100.000×5 % = 24.000, no 200.000×19 %.
    const totales = totalesDeLasLineas([
      linea({ baseCop: 100_000, ivaPct: 19 }),
      linea({ baseCop: 100_000, ivaPct: 5 }),
    ]);
    expect(totales).toEqual({ subtotalCop: 200_000, ivaCop: 24_000, totalCop: 224_000 });
  });

  it('una línea sin base suma cero (y se denuncia aparte)', () => {
    const totales = totalesDeLasLineas([linea(), linea({ baseCop: null })]);
    expect(totales.subtotalCop).toBe(400_000);
    expect(totales.totalCop).toBe(476_000);
  });

  it('sin líneas todo es cero', () => {
    expect(totalesDeLasLineas([])).toEqual({ subtotalCop: 0, ivaCop: 0, totalCop: 0 });
  });
});

describe('retenciones y neto', () => {
  it('el neto es lo que dice la factura menos las tres retenciones', () => {
    expect(
      netoAPagar(476_000, { retefuenteCop: 10_000, reteivaCop: 0, reteicaCop: 3_040 }),
    ).toBe(462_960);
  });

  it('sin retenciones el neto es el total', () => {
    expect(netoAPagar(476_000, { retefuenteCop: 0, reteivaCop: 0, reteicaCop: 0 })).toBe(476_000);
  });

  it('suma las tres', () => {
    expect(
      sumaDeRetenciones({ retefuenteCop: 10_000, reteivaCop: 5_000, reteicaCop: 3_040 }),
    ).toBe(18_040);
  });
});

describe('diferenciaDelTotal', () => {
  it('es 0 cuando el papel y las líneas dicen lo mismo', () => {
    expect(diferenciaDelTotal(476_000, [linea()])).toBe(0);
  });

  it('es positiva cuando el papel dice más', () => {
    expect(diferenciaDelTotal(476_100, [linea()])).toBe(100);
  });

  it('es negativa cuando las líneas suman más', () => {
    expect(diferenciaDelTotal(475_000, [linea()])).toBe(-1_000);
  });
});

describe('problemasDeLaFactura', () => {
  it('una factura completa no tiene problemas', () => {
    expect(problemasDeLaFactura(borrador())).toEqual([]);
  });

  it('el documento del proveedor se pide nombrando la exógena', () => {
    const problemas = problemasDeLaFactura(borrador({ proveedorDocumento: '  ' }));
    expect(problemas.some((p) => p.includes('documento del proveedor'))).toBe(true);
    expect(problemas.some((p) => p.includes('exógena'))).toBe(true);
  });

  it('sin líneas lo dice', () => {
    expect(problemasDeLaFactura(borrador({ lineas: [] }))).toContain(
      'Una factura necesita al menos una línea.',
    );
  });

  it('🔴 una línea a medio llenar se denuncia: sumarla como cero y callarlo miente', () => {
    const problemas = problemasDeLaFactura(borrador({ lineas: [linea(), lineaVacia()] }));
    expect(problemas.some((p) => p.includes('línea sin base'))).toBe(true);
    expect(problemas.some((p) => p.includes('sin descripción'))).toBe(true);
  });

  it('cuenta las líneas incompletas en plural', () => {
    const problemas = problemasDeLaFactura(
      borrador({ lineas: [lineaVacia(), lineaVacia(), lineaVacia()] }),
    );
    expect(problemas.some((p) => p.includes('3 líneas sin base'))).toBe(true);
  });

  it('retenciones mayores que el total serían un pago negativo', () => {
    const problemas = problemasDeLaFactura(borrador({ retefuenteCop: 600_000 }));
    expect(problemas.some((p) => p.includes('pago negativo'))).toBe(true);
  });

  it('una retención negativa no es un descuento: se avisa', () => {
    const problemas = problemasDeLaFactura(
      borrador({ retefuenteCop: -10_000, reteicaCop: 0 }),
    );
    expect(problemas.some((p) => p.includes('en positivo'))).toBe(true);
  });

  it('sin total escrito lo pide, y dice para qué sirve', () => {
    const problemas = problemasDeLaFactura(borrador({ totalCop: null }));
    const delTotal = problemas.find((p) => p.includes('total que dice la factura'))!;
    expect(delTotal).toContain('se verifica que las líneas sumen bien');
  });
});

describe('avisoDeTotalQueNoCuadra', () => {
  const pesos = (n: number) => `$${n.toLocaleString('es-CO')}`;

  it('no avisa cuando cuadra', () => {
    expect(avisoDeTotalQueNoCuadra(borrador(), pesos)).toBeNull();
  });

  it('no avisa cuando todavía no hay total escrito', () => {
    expect(avisoDeTotalQueNoCuadra(borrador({ totalCop: null }), pesos)).toBeNull();
  });

  it('🔴 lleva los DOS números y la diferencia', () => {
    const aviso = avisoDeTotalQueNoCuadra(borrador({ totalCop: 475_900 }), pesos)!;
    expect(aviso).toContain(pesos(475_900));
    expect(aviso).toContain(pesos(476_000));
    expect(aviso).toContain(pesos(100));
  });

  /*
   * 🔴 El contrato decía que el back rechazaba con `TOTALES_NO_CUADRAN`. Quedó
   * implementado de otra forma: el total del papel NO viaja y nadie lo verifica.
   * El aviso tiene que decir ESO —que si se registra así, la factura queda por lo
   * que suman las líneas y nadie lo nota— y no prometer un 400 que no existe.
   */
  it('🔴 dice que el back NO lo verifica y con cuánto va a quedar la factura', () => {
    const aviso = avisoDeTotalQueNoCuadra(borrador({ totalCop: 475_900 }), pesos)!;
    expect(aviso).toContain('no se le manda al back');
    expect(aviso).toContain('nadie más lo va a notar');
    expect(aviso).not.toContain('TOTALES_NO_CUADRAN');
  });
});

describe('lineasParaElBack', () => {
  it('deja afuera las líneas sin base', () => {
    expect(lineasParaElBack([linea(), lineaVacia()])).toHaveLength(1);
  });

  it('omite `cuentaId` vacío: el back usa la del rubro o GASTO_SIN_RUBRO', () => {
    const [enviada] = lineasParaElBack([linea({ cuentaId: '' })]);
    expect('cuentaId' in enviada).toBe(false);
  });

  it('manda la cuenta cuando la hay, y recorta la descripción', () => {
    const [enviada] = lineasParaElBack([linea({ descripcion: '  Cerradura  ' })]);
    expect(enviada).toEqual({
      descripcion: 'Cerradura',
      cuentaId: 'c1',
      baseCop: 400_000,
      ivaPct: 19,
    });
  });

  /*
   * El DTO acepta `ivaCop` y ése MANDA sobre `ivaPct`, pero este formulario
   * captura un porcentaje: no hay de dónde sacar el IVA en pesos. Es una omisión
   * deliberada de un campo opcional, no un desajuste con el DTO.
   */
  it('manda el porcentaje y no el IVA en pesos: es lo que el formulario captura', () => {
    const [enviada] = lineasParaElBack([linea()]);
    expect(enviada.ivaPct).toBe(19);
    expect('ivaCop' in enviada).toBe(false);
  });
});
