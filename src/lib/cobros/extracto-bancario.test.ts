import { describe, it, expect } from 'vitest';
import {
  armarFilasDeExtracto,
  faltantesDelMapeo,
  mapearColumnasDeExtracto,
  parsearFechaDeExtracto,
  parsearValorCop,
} from './extracto-bancario';

describe('parsearValorCop — los formatos con los que llega la plata', () => {
  it.each([
    ['1.230.000', 1230000],
    ['1,230,000.00', 1230000],
    ['$ 1.230.000', 1230000],
    ['-45.000', -45000],
    ['(45.000)', -45000],
    ['45.000-', -45000],
    ['1.230.000,50', 1230001],
    ['1,230', 1230],
    ['1.5', 2],
    ['850000', 850000],
    ['COP 2.000.000', 2000000],
    [1800000.4, 1800000],
  ])('%s → %s', (entrada, esperado) => {
    expect(parsearValorCop(entrada)).toBe(esperado);
  });

  it('sin número devuelve null, nunca 0', () => {
    expect(parsearValorCop('')).toBeNull();
    expect(parsearValorCop('   ')).toBeNull();
    expect(parsearValorCop('N/A')).toBeNull();
    expect(parsearValorCop(null)).toBeNull();
    expect(parsearValorCop(undefined)).toBeNull();
  });
});

describe('parsearFechaDeExtracto', () => {
  it.each([
    ['2026-09-03', '2026-09-03'],
    ['2026-09-03 14:22', '2026-09-03'],
    ['2026/09/03', '2026-09-03'],
    ['03/09/2026', '2026-09-03'],
    ['3-9-26', '2026-09-03'],
    ['03.09.2026', '2026-09-03'],
    [46268, '2026-09-03'],
  ])('%s → %s', (entrada, esperado) => {
    expect(parsearFechaDeExtracto(entrada)).toBe(esperado);
  });

  it('una fecha que no existe o un texto cualquiera dan null', () => {
    expect(parsearFechaDeExtracto('31/02/2026')).toBeNull();
    expect(parsearFechaDeExtracto('ayer')).toBeNull();
    expect(parsearFechaDeExtracto('')).toBeNull();
    expect(parsearFechaDeExtracto(12)).toBeNull();
  });

  it('un Date se lee en la zona local, sin correrse un día', () => {
    expect(parsearFechaDeExtracto(new Date(2026, 8, 3, 23, 30))).toBe('2026-09-03');
  });
});

describe('mapearColumnasDeExtracto — por sinónimos', () => {
  it('Bancolombia: fecha, descripción, referencia y valor con signo', () => {
    const mapeo = mapearColumnasDeExtracto(['FECHA', 'DESCRIPCIÓN', 'REFERENCIA', 'VALOR']);
    expect(mapeo).toEqual({ fecha: 'FECHA', descripcion: 'DESCRIPCIÓN', referencia: 'REFERENCIA', valor: 'VALOR' });
    expect(faltantesDelMapeo(mapeo)).toEqual([]);
  });

  it('crédito y débito separados, con encabezados largos (gana el alias más largo)', () => {
    const mapeo = mapearColumnasDeExtracto([
      'Fecha de transacción',
      'Detalle de la transacción',
      'Nro. documento',
      'Valor crédito',
      'Valor débito',
    ]);
    expect(mapeo.fecha).toBe('Fecha de transacción');
    expect(mapeo.descripcion).toBe('Detalle de la transacción');
    expect(mapeo.referencia).toBe('Nro. documento');
    expect(mapeo.credito).toBe('Valor crédito');
    expect(mapeo.debito).toBe('Valor débito');
    expect(mapeo.valor).toBeUndefined();
    expect(faltantesDelMapeo(mapeo)).toEqual([]);
  });

  it('un encabezado se usa una sola vez y lo que falta se dice por nombre', () => {
    const mapeo = mapearColumnasDeExtracto(['Fecha', 'Concepto', 'Cualquier cosa']);
    expect(mapeo).toEqual({ fecha: 'Fecha', descripcion: 'Concepto' });
    expect(faltantesDelMapeo(mapeo)).toEqual(['Valor (o Crédito/Débito)']);
    expect(faltantesDelMapeo({})).toEqual(['Fecha', 'Descripción', 'Valor (o Crédito/Débito)']);
  });
});

describe('armarFilasDeExtracto', () => {
  const mapeo = { fecha: 'Fecha', descripcion: 'Detalle', referencia: 'Ref', valor: 'Valor' };

  it('convierte cada fila y descarta con motivo lo que no se puede leer', () => {
    const r = armarFilasDeExtracto(
      [
        { Fecha: '03/09/2026', Detalle: 'PAGO PEREZ', Ref: '12', Valor: '$ 1.800.000' },
        { Fecha: '04/09/2026', Detalle: 'CUOTA MANEJO', Ref: '', Valor: '-45.000' },
        { Fecha: 'ayer', Detalle: 'X', Ref: '', Valor: '1' },
        { Fecha: '05/09/2026', Detalle: 'Y', Ref: '', Valor: 'N/A' },
        { Fecha: '05/09/2026', Detalle: 'Z', Ref: '', Valor: '0' },
        { Fecha: '05/09/2026', Detalle: '', Ref: '', Valor: '10' },
        { Fecha: '05/09/2026', Detalle: '', Ref: '777', Valor: '10' },
      ],
      mapeo,
    );
    expect(r.filas).toEqual([
      { fecha: '2026-09-03', valorCop: 1800000, descripcion: 'PAGO PEREZ', referencia: '12' },
      { fecha: '2026-09-04', valorCop: -45000, descripcion: 'CUOTA MANEJO' },
      { fecha: '2026-09-05', valorCop: 10, descripcion: '777', referencia: '777' },
    ]);
    expect(r.descartadas).toEqual([
      { fila: 4, motivo: 'Fecha ilegible: «ayer».' },
      { fila: 5, motivo: 'Valor ilegible.' },
      { fila: 6, motivo: 'Valor en cero.' },
      { fila: 7, motivo: 'Sin descripción ni referencia.' },
    ]);
  });

  it('con crédito y débito separados, el valor es crédito menos débito', () => {
    const r = armarFilasDeExtracto(
      [
        { F: '2026-09-03', D: 'ABONO', C: '1.800.000', Db: '' },
        { F: '2026-09-04', D: 'RETIRO', C: '', Db: '45.000' },
        { F: '2026-09-05', D: 'NADA', C: '', Db: '' },
      ],
      { fecha: 'F', descripcion: 'D', credito: 'C', debito: 'Db' },
    );
    expect(r.filas.map((f) => f.valorCop)).toEqual([1800000, -45000]);
    expect(r.descartadas).toEqual([{ fila: 4, motivo: 'Valor ilegible.' }]);
  });
});
