import { describe, expect, it } from 'vitest';

import { destinoSeguro, porLaVentana } from './ventana-encima';

describe('La ventana de publicar encima de la home (28-10-2026)', () => {
  it('sólo sigue a rutas de Leasefy', () => {
    expect(destinoSeguro('/publica?perfil=agency')).toBe('/publica?perfil=agency');
    expect(destinoSeguro('//otro.sitio/x')).toBe('/publica');
    expect(destinoSeguro('https://otro.sitio')).toBe('/publica');
    expect(destinoSeguro(null)).toBe('/publica');
  });
  it('el destino pasa por la página que avisa a la de arriba', () => {
    expect(porLaVentana('/publica?perfil=landlord')).toBe('/publica/ventana/ir?a=%2Fpublica%3Fperfil%3Dlandlord');
  });
});
