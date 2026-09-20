/**
 * El borrador del asistente de publicación, visto desde el hook (W4).
 *
 * Las tres reglas que se protegen acá son las que separan «un borrador que
 * ayuda» de «un borrador que hace daño»:
 *  1. nunca se aplica solo;
 *  2. mientras se está preguntando qué hacer con él, no se pisa;
 *  3. cuando el inmueble ya existe en el back, el borrador desaparece y no
 *     revive por un guardado que venía en camino.
 */

import * as React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import {
  almacenEnMemoria,
  usarAlmacen,
  VERSION_DEL_FORMATO,
  type AlmacenDeBorradores,
  type BorradorDePublicacion,
  type DatosDelBorrador,
} from '@/lib/inmuebles/borrador-de-publicacion';
import {
  useBorradorDePublicacion,
  ESPERA_MS,
  type EstadoDelBorradorDePublicacion,
} from './use-borrador-de-publicacion';

void React;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const LLAVE = 'ag-1:us-1';

function guardado(parcial: Partial<BorradorDePublicacion> = {}): BorradorDePublicacion {
  return {
    llave: LLAVE,
    datos: { propertyTitle: 'Apartamento en Laureles' },
    fotos: [],
    paso: 3,
    actualizadoEn: Date.now() - 60_000,
    version: VERSION_DEL_FORMATO,
    ...parcial,
  };
}

interface Sonda {
  estado: () => EstadoDelBorradorDePublicacion;
  escribir: (datos: DatosDelBorrador, fotos?: File[]) => Promise<void>;
  desmontar: () => void;
}

/** Monta el hook y deja cambiarle el formulario, como hace el asistente. */
async function montar(inicial: DatosDelBorrador = {}): Promise<Sonda> {
  const contenedor = document.createElement('div');
  document.body.appendChild(contenedor);
  const root: Root = createRoot(contenedor);
  let ultimo: EstadoDelBorradorDePublicacion | undefined;
  let empujar: ((d: { datos: DatosDelBorrador; fotos: File[] }) => void) | undefined;

  function Prueba() {
    const [form, setForm] = React.useState({ datos: inicial, fotos: [] as File[] });
    empujar = setForm;
    ultimo = useBorradorDePublicacion({
      agencyId: 'ag-1',
      userId: 'us-1',
      datos: form.datos,
      fotos: form.fotos,
      paso: 2,
      activo: true,
    });
    return null;
  }

  await act(async () => {
    root.render(<Prueba />);
  });
  await act(async () => {
    await Promise.resolve();
  });

  return {
    estado: () => ultimo as EstadoDelBorradorDePublicacion,
    escribir: async (datos, fotos = []) => {
      await act(async () => {
        empujar?.({ datos, fotos });
      });
    },
    desmontar: () => {
      act(() => root.unmount());
      contenedor.remove();
    },
  };
}

/** Deja pasar el reloj del autoguardado y sus promesas. */
async function pasarElTiempo() {
  await act(async () => {
    vi.advanceTimersByTime(ESPERA_MS + 10);
  });
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('el borrador del asistente de publicación', () => {
  let almacen: AlmacenDeBorradores;
  let sonda: Sonda | null = null;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    almacen = almacenEnMemoria();
    usarAlmacen(almacen);
  });

  afterEach(() => {
    sonda?.desmontar();
    sonda = null;
    usarAlmacen(null);
    vi.useRealTimers();
  });

  it('sin nada guardado no ofrece nada', async () => {
    sonda = await montar();
    expect(sonda.estado().encontrado).toBeNull();
    expect(sonda.estado().decisionPendiente).toBe(false);
  });

  /**
   * Lo más importante del pedido: que el asistente NO aparezca lleno. Se
   * ofrece y se espera; aplicarlo es un gesto de la persona.
   */
  it('lo que había se ofrece, no se aplica', async () => {
    await almacen.guardar(guardado());
    sonda = await montar();

    expect(sonda.estado().decisionPendiente).toBe(true);
    expect(sonda.estado().encontrado?.datos.propertyTitle).toBe('Apartamento en Laureles');
    expect(sonda.estado().encontrado?.paso).toBe(3);
  });

  it('aceptarlo lo entrega una sola vez y deja de ofrecerlo', async () => {
    await almacen.guardar(guardado());
    sonda = await montar();

    let entregado: BorradorDePublicacion | null = null;
    act(() => {
      entregado = sonda!.estado().aceptar();
    });
    expect(entregado).not.toBeNull();
    expect(sonda.estado().decisionPendiente).toBe(false);
    expect(sonda.estado().encontrado).toBeNull();
  });

  /**
   * Con el aviso en pantalla, el primer campo que alguien toque NO puede pisar
   * el borrador que todavía no decidió si quiere. Si lo pisara, elegir
   * «continuar» devolvería datos a medias.
   */
  it('mientras se pregunta, escribir no pisa lo guardado', async () => {
    await almacen.guardar(guardado());
    sonda = await montar();

    await sonda.escribir({ propertyTitle: 'Otro inmueble distinto' });
    await pasarElTiempo();

    expect((await almacen.leer(LLAVE))?.datos.propertyTitle).toBe('Apartamento en Laureles');
  });

  it('descartarlo lo borra del navegador', async () => {
    await almacen.guardar(guardado());
    sonda = await montar();

    await act(async () => {
      await sonda!.estado().descartar();
    });

    expect(await almacen.leer(LLAVE)).toBeNull();
    expect(sonda.estado().decisionPendiente).toBe(false);
  });

  it('lo que se escribe se guarda solo', async () => {
    sonda = await montar();
    await sonda.escribir({ propertyTitle: 'Casa en Envigado' });
    await pasarElTiempo();

    const leido = await almacen.leer(LLAVE);
    expect(leido?.datos.propertyTitle).toBe('Casa en Envigado');
    expect(leido?.version).toBe(VERSION_DEL_FORMATO);
    expect(sonda.estado().guardadoEn).not.toBeNull();
  });

  it('un formulario que sólo tiene los valores por defecto no se guarda', async () => {
    sonda = await montar();
    await sonda.escribir({ propertyType: 'apartment', commissionPercent: 10 });
    await pasarElTiempo();

    expect(await almacen.leer(LLAVE)).toBeNull();
  });

  /**
   * El caso que hace duplicar inmuebles: el back ya tiene el inmueble, se
   * borra el borrador, y un guardado que venía en camino lo vuelve a escribir.
   * La próxima visita ofrecería cargar de nuevo lo que ya existe.
   */
  it('limpiar mata también el guardado que venía en camino', async () => {
    sonda = await montar();
    await sonda.escribir({ propertyTitle: 'Casa en Envigado' });
    await pasarElTiempo();
    expect(await almacen.leer(LLAVE)).not.toBeNull();

    // Se escribe una vez más (deja un temporizador en vuelo) y se limpia antes
    // de que dispare, igual que cuando `POST /properties` devuelve.
    await sonda.escribir({ propertyTitle: 'Casa en Envigado 2' });
    await act(async () => {
      await sonda!.estado().limpiar();
    });
    await pasarElTiempo();

    expect(await almacen.leer(LLAVE)).toBeNull();
    expect(sonda.estado().guardadoEn).toBeNull();
  });

  /**
   * Un borrador de hace medio año casi seguro habla de un inmueble que ya se
   * cargó por otro lado. No se ofrece y se borra en el camino.
   */
  it('un borrador vencido no se ofrece y se tira', async () => {
    const hace40Dias = Date.now() - 40 * 24 * 60 * 60 * 1000;
    await almacen.guardar(guardado({ actualizadoEn: hace40Dias }));
    sonda = await montar();

    expect(sonda.estado().decisionPendiente).toBe(false);
    expect(await almacen.leer(LLAVE)).toBeNull();
  });

  it('un borrador de otro formato tampoco se ofrece', async () => {
    await almacen.guardar(guardado({ version: VERSION_DEL_FORMATO - 1 }));
    sonda = await montar();

    expect(sonda.estado().decisionPendiente).toBe(false);
    expect(await almacen.leer(LLAVE)).toBeNull();
  });

  it('las fotos repetidas se guardan una sola vez', async () => {
    sonda = await montar();
    const f = new File([new Uint8Array(3)], 'sala.jpg', { type: 'image/jpeg', lastModified: 1 });
    await sonda.escribir({ propertyTitle: 'Casa' }, [f, f]);
    await pasarElTiempo();

    expect((await almacen.leer(LLAVE))?.fotos).toHaveLength(1);
  });
});
