/**
 * Los espejos del front con y sin la llave («centavos en todo», C3-FRONT).
 *
 * Cada espejo copia la regla del back (`@EsPlataDeLasAreas`, `imputarPago`,
 * `calcularImpuestos`, la lectura del extracto…). Lo que se protege:
 *
 *   · llave APAGADA → la regla y la frase de siempre (pesos enteros, «sin
 *     centavos»), EXACTAMENTE como hoy;
 *   · llave PRENDIDA → hasta dos decimales, el tercero se frena con su frase
 *     (no se redondea), y las cuentas cuadran al centavo.
 */

import { afterEach, describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api/client';
import { revisarTerminosDelContrato, MENSAJES_DEL_CONTRATO } from '@/lib/contratos/limites-del-contrato';
import { liquidar, perfilPorDefecto } from '@/lib/contratos/escenarios-tributarios';
import { textoDeErrorDeLinea, validarPartidaDoble, type LineaDelFormulario } from '@/lib/contabilidad/partida-doble';
import { totalesDeApertura, type FilaDeApertura } from '@/lib/migracion/asiento-de-apertura';
import { armarFilasDeExtracto, leerValorDelExtracto, parsearValorCop } from '@/lib/cobros/extracto-bancario';
import { leerSaldoEscrito, MENSAJES_DEL_EXTRACTO } from '@/lib/cobros/limites-del-extracto';
import { imputarPago } from '@/lib/recibos/imputar-pago';
import { aPesos, leerLaRelacion } from '@/components/cobros/extracto-bancario/cierre-del-mes';
import { cuadreEnVivo } from '@/components/cobros/extracto-bancario/cuentas-del-extracto';
import { mensajeDeContabilidad } from '@/components/migracion/contabilidad-errores';
import { errorDelCanon, errorDeLaPlataPorPropietario, MENSAJES_DE_LA_MIGRACION } from '@/components/migracion/limites-de-la-migracion';
import { armarFilaAMigrar } from '@/lib/contratos/armar-fila';
import type { MapeoDeColumna } from '@/lib/contratos/columnas-de-contrato';
import { listaDePlata } from '@/lib/migracion/valores-de-origen';
import { AREAS_DE_PLATA, MENSAJE_PLATA_HASTA_EL_CENTAVO, fijarConfigDePlataParaPruebas } from './con-centavos';

afterEach(() => fijarConfigDePlataParaPruebas(null));

describe('el contrato (canon y depósito, `CreateContractDto`)', () => {
  const terminos = { monthlyRent: '2350000.29', deposit: '4700000.58' };

  it('apagada: «sin centavos», como siempre', () => {
    const e = revisarTerminosDelContrato(terminos);
    expect(e.monthlyRent).toBe(MENSAJES_DEL_CONTRATO.canonEntero);
    expect(e.deposit).toBe(MENSAJES_DEL_CONTRATO.depositoEntero);
    expect(MENSAJES_DEL_CONTRATO.canonEntero).toMatch(/sin centavos/);
  });

  it('prendida: el canon con centavos pasa; tres decimales se frenan con la frase del back', () => {
    expect(revisarTerminosDelContrato(terminos, { canonConCentavos: true, depositoConCentavos: true })).toEqual({});
    const e = revisarTerminosDelContrato(
      { monthlyRent: '2350000.295', deposit: '1.555' },
      { canonConCentavos: true, depositoConCentavos: true },
    );
    expect(e.monthlyRent).toBe(MENSAJE_PLATA_HASTA_EL_CENTAVO);
    expect(e.deposit).toBe(MENSAJE_PLATA_HASTA_EL_CENTAVO);
  });

  it('al editar, el depósito sigue entero (el back lo valida con `@IsInt`)', () => {
    const e = revisarTerminosDelContrato(terminos, { canonConCentavos: true });
    expect(e.monthlyRent).toBeUndefined();
    expect(e.deposit).toBe(MENSAJES_DEL_CONTRATO.depositoEntero);
  });
});

describe('el IVA y las retenciones del concepto (P1–P3 a)', () => {
  const empresa = perfilPorDefecto('JURIDICA');

  it('apagada: al peso con `Math.round`, como hoy (la retefuente de $1.000.157 es $35.005)', () => {
    const l = liquidar({ base: 'ARRENDAMIENTO', baseCop: 1_000_157, uso: 'COMERCIAL', paga: empresa, recibe: empresa });
    const rf = l.renglones.find((r) => r.concepto === 'RETENCION_RENTA');
    expect(rf?.valorCop).toBe(-35_005);
  });

  it('prendida: al centavo, la mitad hacia arriba, y «partes = total»', () => {
    const l = liquidar({
      base: 'ARRENDAMIENTO',
      baseCop: 2_350_000.29,
      uso: 'COMERCIAL',
      paga: empresa,
      recibe: empresa,
      conCentavos: true,
    });
    const iva = l.renglones.find((r) => r.concepto === 'IVA')!.valorCop;
    expect(iva).toBe(446_500.06);
    expect(l.totalAPagarCop).toBe(2_796_500.35);
    const retenido = l.renglones.filter((r) => r.valorCop < 0).reduce((s, r) => s + Math.round(-r.valorCop * 100), 0);
    expect(Math.round(l.netoQueRecibeCop * 100)).toBe(Math.round(l.totalAPagarCop * 100) - retenido);
  });
});

describe('la partida doble de la contabilidad', () => {
  const linea = (clave: string, debitoCop: number | null, creditoCop: number | null): LineaDelFormulario => ({
    clave,
    cuentaId: 'c',
    debitoCop,
    creditoCop,
    descripcion: '',
  });

  it('apagada: un monto con centavos es inválido, con la frase de siempre', () => {
    const v = validarPartidaDoble([linea('a', 1_500.5, null), linea('b', null, 1_500.5)]);
    expect(v.porLinea.a).toBe('MONTO_INVALIDO');
    expect(textoDeErrorDeLinea('MONTO_INVALIDO', false)).toBe('El monto va en pesos enteros, en positivo.');
  });

  it('prendida: 0,1 + 0,2 cuadra con 0,3 (en flotante NO cuadraba)', () => {
    const v = validarPartidaDoble(
      [linea('a', 0.1, null), linea('b', 0.2, null), linea('c', null, 0.3)],
      { conCentavos: true },
    );
    expect(v.valido).toBe(true);
    expect(v.totales.diferencia).toBe(0);
    expect(0.1 + 0.2 - 0.3).not.toBe(0);
    expect(textoDeErrorDeLinea('MONTO_INVALIDO', true)).not.toMatch(/enteros/);
  });

  it('la apertura suma exacto al centavo', () => {
    const f = (id: string, d: number, c: number): FilaDeApertura => ({ id, cuentaId: id, debitoCop: d, creditoCop: c });
    expect(totalesDeApertura([f('a', 0.1, 0), f('b', 0.2, 0), f('c', 0, 0.3)]).diferencia).toBe(0);
  });

  it('el MONTO_INVALIDO del back: «sin centavos» sólo con la llave apagada', () => {
    const e = new ApiError(400, 'x', 'MONTO_INVALIDO');
    expect(mensajeDeContabilidad(e, 'No se pudo crear el asiento.')).toMatch(/sin centavos/);
    fijarConfigDePlataParaPruebas({ conCentavos: { contabilidad_facturacion_y_exogena: true } });
    expect(mensajeDeContabilidad(e, 'No se pudo crear el asiento.')).toMatch(/hasta dos decimales/);
  });
});

describe('el extracto del banco («que no se redondee, se trae tal cual»)', () => {
  const mapeo = { fecha: 'Fecha', valor: 'Valor', descripcion: 'Detalle' };
  const filas = [
    { Fecha: '2026-09-03', Valor: '1.230.000,50', Detalle: 'ABONO' },
    { Fecha: '2026-09-04', Valor: '-4.920,48', Detalle: 'GMF 4X1000' },
    { Fecha: '2026-09-05', Valor: '1.234,567', Detalle: 'RARO' },
  ];

  it('apagada: se redondea al peso como hoy', () => {
    expect(parsearValorCop('1.230.000,50')).toBe(1_230_001);
    const { filas: armadas } = armarFilasDeExtracto(filas, mapeo);
    expect(armadas.map((f) => f.valorCop)).toEqual([1_230_001, -4_920, 1_235]);
  });

  it('prendida: tal cual con sus centavos; con tres decimales la fila se FRENA con su frase', () => {
    const { filas: armadas, descartadas } = armarFilasDeExtracto(filas, mapeo, { conCentavos: true });
    expect(armadas.map((f) => f.valorCop)).toEqual([1_230_000.5, -4_920.48]);
    expect(descartadas).toEqual([
      { fila: 4, motivo: 'El valor «1.234,567» trae más de dos decimales: la plata va hasta el centavo.' },
    ]);
    expect(leerValorDelExtracto(1_500.25, true)).toEqual({ valor: 1_500.25 });
    expect(leerValorDelExtracto('(45.000,10)', true)).toEqual({ valor: -45_000.1 });
  });

  it('crédito y débito por separado: la resta exacta al centavo', () => {
    const { filas: armadas } = armarFilasDeExtracto(
      [{ F: '2026-09-03', C: '0,30', D: '0,10', T: 'x' }],
      { fecha: 'F', credito: 'C', debito: 'D', descripcion: 'T' },
      { conCentavos: true },
    );
    expect(armadas[0].valorCop).toBe(0.2);
  });

  it('el saldo escrito: la frase «sin decimales» sólo con la llave apagada', () => {
    const nunca = () => null;
    expect(leerSaldoEscrito('abc', nunca).error).toBe(MENSAJES_DEL_EXTRACTO.saldoEntero);
    expect(leerSaldoEscrito('abc', nunca, { conCentavos: true }).error).toBe(MENSAJE_PLATA_HASTA_EL_CENTAVO);
  });

  it('el cuadre en vivo es exacto: con centavos no dice «no cuadra por $ 0»', () => {
    const c = cuadreEnVivo([{ valorCop: 0.1 }, { valorCop: 0.2 }], 1_000, 1_000.3);
    expect(c).toEqual({ sumaCop: 0.3, diferenciaCop: 0 });
    expect(cuadreEnVivo([{ valorCop: 1_000 }, { valorCop: -300 }], 5_000, 5_700)).toEqual({ sumaCop: 700, diferenciaCop: 0 });
  });
});

describe('la relación de pagos de una aseguradora', () => {
  it('apagada: con centavos es «mal», como hoy; prendida, tal cual', () => {
    expect(aPesos('$ 1.234.567,29')).toBe('mal');
    expect(aPesos('$ 1.234.567,00')).toBe(1_234_567);
    expect(aPesos('$ 1.234.567,29', true)).toBe(1_234_567.29);
    expect(aPesos(1_234_567.29, true)).toBe(1_234_567.29);
    expect(aPesos(1_234.567, true)).toBe('mal');
  });

  it('la frase de la fila dice la regla de la llave', () => {
    const filas = [{ Neto: '1.500,29', Siniestro: 'S-1' }];
    const mapeo = { neto: 'Neto', siniestro: 'Siniestro' };
    expect(leerLaRelacion(filas, mapeo).malas[0].motivo).toMatch(/sin centavos/);
    const prendida = leerLaRelacion(filas, mapeo, { conCentavos: true });
    expect(prendida.malas).toEqual([]);
    expect(prendida.filas[0]).toMatchObject({ netoCop: 1_500.29 });
  });
});

describe('el plan del recibo (la imputación, espejo del back)', () => {
  const deuda = [{ id: 'c1', month: '2026-09', pendiente: 1_500_000.29 }, { id: 'c2', month: '2026-10', pendiente: 1_500_000 }];

  it('prendida: $1.500.000,29 salda la cuota de $1.500.000,29 sin dejar nada colgando', () => {
    const plan = imputarPago(deuda, 1_500_000.29, { conCentavos: true });
    expect(plan.partes).toHaveLength(1);
    expect(plan.partes[0]).toMatchObject({ id: 'c1', valorCop: 1_500_000.29, quedaPendiente: 0 });
    expect(plan.deudaRestante).toBe(1_500_000);
  });

  it('prendida: las partes suman el abono, al centavo', () => {
    const plan = imputarPago(deuda, 2_000_000.5, { conCentavos: true });
    const suma = plan.partes.reduce((s, p) => s + Math.round(p.valorCop * 100), 0) + Math.round(plan.sobrante * 100);
    expect(suma).toBe(200_000_050);
  });

  it('apagada: un abono con centavos no arma plan (como hoy: pesos enteros)', () => {
    expect(imputarPago(deuda, 1_500_000.29).partes).toEqual([]);
  });
});

describe('la migración de contratos (el archivo y la corrección a mano)', () => {
  const mapeo: MapeoDeColumna[] = [
    { columna: 'Canon', campo: 'canon', porque: 'canon', certeza: 'exacta' },
    { columna: 'Deposito', campo: 'deposito', porque: 'deposito', certeza: 'exacta' },
  ];

  it('apagada: la celda se lee al peso y la corrección dice «sin centavos», como hoy', () => {
    const fila = armarFilaAMigrar({ Canon: '$2.350.000,29', Deposito: '4.700.000,58' }, mapeo);
    expect(fila.monthlyRent).toBe(2_350_000);
    expect(fila.deposit).toBe(4_700_001);
    expect(listaDePlata('451.000,50; 649.000')).toEqual([451_001, 649_000]);
    expect(errorDelCanon('2350000.29')).toBe(MENSAJES_DE_LA_MIGRACION.canonEntero);
    expect(errorDeLaPlataPorPropietario([451_000.5, 649_000])).toBe(MENSAJES_DE_LA_MIGRACION.canonEntero);
  });

  it('prendida: el archivo se trae tal cual, con sus centavos', () => {
    const fila = armarFilaAMigrar({ Canon: '$2.350.000,29', Deposito: '4.700.000,58' }, mapeo, { conCentavos: true });
    expect(fila.monthlyRent).toBe(2_350_000.29);
    expect(fila.deposit).toBe(4_700_000.58);
    // Un entero, exactamente como siempre.
    expect(armarFilaAMigrar({ Canon: '1.500.000' }, mapeo, { conCentavos: true }).monthlyRent).toBe(1_500_000);
    expect(listaDePlata('451.000,50; 649.000', { conCentavos: true })).toEqual([451_000.5, 649_000]);
    // Con más de dos decimales no se adivina ni se redondea.
    expect(listaDePlata(1_234.567, { conCentavos: true })).toBeUndefined();
    expect(errorDelCanon('2350000.29', { conCentavos: true })).toBeNull();
    expect(errorDelCanon('2350000.295', { conCentavos: true })).toBe(MENSAJE_PLATA_HASTA_EL_CENTAVO);
  });
});

it('las nueve áreas son las del back', () => {
  expect(AREAS_DE_PLATA).toHaveLength(9);
});
