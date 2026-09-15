/**
 * La configuración de una CUENTA de persona (inquilino, propietario) como datos:
 * grupos → secciones, cada sección con su URL. El dibujo es el mismo marco de la
 * configuración de la inmobiliaria (`MarcoDeConfiguracion`); cada panel declara
 * sólo su lista (Nico, 2026-09-15).
 *
 * La primera sección vive en la raíz (`/…/configuracion`) y el resto en su
 * segmento, igual que en la inmobiliaria: los enlaces viejos a la raíz siguen
 * llegando a algo.
 */

import type { Icon } from '@phosphor-icons/react';

import type { GrupoDeEntradas } from './MarcoDeConfiguracion';

export interface Texto {
  es: string;
  en: string;
}

export interface SeccionDeCuenta<Id extends string = string> {
  id: Id;
  grupo: string;
  /** Segmento bajo la raíz. La primera sección vive en la raíz misma. */
  slug: string;
  label: Texto;
  desc: Texto;
  icon: Icon;
}

export interface ConfiguracionDeCuenta<Id extends string = string> {
  raiz: string;
  titulo: Texto;
  subtitulo: Texto;
  grupos: readonly { id: string; label: Texto }[];
  secciones: readonly SeccionDeCuenta<Id>[];
}

type Idioma = keyof Texto;

export function idiomaDe(locale: string): Idioma {
  return locale === 'en' ? 'en' : 'es';
}

export function seccionPorSlug<Id extends string>(cfg: ConfiguracionDeCuenta<Id>, slug: string): SeccionDeCuenta<Id> | null {
  return cfg.secciones.find((s) => s.slug === slug) ?? null;
}

export function hrefDeSeccion<Id extends string>(cfg: ConfiguracionDeCuenta<Id>, id: Id): string {
  const [primera] = cfg.secciones;
  const seccion = cfg.secciones.find((s) => s.id === id);
  if (!seccion) throw new Error(`Sección de configuración desconocida: ${id}`);
  return primera && seccion.id === primera.id ? cfg.raiz : `${cfg.raiz}/${seccion.slug}`;
}

/** La sección de una URL, o null si la ruta no es de esta configuración. */
export function seccionDeLaRuta<Id extends string>(cfg: ConfiguracionDeCuenta<Id>, pathname: string): SeccionDeCuenta<Id> | null {
  const ruta = (pathname.split('?')[0] ?? pathname).replace(/\/+$/, '');
  if (ruta === cfg.raiz) return cfg.secciones[0] ?? null;
  if (!ruta.startsWith(`${cfg.raiz}/`)) return null;
  return seccionPorSlug(cfg, ruta.slice(cfg.raiz.length + 1).split('/')[0] ?? '');
}

/** El menú listo para `MarcoDeConfiguracion`, sin grupos vacíos. */
export function menuDeCuenta<Id extends string>(cfg: ConfiguracionDeCuenta<Id>, locale: string): GrupoDeEntradas[] {
  const l = idiomaDe(locale);
  return cfg.grupos
    .map((g) => ({
      id: g.id,
      label: g.label[l],
      entradas: cfg.secciones
        .filter((s) => s.grupo === g.id)
        .map((s) => ({ id: s.id, href: hrefDeSeccion(cfg, s.id), label: s.label[l], desc: s.desc[l], icon: s.icon })),
    }))
    .filter((g) => g.entradas.length > 0);
}
