/**
 * El CSV del libro — con datos en la mano.
 *
 * Lo que se congela: una fila por MOVIMIENTO (no por asiento), el `;` y el
 * BOM que Excel en español necesita, el escape de comillas y saltos, y que la
 * descarga de un rango grande pide TODAS las páginas y se corta antes de
 * empezar si el libro supera el tope.
 */

import { describe, expect, it, vi } from 'vitest';

import type { AsientoContable, PaginaDeAsientos } from '@/lib/api/contabilidad.service';
import {
  COLUMNAS_DEL_CSV,
  LibroDemasiadoGrande,
  campoCsv,
  csvDeAsientos,
  filasDelCsv,
  nombreDelCsv,
  todosLosAsientos,
} from './csv';

function asiento(over: Partial<AsientoContable> = {}): AsientoContable {
  return {
    id: 'a-1',
    agencyId: 'ag-1',
    numero: 12,
    fecha: '2026-08-28T00:00:00.000Z',
    descripcion: 'Nómina del mes; agosto',
    origen: 'MIGRACION',
    origenId: null,
    cerrado: false,
    creadoPorUserId: null,
    createdAt: '2026-08-28T10:00:00.000Z',
    movimientos: [
      {
        id: 'm-1',
        asientoId: 'a-1',
        cuentaId: 'c-1',
        debitoCop: 1500000,
        creditoCop: 0,
        terceroTipo: 'PROPIETARIO',
        terceroId: 't-1',
        descripcion: 'Canon "agosto"',
        orden: 1,
        cuenta: { codigo: '130505', nombre: 'Cartera' },
      },
      {
        id: 'm-2',
        asientoId: 'a-1',
        cuentaId: 'c-2',
        debitoCop: 0,
        creditoCop: 1500000,
        terceroTipo: null,
        terceroId: null,
        descripcion: null,
        orden: 2,
        cuenta: { codigo: '415510', nombre: 'Comisiones' },
      },
    ],
    ...over,
  };
}

describe('campoCsv', () => {
  it('deja pasar lo simple y entrecomilla lo que trae separador, comillas o salto', () => {
    expect(campoCsv('Caja')).toBe('Caja');
    expect(campoCsv(1500000)).toBe('1500000');
    expect(campoCsv(null)).toBe('');
    expect(campoCsv('a;b')).toBe('"a;b"');
    expect(campoCsv('dijo "hola"')).toBe('"dijo ""hola"""');
    expect(campoCsv('dos\nlíneas')).toBe('"dos\nlíneas"');
  });
});

describe('filasDelCsv', () => {
  it('una fila por movimiento, con el número y la fecha del asiento repetidos', () => {
    const filas = filasDelCsv([asiento()]);
    expect(filas).toHaveLength(2);
    expect(filas[0]).toEqual([
      '12',
      '2026-08-28',
      'Nómina del mes; agosto',
      'Migración',
      'Abierto',
      '130505',
      'Cartera',
      '1500000',
      '',
      'PROPIETARIO',
      't-1',
      'Canon "agosto"',
    ]);
    expect(filas[1][5]).toBe('415510');
    expect(filas[1][7]).toBe('');
    expect(filas[1][8]).toBe('1500000');
    expect(filas[1][9]).toBe('');
  });

  it('cada fila tiene tantas columnas como el encabezado', () => {
    for (const fila of filasDelCsv([asiento(), asiento({ id: 'a-2', numero: 13, cerrado: true })])) {
      expect(fila).toHaveLength(COLUMNAS_DEL_CSV.length);
    }
  });

  it('sin la cuenta hidratada cae al id, y un asiento cerrado lo dice', () => {
    const a = asiento({ cerrado: true });
    a.movimientos = [{ ...a.movimientos[0], cuenta: undefined }];
    const [fila] = filasDelCsv([a]);
    expect(fila[4]).toBe('Cerrado');
    expect(fila[5]).toBe('');
    expect(fila[6]).toBe('c-1');
  });
});

describe('csvDeAsientos', () => {
  it('arranca con BOM, separa con ; y termina cada línea en CRLF', () => {
    const csv = csvDeAsientos([asiento()]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    const lineas = csv.slice(1).split('\r\n');
    expect(lineas[0]).toBe(COLUMNAS_DEL_CSV.join(';'));
    expect(lineas[1]).toBe('12;2026-08-28;"Nómina del mes; agosto";Migración;Abierto;130505;Cartera;1500000;;PROPIETARIO;t-1;"Canon ""agosto"""');
    expect(lineas).toHaveLength(4);
    expect(lineas[3]).toBe('');
  });

  it('sin asientos deja sólo el encabezado', () => {
    const lineas = csvDeAsientos([]).slice(1).split('\r\n');
    expect(lineas).toEqual([COLUMNAS_DEL_CSV.join(';'), '']);
  });
});

describe('nombreDelCsv', () => {
  it('dice el rango, o «completo» con la fecha de hoy', () => {
    expect(nombreDelCsv('2026-08-01', '2026-08-31', '2026-09-03')).toBe('asientos-2026-08-01-a-2026-08-31.csv');
    expect(nombreDelCsv('2026-08-01', '', '2026-09-03')).toBe('asientos-desde-2026-08-01.csv');
    expect(nombreDelCsv('', '2026-08-31', '2026-09-03')).toBe('asientos-hasta-2026-08-31.csv');
    expect(nombreDelCsv('', '', '2026-09-03')).toBe('asientos-completo-2026-09-03.csv');
  });
});

describe('todosLosAsientos', () => {
  const pagina = (total: number, desde: number, cuantos: number): PaginaDeAsientos => ({
    total,
    limite: 200,
    desplazamiento: desde,
    asientos: Array.from({ length: cuantos }, (_, i) => asiento({ id: `a-${desde + i}`, numero: desde + i })),
  });

  it('pide página por página hasta juntar el total', async () => {
    const listar = vi.fn(async (f: { desplazamiento?: number }) =>
      f.desplazamiento === 0 ? pagina(450, 0, 200) : f.desplazamiento === 200 ? pagina(450, 200, 200) : pagina(450, 400, 50),
    );
    const todos = await todosLosAsientos(listar, { desde: '2026-08-01', hasta: '2026-08-31' });
    expect(todos).toHaveLength(450);
    expect(listar).toHaveBeenCalledTimes(3);
    expect(listar).toHaveBeenNthCalledWith(1, { desde: '2026-08-01', hasta: '2026-08-31', limite: 200, desplazamiento: 0 });
    expect(listar).toHaveBeenNthCalledWith(3, { desde: '2026-08-01', hasta: '2026-08-31', limite: 200, desplazamiento: 400 });
  });

  it('se corta ANTES de la segunda página si el libro supera el tope', async () => {
    const listar = vi.fn(async () => pagina(12000, 0, 200));
    await expect(todosLosAsientos(listar, {}, 10000)).rejects.toBeInstanceOf(LibroDemasiadoGrande);
    expect(listar).toHaveBeenCalledTimes(1);
  });

  it('no queda en bucle si el back devuelve una página vacía antes del total', async () => {
    const listar = vi.fn(async (f: { desplazamiento?: number }) =>
      f.desplazamiento === 0 ? pagina(300, 0, 200) : pagina(300, 200, 0),
    );
    const todos = await todosLosAsientos(listar, {});
    expect(todos).toHaveLength(200);
    expect(listar).toHaveBeenCalledTimes(2);
  });
});
