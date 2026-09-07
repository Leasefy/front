import { describe, expect, it } from 'vitest';

import {
  AYUDA_SIN_TIPO,
  ayudaDelNumeroDeDocumento,
  tipoDeDocumentoDe,
} from './ayuda-del-documento';

describe('tipoDeDocumentoDe', () => {
  it.each([
    ['CC', 'CC'],
    ['cc', 'CC'],
    ['Cédula', 'CC'],
    ['C.C.', 'CC'],
    ['NIT', 'NIT'],
    ['CE', 'CE'],
    ['TI', 'TI'],
    ['PASSPORT', 'PASSPORT'],
    ['Pasaporte', 'PASSPORT'],
    ['PS', 'PASSPORT'],
  ])('«%s» → %s', (crudo, esperado) => {
    expect(tipoDeDocumentoDe(crudo)).toBe(esperado);
  });

  it('lo que no se reconoce es null, no CC: no se adivina', () => {
    expect(tipoDeDocumentoDe('')).toBeNull();
    expect(tipoDeDocumentoDe('RUT')).toBeNull();
    expect(tipoDeDocumentoDe(null)).toBeNull();
    expect(tipoDeDocumentoDe(undefined)).toBeNull();
    expect(tipoDeDocumentoDe(42)).toBeNull();
  });
});

describe('ayudaDelNumeroDeDocumento', () => {
  it('a un NIT le habla del dígito de verificación; a una CC, de sus 6 a 10 dígitos', () => {
    expect(ayudaDelNumeroDeDocumento('NIT')).toBe(
      '9 o 10 dígitos; el dígito de verificación después del guion se ignora.',
    );
    expect(ayudaDelNumeroDeDocumento('CC')).toBe(
      '6 a 10 dígitos, sin puntos ni espacios (las de 10 empiezan por 1).',
    );
  });

  it('TI, CE y pasaporte tienen su propio largo', () => {
    expect(ayudaDelNumeroDeDocumento('TI')).toContain('10 u 11 dígitos');
    expect(ayudaDelNumeroDeDocumento('CE')).toContain('5 a 10 dígitos');
    expect(ayudaDelNumeroDeDocumento('PASSPORT')).toContain('6 a 12 letras o dígitos');
  });

  it('sin tipo no inventa una regla: pide el tipo primero', () => {
    expect(ayudaDelNumeroDeDocumento(null)).toBe(AYUDA_SIN_TIPO);
    expect(AYUDA_SIN_TIPO).not.toContain('NIT');
  });
});
