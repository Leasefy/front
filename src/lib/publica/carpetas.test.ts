import { describe, expect, it } from 'vitest';

import { inmuebleVacio } from './borrador';
import { acomodarCarpetas, agruparPorCarpeta, esLaCarpetaDe, type ArchivoConRuta } from './carpetas';

const foto = (nombre: string) => new File(['x'], nombre, { type: nombre.endsWith('.txt') ? 'text/plain' : 'image/jpeg' });
const en = (ruta: string): ArchivoConRuta => ({ ruta, archivo: foto(ruta.split('/').pop() as string) });
const nombres = (c: { fotos: File[] }) => c.fotos.map((f) => f.name);

describe('carpetas de fotos → inmuebles (20-10-2026)', () => {
  it('una carpeta madre con subcarpetas: un inmueble por subcarpeta, en orden natural', () => {
    const grupos = agruparPorCarpeta([
      en('Inmuebles/Laureles 302/10.jpg'),
      en('Inmuebles/Laureles 302/2.jpg'),
      en('Inmuebles/Laureles 302/cocina/1.jpg'),
      en('Inmuebles/Poblado 101/sala.jpg'),
      en('Inmuebles/suelta.jpg'),
      en('Inmuebles/Poblado 101/notas.txt'),
    ]);
    expect(grupos.map((g) => g.nombre)).toEqual(['Laureles 302', 'Poblado 101']);
    expect(nombres(grupos[0])).toEqual(['1.jpg', '2.jpg', '10.jpg']);
    expect(nombres(grupos[1])).toEqual(['sala.jpg']);
  });

  it('una sola carpeta con fotos: un inmueble; varias carpetas soltadas: una por carpeta', () => {
    expect(agruparPorCarpeta([en('Laureles 302/a.jpg'), en('Laureles 302/b.jpg')]).map((g) => g.nombre)).toEqual(['Laureles 302']);
    expect(agruparPorCarpeta([en('B/a.jpg'), en('A/a.jpg')]).map((g) => g.nombre)).toEqual(['A', 'B']);
  });

  it('fotos sueltas, sin carpeta: un solo inmueble', () => {
    const [g] = agruparPorCarpeta([en('a.jpg'), en('b.png')]);
    expect(g.nombre).toBe('Fotos sueltas');
    expect(g.fotos).toHaveLength(2);
    expect(agruparPorCarpeta([en('notas.txt')])).toEqual([]);
  });

  it('la carpeta casa con la fila por el código (sin ceros ni guiones) o por la dirección', () => {
    const fila = { ...inmuebleVacio('a'), codigo: 'INM-0041', direccion: 'Cra 76 # 34-21 apto 301' };
    expect(esLaCarpetaDe('inm 41', fila)).toBe(true);
    expect(esLaCarpetaDe('INM0041 - Laureles', fila)).toBe(true);
    expect(esLaCarpetaDe('Carrera 76 34 21 apartamento 301', fila)).toBe(true);
    expect(esLaCarpetaDe('INM-0042', fila)).toBe(false);
    expect(esLaCarpetaDe('Laureles', { ...inmuebleVacio('b') })).toBe(false);
  });

  it('cada carpeta va a una sola tarjeta sin fotos; las que no casan quedan como nuevas', () => {
    const a = { ...inmuebleVacio('a'), codigo: '41' };
    const b = { ...inmuebleVacio('b'), codigo: '42' };
    const conFotos = { ...inmuebleVacio('c'), codigo: '43' };
    const { asignadas, nuevas } = acomodarCarpetas(
      [
        { nombre: '0041', fotos: [foto('1.jpg')] },
        { nombre: '43', fotos: [foto('1.jpg')] },
        { nombre: 'Otra', fotos: [foto('1.jpg')] },
        { nombre: '42', fotos: [foto('1.jpg')] },
      ],
      [a, b, conFotos],
      (clave) => (clave === 'c' ? 3 : 0),
    );
    expect(asignadas.map((x) => [x.clave, x.carpeta.nombre])).toEqual([
      ['a', '0041'],
      ['b', '42'],
    ]);
    expect(nuevas.map((c) => c.nombre)).toEqual(['43', 'Otra']);
  });
});
