import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  almacenEnMemoria,
  aQuienesSacar,
  borrarCopia,
  copiaDeConsignacion,
  anotarRuta,
  guardarCopia,
  leerCopia,
  leerCopiaPorContrato,
  listarCopias,
  usarAlmacenDeCopias,
  MAXIMO_DE_COPIAS,
  type CopiaDeInmueble,
} from './copia-de-inmueble';
import {
  almacenEnMemoria as almacenDeBorradoresEnMemoria,
  usarAlmacen as usarAlmacenDeBorradores,
} from './borrador-de-inventario';
import type { Consignacion } from '@/lib/types/inmobiliaria';

function consignacion(id: string, extra: Partial<Consignacion> = {}): Consignacion {
  return {
    id,
    propertyId: `prop-${id}`,
    propietarioId: 'own-1',
    copropietarios: [{ propietarioId: 'own-1', participacionBps: 10000 }],
    agenteId: 'agent-1',
    propertyTitle: `Apto ${id}`,
    propertyAddress: `Cra 1 # 2-${id}`,
    propertyCity: 'Medellín',
    propertyZone: 'El Poblado',
    propertyType: 'apartment',
    monthlyRent: 2_000_000,
    commissionPercent: 10,
    listingType: 'rent',
    saleCommissionPercent: null,
    propertyCode: null,
    contractDate: '2026-01-01',
    status: 'active',
    availability: 'available',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    inventoryItems: [{ id: 'it-1', name: 'Nevera', quantity: 1, condition: 'good' }],
    ...extra,
  } as Consignacion;
}

function copia(id: string, guardadoEn: number): CopiaDeInmueble {
  return {
    consignacionId: id,
    titulo: `Apto ${id}`,
    direccion: 'Cra 1',
    contrato: null,
    consignacion: consignacion(id),
    guardadoEn,
  };
}

describe('la copia del inmueble para trabajar sin señal', () => {
  beforeEach(() => {
    usarAlmacenDeCopias(almacenEnMemoria());
    usarAlmacenDeBorradores(almacenDeBorradoresEnMemoria());
  });
  afterEach(() => {
    usarAlmacenDeCopias(null);
    usarAlmacenDeBorradores(null);
  });

  it('guarda lo que la pantalla necesita: título, dirección e inventario', async () => {
    await guardarCopia(consignacion('c-1'), 1_700_000_000_000);

    const leida = await leerCopia('c-1');
    expect(leida?.titulo).toBe('Apto c-1');
    expect(leida?.direccion).toBe('Cra 1 # 2-c-1');
    expect(leida?.consignacion.inventoryItems).toHaveLength(1);
    expect(leida?.guardadoEn).toBe(1_700_000_000_000);
  });

  it('trae el contrato vigente con su inquilino cuando lo hay', () => {
    const conContrato = copiaDeConsignacion(
      consignacion('c-2', {
        inquilino: {
          contractId: 'lease-9',
          nombre: 'Marcela Ruiz',
          documento: null,
          correo: null,
          telefono: null,
          cuentaDePortalId: null,
        },
      }),
    );
    expect(conContrato.contrato).toEqual({ contratoId: 'lease-9', inquilino: 'Marcela Ruiz' });
  });

  it('un inmueble disponible no inventa un contrato', () => {
    expect(copiaDeConsignacion(consignacion('c-3')).contrato).toBeNull();
  });

  it('no inventa un nombre cuando el contrato viejo no trae inquilino', () => {
    const migrado = copiaDeConsignacion(consignacion('c-4', { currentLeaseId: 'lease-viejo' }));
    expect(migrado.contrato).toEqual({ contratoId: 'lease-viejo', inquilino: '' });
  });

  it('refrescar la copia pisa la anterior, no deja dos', async () => {
    await guardarCopia(consignacion('c-1', { propertyTitle: 'Viejo' }), 1_000);
    await guardarCopia(consignacion('c-1', { propertyTitle: 'Nuevo' }), 2_000);

    const todas = await listarCopias();
    expect(todas).toHaveLength(1);
    expect(todas[0].titulo).toBe('Nuevo');
    expect(todas[0].guardadoEn).toBe(2_000);
  });

  it('«Disponibles sin señal» va de lo más reciente a lo más viejo', async () => {
    await guardarCopia(consignacion('c-1'), 1_000);
    await guardarCopia(consignacion('c-2'), 3_000);
    await guardarCopia(consignacion('c-3'), 2_000);

    expect((await listarCopias()).map((c) => c.consignacionId)).toEqual(['c-2', 'c-3', 'c-1']);
  });

  it('quitar un inmueble de la lista lo saca de verdad', async () => {
    await guardarCopia(consignacion('c-1'), 1_000);
    await borrarCopia('c-1');
    expect(await leerCopia('c-1')).toBeNull();
  });

  it('pasado el tope se guardan las últimas y sale la más vieja', async () => {
    for (let i = 0; i < MAXIMO_DE_COPIAS; i += 1) {
      await guardarCopia(consignacion(`c-${i}`), 1_000 + i);
    }
    await guardarCopia(consignacion('c-nueva'), 9_999);

    const ids = (await listarCopias()).map((c) => c.consignacionId);
    expect(ids).toHaveLength(MAXIMO_DE_COPIAS);
    expect(ids).toContain('c-nueva');
    expect(ids).not.toContain('c-0');
  });

  it('un inmueble con inventario sin subir NO pierde su copia aunque sea la más vieja', async () => {
    const borradores = almacenDeBorradoresEnMemoria();
    usarAlmacenDeBorradores(borradores);
    await borradores.guardar({
      consignacionId: 'c-0',
      items: [],
      fotos: {},
      actualizadoEn: 1,
    });

    for (let i = 0; i < MAXIMO_DE_COPIAS; i += 1) {
      await guardarCopia(consignacion(`c-${i}`), 1_000 + i);
    }
    await guardarCopia(consignacion('c-nueva'), 9_999);

    const ids = (await listarCopias()).map((c) => c.consignacionId);
    expect(ids).toContain('c-0');
    expect(ids).not.toContain('c-1');
  });
});

describe('a quiénes sacar', () => {
  it('no saca a nadie mientras quepan', () => {
    expect(aQuienesSacar([copia('a', 1), copia('b', 2)], [], 3)).toEqual([]);
  });

  it('saca las más viejas, tantas como sobren', () => {
    const copias = [copia('a', 3), copia('b', 1), copia('c', 2), copia('d', 4)];
    expect(aQuienesSacar(copias, [], 2)).toEqual(['b', 'c']);
  });

  it('si las que quedan están todas protegidas, no saca a nadie', () => {
    const copias = [copia('a', 1), copia('b', 2), copia('c', 3)];
    expect(aQuienesSacar(copias, ['a', 'b', 'c'], 1)).toEqual([]);
  });
});

/*
 * 🔴 Nico, 2026-09-13: «desde el contrato también debería de agregar todo lo
 * que se pueda agregar del inventario». La copia de DATOS es una sola —el
 * inventario es del inmueble— pero el service worker guarda PÁGINAS, y la
 * ficha del contrato es otra página. Eso es lo que anota `rutas`, y es lo que
 * la lista «Disponibles sin señal» promete.
 */
describe('desde qué páginas se abre una copia', () => {
  beforeEach(() => {
    usarAlmacenDeCopias(almacenEnMemoria());
    usarAlmacenDeBorradores(almacenDeBorradoresEnMemoria());
  });
  afterEach(() => {
    usarAlmacenDeCopias(null);
    usarAlmacenDeBorradores(null);
  });

  it('una copia recién guardada no promete ninguna página', async () => {
    const guardada = await guardarCopia(consignacion('c-1'), 1_000);
    expect(guardada.rutas).toEqual([]);
  });

  it('anotar una página la deja en la copia, y anotarla dos veces no la duplica', async () => {
    await guardarCopia(consignacion('c-1'), 1_000);
    await anotarRuta('c-1', '/panel/inmobiliaria/contratos/lease-9');
    await anotarRuta('c-1', '/panel/inmobiliaria/contratos/lease-9');

    expect((await leerCopia('c-1'))?.rutas).toEqual(['/panel/inmobiliaria/contratos/lease-9']);
  });

  it('el refresco de datos NO borra las páginas ya preparadas', async () => {
    await guardarCopia(consignacion('c-1'), 1_000);
    await anotarRuta('c-1', '/panel/inmobiliaria/contratos/lease-9');

    // La ficha vuelve a abrir con señal y la copia se refresca sola.
    await guardarCopia(consignacion('c-1', { propertyTitle: 'Apto renombrado' }), 2_000);

    const copia = await leerCopia('c-1');
    expect(copia?.titulo).toBe('Apto renombrado');
    expect(copia?.rutas).toEqual(['/panel/inmobiliaria/contratos/lease-9']);
  });

  it('sin copia guardada no se anota nada: la página sola no alcanza', async () => {
    expect(await anotarRuta('c-fantasma', '/panel/inmobiliaria/contratos/lease-9')).toBeNull();
  });

  it('la ficha del contrato encuentra su copia por el contrato vigente', async () => {
    await guardarCopia(
      consignacion('c-1', { currentLeaseId: 'lease-9', currentTenantName: 'Marcela' }),
      1_000,
    );

    expect((await leerCopiaPorContrato('lease-9'))?.consignacionId).toBe('c-1');
    expect(await leerCopiaPorContrato('lease-otro')).toBeNull();
  });

  it('…y también por la página preparada, que es el caso del contrato en borrador', async () => {
    await guardarCopia(consignacion('c-2'), 1_000);
    await anotarRuta('c-2', '/panel/inmobiliaria/contratos/lease-borrador');

    expect((await leerCopiaPorContrato('lease-borrador'))?.consignacionId).toBe('c-2');
  });
});
