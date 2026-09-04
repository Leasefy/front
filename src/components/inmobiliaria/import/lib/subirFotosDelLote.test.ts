import { describe, it, expect, vi } from 'vitest';
import { emparejarFilasConFotos, subirFotosDelLote } from './subirFotosDelLote';
import type { FilaDeImportacion } from '@/lib/api/inmuebles-importacion.service';
import type { ImportProperty } from './importTypes';

const inmueble = (i: number, imagenes?: string[]): ImportProperty =>
  ({ _rowIndex: i, selected: true, hasErrors: false, errorMessages: [], suggestions: [], imagenes }) as unknown as ImportProperty;

const fila = (n: number, propertyId: string | null): FilaDeImportacion =>
  ({ id: `f-${n}`, lote: 'L', fila: n, estado: 'ACTIVADO', faltantes: [], overrides: [], candidatos: [], propertyId, datos: {} }) as FilaDeImportacion;

const archivo = (nombre: string) => new File(['x'], `${nombre}.jpg`, { type: 'image/jpeg' });

/**
 * 2026-09-02: el lector traía las URLs, la pantalla las contaba («12 fotos»)
 * y nadie las subía. `fila` del back = posición en el array que recibió
 * `preparar()` (1-based) = `importables`.
 */
describe('emparejarFilasConFotos', () => {
  it('empareja por número de fila y sólo lo que tiene fotos y propertyId', () => {
    const importables = [inmueble(0, ['https://a/1.jpg', 'https://a/2.jpg']), inmueble(1), inmueble(2, ['https://c/1.jpg'])];
    const filas = [fila(1, 'p-1'), fila(2, 'p-2'), fila(3, null)];
    expect(emparejarFilasConFotos(filas, importables)).toEqual([
      { propertyId: 'p-1', imagenes: ['https://a/1.jpg', 'https://a/2.jpg'] },
    ]);
  });
});

describe('subirFotosDelLote', () => {
  it('baja cada foto por el proxy, sube al inmueble correcto y cuenta lo que falló sin frenar', async () => {
    const traer = vi.fn(async (url: string, nombre: string) => (url.includes('rota') ? null : archivo(nombre)));
    const subir = vi.fn(async (_id: string, files: File[]) => ({ uploaded: files.length, failed: [] }));
    const avance: Array<[number, number]> = [];
    const r = await subirFotosDelLote(
      [
        { propertyId: 'p-1', imagenes: ['https://a/1.jpg', 'https://a/rota.jpg'] },
        { propertyId: 'p-2', imagenes: ['https://b/1.jpg'] },
      ],
      { traer, subir, alAvanzar: (h, t) => avance.push([h, t]) },
    );
    expect(r).toEqual({ inmuebles: 2, subidas: 2, fallidas: 1 });
    expect(subir).toHaveBeenCalledTimes(2);
    expect(subir.mock.calls[0][0]).toBe('p-1');
    expect(subir.mock.calls[0][1].map((f: File) => f.name)).toEqual(['foto-1.jpg']);
    expect(subir.mock.calls[1][0]).toBe('p-2');
    expect(avance).toEqual([[1, 2], [2, 2]]);
  });

  it('no repite un inmueble ya subido en una tanda anterior, y un subir que revienta cuenta como fallidas', async () => {
    const ya = new Set(['p-1']);
    const traer = vi.fn(async (_u: string, n: string) => archivo(n));
    const subir = vi.fn(async () => { throw new Error('500'); });
    const r = await subirFotosDelLote(
      [{ propertyId: 'p-1', imagenes: ['https://a/1.jpg'] }, { propertyId: 'p-2', imagenes: ['https://b/1.jpg'] }],
      { traer, subir },
      ya,
    );
    expect(r).toEqual({ inmuebles: 1, subidas: 0, fallidas: 1 });
    expect(traer).toHaveBeenCalledTimes(1);
    expect(ya.has('p-2')).toBe(true);
  });
});
