import { describe, it, expect, beforeEach } from 'vitest';
import {
  almacenEnMemoria,
  tienePendientes,
  type BorradorDeInventario,
} from './borrador-de-inventario';
import type { InventoryItem } from '@/lib/types/inmobiliaria';

const nevera: InventoryItem = {
  id: 'it-1',
  name: 'Nevera',
  quantity: 1,
  condition: 'good',
};
const cortinas: InventoryItem = {
  id: 'it-2',
  name: 'Cortinas',
  quantity: 4,
  condition: 'fair',
};

function borrador(
  consignacionId: string,
  items: InventoryItem[],
  fotos: Record<string, Blob> = {},
): BorradorDeInventario {
  return { consignacionId, items, fotos, actualizadoEn: 1_700_000_000_000 };
}

describe('el borrador del inventario', () => {
  let almacen: ReturnType<typeof almacenEnMemoria>;
  beforeEach(() => {
    almacen = almacenEnMemoria();
  });

  it('lo que se guarda es lo que se recupera, fotos incluidas', async () => {
    const foto = new Blob(['fingida'], { type: 'image/jpeg' });
    await almacen.guardar(borrador('cons-1', [nevera], { 'it-1': foto }));

    const leido = await almacen.leer('cons-1');
    expect(leido?.items).toEqual([nevera]);
    expect(leido?.fotos['it-1']).toBe(foto);
    expect(leido?.actualizadoEn).toBe(1_700_000_000_000);
  });

  it('sin borrador devuelve null, no revienta', async () => {
    expect(await almacen.leer('cons-nunca-vista')).toBeNull();
  });

  /**
   * Quien recorre un edificio entra a varios apartamentos seguidos. Si los
   * borradores se mezclaran, la nevera del 301 aparecería en el acta del 302.
   */
  it('dos inmuebles no se mezclan', async () => {
    await almacen.guardar(borrador('cons-1', [nevera]));
    await almacen.guardar(borrador('cons-2', [cortinas]));

    expect((await almacen.leer('cons-1'))?.items).toEqual([nevera]);
    expect((await almacen.leer('cons-2'))?.items).toEqual([cortinas]);
    expect(await almacen.listar()).toHaveLength(2);
  });

  it('guardar dos veces el mismo inmueble reemplaza, no acumula', async () => {
    await almacen.guardar(borrador('cons-1', [nevera]));
    await almacen.guardar(borrador('cons-1', [nevera, cortinas]));

    expect((await almacen.leer('cons-1'))?.items).toHaveLength(2);
    expect(await almacen.listar()).toHaveLength(1);
  });

  it('borrar deja el inmueble sin borrador y no toca al vecino', async () => {
    await almacen.guardar(borrador('cons-1', [nevera]));
    await almacen.guardar(borrador('cons-2', [cortinas]));

    await almacen.borrar('cons-1');

    expect(await almacen.leer('cons-1')).toBeNull();
    expect((await almacen.leer('cons-2'))?.items).toEqual([cortinas]);
  });

  it('borrar algo que no está no es un error', async () => {
    await expect(almacen.borrar('cons-nunca-vista')).resolves.toBeUndefined();
  });
});

describe('tienePendientes', () => {
  it('una foto sin subir es un pendiente aunque la lista no haya cambiado', () => {
    const foto = new Blob(['x'], { type: 'image/jpeg' });
    expect(tienePendientes(borrador('c', [nevera], { 'it-1': foto }), [nevera])).toBe(true);
  });

  it('un ítem que el back no tiene es un pendiente', () => {
    expect(tienePendientes(borrador('c', [nevera, cortinas]), [nevera])).toBe(true);
  });

  it('un ítem editado es un pendiente', () => {
    expect(
      tienePendientes(borrador('c', [{ ...nevera, condition: 'poor' }]), [nevera]),
    ).toBe(true);
  });

  /**
   * Un borrador idéntico a lo que el back ya tiene es basura de una subida
   * anterior. Ofrecerlo diría «tenés trabajo sin subir» sobre trabajo que sí
   * se subió: asusta sin motivo.
   */
  it('un borrador igual a lo que ya está en el back NO es un pendiente', () => {
    expect(tienePendientes(borrador('c', [nevera, cortinas]), [nevera, cortinas])).toBe(
      false,
    );
  });

  it('un borrador vacío sobre un inmueble sin inventario tampoco', () => {
    expect(tienePendientes(borrador('c', []), undefined)).toBe(false);
  });
});
