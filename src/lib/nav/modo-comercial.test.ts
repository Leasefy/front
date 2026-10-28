import { describe, expect, it } from 'vitest';

import { abiertaEnModoComercial, enModoComercial, pideActivar } from './modo-comercial';

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

describe('mes gratis o pagando sin activar (Nico, 27-10-2026: el aliado ve todo)', () => {
  it('«Tu plan» y el pago siempre abiertos, o no hay cómo pagar', () => {
    expect(abiertaEnModoComercial('/panel/inmobiliaria/upgrade')).toBe(true)
    expect(abiertaEnModoComercial('/panel/inmobiliaria/upgrade?seccion=preguntas')).toBe(true)
    expect(pideActivar('/panel/inmobiliaria/upgrade')).toBe(false)
  })

  it('sólo los agentes, el chat y la plata piden activar; lo demás se usa de una', () => {
    for (const ruta of ['/panel/inmobiliaria/contratos', '/panel/inmobiliaria/propietarios', '/panel/inmobiliaria/mantenimientos', '/panel/inmobiliaria/reportes', '/panel/inmobiliaria/inmuebles']) {
      expect(pideActivar(ruta)).toBe(false)
    }
    for (const ruta of ['/panel/inmobiliaria', '/panel/inmobiliaria/pagos/recaudo', '/panel/inmobiliaria/pagos/cobranza', '/panel/inmobiliaria/facturacion', '/panel/inmobiliaria/contabilidad', '/panel/inmobiliaria/conciliacion', '/panel/inmobiliaria/inmuebles/avaluos', '/panel/inmobiliaria/postulaciones/matching', '/panel/inmobiliaria/reportes/ia']) {
      expect(pideActivar(ruta)).toBe(true)
    }
  })
})
