/**
 * Guardianes de la Configuración única.
 *
 * El catálogo de secciones es la fuente de la nav interna, de los deep-links y
 * del permiso con que se abre cada una. Estos tests cuidan lo que no se ve
 * leyendo el archivo:
 *
 *   · cada sección tiene una URL que responde (page.tsx propio o el dinámico);
 *   · los enlaces viejos (`?tab=`) llegan a la sección nueva;
 *   · el permiso de cada sección es el que tenía su pantalla antes de unificar
 *     —nadie gana ni pierde acceso al reorganizar—;
 *   · «Agentes IA» no está en ningún lado (Nico pidió ocultarla);
 *   · Configuración salió del sidebar, así que el riel de secciones se calla.
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { describe, it, expect } from 'vitest';

import es from '@/lib/i18n/locales/es.json';
import en from '@/lib/i18n/locales/en.json';
import { moduloDeLaRuta } from '@/lib/nav/arquitectura-del-panel';
import {
  GRUPOS_DE_CONFIGURACION,
  RAIZ_CONFIGURACION,
  SECCIONES_DE_CONFIGURACION,
  SECCION_POR_DEFECTO,
  destinoDeParametrosViejos,
  esFichaDeMiembro,
  hrefDeSeccion,
  menuDeConfiguracion,
  puedeVerSeccion,
  seccionDeLaRuta,
  seccionPorId,
  seccionPorSlug,
  seccionesVisibles,
} from './secciones';

const CARPETA = join(process.cwd(), 'src/app/panel/inmobiliaria/configuracion');

function leer(dic: unknown, ruta: string): unknown {
  return ruta.split('.').reduce<unknown>((acc, k) => {
    if (acc && typeof acc === 'object' && k in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[k];
    }
    return undefined;
  }, dic);
}

/** Un contexto de permisos falso: la lista de módulos que el rol puede ver. */
function ctx(opciones: { admin?: boolean; modulos?: string[] } = {}) {
  const modulos = opciones.modulos ?? [];
  return {
    isAdmin: opciones.admin ?? false,
    canAccess: (module: string, action: string) => action === 'view' && modulos.includes(module),
  };
}

describe('catálogo de secciones', () => {
  it('ningún id ni slug se repite', () => {
    const ids = SECCIONES_DE_CONFIGURACION.map((s) => s.id);
    const slugs = SECCIONES_DE_CONFIGURACION.map((s) => s.slug);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('cada sección pertenece a un grupo declarado y ningún grupo queda vacío', () => {
    const grupos = GRUPOS_DE_CONFIGURACION.map((g) => g.id);
    for (const s of SECCIONES_DE_CONFIGURACION) expect(grupos, s.id).toContain(s.grupo);
    for (const g of grupos) {
      expect(SECCIONES_DE_CONFIGURACION.some((s) => s.grupo === g), `grupo ${g} sin secciones`).toBe(true);
    }
  });

  it('ninguna sección repite icono: dos con el mismo glifo se leen como la misma cosa', () => {
    const iconos = SECCIONES_DE_CONFIGURACION.map((s) => s.icon);
    expect(new Set(iconos).size).toBe(iconos.length);
  });

  it('toda clave i18n existe en es y en en', () => {
    const claves = [
      'inmobiliaria.config.title',
      'inmobiliaria.config.subtitle',
      'inmobiliaria.config.navAria',
      ...GRUPOS_DE_CONFIGURACION.map((g) => g.labelKey),
      ...SECCIONES_DE_CONFIGURACION.flatMap((s) => [s.labelKey, s.descKey]),
    ];
    const faltan = claves.filter((k) => typeof leer(es, k) !== 'string' || typeof leer(en, k) !== 'string');
    expect(faltan).toEqual([]);
  });

  it('«Agentes IA» no es una sección: quedó oculta (Nico, 2026-09-03)', () => {
    expect(SECCIONES_DE_CONFIGURACION.map((s) => s.slug)).not.toContain('agentes');
    // Y la ruta sigue existiendo, para redirigir en vez de dar 404.
    expect(existsSync(join(CARPETA, 'agentes/page.tsx'))).toBe(true);
  });
});

describe('URLs de las secciones', () => {
  it('Perfil vive en la raíz y el resto en su segmento', () => {
    expect(hrefDeSeccion(SECCION_POR_DEFECTO)).toBe(RAIZ_CONFIGURACION);
    expect(hrefDeSeccion('equipo')).toBe(`${RAIZ_CONFIGURACION}/equipo`);
    expect(hrefDeSeccion('medios-de-pago')).toBe(`${RAIZ_CONFIGURACION}/medios-de-pago`);
    expect(hrefDeSeccion('ia')).toBe(`${RAIZ_CONFIGURACION}/ia`);
  });

  it('cada sección tiene una ruta que responde: su carpeta o el segmento dinámico', () => {
    const hayDinamico = existsSync(join(CARPETA, '[seccion]/page.tsx'));
    expect(hayDinamico).toBe(true);
    for (const s of SECCIONES_DE_CONFIGURACION) {
      const propia = existsSync(join(CARPETA, s.slug, 'page.tsx'));
      expect(propia || hayDinamico, `${s.slug} sin página`).toBe(true);
    }
    // Las dos que ya existían como pantallas conservan su carpeta: un segmento
    // estático le gana al dinámico y sus URLs no cambian.
    expect(existsSync(join(CARPETA, 'equipo/page.tsx'))).toBe(true);
    expect(existsSync(join(CARPETA, 'ia/page.tsx'))).toBe(true);
  });

  it('la ruta dice qué sección se está mirando', () => {
    expect(seccionDeLaRuta(RAIZ_CONFIGURACION)?.id).toBe('perfil');
    expect(seccionDeLaRuta(`${RAIZ_CONFIGURACION}/`)?.id).toBe('perfil');
    expect(seccionDeLaRuta(`${RAIZ_CONFIGURACION}/perfil`)?.id).toBe('perfil');
    expect(seccionDeLaRuta(`${RAIZ_CONFIGURACION}/equipo`)?.id).toBe('equipo');
    expect(seccionDeLaRuta(`${RAIZ_CONFIGURACION}/ia`)?.id).toBe('ia');
    // La ficha de un miembro sigue siendo Equipo.
    expect(seccionDeLaRuta(`${RAIZ_CONFIGURACION}/equipo/abc-123`)?.id).toBe('equipo');
    expect(seccionDeLaRuta(`${RAIZ_CONFIGURACION}/no-existe`)).toBeNull();
    expect(seccionDeLaRuta('/panel/inmobiliaria/cobros')).toBeNull();
  });

  it('la ficha de un miembro se reconoce sola (ahí el marco se aparta)', () => {
    expect(esFichaDeMiembro(`${RAIZ_CONFIGURACION}/equipo/abc-123`)).toBe(true);
    expect(esFichaDeMiembro(`${RAIZ_CONFIGURACION}/equipo`)).toBe(false);
    expect(esFichaDeMiembro(`${RAIZ_CONFIGURACION}/equipo/abc/otra`)).toBe(false);
    expect(esFichaDeMiembro(`${RAIZ_CONFIGURACION}/permisos`)).toBe(false);
  });

  it('slugs desconocidos no resuelven a nada (la página da 404)', () => {
    expect(seccionPorSlug('agentes')).toBeNull();
    expect(seccionPorSlug('')).toBeNull();
  });
});

describe('enlaces viejos con ?tab= / ?seccion=', () => {
  const params = (busqueda: string) => new URLSearchParams(busqueda);

  it('el `?tab=medios-de-pago` del buscador llega a su URL nueva', () => {
    expect(destinoDeParametrosViejos(params('tab=medios-de-pago'))).toBe(`${RAIZ_CONFIGURACION}/medios-de-pago`);
  });

  it('la pestaña «usuarios» de ayer es Equipo', () => {
    expect(destinoDeParametrosViejos(params('tab=usuarios'))).toBe(`${RAIZ_CONFIGURACION}/equipo`);
  });

  it('`?seccion=` funciona igual, y lo que ya está en su lugar no se mueve', () => {
    expect(destinoDeParametrosViejos(params('seccion=seguridad'))).toBe(`${RAIZ_CONFIGURACION}/seguridad`);
    expect(destinoDeParametrosViejos(params('tab=perfil'))).toBeNull();
    expect(destinoDeParametrosViejos(params(''))).toBeNull();
    expect(destinoDeParametrosViejos(params('tab=agentes'))).toBeNull();
    expect(destinoDeParametrosViejos(params('otra=cosa'))).toBeNull();
  });
});

describe('permisos: unificar no abre ni cierra pantallas', () => {
  it('el ADMIN ve las once secciones, en cuatro grupos', () => {
    const menu = menuDeConfiguracion(ctx({ admin: true }));
    expect(menu).toHaveLength(4);
    expect(menu.flatMap((g) => g.secciones)).toHaveLength(SECCIONES_DE_CONFIGURACION.length);
  });

  it('quien no es ADMIN no entra a los ajustes de la agencia', () => {
    const sinNada = ctx();
    expect(puedeVerSeccion(seccionPorId('perfil'), sinNada)).toBe(false);
    expect(puedeVerSeccion(seccionPorId('permisos'), sinNada)).toBe(false);
    expect(puedeVerSeccion(seccionPorId('medios-de-pago'), sinNada)).toBe(false);
  });

  it('Equipo se abre con el permiso del módulo `agentes`, como antes', () => {
    expect(puedeVerSeccion(seccionPorId('equipo'), ctx({ modulos: ['agentes'] }))).toBe(true);
    expect(puedeVerSeccion(seccionPorId('equipo'), ctx({ modulos: ['cobros'] }))).toBe(false);
    expect(puedeVerSeccion(seccionPorId('equipo'), ctx({ admin: true }))).toBe(true);
  });

  it('Automatización IA la sigue viendo todo miembro (no tenía guard)', () => {
    expect(puedeVerSeccion(seccionPorId('ia'), ctx())).toBe(true);
  });

  it('a un miembro sin permisos le queda una sección, no una pantalla vacía', () => {
    const visibles = seccionesVisibles(ctx());
    expect(visibles.map((s) => s.id)).toEqual(['ia']);
  });

  it('un agente comercial ve Equipo y Automatización IA', () => {
    expect(seccionesVisibles(ctx({ modulos: ['agentes'] })).map((s) => s.id)).toEqual(['equipo', 'ia']);
  });
});

describe('Configuración fuera del sidebar', () => {
  it('ningún módulo del sidebar es dueño de /configuracion: el riel de secciones se calla', () => {
    expect(moduloDeLaRuta(RAIZ_CONFIGURACION)).toBeNull();
    expect(moduloDeLaRuta(`${RAIZ_CONFIGURACION}/equipo`)).toBeNull();
    expect(moduloDeLaRuta(`${RAIZ_CONFIGURACION}/ia`)).toBeNull();
  });
});
