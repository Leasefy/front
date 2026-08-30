/**
 * datosDeFila.test.ts — T-0038, contract-addendum-3.md §3.4.
 *
 * The row editor's wire <-> domain translation had NO test, and that is how
 * F-2 shipped: it read `datos.propertyType` (always `undefined` — the wire key
 * is `type`, so the picker rendered blank on every row) and sent
 * `propertyType` back, which is a 400 on every save.
 *
 * The payload `cambiosDesdeFormulario` builds is the same literal object
 * `back`'s `importacion-contrato-wire.spec.ts` feeds to the real
 * `ValidationPipe`. Neither test is contract evidence alone; together they are.
 */

import { describe, it, expect } from 'vitest';
import {
  formularioDesde,
  cambiosDesdeFormulario,
  listingTypeDeDatos,
  propertyTypeDeDatos,
  type FormularioFila,
} from './datosDeFila';

describe('reading `fila.datos` — the wire is UPPER_SNAKE and the key is `type`', () => {
  it('maps the wire type back to the domain so the picker is not blank', () => {
    expect(propertyTypeDeDatos('APARTMENT')).toBe('apartment');
    expect(propertyTypeDeDatos('WAREHOUSE')).toBe('warehouse');
  });

  it('leaves an unmappable type undefined — never a fabricated apartment (C19)', () => {
    expect(propertyTypeDeDatos('Apartaestudio')).toBeUndefined();
    expect(propertyTypeDeDatos(undefined)).toBeUndefined();
    expect(propertyTypeDeDatos('')).toBeUndefined();
  });

  it('reads a whole row, `type` and not `propertyType`', () => {
    const form = formularioDesde({
      title: 'Casa Laureles',
      type: 'HOUSE',
      listingType: 'SALE',
      salePrice: 450_000_000,
      area: 78,
    });

    expect(form.propertyType).toBe('house');
    expect(form.listingType).toBe('sale');
    expect(form.salePrice).toBe(450_000_000);
  });
});

describe('reading `listingType` tolerantly — a bad row must not crash the page', () => {
  it('maps the two known values', () => {
    expect(listingTypeDeDatos('SALE')).toBe('sale');
    expect(listingTypeDeDatos('RENT')).toBe('rent');
  });

  // `resolveListingType` in properties.mapper THROWS on an unknown value.
  // That is right for a validated Property response and catastrophic here:
  // `datos` is unvalidated by design (C13) and this runs inside a list render,
  // so one bad row would take down the whole review screen.
  it.each([['Permuta'], [''], [null], [undefined], [42], [{}]])(
    'degrades %o to undefined instead of throwing',
    (valor) => {
      expect(() => listingTypeDeDatos(valor)).not.toThrow();
      expect(listingTypeDeDatos(valor)).toBeUndefined();
    },
  );

  it('does not pre-select "arriendo" for an unrecognised value (C19)', () => {
    expect(formularioDesde({ listingType: 'Permuta' }).listingType).toBeUndefined();
  });
});

describe('writing the correction — domain -> wire at the boundary', () => {
  const base: FormularioFila = {
    title: 'Casa Laureles',
    address: 'Carrera 76 # 32-14',
    city: 'Medellín',
    neighborhood: 'Laureles',
    department: 'Antioquia',
    propertyType: 'apartment',
    area: 78,
  };

  it('sends `type` in UPPER_SNAKE, never `propertyType` — F-2', () => {
    const cambios = cambiosDesdeFormulario({ ...base, listingType: 'sale', salePrice: 450_000_000 });

    expect(cambios.type).toBe('APARTMENT');
    expect('propertyType' in cambios).toBe(false);
    expect(cambios.listingType).toBe('SALE');
  });

  // Every one of these is a 400 on `ResolverInmuebleDto` (§3.2). The old front
  // mirror declared three of them; the UI never sent them, so they were latent
  // rather than live. This keeps them that way.
  it.each(['bedrooms', 'bathrooms', 'adminFee', 'amenities', 'latitude', 'longitude'])(
    'never sends `%s` — not on the correction DTO',
    (clave) => {
      const cambios = cambiosDesdeFormulario({ ...base, listingType: 'rent', monthlyRent: 2_400_000 });
      expect(clave in cambios).toBe(false);
    },
  );

  it('a sale clears the canon with an explicit null — that is the exit from precio_inconsistente', () => {
    const cambios = cambiosDesdeFormulario({ ...base, listingType: 'sale', salePrice: 450_000_000 });

    expect(cambios.monthlyRent).toBeNull();
    expect(cambios.salePrice).toBe(450_000_000);
  });

  it('a rent clears the sale price the same way', () => {
    const cambios = cambiosDesdeFormulario({ ...base, listingType: 'rent', monthlyRent: 2_400_000 });

    expect(cambios.salePrice).toBeNull();
    expect(cambios.monthlyRent).toBe(2_400_000);
  });

  it('never sends a price of 0 — a 0 is a 400 here, not a cleared price (C6)', () => {
    const cambios = cambiosDesdeFormulario({ ...base, listingType: 'rent', monthlyRent: undefined });

    expect(cambios.monthlyRent).toBeUndefined();
    expect('monthlyRent' in cambios).toBe(false);
  });

  it('omits untouched fields entirely — an omitted key leaves the stored value alone', () => {
    const cambios = cambiosDesdeFormulario({ listingType: 'rent', monthlyRent: 2_400_000 });

    expect('title' in cambios).toBe(false);
    expect('type' in cambios).toBe(false);
    expect('area' in cambios).toBe(false);
  });
});
