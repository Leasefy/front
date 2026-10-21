import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  fotoParaLaVistaPrevia,
  metadataDeLaVistaPrevia,
  pedirInmuebleParaLaVistaPrevia,
  primeraFoto,
  type InmuebleDeLaVistaPrevia,
} from './vista-previa-del-inmueble';

const ID = '73ced217-d7ef-4abc-a088-428c51e420ad';
const FOTO = `https://rsywnqqrxuzylangbgmh.supabase.co/storage/v1/object/public/property-images/${ID}/1792598877929-wczje.jpg`;

/** Lo que devolvió producción el 21-10 para el inmueble que compartió Nico. */
const DEL_YERBAL: InmuebleDeLaVistaPrevia = {
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

describe('fotoParaLaVistaPrevia', () => {
  it('una foto del almacén pasa por el optimizador a 1200 px y calidad 75', () => {
    expect(fotoParaLaVistaPrevia(FOTO)).toBe(`/_next/image?url=${encodeURIComponent(FOTO)}&w=1200&q=75`);
  });

  it('la del almacén del laboratorio también', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://localhost:3309');
    const local = 'http://localhost:3309/storage/v1/object/public/property-images/x.jpg';
    expect(fotoParaLaVistaPrevia(local)).toBe(`/_next/image?url=${encodeURIComponent(local)}&w=1200&q=75`);
  });

  it('cualquier otra va tal cual (el optimizador la rechazaría)', () => {
    expect(fotoParaLaVistaPrevia('https://portofinopr.arrendasoft.co/img/fotos/1.jpg')).toBe(
      'https://portofinopr.arrendasoft.co/img/fotos/1.jpg',
    );
    expect(fotoParaLaVistaPrevia('no es una url')).toBe('no es una url');
  });
});

describe('metadataDeLaVistaPrevia', () => {
  it('título, descripción con el lugar y el precio, la foto y la URL', () => {
    const m = metadataDeLaVistaPrevia(DEL_YERBAL, { idioma: 'es', url: `/es/propiedades/${ID}` });
    const descripcion = 'Arriendo en El Yerbal, Envigado — $ 12.000.000 / mes';
    expect(m.title).toBe('Apartamento en El Yerbal, Envigado');
    expect(m.description).toBe(descripcion);
    expect(m.openGraph).toMatchObject({
      type: 'website',
      siteName: 'Leasefy',
      locale: 'es_CO',
      url: `/es/propiedades/${ID}`,
      title: 'Apartamento en El Yerbal, Envigado',
      description: descripcion,
      images: [{ url: fotoParaLaVistaPrevia(FOTO), alt: 'Apartamento en El Yerbal, Envigado' }],
    });
    expect(m.twitter).toMatchObject({ card: 'summary_large_image', images: [fotoParaLaVistaPrevia(FOTO)] });
  });

  it('sin fotos no pone `images` (queda la imagen de Leasefy del layout raíz)', () => {
    const m = metadataDeLaVistaPrevia({ ...DEL_YERBAL, images: [] }, { idioma: 'es', url: '/es/propiedades/x' });
    expect(m.openGraph && 'images' in m.openGraph).toBe(false);
    expect(m.twitter && 'images' in m.twitter).toBe(false);
  });

  it('una venta y en inglés', () => {
    const m = metadataDeLaVistaPrevia(
      { ...DEL_YERBAL, listingType: 'SALE', monthlyRent: null, salePrice: 480_000_000, bedrooms: 3 },
      { idioma: 'en', url: `/en/propiedades/${ID}` },
    );
    expect(m.description).toBe('For sale in El Yerbal, Envigado — $ 480,000,000 · 3 bedrooms');
    expect(m.openGraph).toMatchObject({ locale: 'en_US' });
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
