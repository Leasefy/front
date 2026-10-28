import { describe, expect, it } from 'vitest';
import { armarVitrina, miniatura, VITRINA_VACIA } from './vitrina-de-la-home';

const foto = (url: string, order = 0) => ({ id: url, propertyId: 'p', url, order });
const inmueble = (over: Record<string, unknown> = {}) => ({
  id: 'p1',
  title: 'Apartamento en Laureles',
  description: '',
  type: 'APARTMENT',
  status: 'AVAILABLE',
  listingType: 'RENT',
  city: 'Medellin',
  neighborhood: 'Laureles',
  address: 'Cra 1',
  monthlyRent: 2600000,
  salePrice: null,
  bedrooms: 2,
  amenities: [],
  images: [foto('https://x.supabase.co/b.jpg', 1), foto('https://x.supabase.co/a.jpg', 0)],
  ...over,
});

describe('la franja del marketplace de la landing', () => {
  it('pinta lo publicado: precio, tipo, habitaciones, barrio y la primera foto en miniatura', () => {
    const v = armarVitrina({ data: [inmueble()], meta: { total: 29 } });
    expect(v.total).toBe(29);
    expect(v.inmuebles).toEqual([
      { id: 'p1', foto: miniatura('https://x.supabase.co/a.jpg'), precio: 2600000, venta: false, tipo: 'APARTMENT', habitaciones: 2, lugar: 'Laureles' },
    ]);
    expect(v.inmuebles[0].foto).toBe('/_next/image?url=https%3A%2F%2Fx.supabase.co%2Fa.jpg&w=96&q=75');
  });

  it('la venta usa su precio de venta; sin barrio, la ciudad; sin habitaciones, nada', () => {
    const [i] = armarVitrina({ data: [inmueble({ listingType: 'SALE', salePrice: 450000000, monthlyRent: null, neighborhood: '', bedrooms: null })] }).inmuebles;
    expect(i).toMatchObject({ venta: true, precio: 450000000, lugar: 'Medellin', habitaciones: null });
  });

  it('deja fuera lo que no se puede mostrar (sin foto, sin precio, no disponible, tipo de operación raro) sin tumbar la franja', () => {
    const v = armarVitrina({
      data: [
        inmueble({ id: 'sin-foto', images: [] }),
        inmueble({ id: 'sin-precio', monthlyRent: 0 }),
        inmueble({ id: 'arrendado', status: 'RENTED' }),
        inmueble({ id: 'raro', listingType: 'PERMUTA' }),
        inmueble({ id: 'bien' }),
      ],
    });
    // 27-10 (Nico: «sigo sin ver ahí dentro inmuebles»): el publicado sin foto ya no se esconde; va DESPUÉS de
    // los que tienen foto, con la ilustración de su tipo.
    expect(v.inmuebles.map((i) => i.id)).toEqual(['bien', 'sin-foto']);
    const sinFoto = v.inmuebles[1]!;
    expect(sinFoto.sinFoto).toBe(true);
    expect(sinFoto.foto).toMatch(/^\/landing\/img\/.+-voltaje\.webp$/);
    expect(v.total).toBe(5);
  });

  it('una respuesta rara es una franja vacía, nunca inventada', () => {
    expect(armarVitrina(null)).toEqual(VITRINA_VACIA);
    expect(armarVitrina({ data: 'x' })).toEqual(VITRINA_VACIA);
  });

  it('no pasa del máximo de la franja', () => {
    const data = Array.from({ length: 30 }, (_, k) => inmueble({ id: `p${k}` }));
    expect(armarVitrina({ data, meta: { total: 30 } }, 16).inmuebles).toHaveLength(16);
  });
});
