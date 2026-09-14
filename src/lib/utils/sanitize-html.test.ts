// @vitest-environment node
//
// Este archivo corre a propósito en entorno `node` (sin DOM), no en el
// happy-dom global de `vitest.config.ts`: el bug que cubre era EXACTAMENTE que
// el módulo reventara al cargarse del lado del servidor.
//
// Qué pasaba: `sanitize-html.ts` importa `isomorphic-dompurify` en el nivel
// superior; en el servidor eso carga jsdom, y webpack lo empaquetaba dentro del
// bundle de Next (ver el comentario largo en `next.config.mjs`). Empaquetado,
// jsdom buscaba su hoja de estilos por defecto en
// `.next/browser/default-stylesheet.css` —que no existe— y tiraba ENOENT al
// cargar el módulo. Resultado: `GET /panel/inmobiliaria/contratos/<id>`
// devolvía 500 al abrirla por URL directa o al recargar. Por clic desde la
// lista no se notaba porque eso es navegación de cliente.

import { describe, expect, it } from 'vitest';

import nextConfig from '../../../next.config.mjs';

import { sanitizeContractHtml } from './sanitize-html';

describe('sanitizeContractHtml en el servidor (sin DOM)', () => {
  it('carga y sanea sin necesitar un DOM del navegador', () => {
    const { dangerouslySetInnerHTML } = sanitizeContractHtml(
      '<p>Canon <b>$1.500.000</b></p><script>alert(1)</script>'
    );

    expect(dangerouslySetInnerHTML.__html).toContain('<b>$1.500.000</b>');
    expect(dangerouslySetInnerHTML.__html).not.toContain('<script');
  });

  it('trata null/undefined como cadena vacía, no como HTML a inyectar', () => {
    expect(sanitizeContractHtml(null).dangerouslySetInnerHTML.__html).toBe('');
    expect(sanitizeContractHtml(undefined).dangerouslySetInnerHTML.__html).toBe('');
  });

  it('saca los manejadores de evento en línea', () => {
    const { dangerouslySetInnerHTML } = sanitizeContractHtml(
      '<img src="x" onerror="alert(1)"><a href="#" onclick="alert(2)">ver</a>'
    );

    expect(dangerouslySetInnerHTML.__html).not.toContain('onerror');
    expect(dangerouslySetInnerHTML.__html).not.toContain('onclick');
  });
});

describe('next.config.mjs', () => {
  // Éste es el guard de verdad contra la regresión: si alguien saca
  // `isomorphic-dompurify` de los externos del servidor, webpack vuelve a
  // empaquetar jsdom y la ficha del contrato vuelve a dar 500 al recargar.
  it('deja `isomorphic-dompurify` fuera del bundle de servidor', () => {
    expect(nextConfig.experimental?.serverComponentsExternalPackages).toContain(
      'isomorphic-dompurify'
    );
  });
});
