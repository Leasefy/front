import { describe, expect, it } from 'vitest';

import {
  cifrasDelInmueble,
  cifrasCortas,
  descripcionParaLaVistaPrevia,
  fichaDelInmueble,
  lugarDelInmueble,
  nombrePropio,
  precioDelInmueble,
  textoDeLaFicha,
  tituloParaCompartir,
  type InmuebleParaCompartir,
} from './ficha-para-compartir';

// La plata sale con el espacio duro de `formatCurrency`.
const $ = (cifra: string) => `$ ${cifra}`;

/** El inmueble que Nico compartió el 21-10 (migrado de Portofino: sin cifras). */
const DEL_YERBAL: InmuebleParaCompartir = {
  titulo: 'Apartamento en El Yerbal, Envigado',
  tipoDeNegocio: 'rent',
  canon: 12_000_000,
  administracion: 0,
  ciudad: 'Envigado',
  barrio: 'EL YERBAL',
  area: null,
  habitaciones: null,
  banos: null,
};

/** La Casa Finca de Portofino, el ejemplo de Juan. */
const CASA_FINCA: InmuebleParaCompartir = {
  titulo: 'Casa Finca (Kachotis)',
  tipoDeNegocio: 'rent',
  canon: 2_900_000,
  administracion: 150_000,
  ciudad: 'CALDAS',
  barrio: 'PRIMAVERA',
  area: 100,
  habitaciones: 2,
  banos: 1,
  parqueaderos: 0,
};

describe('fichaDelInmueble', () => {
  it('lleva los campos del inmueble del front a los de la ficha', () => {
    expect(
      fichaDelInmueble({
        title: 'Casa Finca',
        listingType: 'sale',
        monthlyRent: null,
        salePrice: 300_000_000,
        adminFee: 0,
        city: 'Caldas',
        neighborhood: null,
        area: 100,
        bedrooms: 2,
        bathrooms: 1,
        parkingSpaces: undefined,
      }),
    ).toEqual({
      titulo: 'Casa Finca',
      tipoDeNegocio: 'sale',
      canon: null,
      precioDeVenta: 300_000_000,
      administracion: 0,
      ciudad: 'Caldas',
      barrio: null,
      area: 100,
      habitaciones: 2,
      banos: 1,
      parqueaderos: undefined,
    });
    expect(fichaDelInmueble({ listingType: 'rent' }).tipoDeNegocio).toBe('rent');
    expect(fichaDelInmueble({}).tipoDeNegocio).toBe('rent');
  });
});

describe('nombrePropio', () => {
  it('baja lo que viene todo en mayúscula, con las palabras chicas en minúscula', () => {
    expect(nombrePropio('EL YERBAL')).toBe('El Yerbal');
    expect(nombrePropio('BARRIO DE LA PAZ')).toBe('Barrio de la Paz');
    expect(nombrePropio('  LA   CEJA ')).toBe('La Ceja');
    expect(nombrePropio('URBANIZACIÓN ETAPA II')).toBe('Urbanización Etapa II');
  });

  it('no toca lo que ya viene escrito a mano', () => {
    expect(nombrePropio('Laureles')).toBe('Laureles');
    expect(nombrePropio('La Estrella')).toBe('La Estrella');
    expect(nombrePropio('El Poblado - Manila')).toBe('El Poblado - Manila');
  });

  it('vacío, null o sólo cifras', () => {
    expect(nombrePropio(null)).toBe('');
    expect(nombrePropio('   ')).toBe('');
    expect(nombrePropio('123')).toBe('123');
  });
});

describe('las piezas de la ficha', () => {
  it('el lugar sin coma huérfana', () => {
    expect(lugarDelInmueble(DEL_YERBAL)).toBe('El Yerbal, Envigado');
    expect(lugarDelInmueble({ ciudad: 'Medellín' })).toBe('Medellín');
    expect(lugarDelInmueble({})).toBe('');
  });

  it('el precio del arriendo va «/ mes»; el de venta, solo; sin precio, nada', () => {
    expect(precioDelInmueble(DEL_YERBAL)).toBe(`${$('12.000.000')} / mes`);
    expect(precioDelInmueble(DEL_YERBAL, 'en')).toBe(`${$('12,000,000')} / month`);
    expect(precioDelInmueble({ tipoDeNegocio: 'sale', precioDeVenta: 450_000_000, canon: 3_000_000 })).toBe(
      $('450.000.000'),
    );
    expect(precioDelInmueble({ canon: null })).toBeNull();
    expect(precioDelInmueble({ canon: 0 })).toBeNull();
    expect(precioDelInmueble({ tipoDeNegocio: 'sale', precioDeVenta: null })).toBeNull();
  });

  it('las cifras: sólo las que tiene, en singular o plural', () => {
    expect(cifrasDelInmueble(CASA_FINCA)).toEqual(['100 m²', '2 habitaciones', '1 baño']);
    expect(cifrasDelInmueble({ area: 1250.4, habitaciones: 1, banos: 3, parqueaderos: 2 })).toEqual([
      '1.250 m²',
      '1 habitación',
      '3 baños',
      '2 parqueaderos',
    ]);
    expect(cifrasDelInmueble(DEL_YERBAL)).toEqual([]);
    expect(cifrasDelInmueble(CASA_FINCA, 'en')).toEqual(['100 m²', '2 bedrooms', '1 bathroom']);
  });

  it('el título: el del inmueble; si no tiene, uno con el negocio y el lugar', () => {
    expect(tituloParaCompartir(DEL_YERBAL)).toBe('Apartamento en El Yerbal, Envigado');
    expect(tituloParaCompartir({ titulo: '  ', ciudad: 'Bello' })).toBe('Inmueble en arriendo en Bello');
    expect(tituloParaCompartir({ tipoDeNegocio: 'sale' })).toBe('Inmueble en venta');
    expect(tituloParaCompartir({ ciudad: 'Bello' }, 'en')).toBe('Property for rent in Bello');
  });
});

describe('descripcionParaLaVistaPrevia', () => {
  it('🔴 el formato que Nico aprobó: precio · cifras · lugar', () => {
    expect(
      descripcionParaLaVistaPrevia({ tipoDeNegocio: 'rent', canon: 1_200_000, habitaciones: 2, banos: 2, area: 50, parqueaderos: 1, barrio: 'Poblado', ciudad: 'Medellín' }),
    ).toBe(`${$('1.200.000')} / mes · 2 hab · 2 baños · 50 m² · 1 parq. · Poblado, Medellín`);
    expect(descripcionParaLaVistaPrevia(CASA_FINCA)).toBe(`${$('2.900.000')} / mes · 2 hab · 1 baño · 100 m² · Primavera, Caldas`);
  });

  it('lo migrado sin cifras: el estrato completa; nunca «0 habitaciones»', () => {
    expect(descripcionParaLaVistaPrevia(DEL_YERBAL)).toBe(`${$('12.000.000')} / mes · El Yerbal, Envigado`);
    expect(descripcionParaLaVistaPrevia({ ...DEL_YERBAL, estrato: 4 })).toBe(`${$('12.000.000')} / mes · Estrato 4 · El Yerbal, Envigado`);
  });

  it('venta, sin precio y sin lugar', () => {
    expect(descripcionParaLaVistaPrevia({ tipoDeNegocio: 'sale', precioDeVenta: 300_000_000, ciudad: 'Sabaneta' })).toBe(
      `Venta · ${$('300.000.000')} · Sabaneta`,
    );
    expect(descripcionParaLaVistaPrevia({ ciudad: 'Itagüí', habitaciones: 3 })).toBe('3 hab · Itagüí');
    expect(descripcionParaLaVistaPrevia({})).toBe('Arriendo');
  });

  it('en inglés', () => {
    expect(descripcionParaLaVistaPrevia(CASA_FINCA, 'en')).toBe(`${$('2,900,000')} / month · 2 bd · 1 ba · 100 m² · Primavera, Caldas`);
  });
});

describe('cifrasCortas', () => {
  it('hab, baños, m² y parqueaderos; el estrato sólo si quedan menos de cuatro', () => {
    expect(cifrasCortas({ habitaciones: 2, banos: 2, area: 50, parqueaderos: 1, estrato: 4 })).toEqual(['2 hab', '2 baños', '50 m²', '1 parq.']);
    expect(cifrasCortas({ habitaciones: 1, banos: 1, estrato: 3 })).toEqual(['1 hab', '1 baño', 'Estrato 3']);
    expect(cifrasCortas({ estrato: 0 })).toEqual([]);
    expect(cifrasCortas({ estrato: 9 })).toEqual([]);
  });
});

describe('textoDeLaFicha', () => {
  const URL = 'https://leasefy.co/propiedades/73ced217-d7ef-4abc-a088-428c51e420ad';

  it('el formato de «Copiar ficha» de Portofino, con el enlace al final', () => {
    expect(textoDeLaFicha(CASA_FINCA, URL)).toBe(
      [
        'CASA FINCA (KACHOTIS)',
        'Primavera, Caldas',
        `Precio: ${$('2.900.000')} / mes`,
        `Administración: ${$('150.000')}`,
        '100 m²',
        '2 habitaciones',
        '1 baño',
        '',
        'Conoce más detalles aquí:',
        URL,
      ].join('\n'),
    );
  });

  it('lo que no tiene no sale: ni administración en cero ni cifras vacías', () => {
    expect(textoDeLaFicha(DEL_YERBAL, URL)).toBe(
      [
        'APARTAMENTO EN EL YERBAL, ENVIGADO',
        'El Yerbal, Envigado',
        `Precio: ${$('12.000.000')} / mes`,
        '',
        'Conoce más detalles aquí:',
        URL,
      ].join('\n'),
    );
  });

  it('una venta no lleva administración', () => {
    const texto = textoDeLaFicha({ tipoDeNegocio: 'sale', precioDeVenta: 300_000_000, administracion: 200_000 }, URL);
    expect(texto).toContain(`Precio: ${$('300.000.000')}`);
    expect(texto).not.toContain('Administración');
  });

  it('en inglés', () => {
    const texto = textoDeLaFicha(CASA_FINCA, URL, 'en');
    expect(texto).toContain(`Price: ${$('2,900,000')} / month`);
    expect(texto).toContain('HOA fee:');
    expect(texto.endsWith(`See more details here:\n${URL}`)).toBe(true);
  });
});
