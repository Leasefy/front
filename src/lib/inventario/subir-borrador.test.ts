import { describe, it, expect, vi } from 'vitest';
import { subirBorrador } from './subir-borrador';
import { almacenEnMemoria, type BorradorDeInventario } from './borrador-de-inventario';
import type { InventoryItem } from '@/lib/types/inmobiliaria';

const nevera: InventoryItem = { id: 'it-1', name: 'Nevera', quantity: 1, condition: 'good' };
const horno: InventoryItem = { id: 'it-2', name: 'Horno', quantity: 1, condition: 'fair' };

/**
 * El almacén real es asíncrono, como IndexedDB. Estas pruebas necesitan leer
 * el borrador ENTRE dos intentos de subida sin `await`, así que se le pega un
 * atajo sincrónico encima del mismo almacén que usa la pantalla.
 */
function almacenConAtajo(inicial: BorradorDeInventario) {
  const base = almacenEnMemoria([inicial]);
  const filas = new Map<string, BorradorDeInventario>([
    [inicial.consignacionId, inicial],
  ]);
  return {
    ...base,
    guardar: (b: BorradorDeInventario) => {
      filas.set(b.consignacionId, b);
      return base.guardar(b);
    },
    borrar: (id: string) => {
      filas.delete(id);
      return base.borrar(id);
    },
    leerSync: (id: string) => filas.get(id)!,
    existe: (id: string) => filas.has(id),
  };
}

const foto = () => new Blob(['jpg'], { type: 'image/jpeg' });

describe('subirBorrador', () => {
  it('sube cada foto, la anota en su ítem y manda la lista una sola vez', async () => {
    const almacen = almacenConAtajo({
      consignacionId: 'cons-1',
      items: [nevera, horno],
      fotos: { 'it-1': foto(), 'it-2': foto() },
      actualizadoEn: 1,
    });
    const subirFoto = vi.fn((_c: string, itemId: string) =>
      Promise.resolve(`https://s/${itemId}`),
    );
    const guardarInventario = vi.fn((_id: string, _items: InventoryItem[]) => Promise.resolve());

    const r = await subirBorrador({
      borrador: almacen.leerSync('cons-1'),
      subirFoto,
      guardarInventario,
      guardarBorrador: almacen.guardar,
      borrarBorrador: almacen.borrar,
    });

    expect(subirFoto).toHaveBeenCalledTimes(2);
    expect(guardarInventario).toHaveBeenCalledTimes(1);
    expect(guardarInventario.mock.calls[0][1]).toEqual([
      { ...nevera, photoUrl: 'https://s/it-1' },
      { ...horno, photoUrl: 'https://s/it-2' },
    ]);
    expect(r.fotosSubidas).toBe(2);
    // El borrador se borra sólo con todo confirmado.
    expect(almacen.existe('cons-1')).toBe(false);
  });

  /**
   * El caso que da sentido a todo esto: la señal se corta con la segunda foto
   * a medio subir. Al reintentar, la primera NO se vuelve a subir.
   */
  it('si se corta a mitad, el reintento sube sólo lo que faltaba', async () => {
    const almacen = almacenConAtajo({
      consignacionId: 'cons-1',
      items: [nevera, horno],
      fotos: { 'it-1': foto(), 'it-2': foto() },
      actualizadoEn: 1,
    });
    const subidas: string[] = [];
    let fallar = true;
    const subirFoto = vi.fn((_c: string, itemId: string) => {
      if (itemId === 'it-2' && fallar) return Promise.reject(new Error('sin señal'));
      subidas.push(itemId);
      return Promise.resolve(`https://s/${itemId}`);
    });
    const guardarInventario = vi.fn((_id: string, _items: InventoryItem[]) => Promise.resolve());

    await expect(
      subirBorrador({
        borrador: almacen.leerSync('cons-1'),
        subirFoto,
        guardarInventario,
        guardarBorrador: almacen.guardar,
        borrarBorrador: almacen.borrar,
      }),
    ).rejects.toThrow('sin señal');

    // Nada se dio por subido: ni la lista ni el borrador se tocaron.
    expect(guardarInventario).not.toHaveBeenCalled();
    expect(almacen.existe('cons-1')).toBe(true);
    // Pero la foto que SÍ subió ya salió de pendientes y quedó anotada.
    const aMitad = almacen.leerSync('cons-1');
    expect(Object.keys(aMitad.fotos)).toEqual(['it-2']);
    expect(aMitad.items[0].photoUrl).toBe('https://s/it-1');

    fallar = false;
    const r = await subirBorrador({
      borrador: almacen.leerSync('cons-1'),
      subirFoto,
      guardarInventario,
      guardarBorrador: almacen.guardar,
      borrarBorrador: almacen.borrar,
    });

    expect(subidas).toEqual(['it-1', 'it-2']); // it-1 una sola vez, no dos
    expect(r.fotosSubidas).toBe(1);
    expect(guardarInventario.mock.calls[0][1]).toEqual([
      { ...nevera, photoUrl: 'https://s/it-1' },
      { ...horno, photoUrl: 'https://s/it-2' },
    ]);
    expect(almacen.existe('cons-1')).toBe(false);
  });

  it('si el PUT de la lista falla, el borrador SIGUE ahí', async () => {
    const almacen = almacenConAtajo({
      consignacionId: 'cons-1',
      items: [nevera],
      fotos: {},
      actualizadoEn: 1,
    });

    await expect(
      subirBorrador({
        borrador: almacen.leerSync('cons-1'),
        subirFoto: vi.fn(),
        guardarInventario: () => Promise.reject(new Error('502')),
        guardarBorrador: almacen.guardar,
        borrarBorrador: almacen.borrar,
      }),
    ).rejects.toThrow('502');

    expect(almacen.existe('cons-1')).toBe(true);
  });

  it('la foto de un ítem que se quitó después no se sube', async () => {
    const almacen = almacenConAtajo({
      consignacionId: 'cons-1',
      items: [nevera],
      fotos: { 'it-1': foto(), 'it-borrado': foto() },
      actualizadoEn: 1,
    });
    const subirFoto = vi.fn((_c: string, itemId: string) =>
      Promise.resolve(`https://s/${itemId}`),
    );

    const r = await subirBorrador({
      borrador: almacen.leerSync('cons-1'),
      subirFoto,
      guardarInventario: () => Promise.resolve(),
      guardarBorrador: almacen.guardar,
      borrarBorrador: almacen.borrar,
    });

    expect(subirFoto).toHaveBeenCalledTimes(1);
    expect(subirFoto.mock.calls[0][1]).toBe('it-1');
    expect(r.items).toEqual([{ ...nevera, photoUrl: 'https://s/it-1' }]);
  });

  it('un inventario sin fotos va directo al PUT', async () => {
    const almacen = almacenConAtajo({
      consignacionId: 'cons-1',
      items: [nevera, horno],
      fotos: {},
      actualizadoEn: 1,
    });
    const subirFoto = vi.fn();
    const guardarInventario = vi.fn((_id: string, _items: InventoryItem[]) => Promise.resolve());

    const r = await subirBorrador({
      borrador: almacen.leerSync('cons-1'),
      subirFoto,
      guardarInventario,
      guardarBorrador: almacen.guardar,
      borrarBorrador: almacen.borrar,
    });

    expect(subirFoto).not.toHaveBeenCalled();
    expect(guardarInventario.mock.calls[0][1]).toEqual([nevera, horno]);
    expect(r.fotosSubidas).toBe(0);
    expect(almacen.existe('cons-1')).toBe(false);
  });

  it('avisa el avance foto a foto, para que la barra no mienta', async () => {
    const almacen = almacenConAtajo({
      consignacionId: 'cons-1',
      items: [nevera, horno],
      fotos: { 'it-1': foto(), 'it-2': foto() },
      actualizadoEn: 1,
    });
    const avances: string[] = [];

    await subirBorrador({
      borrador: almacen.leerSync('cons-1'),
      subirFoto: (_c, itemId) => Promise.resolve(`https://s/${itemId}`),
      guardarInventario: () => Promise.resolve(),
      guardarBorrador: almacen.guardar,
      borrarBorrador: almacen.borrar,
      alAvanzar: (a) => avances.push(`${a.fotosSubidas}/${a.fotosTotales}`),
    });

    expect(avances).toEqual(['0/2', '1/2', '2/2']);
  });
});
