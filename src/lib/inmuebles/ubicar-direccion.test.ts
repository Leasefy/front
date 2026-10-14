/**
 * Lo que se fija acá es la regla que faltaba: **un punto que cayó fuera de su
 * municipio no es el inmueble**.
 *
 * Los casos no son inventados. Salen de los 2.824 inmuebles reales de Nico:
 * 548 tenían punto en otro departamento (Amagá pinchado en Santa Marta,
 * Sabaneta en Villavicencio) porque la búsqueda aceptaba el primer resultado
 * sin mirar dónde había caído, y 1.442 no tenían punto porque su municipio no
 * estaba en la tabla de 32 ciudades.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { autocomplete, buscar } = vi.hoisted(() => ({ autocomplete: vi.fn(), buscar: vi.fn() }));
// La dirección se ubica con `buscar` (/v1/search); el centro del municipio, con `autocomplete`.
vi.mock('@/lib/api/geocode.service', () => ({ geocodeApi: { autocomplete, buscar } }));

import {
  consultaDeDireccion,
  consultasParaBuscar,
  direccionParaBuscar,
  distanciaKm,
  olvidarMunicipios,
  pareceDireccion,
  ubicarDireccion,
  RADIO_DEL_MUNICIPIO_KM,
} from './ubicar-direccion';

/** Los de verdad, de LocationIQ. */
const CALDAS = { lat: 6.0918609, lng: -75.6356917 };
const BOGOTA = { lat: 4.6016156, lng: -74.066217 };

const resultado = (lat: number, lon: number, label = 'un lugar', city?: string, road?: string) => ({
  label,
  lat,
  lon,
  placeId: `${lat},${lon}`,
  ...(city ? { city } : {}),
  ...(road ? { road } : {}),
});

beforeEach(() => {
  autocomplete.mockReset();
  buscar.mockReset().mockResolvedValue([]);
  olvidarMunicipios();
});

describe('pareceDireccion', () => {
  it('una dirección con vía y número sí lo es', () => {
    expect(pareceDireccion('CL 131 SUR 51 30 INT 611')).toBe(true);
    expect(pareceDireccion('CRA. 51 #98 SUR-237 APTO 1719')).toBe(true);
  });

  /*
   * 🔴 18 de cada 60 filas del portafolio real son esto. Buscarlas es gastar
   * una llamada para que el buscador conteste cualquier cosa a 500 km.
   */
  it('una referencia de barrio NO lo es', () => {
    for (const r of [
      'DETRAS DE LA ESCUELA 9902',
      'LAS ACACIAS',
      'FINCA',
      'MIRADOR TOÑITO PARA ARRIBA',
      'CERCA A LA BOMBA PRIMAX DE LA VARIANTE',
    ]) {
      expect(pareceDireccion(r)).toBe(false);
    }
  });

  it('vacío o nulo no lo es', () => {
    expect(pareceDireccion('')).toBe(false);
    expect(pareceDireccion(null)).toBe(false);
    expect(pareceDireccion(undefined)).toBe(false);
  });
});

describe('direccionParaBuscar', () => {
  it('expande la vía escrita como la escribe una inmobiliaria', () => {
    expect(direccionParaBuscar('CR 50 CL 138 SUR -22')).toBe('Carrera 50 Calle 138 SUR -22');
    expect(direccionParaBuscar('CLLE 124 A SUR CR 50 B 65')).toBe(
      'Calle 124 A SUR Carrera 50 B 65',
    );
    expect(direccionParaBuscar('KRA 45 DG 12')).toBe('Carrera 45 Diagonal 12');
  });

  /* El interior no ayuda a encontrar la cuadra: estorba. */
  it('corta desde el interior hasta el final, sin dejar restos', () => {
    expect(direccionParaBuscar('CL 132 SUR 51 37 INT. 301')).toBe('Calle 132 SUR 51 37');
    expect(direccionParaBuscar('CRA 54 CALLE 124 SUR, APTO 101 - FUNDADORES')).toBe(
      'Carrera 54 Calle 124 SUR',
    );
    expect(
      direccionParaBuscar('CALLE 129 SUR # 55-51. APARTAMENTO 304. EDIFICIO SANTA ANA'),
    ).toBe('Calle 129 SUR # 55-51');
  });

  /*
   * 🔴 La marca se busca DESPUÉS de la vía. Con la dirección que arranca por
   * el edificio, cortar en la primera marca la borraba entera.
   */
  it('una dirección que arranca por el edificio no se queda en nada', () => {
    expect(direccionParaBuscar('EDIFICIO SANTA ANA, CALLE 10 # 20-30')).toBe(
      'EDIFICIO SANTA ANA Calle 10 # 20-30',
    );
  });

  it('normaliza «N°», «No» y «Nº» al mismo numeral', () => {
    expect(direccionParaBuscar('CR 45 N° 134 SUR - 4')).toBe('Carrera 45 # 134 SUR - 4');
    expect(direccionParaBuscar('CARRERA 50 N. 127 SUR - 61')).toBe('Carrera 50 # 127 SUR - 61');
  });
});

describe('consultaDeDireccion', () => {
  /*
   * 🔴 Sin esto, «CALLE 132 SUR 55 19» es una calle de Bogotá tanto como una
   * de Caldas — y Bogotá gana, porque tiene más resultados.
   */
  it('lleva el municipio, el departamento y el país', () => {
    expect(
      consultaDeDireccion({
        direccion: 'CL 132 SUR 55 19',
        ciudad: 'Caldas',
        departamento: 'Antioquia',
      }),
    ).toBe('Calle 132 SUR 55 19, Caldas, Antioquia, Colombia');
  });

  it('sin departamento no deja el hueco', () => {
    expect(consultaDeDireccion({ direccion: 'CL 10 20', ciudad: 'Caldas' })).toBe(
      'Calle 10 20, Caldas, Colombia',
    );
  });
});

describe('distanciaKm', () => {
  it('mide lo que mide: Caldas a Bogotá son ~240 km', () => {
    expect(Math.round(distanciaKm(CALDAS, BOGOTA))).toBeGreaterThan(220);
    expect(Math.round(distanciaKm(CALDAS, BOGOTA))).toBeLessThan(260);
  });

  it('el mismo punto es cero', () => {
    expect(distanciaKm(CALDAS, CALDAS)).toBe(0);
  });
});

describe('ubicarDireccion', () => {
  /*
   * 🔴 UNA sola llamada cuando el resultado ya dice su municipio: la primera
   * versión pedía el centro y la dirección seguidas y LocationIQ —dos por
   * segundo— rechazaba la segunda.
   */
  it('un punto sobre su misma vía y en su municipio se acepta de una, sin una segunda llamada', async () => {
    buscar.mockResolvedValueOnce([resultado(6.0925, -75.6361, 'Carrera 48, Caldas', 'Caldas', 'Carrera 48')]);

    const u = await ubicarDireccion({ direccion: 'CRA 48 #128 SUR 14', ciudad: 'Caldas', departamento: 'Antioquia' });

    expect(u.precision).toBe('direccion');
    expect(u.lat).toBeCloseTo(6.0925, 4);
    expect(buscar).toHaveBeenCalledTimes(1);
    expect(autocomplete).not.toHaveBeenCalled();
  });

  it('el municipio se compara sin acentos ni mayúsculas: «Itagüí» ≡ «ITAGUI»', async () => {
    buscar.mockResolvedValueOnce([resultado(6.1724, -75.6093, 'Calle 52 Sur', 'Itagüí', 'Calle 52 Sur')]);

    const u = await ubicarDireccion({ direccion: 'CL 52 SUR 48 30', ciudad: 'ITAGUI', departamento: 'Antioquia' });

    expect(u.precision).toBe('direccion');
    expect(buscar).toHaveBeenCalledTimes(1);
  });

  it('un resultado sin municipio se mide contra el centro', async () => {
    buscar.mockResolvedValueOnce([resultado(6.0925, -75.6361, 'Carrera 48', undefined, 'Kr 48')]);
    autocomplete.mockResolvedValueOnce([resultado(CALDAS.lat, CALDAS.lng, 'Caldas, Antioquia')]);

    const u = await ubicarDireccion({ direccion: 'CRA 48 #128 SUR 14', ciudad: 'Caldas', departamento: 'Antioquia' });

    expect(u.precision).toBe('direccion');
    expect(autocomplete).toHaveBeenCalledTimes(1);
  });

  /* 🔴 EL caso de los 548: la misma vía existe en Bogotá. Se descarta. */
  it('un punto a 240 km NO es este inmueble: cae al municipio', async () => {
    buscar.mockResolvedValue([resultado(BOGOTA.lat, BOGOTA.lng, 'Calle 132 Sur, Bogotá', 'Bogotá', 'Calle 132 Sur')]);
    autocomplete.mockResolvedValueOnce([resultado(CALDAS.lat, CALDAS.lng, 'Caldas, Antioquia')]);

    const u = await ubicarDireccion({ direccion: 'CALLE 132 SUR 55 19', ciudad: 'Caldas', departamento: 'Antioquia' });

    expect(u.precision).toBe('municipio');
    expect(u.lat).toBeCloseTo(CALDAS.lat, 4);
    expect(u.lng).toBeCloseTo(CALDAS.lng, 4);
  });

  it('justo en el borde del radio todavía cuenta como dirección', async () => {
    const cerca = { lat: CALDAS.lat + (RADIO_DEL_MUNICIPIO_KM / 2 / 111), lng: CALDAS.lng };
    buscar.mockResolvedValueOnce([resultado(cerca.lat, cerca.lng, 'Calle 10', undefined, 'Calle 10')]);
    autocomplete.mockResolvedValueOnce([resultado(CALDAS.lat, CALDAS.lng)]);

    const u = await ubicarDireccion({ direccion: 'CL 10 # 20 30', ciudad: 'Caldas', departamento: 'Antioquia' });

    expect(u.precision).toBe('direccion');
  });

  /*
   * 🔴 QA de Portofino (14-10-2026, 30 direcciones reales, Nico: «estricto»).
   * Antes bastaba caer en el municipio: «CRA 82A 33B-48» quedaba en la
   * Carrera 76 y «CL 131 SUR 50-35» en la Calle 142 A Sur, marcadas «dirección».
   */
  it('🔴 un resultado en OTRA vía de su municipio no es la dirección: cae al centro', async () => {
    buscar.mockResolvedValue([
      resultado(6.245, -75.59, '33A-48, Carrera 76, Laureles, Medellín', 'Medellín', 'Carrera 76'),
    ]);
    autocomplete.mockResolvedValueOnce([resultado(6.2442, -75.5812, 'Medellín')]);

    const u = await ubicarDireccion({ direccion: 'CRA 82A 33B-48 6TO PISO LA CASTELLANA', ciudad: 'Medellin', departamento: 'Antioquia' });

    expect(u.precision).toBe('municipio');
  });

  it('🔴 la letra cuenta: la Calle 45 Sur no es la Calle 45 A Sur', async () => {
    buscar.mockResolvedValue([resultado(6.17, -75.58, 'Cl 45 S', 'Envigado', 'Cl 45 S')]);
    autocomplete.mockResolvedValueOnce([resultado(6.17, -75.59, 'Envigado')]);

    const u = await ubicarDireccion({ direccion: 'CALLE 45A SUR # 39B 101', ciudad: 'Envigado', departamento: 'Antioquia' });

    expect(u.precision).toBe('municipio');
  });

  it('de varios resultados se queda con el que está sobre su vía, escrita como sea («Kr 50 142 S 10»)', async () => {
    buscar.mockResolvedValueOnce([
      resultado(6.11, -75.63, 'Carrera 50, La Estrella', 'La Estrella', 'Carrera 50'),
      resultado(6.0905, -75.6371, 'Kr 50 142 S 10, Caldas', 'Caldas', 'Kr 50'),
    ]);

    const u = await ubicarDireccion({ direccion: 'CR 50 CL 142 SUR 10 INT 314', ciudad: 'Caldas', departamento: 'Antioquia' });

    expect(u.precision).toBe('direccion');
    expect(u.lat).toBeCloseTo(6.0905, 4);
  });

  it('sin una vía que leer no hay con qué verificar: ni se busca la dirección', async () => {
    autocomplete.mockResolvedValueOnce([resultado(CALDAS.lat, CALDAS.lng)]);

    const u = await ubicarDireccion({ direccion: 'DETRAS DE LA ESCUELA 9902', ciudad: 'Caldas', departamento: 'Antioquia' });

    expect(u.precision).toBe('municipio');
    expect(buscar).not.toHaveBeenCalled();
    expect(autocomplete).toHaveBeenCalledTimes(1);
    expect(autocomplete.mock.calls[0][0]).toBe('Caldas, Antioquia, Colombia');
  });

  it('un municipio que ninguna tabla conoce igual queda ubicado', async () => {
    autocomplete.mockResolvedValueOnce([resultado(6.0406977, -75.7030694, 'Amagá, Antioquia')]);

    const u = await ubicarDireccion({ direccion: 'PARTIDAS CAMILO C', ciudad: 'Amaga', departamento: 'Antioquia' });

    expect(u.precision).toBe('municipio');
    expect(u.lat).toBeCloseTo(6.0406977, 4);
  });

  it('el centro del municipio se pregunta UNA vez para todo el portafolio', async () => {
    autocomplete.mockResolvedValue([resultado(CALDAS.lat, CALDAS.lng)]);

    await ubicarDireccion({ direccion: 'FINCA', ciudad: 'Caldas', departamento: 'Antioquia' });
    await ubicarDireccion({ direccion: 'CASA', ciudad: 'Caldas', departamento: 'Antioquia' });
    await ubicarDireccion({ direccion: 'LOTE', ciudad: 'Caldas', departamento: 'Antioquia' });

    expect(autocomplete).toHaveBeenCalledTimes(1);
  });

  it('sin municipio y sin nada que verificar, no se inventa un punto', async () => {
    autocomplete.mockResolvedValue([]);

    const u = await ubicarDireccion({ direccion: 'CL 10 # 20 30', ciudad: 'Villa Que No Existe', departamento: 'Ninguno' });

    expect(u.precision).toBe('ninguna');
    expect(u.lat).toBeUndefined();
    expect(u.lng).toBeUndefined();
  });

  it('un buscador caído no tumba la carga: devuelve «ninguna», no lanza', async () => {
    buscar.mockRejectedValue(new Error('503'));
    autocomplete.mockRejectedValue(new Error('503'));

    const u = await ubicarDireccion({ direccion: 'CL 10 # 20 30', ciudad: 'Nunca Jamás', departamento: 'Antioquia' });

    expect(u.precision).toBe('ninguna');
  });

  it('con el buscador caído, una ciudad conocida cae en su centro', async () => {
    buscar.mockRejectedValue(new Error('503'));
    autocomplete.mockRejectedValue(new Error('503'));

    const u = await ubicarDireccion({ direccion: 'CL 10 # 20 30', ciudad: 'Medellín', departamento: 'Antioquia' });

    expect(u.precision).toBe('municipio');
    expect(u.lat).toBeCloseTo(6.2442, 3);
  });
});

describe('consultasParaBuscar (T-0159)', () => {
  it('normalised first, then cleaned, then raw, without repeats', () => {
    const q = consultasParaBuscar({
      direccion: 'CR 55 N 53 A - 35 TO 1 AP 2201- PQ 3049 RESERVAS D',
      ciudad: 'Caldas',
      departamento: 'Antioquia',
    });
    expect(q[0]).toBe('Carrera 55 # 53 A - 35, Caldas, Antioquia, Colombia');
    expect(q).toHaveLength(3);
    expect(q[2]).toBe(
      'CR 55 N 53 A - 35 TO 1 AP 2201- PQ 3049 RESERVAS D, Caldas, Antioquia, Colombia',
    );
    expect(new Set(q).size).toBe(q.length);
  });

  it('landmarks and building names yield no queries (today path)', () => {
    expect(consultasParaBuscar({ direccion: 'EDIFICIO LUCIANA', ciudad: 'Caldas' })).toEqual([]);
    expect(consultasParaBuscar({ direccion: 'PARQUE PRINCIPAL', ciudad: 'Caldas' })).toEqual([]);
  });
});

describe('ubicarDireccion: noisy addresses (T-0159)', () => {
  const direccion = 'CR 55 N 53 A - 35 TO 1 AP 2201- PQ 3049 RESERVAS D';

  it('geocodes the normalised address first', async () => {
    buscar.mockResolvedValueOnce([resultado(6.0925, -75.6361, 'Carrera 55', 'Caldas', 'Carrera 55')]);

    const u = await ubicarDireccion({ direccion, ciudad: 'Caldas', departamento: 'Antioquia' });

    expect(u.precision).toBe('direccion');
    expect(buscar).toHaveBeenCalledTimes(1);
    expect(buscar.mock.calls[0][0]).toBe(
      'Carrera 55 # 53 A - 35, Caldas, Antioquia, Colombia',
    );
  });

  it('falls back to the next query when the normalised one finds nothing', async () => {
    buscar
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([resultado(6.0925, -75.6361, 'Carrera 55', 'Caldas', 'Carrera 55')]);

    const u = await ubicarDireccion({ direccion, ciudad: 'Caldas', departamento: 'Antioquia' });

    expect(u.precision).toBe('direccion');
    expect(buscar).toHaveBeenCalledTimes(2);
    expect(buscar.mock.calls[1][0]).toContain('Carrera 55 N 53 A');
  });

  it('every query failing lands on the municipality, as before', async () => {
    autocomplete.mockImplementation(async (q: string) =>
      q === 'Caldas, Antioquia, Colombia' ? [resultado(CALDAS.lat, CALDAS.lng)] : [],
    );

    const u = await ubicarDireccion({ direccion, ciudad: 'Caldas', departamento: 'Antioquia' });

    expect(u.precision).toBe('municipio');
    expect(u.lat).toBeCloseTo(CALDAS.lat, 4);
  });

  it('a normalised hit that lands in another city is still rejected', async () => {
    autocomplete.mockImplementation(async (q: string) =>
      q === 'Caldas, Antioquia, Colombia'
        ? [resultado(CALDAS.lat, CALDAS.lng)]
        : [],
    );
    buscar.mockResolvedValue([resultado(BOGOTA.lat, BOGOTA.lng, 'Carrera 55, Bogotá', 'Bogotá', 'Carrera 55')]);

    const u = await ubicarDireccion({ direccion, ciudad: 'Caldas', departamento: 'Antioquia' });

    expect(u.precision).toBe('municipio');
  });
});

describe('la vía principal (QA de Portofino, 14-10)', () => {
  it('se lee igual del archivo y del buscador', async () => {
    const { viaPrincipal, mismaVia } = await import('./normalizar-direccion-co');
    const casos: [string, string, boolean][] = [
      ['CL 131 SUR 50 - 35 INT 304', 'Calle 131 Sur', true],
      ['CLL 139 SUR # 47 A 52', 'Cl 139 S', true],
      ['CR 50 CL 142 SUR 10 INT 314', 'Kr 50', true],
      ['CRA 43A # 71 SUR - 41', 'Carrera 43A', true],
      ['CRA 39 E # 48 C SUR 103', 'Carrera 39E', true],
      ['CALLE 45A SUR # 39B 101', 'Cl 45 S', false],
      ['CRA 82A 33B-48', 'Carrera 76', false],
      ['CALLE 66 SUR CRA. 43 C 35', 'Manzana C', false],
      ['CL 72S 35-240', 'Calle 72A Sur', false],
    ];
    for (const [archivo, buscador, igual] of casos) {
      const a = viaPrincipal(archivo);
      const b = viaPrincipal(buscador);
      expect([archivo, buscador, a !== null && b !== null && mismaVia(a, b)]).toEqual([archivo, buscador, igual]);
    }
  });
});

describe('el cruce de la puerta (QA de Portofino, 14-10, 2.ª muestra)', () => {
  it('🔴 sobre la misma vía pero 29 calles más allá no es el inmueble', async () => {
    buscar.mockResolvedValue([{ ...resultado(6.07, -75.64, '124 S 87, Kr 54, Caldas', 'Caldas', 'Kr 54'), houseNumber: '124 S 87' }]);
    autocomplete.mockResolvedValueOnce([resultado(CALDAS.lat, CALDAS.lng)]);
    const u = await ubicarDireccion({ direccion: 'CRA 54 CALLE 153 SUR 87, APTO 1004', ciudad: 'Caldas', departamento: 'Antioquia' });
    expect(u.precision).toBe('municipio');
  });

  it('a una o dos calles del cruce sí lo es («Cl 77 S # 46B 65» por «# 47 C 65»)', async () => {
    buscar.mockResolvedValueOnce([{ ...resultado(6.15, -75.61, '46B 65, Cl 77 S, Sabaneta', 'Sabaneta', 'Cl 77 S'), houseNumber: '46B 65' }]);
    const u = await ubicarDireccion({ direccion: 'CL. 77 SUR # 47 C 65 INT 1301', ciudad: 'Sabaneta', departamento: 'Antioquia' });
    expect(u.precision).toBe('direccion');
  });
});
