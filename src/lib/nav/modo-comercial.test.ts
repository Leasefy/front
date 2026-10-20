import { describe, expect, it } from 'vitest';

import { abiertaEnModoComercial, enModoComercial } from './modo-comercial';

/** Juan, 19-10-2026: «que solo vea lo comercial». */
describe('el modo comercial del panel', () => {
  it('abre lo comercial: inmuebles, interesados, postulaciones, agenda, mensajes y su página', () => {
    for (const r of [
      '/panel/inmobiliaria/inmuebles',
      '/panel/inmobiliaria/inmuebles/nuevo',
      '/panel/inmobiliaria/inmuebles/abc-123?tab=fotos',
      '/panel/inmobiliaria/pipeline',
      '/panel/inmobiliaria/postulaciones',
      '/panel/inmobiliaria/agenda',
      '/panel/inmobiliaria/mensajes',
      '/panel/inmobiliaria/configuracion/tu-pagina',
    ]) {
      expect(abiertaEnModoComercial(r)).toBe(true);
    }
  });

  it('cierra lo demás y lo que hacen los agentes de IA, aunque viva dentro de lo comercial', () => {
    for (const r of [
      '/panel/inmobiliaria',
      '/panel/inmobiliaria/contratos',
      '/panel/inmobiliaria/pagos/cobranza',
      '/panel/inmobiliaria/contabilidad',
      '/panel/inmobiliaria/configuracion',
      '/panel/inmobiliaria/configuracion/seguridad',
      '/panel/inmobiliaria/inmuebles/avaluos',
      '/panel/inmobiliaria/postulaciones/matching',
      '/panel/inmobiliaria/postulaciones/estudio',
      '/panel/inmobiliaria/inmueblesx',
    ]) {
      expect(abiertaEnModoComercial(r)).toBe(false);
    }
  });

  it('lo decide el back: sólo un `true` explícito', () => {
    expect(enModoComercial({ modoComercial: true })).toBe(true);
    expect(enModoComercial({ modoComercial: false })).toBe(false);
    expect(enModoComercial({})).toBe(false);
    expect(enModoComercial(null)).toBe(false);
  });
});
