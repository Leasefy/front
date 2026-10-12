import { describe, expect, it } from 'vitest';
import { agruparFotos, emparejar } from './fotos-del-zip';

const b = new Uint8Array([1]);

describe('agruparFotos', () => {
  it('una carpeta por inmueble, fotos en orden natural, sin lo que no es foto', () => {
    const r = agruparFotos([
      { ruta: 'LAB-001/10.jpg', bytes: b },
      { ruta: 'LAB-001/2.jpg', bytes: b },
      { ruta: 'LAB-001/leeme.txt', bytes: b },
      { ruta: '__MACOSX/LAB-001/._2.jpg', bytes: b },
      { ruta: '4021/sala.PNG', bytes: b },
    ]);
    expect(r.map((c) => [c.carpeta, c.fotos.map((f) => f.nombre)])).toEqual([
      ['4021', ['sala.PNG']],
      ['LAB-001', ['2.jpg', '10.jpg']],
    ]);
    expect(r[0].fotos[0].tipo).toBe('image/png');
  });

  it('todo dentro de una sola carpeta raíz: esa raíz se salta', () => {
    const r = agruparFotos([
      { ruta: 'fotos/LAB-001/1.jpg', bytes: b },
      { ruta: 'fotos/LAB-002/1.webp', bytes: b },
    ]);
    expect(r.map((c) => c.carpeta)).toEqual(['LAB-001', 'LAB-002']);
  });

  it('fotos sueltas sin carpeta quedan aparte (no tienen inmueble)', () => {
    expect(agruparFotos([{ ruta: 'suelta.jpg', bytes: b }])[0].carpeta).toBe('');
  });
});

describe('emparejar', () => {
  const inmuebles = [
    { id: 'a', code: 12, externalId: '0040', titulo: 'Apto', fotos: 38 },
    { id: 'b', code: 7, externalId: null, titulo: 'Casa', fotos: 0 },
  ];
  const carpeta = (nombre: string, n: number) => ({
    carpeta: nombre,
    fotos: Array.from({ length: n }, (_, k) => ({ nombre: `${k}.jpg`, tipo: 'image/jpeg', bytes: b })),
  });

  it('primero el código de su sistema (sin importar ceros a la izquierda), después el de Leasefy', () => {
    const r = emparejar([carpeta('40', 1), carpeta('7', 1), carpeta('XYZ', 1)], inmuebles);
    expect(r.map((e) => e.inmueble?.id ?? null)).toEqual(['a', 'b', null]);
  });

  it('se suman hasta 40 en total: lo que no cabe se cuenta aparte', () => {
    const [e] = emparejar([carpeta('0040', 5)], inmuebles);
    expect(e.caben).toBe(2);
  });
});
