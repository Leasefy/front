import { describe, it, expect } from 'vitest';
import { detectarTipoDeImagenPorFirma } from './firma-imagen';

function bytes(...vals: number[]): Uint8Array {
  return new Uint8Array(vals);
}

/**
 * T-0036: `imagen-remota` confiaba en el `Content-Type` que manda el origen,
 * y un CDN real sirve JPEGs genuinos rotulados `application/octet-stream`.
 * La firma de bytes es la única fuente que el origen no controla.
 */
describe('detectarTipoDeImagenPorFirma', () => {
  it('detecta un JPEG por su firma FF D8 FF, sin importar lo que declare el header', () => {
    // Los 12 bytes reales de la foto rechazada, medidos por el Orchestrator.
    const jpeg = bytes(0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01);
    expect(detectarTipoDeImagenPorFirma(jpeg)).toBe('image/jpeg');
  });

  it('detecta un PNG por su firma completa de 8 bytes', () => {
    const png = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d);
    expect(detectarTipoDeImagenPorFirma(png)).toBe('image/png');
  });

  it('detecta un WebP por RIFF….WEBP (bytes 0-3 y 8-11)', () => {
    const webp = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, // RIFF
      0x00, 0x00, 0x00, 0x00, // tamaño — no importa para la firma
      0x57, 0x45, 0x42, 0x50, // WEBP
    ]);
    expect(detectarTipoDeImagenPorFirma(webp)).toBe('image/webp');
  });

  it('rechaza HTML aunque el origen lo haya mandado como image/jpeg — el chequeo es de bytes', () => {
    const html = new TextEncoder().encode('<!DOCTYPE html><html><head></head><body></body></html>');
    expect(detectarTipoDeImagenPorFirma(html)).toBeNull();
  });

  it('rechaza un cuerpo vacío sin explotar', () => {
    expect(detectarTipoDeImagenPorFirma(new Uint8Array(0))).toBeNull();
  });

  it('rechaza un cuerpo más corto que cualquier firma (truncado)', () => {
    expect(detectarTipoDeImagenPorFirma(bytes(0xff, 0xd8))).toBeNull();
  });

  it('rechaza otros formatos binarios conocidos (PDF, ZIP)', () => {
    expect(detectarTipoDeImagenPorFirma(bytes(0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34))).toBeNull(); // %PDF-1.4
    expect(detectarTipoDeImagenPorFirma(bytes(0x50, 0x4b, 0x03, 0x04))).toBeNull(); // PK.. (zip)
  });

  it('no widens beyond lo que el back acepta: no hay una cuarta firma reconocida (GIF)', () => {
    const gif = new TextEncoder().encode('GIF89a');
    expect(detectarTipoDeImagenPorFirma(gif)).toBeNull();
  });
});
