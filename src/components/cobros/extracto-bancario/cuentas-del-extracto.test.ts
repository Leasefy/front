import { describe, it, expect } from 'vitest';
import {
  aparecer,
  cuadreEnVivo,
  fraseDelCuadre,
  nombreDeLaCuenta,
  nombreDelFiltro,
  opcionDeLaCuenta,
  partesDelResultado,
  periodoDeLasFilas,
  porcentajeLegible,
  traeLaColumnaDeSaldo,
} from './cuentas-del-extracto';
import { leerSaldoEscrito, MENSAJES_DEL_EXTRACTO } from '@/lib/cobros/limites-del-extracto';
import { parsearValorCop } from '@/lib/cobros/extracto-bancario';
import type { CuentaDelExtracto } from '@/lib/api/conciliacion-bancaria.types';

const cuenta = (sobre: Partial<CuentaDelExtracto> = {}): CuentaDelExtracto => ({
  id: 'cta-1',
  nombre: 'Ahorros Bancolombia',
  tipo: 'TRANSFERENCIA',
  banco: 'Bancolombia',
  tipoDeCuenta: 'AHORROS',
  numeroEnmascarado: '•••• 6789',
  activa: true,
  via: 'SIN_DEFINIR',
  convenio: null,
  ...sobre,
});

describe('la cuenta del extracto', () => {
  it('se nombra con su número tapado, y el banco sólo si el nombre no lo dice ya', () => {
    expect(nombreDeLaCuenta(cuenta())).toBe('Ahorros Bancolombia •••• 6789');
    expect(opcionDeLaCuenta(cuenta())).toBe('Ahorros Bancolombia •••• 6789');
    expect(opcionDeLaCuenta(cuenta({ nombre: 'Recaudo', via: 'ARCHIVO' }))).toBe('Recaudo •••• 6789 · Bancolombia (recauda por archivo)');
  });

  it('el filtro se nombra: todas, una cuenta, sin cuenta o la pasarela', () => {
    expect(nombreDelFiltro(null, [])).toBe('Todas las cuentas');
    expect(nombreDelFiltro('cta-1', [cuenta()])).toBe('Ahorros Bancolombia •••• 6789');
    expect(nombreDelFiltro('sin-cuenta', [])).toContain('Sin cuenta');
    expect(nombreDelFiltro('pasarela', [])).toBe('Pasarela de pagos');
  });
});

describe('saldos y período', () => {
  const filas = [
    { fecha: '2026-09-04', valorCop: -45_000, descripcion: 'x', saldoCop: 11_755_000 },
    { fecha: '2026-09-01', valorCop: 1_800_000, descripcion: 'y' },
  ];

  it('el período sale de las fechas de las líneas', () => {
    expect(periodoDeLasFilas(filas)).toEqual({ desde: '2026-09-01', hasta: '2026-09-04' });
    expect(periodoDeLasFilas([])).toBeNull();
    expect(traeLaColumnaDeSaldo(filas)).toBe(true);
    expect(traeLaColumnaDeSaldo([{ saldoCop: undefined }])).toBe(false);
  });

  it('el cuadre en vivo: inicial + líneas = final, o cuánto falta', () => {
    expect(cuadreEnVivo(filas, undefined, 1)).toBeNull();
    const ok = cuadreEnVivo(filas, 10_000_000, 11_755_000)!;
    expect(ok.diferenciaCop).toBe(0);
    expect(fraseDelCuadre(ok)).toContain('Cuadra');
    const mal = cuadreEnVivo(filas, 10_000_000, 12_000_000)!;
    expect(mal.diferenciaCop).toBe(-245_000);
    expect(fraseDelCuadre(mal)).toContain('faltan entradas');
  });

  it('lo que la persona escribe como saldo: vacío, número (con signo y separadores) o la frase del tope', () => {
    expect(leerSaldoEscrito('', parsearValorCop)).toEqual({});
    expect(leerSaldoEscrito('$ 10.000.000', parsearValorCop)).toEqual({ valor: 10_000_000 });
    expect(leerSaldoEscrito('(45.000)', parsearValorCop)).toEqual({ valor: -45_000 });
    expect(leerSaldoEscrito('abc', parsearValorCop)).toEqual({ error: MENSAJES_DEL_EXTRACTO.saldoEntero });
    expect(leerSaldoEscrito('2.000.000.000.000', parsearValorCop)).toEqual({ error: MENSAJES_DEL_EXTRACTO.saldoFueraDeRango });
  });
});

describe('el resultado de la carga', () => {
  it('🔴 distingue lo que ya estaba (duplicado de datos) de las idénticas del archivo que entraron', () => {
    const partes = partesDelResultado({
      nuevas: 3,
      repetidas: 2,
      igualesEnElArchivo: 1,
      adoptadas: 2,
      salidas: 1,
      descartadas: 1,
      descartadasPorValor: 0,
      yaPagadasPorPasarela: 1,
      pendientes: 2,
      seguras: 0,
    });
    expect(partes).toEqual([
      '3 nuevas',
      '2 ya estaban',
      '1 línea idéntica a otra del archivo entró (son movimientos distintos)',
      '2 de antes tomaron esta cuenta',
      '1 salida de plata',
      '1 descartadas por ilegibles',
      '1 traía el id de un pago en línea y quedó marcada',
    ]);
  });

  it('el porcentaje conciliado se dice por número y por valor', () => {
    expect(porcentajeLegible({ porcentajePorNumero: 80, porcentajePorValor: 75.5 })).toBe('80 % por número · 75,5 % por valor');
    expect(porcentajeLegible({ porcentajePorNumero: null, porcentajePorValor: null })).toBe('Sin entradas');
  });
});

describe('el movimiento de los bloques nuevos', () => {
  it('sube 8 px y entra en 200 ms; sale en 150 ms', () => {
    const m = aparecer(false);
    expect(m.initial).toEqual({ opacity: 0, y: 8 });
    expect(m.animate).toMatchObject({ opacity: 1, y: 0, transition: { duration: 0.2 } });
    expect(m.exit).toMatchObject({ transition: { duration: 0.15 } });
  });

  it('con movimiento reducido: en el lugar y sin esperar', () => {
    const m = aparecer(true);
    expect(m.initial).toEqual({ opacity: 1 });
    expect(m.animate).toMatchObject({ transition: { duration: 0 } });
  });
});
