import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  metadataDeLaVistaPrevia,
  pedirInmobiliariaDeLaVistaPrevia,
  pedirInmuebleParaLaVistaPrevia,
  primeraFoto,
  rutaDeLaImagen,
  type InmuebleDeLaVistaPrevia,
} from './vista-previa-del-inmueble';

const ID = '73ced217-d7ef-4abc-a088-428c51e420ad';
const FOTO = `https://rsywnqqrxuzylangbgmh.supabase.co/storage/v1/object/public/property-images/${ID}/1792598877929-wczje.jpg`;

/** Lo que devolvió producción el 21-10 para el inmueble que compartió Nico. */
const DEL_YERBAL: InmuebleDeLaVistaPrevia = {
  id: ID,
  type: 'APARTMENT',
  stratum: 4,
  updatedAt: '2026-10-21T15:00:00.000Z',
  agencyId: 'e7b9937d-81f7-4447-a006-732b579193c4',
  title: 'Apartamento en El Yerbal, Envigado',
  city: 'Envigado',
  neighborhood: 'EL YERBAL',
  monthlyRent: 12_000_000,
  adminFee: 0,
  listingType: 'RENT',
  salePrice: null,
  area: null,
  bedrooms: null,
  bathrooms: null,
  parkingSpaces: null,
  images: [
    { id: 'b', propertyId: ID, url: `${FOTO}?segunda`, order: 1, createdAt: '' },
    { id: 'a', propertyId: ID, url: FOTO, order: 0, createdAt: '' },
  ],
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('primeraFoto', () => {
  it('la de orden más bajo, aunque no venga primero', () => {
    expect(primeraFoto(DEL_YERBAL)).toBe(FOTO);
  });

  it('sin fotos, o con una URL que no es http(s), null', () => {
    expect(primeraFoto({ images: [] })).toBeNull();
    expect(primeraFoto({ images: undefined })).toBeNull();
    expect(primeraFoto({ images: [{ id: 'x', propertyId: ID, url: 'blob:abc', order: 0, createdAt: '' }] })).toBeNull();
  });
});

describe('rutaDeLaImagen', () => {
  it('la tarjeta del inmueble, con la fecha del último cambio para que nadie guarde una vieja', () => {
    expect(rutaDeLaImagen(DEL_YERBAL)).toBe(`/api/og/inmueble/${ID}?v=${Date.parse('2026-10-21T15:00:00.000Z').toString(36)}`);
    expect(rutaDeLaImagen({ id: ID, updatedAt: '' })).toBe(`/api/og/inmueble/${ID}`);
  });
});

describe('metadataDeLaVistaPrevia', () => {
  const IMAGEN = rutaDeLaImagen(DEL_YERBAL);

  it('título, la línea «precio · cifras · lugar», la tarjeta de 1200 × 630 y la URL', () => {
    const m = metadataDeLaVistaPrevia(DEL_YERBAL, { idioma: 'es', url: `/es/propiedades/${ID}` });
    const descripcion = '$\u00a012.000.000 / mes · Estrato 4 · El Yerbal, Envigado';
    expect(m.title).toBe('Apartamento en El Yerbal, Envigado');
    expect(m.description).toBe(descripcion);
    expect(m.openGraph).toMatchObject({
      type: 'website',
      siteName: 'Leasefy',
      locale: 'es_CO',
      url: `/es/propiedades/${ID}`,
      title: 'Apartamento en El Yerbal, Envigado',
      description: descripcion,
      images: [{ url: IMAGEN, width: 1200, height: 630, alt: 'Apartamento en El Yerbal, Envigado', type: 'image/jpeg' }],
    });
    expect(m.twitter).toMatchObject({ card: 'summary_large_image', images: [IMAGEN] });
  });

  it('sin fotos también va la tarjeta (con el fondo de la marca)', () => {
    const m = metadataDeLaVistaPrevia({ ...DEL_YERBAL, images: [] }, { idioma: 'es', url: '/es/propiedades/x' });
    expect(m.openGraph).toMatchObject({ images: [{ url: IMAGEN }] });
  });

  it('una venta y en inglés', () => {
    const m = metadataDeLaVistaPrevia(
      { ...DEL_YERBAL, listingType: 'SALE', monthlyRent: null, salePrice: 480_000_000, bedrooms: 3 },
      { idioma: 'en', url: `/en/propiedades/${ID}` },
    );
    expect(m.description).toBe('For sale · $\u00a0480,000,000 · 3 bd · Stratum 4 · El Yerbal, Envigado');
    expect(m.openGraph).toMatchObject({ locale: 'en_US' });
  });
});

describe('pedirInmobiliariaDeLaVistaPrevia', () => {
  const PORTOFINO = { id: 'e7b9937d-81f7-4447-a006-732b579193c4', nombre: 'Portofino Propiedad Raiz S.A.S.', logoUrl: 'https://x.supabase.co/l.webp' };

  it('busca la inmobiliaria del inmueble en el directorio público del marketplace', async () => {
    vi.stubEnv('NEXT_PUBLIC_BACKEND_URL', 'https://api.leasefy.co/api');
    const fetchFalso = vi.fn().mockResolvedValue(new Response(JSON.stringify([{ id: 'otra', nombre: 'Otra' }, PORTOFINO]), { status: 200 }));
    vi.stubGlobal('fetch', fetchFalso);
    await expect(pedirInmobiliariaDeLaVistaPrevia(PORTOFINO.id)).resolves.toEqual({ nombre: PORTOFINO.nombre, logoUrl: PORTOFINO.logoUrl });
    expect(fetchFalso).toHaveBeenCalledWith('https://api.leasefy.co/api/marketplace/inmobiliarias', expect.anything());
  });

  it('sin id, con un id raro, sin encontrarla o con el back caído: null', async () => {
    const fetchFalso = vi.fn();
    vi.stubGlobal('fetch', fetchFalso);
    await expect(pedirInmobiliariaDeLaVistaPrevia(null)).resolves.toBeNull();
    await expect(pedirInmobiliariaDeLaVistaPrevia('../x')).resolves.toBeNull();
    expect(fetchFalso).not.toHaveBeenCalled();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('[]', { status: 200 })));
    await expect(pedirInmobiliariaDeLaVistaPrevia(PORTOFINO.id)).resolves.toBeNull();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));
    await expect(pedirInmobiliariaDeLaVistaPrevia(PORTOFINO.id)).resolves.toBeNull();
  });
});

describe('pedirInmuebleParaLaVistaPrevia', () => {
  it('pide la ruta pública del back con el id, guardada 5 minutos', async () => {
    vi.stubEnv('NEXT_PUBLIC_BACKEND_URL', 'https://api.leasefy.co/api');
    const fetchFalso = vi.fn().mockResolvedValue(new Response(JSON.stringify(DEL_YERBAL), { status: 200 }));
    vi.stubGlobal('fetch', fetchFalso);
    await expect(pedirInmuebleParaLaVistaPrevia(ID)).resolves.toMatchObject({ title: DEL_YERBAL.title });
    expect(fetchFalso).toHaveBeenCalledWith(
      `https://api.leasefy.co/api/properties/${ID}`,
      expect.objectContaining({ next: { revalidate: 300 } }),
    );
  });

  it('un id que no es UUID ni se pide (va pegado a la ruta del back)', async () => {
    const fetchFalso = vi.fn();
    vi.stubGlobal('fetch', fetchFalso);
    await expect(pedirInmuebleParaLaVistaPrevia('../users/me')).resolves.toBeNull();
    expect(fetchFalso).not.toHaveBeenCalled();
  });

  it('404, un back caído o una respuesta rara: null, sin tirar la página', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 404 })));
    await expect(pedirInmuebleParaLaVistaPrevia(ID)).resolves.toBeNull();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')));
    await expect(pedirInmuebleParaLaVistaPrevia(ID)).resolves.toBeNull();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('null', { status: 200 })));
    await expect(pedirInmuebleParaLaVistaPrevia(ID)).resolves.toBeNull();
  });
});
