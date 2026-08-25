/**
 * Cliente del lector de enlaces: del navegador a `/api/inmuebles/*`.
 *
 * Acá vive la traducción de «lo que dice la página» a «un inmueble del
 * asistente», y es donde hay que tener cuidado: lo que se lee de un texto NO
 * vale lo mismo que lo que el sitio declara como dato. La procedencia viaja
 * con cada campo hasta la pantalla.
 */

import type { InmuebleDesdeEnlace } from './leer-enlace';
import type { ImportProperty } from '@/components/inmobiliaria/import/lib/importTypes';

export interface EnlaceLeido {
  url: string;
  ok: true;
  inmueble: InmuebleDesdeEnlace;
  falta: string[];
}

export interface EnlaceFallido {
  url: string;
  ok: false;
  motivo: string;
  mensaje: string;
}

export type ResultadoDeEnlace = EnlaceLeido | EnlaceFallido;

/**
 * Separa lo pegado en enlaces. Acepta uno por línea, separados por coma o por
 * espacios: la gente pega desde WhatsApp, desde un correo o desde una columna
 * de Excel, y las tres cosas se ven distinto.
 */
export function separarEnlaces(pegado: string): string[] {
  const candidatos = pegado
    .split(/[\s,;]+/)
    .map((s) => s.trim().replace(/[.,;]+$/, ''))
    .filter(Boolean);

  const vistos = new Set<string>();
  const salida: string[] = [];
  for (const candidato of candidatos) {
    // Sin esquema no se puede pedir; `www.algo.com` se completa a https.
    const conEsquema = /^https?:\/\//i.test(candidato) ? candidato : `https://${candidato}`;
    try {
      const url = new URL(conEsquema);
      if (!url.hostname.includes('.')) continue;
      const normalizada = url.toString();
      if (vistos.has(normalizada)) continue;
      vistos.add(normalizada);
      salida.push(normalizada);
    } catch {
      // No era un enlace. No se avisa acá: se avisa contando cuántos entraron.
    }
  }
  return salida;
}

/** Cuántos enlaces se leen a la vez. Cada uno es una página completa. */
const EN_PARALELO = 4;

/**
 * Lee todos los enlaces, de a tandas, avisando el avance.
 *
 * Nunca rechaza: un enlace que falla es un resultado con `ok: false`. Perder
 * los otros diecinueve porque el tercero estaba mal no le sirve a nadie.
 */
export async function leerEnlaces(
  urls: string[],
  alAvanzar?: (listos: number, total: number) => void,
): Promise<ResultadoDeEnlace[]> {
  const resultados: ResultadoDeEnlace[] = [];
  let listos = 0;

  for (let i = 0; i < urls.length; i += EN_PARALELO) {
    const tanda = urls.slice(i, i + EN_PARALELO);
    const parcial = await Promise.all(
      tanda.map(async (url): Promise<ResultadoDeEnlace> => {
        try {
          const res = await fetch('/api/inmuebles/desde-enlace', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url }),
          });
          const datos = await res.json();
          if (datos?.ok) {
            return { url, ok: true, inmueble: datos.inmueble, falta: datos.falta ?? [] };
          }
          return {
            url,
            ok: false,
            motivo: datos?.motivo ?? 'no_responde',
            mensaje: datos?.mensaje ?? 'No se pudo leer el enlace.',
          };
        } catch {
          return {
            url,
            ok: false,
            motivo: 'no_responde',
            mensaje: 'No se pudo conectar para leer el enlace.',
          };
        } finally {
          listos += 1;
          alAvanzar?.(listos, urls.length);
        }
      }),
    );
    resultados.push(...parcial);
  }

  return resultados;
}

/** Cuántas fotos acepta el back por inmueble. */
export const MAX_FOTOS_POR_INMUEBLE = 10;

/**
 * Baja una foto por el proxy y la deja como `File`, que es lo que espera
 * `uploadPropertyPhotos`. Devuelve `null` si no se pudo: una foto que falla
 * no puede tumbar un inmueble que ya se creó.
 */
export async function traerFotoComoArchivo(url: string, nombre: string): Promise<File | null> {
  try {
    const res = await fetch(`/api/inmuebles/imagen-remota?url=${encodeURIComponent(url)}`);
    if (!res.ok) return null;
    const blob = await res.blob();
    if (blob.size === 0) return null;
    const extension = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg';
    return new File([blob], `${nombre}.${extension}`, { type: blob.type });
  } catch {
    return null;
  }
}

/**
 * Convierte lo leído en el inmueble que maneja el asistente.
 *
 * `_rowIndex` sigue siendo el identificador dentro del asistente: acá no hay
 * filas de un archivo, pero el resto de los pasos lo usa para señalar cuál es
 * cuál, así que el índice del enlace hace ese papel.
 */
export function aImportProperty(leido: InmuebleDesdeEnlace, indice: number): ImportProperty {
  const procedencia: Record<string, string> = {};
  const anotar = (campo: string, dato?: { fuente: string; textoOriginal?: string }) => {
    if (dato) procedencia[campo] = dato.textoOriginal ? `${dato.fuente}: ${dato.textoOriginal}` : dato.fuente;
  };

  anotar('propertyTitle', leido.titulo);
  anotar('propertyAddress', leido.direccion);
  anotar('propertyCity', leido.ciudad);
  anotar('propertyZone', leido.barrio);
  anotar('propertyType', leido.tipo);
  anotar('monthlyRent', leido.canon);
  anotar('adminFee', leido.administracion);
  anotar('propertyArea', leido.area);
  anotar('bedrooms', leido.habitaciones);
  anotar('bathrooms', leido.banos);

  return {
    _rowIndex: indice,
    propertyTitle: leido.titulo?.valor,
    propertyAddress: leido.direccion?.valor,
    propertyCity: leido.ciudad?.valor,
    propertyZone: leido.barrio?.valor,
    propertyType: leido.tipo?.valor,
    monthlyRent: leido.canon?.valor,
    adminFee: leido.administracion?.valor,
    propertyArea: leido.area?.valor,
    bedrooms: leido.habitaciones?.valor,
    bathrooms: leido.banos?.valor,
    notes: leido.descripcion?.valor,
    suggestions: [],
    selected: true,
    hasErrors: false,
    errorMessages: [],
    enlaceOrigen: leido.url,
    imagenes: leido.imagenes.slice(0, MAX_FOTOS_POR_INMUEBLE),
    procedencia,
  };
}
