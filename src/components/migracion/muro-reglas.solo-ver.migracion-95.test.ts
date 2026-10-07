/**
 * QA-MIGRACION-95 (fork de hallazgos, 06-10-2026) — RO-04: quien sólo puede
 * VER no recibe un paso que no puede hacer.
 *
 * Visto en el navegador con el VISOR de la inmobiliaria B (b-RO-viewer-*.png):
 * el muro le abría el asistente de inmuebles y la subida de contratos, con
 * «Retomar» y «Descartar» en las cargas a medias, porque medía el paso con
 * `portafolio:view` / `contratos:view`. El back le responde 403 al preparar,
 * descartar y activar (piden `create`): subía el archivo y se estrellaba. El
 * asesor (AGENTE), que sí crea inmuebles, lo sigue viendo.
 */
import { describe, expect, it } from 'vitest';

import { puedeHacerElPaso } from './muro-reglas';

type Accion = 'view' | 'create';
const conPermisos = (permisos: Record<string, Accion[]>) => (modulo: string, accion: Accion) =>
  (permisos[modulo] ?? []).includes(accion);

describe('el muro mide los pasos con el permiso de HACERLOS (RO-04)', () => {
  it('el visor (sólo ver portafolio y contratos) no recibe inmuebles ni contratos', () => {
    const p = { canAccess: conPermisos({ portafolio: ['view'], contratos: ['view'], propietarios: ['view'] }), agencyRole: 'VIEWER' };
    expect(puedeHacerElPaso('propiedades', p)).toBe(false);
    expect(puedeHacerElPaso('contratos', p)).toBe(false);
    expect(puedeHacerElPaso('propietarios', p)).toBe(false);
  });

  it('el asesor, que crea inmuebles, sí recibe el paso de inmuebles (y no el de contratos)', () => {
    const p = { canAccess: conPermisos({ portafolio: ['view', 'create'] }), agencyRole: 'AGENTE' };
    expect(puedeHacerElPaso('propiedades', p)).toBe(true);
    expect(puedeHacerElPaso('contratos', p)).toBe(false);
  });
});
