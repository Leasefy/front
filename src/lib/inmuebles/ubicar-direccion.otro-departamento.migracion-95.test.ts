/**
 * QA-MIGRACION-95 (IN-06, 06-10-2026): «nada pinchado en otro departamento».
 *
 * La verificación por NOMBRE (sin segunda llamada) comparaba sólo el municipio.
 * Rionegro existe en Antioquia y en Santander (el portafolio real tiene los
 * dos): un resultado «Rionegro» de Santander para una fila de Rionegro,
 * Antioquia pasaba como «dirección» a 200 km. Visto en el navegador, agencia B,
 * fila 8302 de b-IN-lote.csv (importacion_inmuebles.ubicacion = DIRECCION en
 * 7.2647, -73.1514) con el buscador simulado.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { autocomplete } = vi.hoisted(() => ({ autocomplete: vi.fn() }));
vi.mock('@/lib/api/geocode.service', () => ({ geocodeApi: { autocomplete } }));

import { olvidarMunicipios, ubicarDireccion } from './ubicar-direccion';
import { normalizeAutocompleteResults } from '@/lib/api/geocode.normalize';

const RIONEGRO_ANTIOQUIA = { lat: 6.1551, lon: -75.3737 };
const RIONEGRO_SANTANDER = { lat: 7.2647, lon: -73.1514 };

beforeEach(() => {
  autocomplete.mockReset();
  olvidarMunicipios();
});

describe('IN-06: un municipio homónimo de otro departamento no pasa por el nombre', () => {
  it('el normalizador conserva el departamento que trae LocationIQ', () => {
    const [s] = normalizeAutocompleteResults([
      {
        place_id: '1',
        lat: String(RIONEGRO_SANTANDER.lat),
        lon: String(RIONEGRO_SANTANDER.lon),
        display_name: 'Calle 50, Rionegro, Santander, Colombia',
        address: { road: 'Calle 50', city: 'Rionegro', state: 'Santander' },
      },
    ]);
    expect(s.city).toBe('Rionegro');
    expect(s.state).toBe('Santander');
  });

  it('«Rionegro, Santander» para una fila de Rionegro, Antioquia: se mide contra el centro y cae al municipio', async () => {
    autocomplete
      .mockResolvedValueOnce([
        { label: 'Calle 50, Rionegro, Santander, Colombia', placeId: 'x', city: 'Rionegro', state: 'Santander', ...RIONEGRO_SANTANDER },
      ])
      .mockResolvedValueOnce([
        { label: 'Rionegro, Antioquia, Colombia', placeId: 'y', city: 'Rionegro', state: 'Antioquia', ...RIONEGRO_ANTIOQUIA },
      ]);
    const u = await ubicarDireccion({ direccion: 'CL 50 45 20', ciudad: 'Rionegro', departamento: 'Antioquia' });
    expect(u.precision).toBe('municipio');
    expect(u.lat).toBeCloseTo(RIONEGRO_ANTIOQUIA.lat, 3);
  });

  it('con el mismo departamento (sin tildes ni mayúsculas) sigue aceptándose de una', async () => {
    autocomplete.mockResolvedValueOnce([
      { label: 'Calle 50, Rionegro, Antioquia', placeId: 'z', city: 'Rionegro', state: 'ANTIOQUÍA', lat: 6.153, lon: -75.374 },
    ]);
    const u = await ubicarDireccion({ direccion: 'CL 50 45 20', ciudad: 'Rionegro', departamento: 'Antioquia' });
    expect(u.precision).toBe('direccion');
    expect(autocomplete).toHaveBeenCalledTimes(1);
  });
});
