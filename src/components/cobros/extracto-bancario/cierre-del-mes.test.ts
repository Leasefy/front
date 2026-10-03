/**
 * El cierre del mes, la relación de las aseguradoras — lo que calcula la
 * pantalla sin red (Nico, P9 y P6): leer la relación con el mapeo genérico
 * (todo o nada, sin centavos) y armar el Excel/PDF desde la foto con su huella.
 */
import { describe, it, expect } from 'vitest';
import type { CierreConFoto } from '@/lib/api/cierre-de-conciliacion';
import { aPesos, leerLaRelacion, mapeoSugerido, nombreDelArchivoDelCierre, pesos, porcentaje, seccionesDelCierre } from './cierre-del-mes';

describe('la plata de un archivo', () => {
  it('lee los formatos de Colombia y de afuera, sin centavos', () => {
    expect(aPesos('$ 1.234.567')).toBe(1_234_567);
    expect(aPesos('1,234,567.00')).toBe(1_234_567);
    expect(aPesos('1.234.567,00')).toBe(1_234_567);
    expect(aPesos(965000)).toBe(965_000);
    expect(aPesos('1.234,50')).toBe('mal');
    expect(aPesos(12.5)).toBe('mal');
    expect(aPesos('')).toBeNull();
    expect(aPesos('abc')).toBe('mal');
  });

  it('dice la plata y los porcentajes como se leen acá', () => {
    expect(pesos(-4000)).toBe('−$4.000');
    expect(pesos(null)).toBe('—');
    expect(porcentaje(83.15)).toBe('83,15 %');
  });
});

describe('la relación de pagos de una aseguradora', () => {
  const columnas = ['No. Siniestro', 'Valor Pagado', 'Retención', 'Fecha pago', 'Cédula'];

  it('propone el mapeo por el nombre de la columna', () => {
    expect(mapeoSugerido(columnas)).toMatchObject({
      siniestro: 'No. Siniestro',
      neto: 'Valor Pagado',
      retencion: 'Retención',
      fecha: 'Fecha pago',
      documento: 'Cédula',
    });
  });

  it('lee las filas con el mapeo; las vacías no cuentan; las malas se dicen por fila', () => {
    const mapeo = mapeoSugerido(columnas);
    const r = leerLaRelacion(
      [
        { 'No. Siniestro': 'SIN-1', 'Valor Pagado': '$ 965.000', Retención: '35.000', 'Fecha pago': '05/09/2026', Cédula: '' },
        { 'No. Siniestro': '', 'Valor Pagado': '', Retención: '', 'Fecha pago': '', Cédula: '' },
        { 'No. Siniestro': 'SIN-2', 'Valor Pagado': '0', Retención: '', 'Fecha pago': '', Cédula: '' },
        { 'No. Siniestro': '', 'Valor Pagado': '100', Retención: '', 'Fecha pago': '', Cédula: '' },
      ],
      mapeo,
    );
    expect(r.filas).toEqual([
      expect.objectContaining({ siniestro: 'SIN-1', netoCop: 965_000, retencionCop: 35_000, fecha: '2026-09-05' }),
    ]);
    expect(r.malas.map((m) => m.fila)).toEqual([3, 4]);
  });
});

describe('el Excel y el PDF salen de la foto firmada', () => {
  const cierre = {
    id: 'c1',
    cuentaId: 'cta',
    mes: '2026-09',
    version: 2,
    estado: 'CERRADO',
    huella: 'a'.repeat(64),
    firma: { userId: 'u', nombre: 'Carla', rol: 'CONTADOR', tarjetaProfesional: '123-T', firmadoAt: '2026-10-02T15:00:00.000Z' },
    reapertura: null,
    foto: {
      formato: 1,
      cuenta: { id: 'cta', nombre: 'Ahorros Bancolombia •••• 6789', numeroEnmascarado: '•••• 6789', banco: 'Bancolombia' },
      mes: '2026-09',
      mesEnPalabras: 'septiembre de 2026',
      periodo: { desde: '2026-09-01', hasta: '2026-09-30' },
      saldos: {
        extracto: { valorCop: 12_345_678, fuente: 'carga', detalle: '' },
        libros: { valorCop: 12_000_000, cuentaPuc: { id: 'p', codigo: '11100501', nombre: 'Bancolombia' }, compartida: false, detalle: '' },
        diferenciaCop: 345_678,
        efectoDeLasPartidasCop: 345_678,
        diferenciaSinExplicarCop: 0,
      },
      partidas: {
        lista: [{ id: 'l', fecha: '2026-07-15', tipo: 'ENTRADA_SIN_IDENTIFICAR', valorCop: 250_000, dias: 77, rango: 'mas-de-60', descripcion: 'CONSIG', referencia: null }],
        porTipoYRango: [{ tipo: 'ENTRADA_SIN_IDENTIFICAR', rango: 'mas-de-60', n: 1, valorCop: 250_000 }],
        total: { n: 1, valorCop: 250_000, valorAbsolutoCop: 250_000 },
      },
      conciliado: { lineasDelMes: 4, conciliadas: 2, pendientes: 2, porNumeroPct: 50, valorDelMesCop: 1, conciliadoCop: 1, porValorPct: 83.15 },
      quien: [{ origen: 'persona', n: 1, valorCop: 1_000_000, personas: [{ userId: 'p', nombre: 'Pedro Pérez', n: 1, valorCop: 1_000_000 }] }],
      ignoradas: { n: 0, valorCop: 0, entradas: 0, entradasCop: 0 },
      terceros: null,
      avisos: ['Una partida lleva más de 60 días sin identificar.'],
      armadaAt: '2026-10-02T15:00:00.000Z',
      firma: { userId: 'u', nombre: 'Carla', email: null, rol: 'CONTADOR', tarjetaProfesional: '123-T', firmadoAt: '2026-10-02T15:00:00.000Z' },
    },
  } as unknown as CierreConFoto;

  it('trae saldos, partidas por tipo y antigüedad, % conciliado, quién concilió, la firma y la huella', () => {
    const s = seccionesDelCierre(cierre);
    expect(s.map((x) => x.titulo)).toEqual(['Resumen', 'Partidas por tipo y antigüedad', 'Partidas conciliatorias', 'Quién concilió', 'Avisos']);
    const resumen = Object.fromEntries(s[0].filas.map((f) => [f[0], f[1]]));
    expect(resumen['Saldo según el extracto']).toBe('$12.345.678');
    expect(resumen['Conciliado por valor']).toBe('83,15 %');
    expect(resumen['Firmó']).toBe('Carla (contador)');
    expect(resumen['Huella (sha256)']).toBe('a'.repeat(64));
    expect(s[1].filas[1]).toEqual(['Consignaciones sin identificar', 'Más de 60 días', 1, 250_000]);
    expect(s[3].filas.map((f) => f[0])).toEqual(['Quién concilió', 'Una persona', '   Pedro Pérez']);
  });

  it('el nombre del archivo dice el mes, la cuenta y la versión', () => {
    expect(nombreDelArchivoDelCierre(cierre, 'xlsx')).toBe('cierre-2026-09-Ahorros-Bancolombia-6789-v2.xlsx');
  });
});
