import { describe, expect, it } from 'vitest';

import { LADO_MAXIMO, medidasParaAchicar, nombreEnJpg, soloImagenes } from './fotos';

describe('las fotos del publicador, livianas (20-10-2026)', () => {
  it('achica el lado largo a 2048 sin agrandar nunca', () => {
    expect(medidasParaAchicar(4032, 3024, LADO_MAXIMO)).toEqual({ ancho: 2048, alto: 1536 });
    expect(medidasParaAchicar(3024, 4032, LADO_MAXIMO)).toEqual({ ancho: 1536, alto: 2048 });
    expect(medidasParaAchicar(800, 600, LADO_MAXIMO)).toEqual({ ancho: 800, alto: 600 });
    expect(medidasParaAchicar(0, 600, LADO_MAXIMO)).toEqual({ ancho: 0, alto: 0 });
  });

  it('la foto achicada se llama igual, en jpg', () => {
    expect(nombreEnJpg('IMG_2041.HEIC')).toBe('IMG_2041.jpg');
    expect(nombreEnJpg('sala.png')).toBe('sala.jpg');
    expect(nombreEnJpg('.jpg')).toBe('foto.jpg');
  });

  it('sólo las imágenes, en orden natural de nombre', () => {
    const f = (n: string, t = 'image/jpeg') => new File(['x'], n, { type: t });
    expect(soloImagenes([f('10.jpg'), f('notas.txt', 'text/plain'), f('2.jpg'), f('IMG.HEIC', '')]).map((x) => x.name)).toEqual([
      '2.jpg',
      '10.jpg',
      'IMG.HEIC',
    ]);
  });
});
