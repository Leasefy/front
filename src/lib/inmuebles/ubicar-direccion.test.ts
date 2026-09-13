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

const { autocomplete } = vi.hoisted(() => ({ autocomplete: vi.fn() }));
vi.mock('@/lib/api/geocode.service', () => ({ geocodeApi: { autocomplete } }));

import {
  consultaDeDireccion,
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

const resultado = (lat: number, lon: number, label = 'un lugar', city?: string) => ({
  label,
  lat,
  lon,
  placeId: `${lat},${lon}`,
  ...(city ? { city } : {}),
});

beforeEach(() => {
  autocomplete.mockReset();
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
   * 🔴 UNA sola llamada. La primera versión pedía el centro del municipio y
   * la dirección seguidas, y LocationIQ —dos por segundo— rechazaba la
   * segunda: el inmueble quedaba clavado en el centro del pueblo con la
   * dirección perfectamente resoluble. Se vio en vivo creando un inmueble de
   * Caldas.
   */
  it('un punto cuyo municipio coincide se acepta de una, sin una segunda llamada', async () => {
    autocomplete.mockResolvedValueOnce([
      resultado(6.0925, -75.6361, 'Madame Purita, Carrera 49', 'Caldas'),
    ]);

    const u = await ubicarDireccion({
      direccion: 'CRA 48 #128 SUR 14',
      ciudad: 'Caldas',
      departamento: 'Antioquia',
    });

    expect(u.precision).toBe('direccion');
    expect(u.lat).toBeCloseTo(6.0925, 4);
    expect(u.etiqueta).toContain('Madame Purita');
    expect(autocomplete).toHaveBeenCalledTimes(1);
  });

  it('el municipio se compara sin acentos ni mayúsculas: «Itagüí» ≡ «ITAGUI»', async () => {
    autocomplete.mockResolvedValueOnce([resultado(6.1724, -75.6093, 'una calle', 'Itagüí')]);

    const u = await ubicarDireccion({
      direccion: 'CL 52 SUR 48 30',
      ciudad: 'ITAGUI',
      departamento: 'Antioquia',
    });

    expect(u.precision).toBe('direccion');
    expect(autocomplete).toHaveBeenCalledTimes(1);
  });

  /* Sin municipio en la respuesta queda la distancia, que es el respaldo. */
  it('un resultado sin municipio se mide contra el centro', async () => {
    autocomplete
      .mockResolvedValueOnce([resultado(6.0925, -75.6361, 'un punto de interés')])
      .mockResolvedValueOnce([resultado(CALDAS.lat, CALDAS.lng, 'Caldas, Antioquia')]);

    const u = await ubicarDireccion({
      direccion: 'CRA 48 #128 SUR 14',
      ciudad: 'Caldas',
      departamento: 'Antioquia',
    });

    expect(u.precision).toBe('direccion');
    expect(autocomplete).toHaveBeenCalledTimes(2);
  });

  /*
   * 🔴 EL caso. Es exactamente lo que pasó 548 veces: la dirección existe en
   * Bogotá, el buscador la devuelve, y antes se guardaba tal cual. Ahora el
   * punto se descarta y el inmueble queda en su municipio.
   */
  it('un punto a 240 km NO es este inmueble: cae al municipio', async () => {
    autocomplete
      .mockResolvedValueOnce([resultado(BOGOTA.lat, BOGOTA.lng, 'Calle 132 Sur, Bogotá', 'Bogotá')])
      .mockResolvedValueOnce([resultado(CALDAS.lat, CALDAS.lng, 'Caldas, Antioquia')]);

    const u = await ubicarDireccion({
      direccion: 'CALLE 132 SUR 55 19',
      ciudad: 'Caldas',
      departamento: 'Antioquia',
    });

    expect(u.precision).toBe('municipio');
    expect(u.lat).toBeCloseTo(CALDAS.lat, 4);
    expect(u.lng).toBeCloseTo(CALDAS.lng, 4);
  });

  it('justo en el borde del radio todavía cuenta como dirección', async () => {
    // Un grado de latitud son ~111 km: medio radio queda cómodamente adentro.
    const cerca = { lat: CALDAS.lat + (RADIO_DEL_MUNICIPIO_KM / 2 / 111), lng: CALDAS.lng };
    autocomplete
      .mockResolvedValueOnce([resultado(cerca.lat, cerca.lng)])
      .mockResolvedValueOnce([resultado(CALDAS.lat, CALDAS.lng)]);

    const u = await ubicarDireccion({
      direccion: 'CL 10 # 20 30',
      ciudad: 'Caldas',
      departamento: 'Antioquia',
    });

    expect(u.precision).toBe('direccion');
  });

  /* Una referencia no se busca: se queda en su municipio y punto. */
  it('una referencia de barrio no gasta una búsqueda de dirección', async () => {
    autocomplete.mockResolvedValueOnce([resultado(CALDAS.lat, CALDAS.lng)]);

    const u = await ubicarDireccion({
      direccion: 'DETRAS DE LA ESCUELA 9902',
      ciudad: 'Caldas',
      departamento: 'Antioquia',
    });

    expect(u.precision).toBe('municipio');
    expect(autocomplete).toHaveBeenCalledTimes(1);
    expect(autocomplete.mock.calls[0][0]).toBe('Caldas, Antioquia, Colombia');
  });

  /*
   * 🔴 Los 1.442: Caldas, La Estrella y Amagá no estaban en la tabla de 32
   * ciudades, así que no había red de seguridad. Preguntar por el municipio
   * sí los cubre, sean 32 o 1.103.
   */
  it('un municipio que ninguna tabla conoce igual queda ubicado', async () => {
    autocomplete.mockResolvedValueOnce([resultado(6.0406977, -75.7030694, 'Amagá, Antioquia')]);

    const u = await ubicarDireccion({
      direccion: 'PARTIDAS CAMILO C',
      ciudad: 'Amaga',
      departamento: 'Antioquia',
    });

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

    const u = await ubicarDireccion({
      direccion: 'CL 10 # 20 30',
      ciudad: 'Villa Que No Existe',
      departamento: 'Ninguno',
    });

    expect(u.precision).toBe('ninguna');
    expect(u.lat).toBeUndefined();
    expect(u.lng).toBeUndefined();
  });

  it('un buscador caído no tumba la carga: devuelve «ninguna», no lanza', async () => {
    autocomplete.mockRejectedValue(new Error('503'));

    const u = await ubicarDireccion({
      direccion: 'CL 10 # 20 30',
      ciudad: 'Nunca Jamás',
      departamento: 'Antioquia',
    });

    expect(u.precision).toBe('ninguna');
  });

  /* La tabla de ciudades sigue siendo la red cuando el buscador no contesta. */
  it('con el buscador caído, una ciudad conocida cae en su centro', async () => {
    autocomplete.mockRejectedValue(new Error('503'));

    const u = await ubicarDireccion({
      direccion: 'CL 10 # 20 30',
      ciudad: 'Medellín',
      departamento: 'Antioquia',
    });

    expect(u.precision).toBe('municipio');
    expect(u.lat).toBeCloseTo(6.2442, 3);
  });
});
