/**
 * 🔴 Nico, 2026-09-12: «deberíamos dar la opción de que pueda colocar el link
 * de donde tienen esa propiedad, donde podamos sacar las imágenes, y ya
 * nosotros hacemos la tarea de sacarlas y subirlas al inmueble».
 *
 * Lo que se fija acá es que se reusa la maquinaria del importador tal cual, y
 * sobre todo que **nada se corta en silencio**: lo que no cabe y lo que no se
 * pudo bajar se cuenta y se devuelve.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { leerEnlaces, traerFotoComoArchivo } = vi.hoisted(() => ({
  leerEnlaces: vi.fn(),
  traerFotoComoArchivo: vi.fn(),
}));

vi.mock('./enlaces.service', async () => {
  const actual = await vi.importActual<typeof import('./enlaces.service')>('./enlaces.service');
  return { ...actual, leerEnlaces, traerFotoComoArchivo };
});

import { fotosDesdeEnlace } from './fotos-desde-enlace';

const avisoCon = (cuantas: number) => [
  {
    url: 'https://www.fincaraiz.com.co/apartamento/1',
    ok: true,
    falta: [],
    inmueble: {
      imagenes: Array.from({ length: cuantas }, (_, i) => `https://cdn/foto-${i}.jpg`),
    },
  },
];

const archivo = (nombre: string) =>
  new File([new Uint8Array([1, 2, 3])], nombre, { type: 'image/jpeg' });

beforeEach(() => {
  leerEnlaces.mockReset();
  traerFotoComoArchivo.mockReset();
  traerFotoComoArchivo.mockImplementation(async (_url: string, nombre: string) =>
    archivo(`${nombre}.jpg`),
  );
});

describe('fotosDesdeEnlace', () => {
  it('lee el aviso y devuelve sus fotos como archivos, en el orden del aviso', async () => {
    leerEnlaces.mockResolvedValue(avisoCon(3));

    const r = await fotosDesdeEnlace('https://www.fincaraiz.com.co/apartamento/1', 40);

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.archivos.map((a) => a.name)).toEqual([
      'foto-01.jpg',
      'foto-02.jpg',
      'foto-03.jpg',
    ]);
    expect(r.encontradas).toBe(3);
    expect(r.fallidas).toBe(0);
    expect(r.fueraDeCupo).toBe(0);
  });

  /* 🔴 Lo que no cabe se CUENTA. Un corte en silencio es cómo alguien da por
     subidas unas fotos que no están. Y se toman las PRIMERAS: en un aviso la
     primera foto es la de portada. */
  it('respeta el cupo, se queda con las primeras y dice cuántas dejó fuera', async () => {
    leerEnlaces.mockResolvedValue(avisoCon(18));

    const r = await fotosDesdeEnlace('https://x/1', 5);

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.archivos).toHaveLength(5);
    expect(r.fueraDeCupo).toBe(13);
    expect(traerFotoComoArchivo).toHaveBeenCalledTimes(5);
    expect(traerFotoComoArchivo.mock.calls[0][0]).toBe('https://cdn/foto-0.jpg');
  });

  /* Una foto que da 403 no puede tumbar a las otras 16. */
  it('las fotos que fallan se cuentan y las demás entran igual', async () => {
    leerEnlaces.mockResolvedValue(avisoCon(4));
    traerFotoComoArchivo
      .mockResolvedValueOnce(archivo('a.jpg'))
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(archivo('c.jpg'))
      .mockResolvedValueOnce(null);

    const r = await fotosDesdeEnlace('https://x/1', 40);

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.archivos).toHaveLength(2);
    expect(r.fallidas).toBe(2);
  });

  it('informa el avance foto por foto', async () => {
    leerEnlaces.mockResolvedValue(avisoCon(3));
    const visto: [number, number][] = [];

    await fotosDesdeEnlace('https://x/1', 40, (l, t) => visto.push([l, t]));

    expect(visto).toEqual([
      [1, 3],
      [2, 3],
      [3, 3],
    ]);
  });

  it('un aviso que no se pudo leer devuelve su motivo tal cual, sin inventar', async () => {
    leerEnlaces.mockResolvedValue([
      { url: 'https://x/1', ok: false, motivo: 'bloqueado', mensaje: 'El portal no dejó entrar.' },
    ]);

    const r = await fotosDesdeEnlace('https://x/1', 40);

    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.motivo).toBe('bloqueado');
    expect(r.mensaje).toBe('El portal no dejó entrar.');
  });

  it('un aviso sin fotos lo dice, y no es lo mismo que no poder leerlo', async () => {
    leerEnlaces.mockResolvedValue(avisoCon(0));

    const r = await fotosDesdeEnlace('https://x/1', 40);

    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.motivo).toBe('sin_fotos');
  });

  it('sin cupo ni siquiera pide el aviso', async () => {
    const r = await fotosDesdeEnlace('https://x/1', 0);

    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.motivo).toBe('sin_cupo');
    expect(leerEnlaces).not.toHaveBeenCalled();
  });
});
