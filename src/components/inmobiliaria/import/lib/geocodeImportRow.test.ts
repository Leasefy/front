/**
 * geocodeImportRow — la ubicación de una fila del portafolio que se importa.
 *
 * La regla y su porqué viven en `ubicar-direccion.test.ts`. Acá sólo se fija
 * la traducción: que la fila de importación llegue completa a la regla
 * —incluido el departamento— y que la precisión vuelva con el vocabulario que
 * `StepConfirmImport` usa para contar cuántas quedaron sin dirección exacta.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { ubicarDireccion } = vi.hoisted(() => ({ ubicarDireccion: vi.fn() }));
vi.mock('@/lib/inmuebles/ubicar-direccion', async () => {
  const actual = await vi.importActual<typeof import('@/lib/inmuebles/ubicar-direccion')>(
    '@/lib/inmuebles/ubicar-direccion',
  );
  return { ...actual, ubicarDireccion };
});

import { geocodeImportRow } from './geocodeImportRow';

beforeEach(() => {
  ubicarDireccion.mockReset();
});

describe('geocodeImportRow', () => {
  /*
   * 🔴 El departamento no es un adorno: el portafolio real tiene un Rionegro
   * en Antioquia y otro en Santander. Sin él, la regla no puede verificar
   * contra el municipio correcto.
   */
  it('le pasa a la regla la dirección, el municipio Y el departamento', async () => {
    ubicarDireccion.mockResolvedValue({ lat: 6.09, lng: -75.63, precision: 'direccion' });

    await geocodeImportRow({
      propertyAddress: 'CR 50 CL 138 SUR -22',
      propertyCity: 'Caldas',
      propertyDepartment: 'Antioquia',
    });

    expect(ubicarDireccion).toHaveBeenCalledWith({
      direccion: 'CR 50 CL 138 SUR -22',
      ciudad: 'Caldas',
      departamento: 'Antioquia',
    });
  });

  it('una dirección verificada vuelve como «geocoded»', async () => {
    ubicarDireccion.mockResolvedValue({
      lat: 6.0925,
      lng: -75.6361,
      precision: 'direccion',
      etiqueta: 'Madame Purita',
    });

    expect(
      await geocodeImportRow({ propertyAddress: 'CRA 48 #128 SUR 14', propertyCity: 'Caldas' }),
    ).toEqual({ lat: 6.0925, lng: -75.6361, source: 'geocoded' });
  });

  /* El centro del municipio es lo que `StepConfirmImport` cuenta como «sin
     ubicar con precisión» para poder decirlo. */
  it('el centro del municipio vuelve como «city»', async () => {
    ubicarDireccion.mockResolvedValue({ lat: 6.0918, lng: -75.6356, precision: 'municipio' });

    expect(
      await geocodeImportRow({ propertyAddress: 'DETRAS DE LA ESCUELA', propertyCity: 'Caldas' }),
    ).toEqual({ lat: 6.0918, lng: -75.6356, source: 'city' });
  });

  it('sin nada que ubicar vuelve como «none», sin coordenadas', async () => {
    ubicarDireccion.mockResolvedValue({ precision: 'ninguna' });

    expect(
      await geocodeImportRow({ propertyAddress: '', propertyCity: 'Villa Que No Existe' }),
    ).toEqual({ lat: undefined, lng: undefined, source: 'none' });
  });
});
