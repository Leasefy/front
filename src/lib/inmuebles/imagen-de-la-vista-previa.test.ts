import { describe, expect, it } from 'vitest';

import { datosDeLaTarjeta, fotoPermitida, tamanoDelTitulo } from './imagen-de-la-vista-previa';

// La plata sale con el espacio duro de `formatCurrency`.
const $ = (cifra: string) => `$ ${cifra}`;

describe('datosDeLaTarjeta (diseño A, Nico 21-10-2026)', () => {
  it('un arriendo completo: letreros, lugar, título, precio por mes y cuatro cifras', () => {
    expect(
      datosDeLaTarjeta(
        { titulo: 'Apartamento 2 hab en Poblado', tipoDeNegocio: 'rent', canon: 1_200_000, habitaciones: 2, banos: 2, area: 50, parqueaderos: 1, barrio: 'Poblado', ciudad: 'Medellín', tipo: 'APARTMENT' },
        'Portofino Propiedad Raiz S.A.S.',
      ),
    ).toEqual({
      negocio: 'EN ARRIENDO',
      tipo: 'APARTAMENTO',
      titulo: 'Apartamento 2 hab en Poblado',
      lugar: 'Poblado, Medellín',
      precio: $('1.200.000'),
      periodo: '/mes',
      cifras: ['2 hab', '2 baños', '50 m²', '1 parq.'],
      inmobiliaria: 'Portofino Propiedad Raiz S.A.S.',
    });
  });

  it('lo migrado: el barrio en mayúscula se baja, el estrato completa las cifras', () => {
    const d = datosDeLaTarjeta({ titulo: 'Apartamento en El Yerbal, Envigado', canon: 12_000_000, barrio: 'EL YERBAL', ciudad: 'Envigado', estrato: 4, tipo: 'APARTMENT' }, null);
    expect(d.lugar).toBe('El Yerbal, Envigado');
    expect(d.cifras).toEqual(['Estrato 4']);
    expect(d.inmobiliaria).toBeNull();
  });

  it('una venta: «EN VENTA» y el precio sin «/mes»; un tipo desconocido no pone letrero', () => {
    const d = datosDeLaTarjeta({ tipoDeNegocio: 'sale', precioDeVenta: 480_000_000, ciudad: 'Sabaneta', tipo: 'CASTILLO' }, '  ');
    expect(d).toMatchObject({ negocio: 'EN VENTA', tipo: null, precio: $('480.000.000'), periodo: null, inmobiliaria: null });
    expect(d.titulo).toBe('Inmueble en venta en Sabaneta');
  });

  it('sin precio no inventa uno', () => {
    expect(datosDeLaTarjeta({ canon: 0 }, null)).toMatchObject({ precio: null, periodo: null });
  });
});

describe('tamanoDelTitulo: entero siempre, la letra baja con el largo', () => {
  it.each([
    ['Casa en Itagüí', 56],
    ['Apartamento en El Yerbal, Envigado', 56],
    ['Inmueble amoblado en Conquistadores, Medellín', 50],
    ['Apartamento amoblado con vista a la ciudad en Conquistadores', 44],
    ['x'.repeat(90), 38],
  ])('«%s» → %i px', (titulo, px) => {
    expect(tamanoDelTitulo(titulo)).toBe(px);
  });
});

describe('fotoPermitida: la ruta es pública, sólo baja fotos del almacén', () => {
  it('el almacén de Supabase y UploadThing, por https', () => {
    expect(fotoPermitida('https://rsywnqqrxuzylangbgmh.supabase.co/storage/v1/object/public/property-images/a.jpg')).toBe(true);
    expect(fotoPermitida('https://utfs.io/f/abc')).toBe(true);
  });

  it('cualquier otro origen, http, una dirección interna o algo que no es URL: no', () => {
    expect(fotoPermitida('https://portofinopr.arrendasoft.co/img/1.jpg')).toBe(false);
    expect(fotoPermitida('http://rsywnqqrxuzylangbgmh.supabase.co/a.jpg')).toBe(false);
    expect(fotoPermitida('https://169.254.169.254/latest/meta-data')).toBe(false);
    expect(fotoPermitida('https://supabase.co.evil.com/a.jpg')).toBe(false);
    expect(fotoPermitida('no es una url')).toBe(false);
    expect(fotoPermitida(null)).toBe(false);
  });
});
