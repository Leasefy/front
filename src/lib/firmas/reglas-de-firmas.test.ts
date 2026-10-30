import { describe, expect, it } from 'vitest';

import { cajaEn, loQueLeFalta, moverCaja, repetidos, tituloDelArchivo, type FirmanteEnElFormulario } from './reglas-de-firmas';

const f = (o: Partial<FirmanteEnElFormulario>): FirmanteEnElFormulario => ({
  clave: 'a',
  nombre: 'Ana Gómez',
  email: '',
  celular: '',
  pais: 'CO',
  numeroDocumento: '',
  posicion: null,
  ...o,
});
const conWhatsapp = { codigoPorWhatsapp: true, enElDocumento: false };

describe('Firmas en el panel — lo que le falta a cada persona (espejo del back)', () => {
  it('con correo o celular de Colombia está lista', () => {
    expect(loQueLeFalta(f({ email: 'ana@correo.co' }), conWhatsapp)).toBeNull();
    expect(loQueLeFalta(f({ celular: '300 123 4567' }), conWhatsapp)).toBeNull();
  });

  it('dice qué falta, en palabras', () => {
    expect(loQueLeFalta(f({ nombre: 'A' }), conWhatsapp)).toBe('Escribe su nombre.');
    expect(loQueLeFalta(f({}), conWhatsapp)).toContain('correo o un celular');
    expect(loQueLeFalta(f({ email: 'ana@' }), conWhatsapp)).toBe('Revisa el correo.');
    expect(loQueLeFalta(f({ celular: '12' }), conWhatsapp)).toBe('Revisa el celular.');
    expect(loQueLeFalta(f({ celular: '5512345678', pais: 'MX' }), conWhatsapp)).toContain('sólo llega a celulares de Colombia');
    expect(loQueLeFalta(f({ celular: '3001234567' }), { codigoPorWhatsapp: false, enElDocumento: false })).toContain('Necesita un correo');
    expect(loQueLeFalta(f({ email: 'ana@correo.co' }), { codigoPorWhatsapp: true, enElDocumento: true })).toBe('Ubica su firma en el documento.');
  });

  it('repetidos por correo o por celular', () => {
    expect(repetidos([f({ clave: 'a', email: 'x@y.co' }), f({ clave: 'b', email: 'X@y.co' })])).toEqual(['b']);
    expect(repetidos([f({ clave: 'a', celular: '3001234567' }), f({ clave: 'b', celular: '300 123 4567' })])).toEqual(['b']);
    expect(repetidos([f({ clave: 'a', email: 'x@y.co' }), f({ clave: 'b', email: 'z@y.co' })])).toEqual([]);
  });
});

describe('Firmas en el panel — la caja de la firma', () => {
  it('nace centrada donde se tocó y no se sale de la página', () => {
    expect(cajaEn(2, 0.5, 0.5)).toEqual({ pagina: 2, x: 0.35, y: 0.465, ancho: 0.3, alto: 0.07 });
    expect(cajaEn(1, 0.99, 0.99)).toEqual({ pagina: 1, x: 0.7, y: 0.93, ancho: 0.3, alto: 0.07 });
    expect(cajaEn(1, 0, 0)).toMatchObject({ x: 0, y: 0 });
  });

  it('se mueve sin salirse', () => {
    const c = cajaEn(1, 0.5, 0.5);
    expect(moverCaja(c, 0.1, 0.1)).toMatchObject({ x: 0.45, y: 0.565 });
    expect(moverCaja(c, 5, -5)).toMatchObject({ x: 0.7, y: 0 });
  });

  it('el nombre sale del archivo', () => {
    expect(tituloDelArchivo('promesa_de_compraventa-laureles.pdf')).toBe('Promesa de compraventa laureles');
    expect(tituloDelArchivo('.pdf')).toBe('');
  });
});
