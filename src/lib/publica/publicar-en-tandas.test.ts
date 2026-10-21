import { describe, expect, it, vi } from 'vitest';

import { enParalelo, publicarEnTandas, type ManosDeLaPublicacion, type TrabajoDePublicacion } from './publicar-en-tandas';

const archivo = (n: string) => new File(['x'], n, { type: 'image/jpeg' });
const trabajo = (clave: string, fotos = 2, extra: Partial<TrabajoDePublicacion<{ t: string }>> = {}): TrabajoDePublicacion<{ t: string }> => ({
  clave,
  llave: `llave-${clave}`,
  datos: { t: clave },
  fotos: Array.from({ length: fotos }, (_, i) => ({ id: `${clave}-f${i}`, archivo: archivo(`${clave}-${i}.jpg`), subida: false })),
  ...extra,
});

function manos(over: Partial<ManosDeLaPublicacion<{ t: string }>> = {}) {
  const subidas: string[] = [];
  const m: ManosDeLaPublicacion<{ t: string }> = {
    crear: vi.fn(async (d: { t: string }) => ({ id: `id-${d.t}` })),
    subirFoto: vi.fn(async (_id: string, f: File) => {
      subidas.push(f.name);
    }),
    motivo: () => 'algo falló',
    ...over,
  };
  return { m, subidas };
}

describe('publicar muchos sin duplicar ni desordenar (20-10-2026)', () => {
  it('crea con la llave de cada tarjeta y sube sus fotos EN ORDEN', async () => {
    const { m, subidas } = manos();
    const r = await publicarEnTandas([trabajo('a', 3)], m);
    expect(m.crear).toHaveBeenCalledWith({ t: 'a' }, 'llave-a');
    expect(subidas).toEqual(['a-0.jpg', 'a-1.jpg', 'a-2.jpg']);
    expect(r.get('a')).toEqual({ que: 'publicado', id: 'id-a' });
  });

  it('un inmueble ya creado no se crea otra vez y sólo sube las fotos que faltan', async () => {
    const { m, subidas } = manos();
    const t = trabajo('a', 3, { idCreado: 'id-viejo' });
    t.fotos[0].subida = true;
    const avisos = { alSubirFoto: vi.fn(), alCrear: vi.fn() };
    const r = await publicarEnTandas([t], m, avisos);
    expect(m.crear).not.toHaveBeenCalled();
    expect(avisos.alCrear).not.toHaveBeenCalled();
    expect(subidas).toEqual(['a-1.jpg', 'a-2.jpg']);
    expect(avisos.alSubirFoto.mock.calls.map((c) => c[1])).toEqual(['a-f1', 'a-f2']);
    expect(r.get('a')).toEqual({ que: 'publicado', id: 'id-viejo' });
  });

  it('al retomar, la foto que alcanzó a llegar antes del corte no se sube dos veces', async () => {
    const { m, subidas } = manos({ cuantasTiene: async () => 2 });
    const t = trabajo('a', 4, { idCreado: 'id-viejo' });
    t.fotos[0].subida = true; // la pantalla alcanzó a marcar 1; el servidor tiene 2
    const avisos = { alSubirFoto: vi.fn() };
    const r = await publicarEnTandas([t], m, avisos);
    expect(subidas).toEqual(['a-2.jpg', 'a-3.jpg']);
    expect(avisos.alSubirFoto.mock.calls.map((c) => c[1])).toEqual(['a-f1', 'a-f2', 'a-f3']);
    expect(r.get('a')).toEqual({ que: 'publicado', id: 'id-viejo' });
  });

  it('si no se puede preguntar cuántas tiene, sube las pendientes (mejor repetida que faltante)', async () => {
    const { m, subidas } = manos({ cuantasTiene: async () => Promise.reject(new Error('red')) });
    const t = trabajo('a', 2, { idCreado: 'id-viejo' });
    await publicarEnTandas([t], m);
    expect(subidas).toEqual(['a-0.jpg', 'a-1.jpg']);
  });

  it('un inmueble nuevo no pregunta cuántas fotos tiene', async () => {
    const cuantasTiene = vi.fn(async () => 0);
    const { m } = manos({ cuantasTiene });
    await publicarEnTandas([trabajo('a', 2)], m);
    expect(cuantasTiene).not.toHaveBeenCalled();
  });

  it('avisa el id apenas se crea, para guardarlo antes de subir las fotos', async () => {
    const orden: string[] = [];
    const { m } = manos({ subirFoto: async () => void orden.push('foto') });
    await publicarEnTandas([trabajo('a', 1)], m, { alCrear: (_c, id) => orden.push(`creado ${id}`) });
    expect(orden).toEqual(['creado id-a', 'foto']);
  });

  it('el que falla al crear no frena a los demás', async () => {
    const { m } = manos({
      crear: async (d) => {
        if (d.t === 'b') throw new Error('400');
        return { id: `id-${d.t}` };
      },
      motivo: (_e, que) => (que === 'crear' ? 'Falta la ciudad.' : 'x'),
    });
    const r = await publicarEnTandas([trabajo('a'), trabajo('b'), trabajo('c')], m);
    expect(r.get('a')?.que).toBe('publicado');
    expect(r.get('b')).toEqual({ que: 'fallo', motivo: 'Falta la ciudad.' });
    expect(r.get('c')?.que).toBe('publicado');
  });

  it('si una foto no sube, el inmueble queda publicado con el id y dice cuántas faltan', async () => {
    const { m } = manos({
      subirFoto: async (_id, f) => {
        if (f.name === 'a-1.jpg') throw new Error('415');
      },
      motivo: () => 'El formato de la foto no se puede leer.',
    });
    const r = await publicarEnTandas([trabajo('a', 3)], m);
    expect(r.get('a')).toEqual({
      que: 'fallo',
      id: 'id-a',
      motivo: 'Ya está publicado, pero 1 foto no subió (El formato de la foto no se puede leer). Toca «Publicar» para reintentarlas.',
    });
  });

  it('nunca hay más inmuebles en vuelo que los pedidos', async () => {
    let enVuelo = 0;
    let maximo = 0;
    const { m } = manos({
      crear: async (d) => {
        enVuelo += 1;
        maximo = Math.max(maximo, enVuelo);
        await new Promise((r) => setTimeout(r, 5));
        enVuelo -= 1;
        return { id: `id-${d.t}` };
      },
    });
    const r = await publicarEnTandas(
      Array.from({ length: 10 }, (_, i) => trabajo(`t${i}`, 0)),
      m,
      {},
      { aLaVez: 3 },
    );
    expect(maximo).toBe(3);
    expect(r.size).toBe(10);
  });

  it('enParalelo con una lista vacía no hace nada', async () => {
    const tarea = vi.fn(async () => undefined);
    await enParalelo([], 4, tarea);
    expect(tarea).not.toHaveBeenCalled();
  });
});

describe('limitador', () => {
  it('nunca deja correr más de n a la vez y atiende en orden', async () => {
    const { limitador } = await import('./publicar-en-tandas');
    const correr = limitador(2);
    let enVuelo = 0;
    let maximo = 0;
    const orden: number[] = [];
    await Promise.all(
      [0, 1, 2, 3, 4].map((k) =>
        correr(async () => {
          enVuelo += 1;
          maximo = Math.max(maximo, enVuelo);
          await new Promise((r) => setTimeout(r, 3));
          orden.push(k);
          enVuelo -= 1;
        }),
      ),
    );
    expect(maximo).toBe(2);
    expect(orden.sort()).toEqual([0, 1, 2, 3, 4]);
  });
});
