import { describe, expect, it } from 'vitest';
import { logoDelAliado } from './logo-del-aliado';

describe('El logo de cada aliado del mes gratis', () => {
  it('lo encuentra por el nombre que trae el panel y por el código del enlace', () => {
    expect(logoDelAliado('Fianly')?.src).toBe('/aliados/fianly.webp');
    expect(logoDelAliado('La Lonja')?.src).toBe('/aliados/la-lonja.png');
    expect(logoDelAliado('la-lonja')?.forma).toBe('horizontal');
    expect(logoDelAliado('FENALCO')?.src).toBe('/aliados/fenalco.png');
    expect(logoDelAliado('Fenalco Antioquia')?.src).toBe('/aliados/fenalco.png');
    expect(logoDelAliado('Lonja de Medellín')?.src).toBe('/aliados/la-lonja.png');
  });
  it('sin logo conocido no inventa uno: se escribe el nombre', () => {
    expect(logoDelAliado('Camacol')).toBeNull();
    expect(logoDelAliado(null)).toBeNull();
    expect(logoDelAliado('')).toBeNull();
  });
});
