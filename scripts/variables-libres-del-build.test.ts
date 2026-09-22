/**
 * El detector de identificadores libres reconoce la huella del ReferenceError
 * de Propietarios (QA 22-09) y no marca lo que sí está declarado.
 *
 * El guardián entero corre sobre `.next/static/chunks` después de `pnpm build`
 * (ver CLAUDE.md, Gates manuales); acá se prueba la pieza que decide, con el
 * código que el minificador produjo aquel día.
 */

import { describe, expect, it } from 'vitest';

import { libresDelChunk } from './variables-libres-del-build.mjs';

type Hallado = { nombre: string; contexto: string };
const nombres = (fuente: string) => (libresDelChunk(fuente) as Hallado[]).map((h) => h.nombre);

describe('libresDelChunk', () => {
  it('🔴 marca la forma exacta del 22-09: el cierre inlineado con los nombres originales', () => {
    const chunk =
      '(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[1],{1:function(e,t,a){' +
      'var Z=function(S,D){var e,t;return{todos:(e={tipo:"all"},eu(S,{...D,...e}).length),' +
      'persona:(t={tipo:"person"},eu(propietarios,{...filtros,...t}).length)}};' +
      'function eu(x,y){return x}}}]);';
    expect(nombres(chunk).sort()).toEqual(['filtros', 'propietarios']);
  });

  it('lo declarado, los parámetros y los globales del navegador no se marcan', () => {
    // Envuelto en una función, como webpack envuelve cada módulo.
    const chunk =
      '(function(){var propietarios=[];function f(filtros){return propietarios.concat(filtros)}' +
      'window.addEventListener("x",f);document.title=navigator.userAgent;})();';
    expect(nombres(chunk)).toEqual([]);
  });

  it('los nombres de 1–2 letras (minificador, webpack) no se juzgan', () => {
    expect(nombres('ab(cd);')).toEqual([]);
  });
});
