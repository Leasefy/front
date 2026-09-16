/**
 * El borrador del asistente de publicación (W4).
 *
 * Lo que se protege acá es lo que vuelve peligroso a un borrador: ofrecer
 * basura, repetir fotos y revivir un propietario que ya no existe.
 */

import { describe, it, expect } from 'vitest';
import {
  almacenEnMemoria,
  conPropietariosVivos,
  estaVencido,
  hayAlgoQueGuardar,
  llaveDelBorrador,
  sinRepetidas,
  DIAS_DE_VIDA,
  VERSION_DEL_FORMATO,
  type BorradorDePublicacion,
  type DatosDelBorrador,
} from './borrador-de-publicacion';

const UN_DIA = 24 * 60 * 60 * 1000;
const AHORA = 1_700_000_000_000;

function foto(nombre: string, tamano = 3, fecha = 1): File {
  return new File([new Uint8Array(tamano)], nombre, {
    type: 'image/jpeg',
    lastModified: fecha,
  });
}

function borrador(parcial: Partial<BorradorDePublicacion> = {}): BorradorDePublicacion {
  return {
    llave: 'ag-1:us-1',
    datos: { propertyTitle: 'Apartamento en Laureles' },
    fotos: [],
    paso: 2,
    actualizadoEn: AHORA,
    version: VERSION_DEL_FORMATO,
    ...parcial,
  };
}

describe('la llave del borrador', () => {
  /**
   * El computador del mostrador lo usan varias personas. Si la llave fuera
   * sólo la agencia, quien entra después vería el inmueble a medio cargar del
   * turno anterior y lo publicaría creyendo que es el suyo.
   */
  it('separa por agencia y por usuario', () => {
    expect(llaveDelBorrador('ag-1', 'us-1')).toBe('ag-1:us-1');
    expect(llaveDelBorrador('ag-1', 'us-2')).not.toBe(llaveDelBorrador('ag-1', 'us-1'));
    expect(llaveDelBorrador('ag-2', 'us-1')).not.toBe(llaveDelBorrador('ag-1', 'us-1'));
  });

  it('sin sesión no colisiona con una llave real', () => {
    expect(llaveDelBorrador(null, null)).toBe('sin-agencia:sin-usuario');
  });
});

describe('el almacén', () => {
  it('devuelve lo mismo que se guardó, fotos incluidas', async () => {
    const almacen = almacenEnMemoria();
    const f = foto('sala.jpg');
    await almacen.guardar(borrador({ fotos: [f] }));

    const leido = await almacen.leer('ag-1:us-1');
    expect(leido?.datos.propertyTitle).toBe('Apartamento en Laureles');
    expect(leido?.fotos[0]).toBe(f);
    expect(leido?.paso).toBe(2);
  });

  it('sin borrador devuelve null, no revienta', async () => {
    expect(await almacenEnMemoria().leer('nadie')).toBeNull();
  });

  it('borrar deja la llave vacía', async () => {
    const almacen = almacenEnMemoria([borrador()]);
    await almacen.borrar('ag-1:us-1');
    expect(await almacen.leer('ag-1:us-1')).toBeNull();
  });
});

describe('qué merece guardarse', () => {
  /**
   * El asistente arranca con tipo, comisión, término y fechas de hoy ya
   * puestos. Guardar eso le pondría el aviso «tienes un borrador» a quien
   * apenas entró y se fue, y el aviso que sale siempre deja de leerse.
   */
  it('los valores por defecto no son un borrador', () => {
    const defaults: DatosDelBorrador = {
      propertyType: 'apartment',
      commissionPercent: 10,
      minimumTerm: 12,
      listingType: 'rent',
      inventoryItems: [],
      inventoryNotes: '',
      contractStartDate: '2026-09-15',
      consignedAt: '2026-09-15',
    };
    expect(hayAlgoQueGuardar(defaults, [])).toBe(false);
  });

  it('una sola foto ya es trabajo', () => {
    expect(hayAlgoQueGuardar({}, [foto('sala.jpg')])).toBe(true);
  });

  it.each([
    ['el título', { propertyTitle: 'Casa en Envigado' }],
    ['la dirección', { propertyAddress: 'Cra 43 # 30-20' }],
    ['el propietario', { propietarioId: 'prop-1' }],
    ['el canon', { monthlyRent: 1_800_000 }],
    ['un ítem del inventario', { inventoryItems: [{ id: 'i1', name: 'Nevera', quantity: 1, condition: 'good' as const }] }],
  ])('%s sí es trabajo', (_caso, datos) => {
    expect(hayAlgoQueGuardar(datos as DatosDelBorrador, [])).toBe(true);
  });

  it('un título de puros espacios no cuenta', () => {
    expect(hayAlgoQueGuardar({ propertyTitle: '   ' }, [])).toBe(false);
  });
});

describe('cuándo se deja de ofrecer', () => {
  it('recién guardado se ofrece', () => {
    expect(estaVencido(borrador(), AHORA + 60_000)).toBe(false);
  });

  it('un mes después ya no', () => {
    expect(estaVencido(borrador(), AHORA + (DIAS_DE_VIDA + 1) * UN_DIA)).toBe(true);
  });

  /**
   * Un borrador escrito por una versión anterior del asistente puede tener
   * campos que ya no existen. Adivinar cómo migrarlo es peor que descartarlo.
   */
  it('un formato viejo se descarta', () => {
    expect(estaVencido(borrador({ version: VERSION_DEL_FORMATO - 1 }), AHORA)).toBe(true);
  });
});

describe('las fotos no se repiten', () => {
  it('la misma foto dos veces queda una', () => {
    const f = foto('sala.jpg');
    expect(sinRepetidas([f, f])).toHaveLength(1);
  });

  it('el mismo nombre con otro tamaño son dos fotos distintas', () => {
    expect(sinRepetidas([foto('sala.jpg', 3), foto('sala.jpg', 9)])).toHaveLength(2);
  });

  it('conserva el orden en que se eligieron', () => {
    const unicas = sinRepetidas([foto('a.jpg'), foto('b.jpg'), foto('a.jpg')]);
    expect(unicas.map((f) => f.name)).toEqual(['a.jpg', 'b.jpg']);
  });
});

describe('el propietario del borrador', () => {
  const vivos = [{ id: 'prop-1' }, { id: 'prop-2' }];

  it('si sigue existiendo no se toca nada', () => {
    const datos: DatosDelBorrador = { propietarioId: 'prop-1', propertyTitle: 'Casa' };
    const r = conPropietariosVivos(datos, vivos);
    expect(r.sePerdioElPropietario).toBe(false);
    expect(r.datos).toBe(datos);
  });

  /**
   * La lista vacía es «todavía está cargando», no «no hay ninguno». Borrar el
   * dueño ahí sería el peor error posible: se perdería aun cuando existe.
   */
  it('con la lista todavía vacía no se asume nada', () => {
    const datos: DatosDelBorrador = { propietarioId: 'prop-1' };
    expect(conPropietariosVivos(datos, []).sePerdioElPropietario).toBe(false);
  });

  it('si lo borraron, se quita el dueño y se avisa', () => {
    const datos: DatosDelBorrador = {
      propietarioId: 'prop-borrado',
      newPropietarioData: { name: 'Ana' } as unknown as DatosDelBorrador['newPropietarioData'],
      propertyTitle: 'Casa',
    };
    const r = conPropietariosVivos(datos, vivos);
    expect(r.sePerdioElPropietario).toBe(true);
    expect(r.datos.propietarioId).toBeUndefined();
    expect(r.datos.newPropietarioData).toBeUndefined();
    // Lo demás se conserva: se pierde el dueño, no las cinco pantallas.
    expect(r.datos.propertyTitle).toBe('Casa');
  });

  /**
   * Un propietario a medio crear (`new-…`) todavía no está en la lista y no
   * tiene por qué estar: el paso 1 lo manda al back al pasar al 2.
   */
  it('un dueño a medio crear no se considera perdido', () => {
    const datos: DatosDelBorrador = { propietarioId: 'new-1757900000000' };
    expect(conPropietariosVivos(datos, vivos).sePerdioElPropietario).toBe(false);
  });

  it('un copropietario borrado también manda al paso 1', () => {
    const datos: DatosDelBorrador = {
      propietarioId: 'prop-1',
      copropietarios: [
        { propietarioId: 'prop-1', participacionBps: 5000 },
        { propietarioId: 'prop-fantasma', participacionBps: 5000 },
      ],
    } as DatosDelBorrador;
    const r = conPropietariosVivos(datos, vivos);
    expect(r.sePerdioElPropietario).toBe(true);
    expect(r.datos.copropietarios).toBeUndefined();
  });
});
