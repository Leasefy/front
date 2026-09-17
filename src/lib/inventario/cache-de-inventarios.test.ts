import { afterEach, describe, expect, it } from 'vitest';
import { guardarInventariosEnCache, leerInventariosDeCache } from '@/lib/inventario/cache-de-inventarios';
import type { InventariosDelInmueble } from '@/lib/types/inventario-del-inmueble';

const datos: InventariosDelInmueble = {
  disponible: true, consignacionId: 'cons-1', propertyId: 'p1',
  versiones: [], borrador: null, ultimoCompleto: null, vigencia: null,
};

describe('copia local de las versiones del inventario', () => {
  afterEach(() => window.localStorage.clear());

  it('lo guardado con señal se lee sin señal, por consignación', () => {
    guardarInventariosEnCache(datos);
    expect(leerInventariosDeCache('cons-1')).toEqual(datos);
    expect(leerInventariosDeCache('otra')).toBeNull();
  });

  it('una copia rota no tumba la ficha', () => {
    window.localStorage.setItem('leasefy:inventarios:cons-1', '{no es json');
    expect(leerInventariosDeCache('cons-1')).toBeNull();
  });
});
