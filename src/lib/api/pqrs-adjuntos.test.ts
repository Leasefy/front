/**
 * QA en Chrome (21-10-2026): el inquilino no podía mandar el video de la fuga
 * («no es una foto ni un PDF»). Los adjuntos de una PQRS aceptan videos de hasta
 * 20 MB; los documentos del proveedor siguen siendo sólo fotos y PDF.
 */
import { describe, expect, it } from 'vitest';
import {
  ACCEPT_DE_ADJUNTOS,
  ACCEPT_DE_ADJUNTOS_DE_PQRS,
  esVideoDePqrs,
  problemaDelAdjunto,
  problemaDelAdjuntoDePqrs,
} from './pqrs-adjuntos';

const MB = 1024 * 1024;

function archivo(nombre: string, tipo: string, bytes: number): File {
  const f = new File(['x'], nombre, { type: tipo });
  Object.defineProperty(f, 'size', { value: bytes });
  return f;
}

describe('adjuntos de una PQRS con videos', () => {
  it('un video MP4 o MOV de hasta 20 MB entra; de más, la frase dice cuánto', () => {
    expect(problemaDelAdjuntoDePqrs(archivo('fuga.mp4', 'video/mp4', 15 * MB))).toBeNull();
    expect(problemaDelAdjuntoDePqrs(archivo('fuga.mov', 'video/quicktime', 2 * MB))).toBeNull();
    expect(problemaDelAdjuntoDePqrs(archivo('largo.mp4', 'video/mp4', 21 * MB))).toMatch(/más de 20 MB/);
  });

  it('un .mov sin tipo (algunos navegadores lo mandan vacío) se reconoce por la extensión', () => {
    expect(esVideoDePqrs({ name: 'fuga.MOV', type: '' })).toBe(true);
    expect(problemaDelAdjuntoDePqrs(archivo('fuga.mov', '', 3 * MB))).toBeNull();
  });

  it('fotos y PDF siguen en 10 MB; lo demás se rechaza nombrando foto, video y PDF', () => {
    expect(problemaDelAdjuntoDePqrs(archivo('foto.jpg', 'image/jpeg', 11 * MB))).toMatch(/más de 10 MB/);
    expect(problemaDelAdjuntoDePqrs(archivo('acta.pdf', 'application/pdf', MB))).toBeNull();
    expect(problemaDelAdjuntoDePqrs(archivo('virus.exe', 'application/x-msdownload', MB))).toMatch(
      /no es una foto, un video ni un PDF/,
    );
  });

  it('el selector de la PQRS ofrece videos; el del proveedor no', () => {
    expect(ACCEPT_DE_ADJUNTOS_DE_PQRS).toContain('video/mp4');
    expect(ACCEPT_DE_ADJUNTOS).not.toContain('video');
    expect(problemaDelAdjunto(archivo('rut.mp4', 'video/mp4', MB))).toMatch(/no es una foto ni un PDF/);
  });
});
