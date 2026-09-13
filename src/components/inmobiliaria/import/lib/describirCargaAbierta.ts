/**
 * describirCargaAbierta — cómo se reconoce una carga sin terminar entre varias.
 *
 * 🔴 Nico, 2026-09-11, mirando la tarjeta con cinco cargas: «¿cuál de esos
 * retomo?». No podía saberlo, y la tarjeta tampoco se lo decía: las cinco
 * eran del MISMO archivo, así que las cinco líneas empezaban con «2864
 * inmuebles» y sólo se diferenciaban en dos conteos sin contexto.
 *
 * Faltaban las tres cosas que separan una carga de otra:
 *
 *  1. CUÁNDO se subió — es lo primero que una persona recuerda.
 *  2. CUÁNTOS inmuebles ya entraron por ella — distingue la que sirvió de la
 *     que quedó a medias.
 *  3. SI FRENA el paso. Sólo las filas LISTO dejan «Propiedades» en
 *     «pendiente» y esconden el «Seguir con Contratos» del muro. Una carga
 *     con 2.864 filas «por revisar» y cero listas NO frena nada, y hasta acá
 *     se veía igual de alarmante que una que sí.
 */

import type { EstadoDeLoteInmuebles } from '@/lib/api/inmuebles-importacion.service';

export interface CargaDescrita {
  /** «hoy 5:29 p. m.», «ayer 6:23 p. m.» o «10 sep, 6:23 p. m.». */
  cuando: string;
  /** Cuántos inmuebles ya entraron al portafolio por esta carga. */
  yaEntraron: number;
  /** Filas listas sin activar: son las ÚNICAS que frenan el paso. */
  frena: number;
  /** Filas a las que les falta un dato. No frenan. */
  porRevisar: number;
  /** El worker todavía la está procesando: no se puede descartar ni retomar. */
  enVuelo: boolean;
  /**
   * Qué conviene hacer con ella, en una palabra.
   *
   * `terminada` — no le queda nada que activar. Retomarla sólo sirve para
   *   corregir las filas que quedaron con datos incompletos.
   * `frena` — tiene filas listas sin activar: o se activan o se descarta,
   *   porque mientras existan el paso no se da por terminado.
   * `sin-frenar` — sólo le quedan filas por revisar. Descartarla no pierde
   *   ningún inmueble: los que entraron ya están.
   */
  queHacer: 'procesando' | 'frena' | 'terminada' | 'sin-frenar';
}

/**
 * `ahora` entra por parámetro a propósito: sin eso la descripción depende del
 * reloj de la máquina y no se puede fijar en una prueba.
 */
export function describirCargaAbierta(
  lote: EstadoDeLoteInmuebles,
  ahora: Date,
): CargaDescrita {
  const enVuelo = lote.estado === 'ENCOLADO' || lote.estado === 'PROCESANDO';
  const frena = lote.listos;
  return {
    cuando: cuandoSeSubio(lote.creadoEn, ahora),
    yaEntraron: lote.activados,
    frena,
    porRevisar: lote.pendientes,
    enVuelo,
    queHacer: enVuelo
      ? 'procesando'
      : frena > 0
        ? 'frena'
        : lote.activados > 0
          ? 'terminada'
          : 'sin-frenar',
  };
}

/**
 * «hoy», «ayer» o la fecha. Se compara por DÍA CALENDARIO local, no por
 * diferencia de horas: algo subido a las 23:52 de ayer es «ayer» a las 00:30
 * de hoy, aunque hayan pasado 38 minutos.
 */
function cuandoSeSubio(iso: string, ahora: Date): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const hora = d.toLocaleTimeString('es-CO', {
    hour: 'numeric',
    minute: '2-digit',
  });
  const dias = diasDeDiferencia(d, ahora);
  if (dias === 0) return `hoy ${hora}`;
  if (dias === 1) return `ayer ${hora}`;
  return `${d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}, ${hora}`;
}

function diasDeDiferencia(antes: Date, ahora: Date): number {
  const a = new Date(antes.getFullYear(), antes.getMonth(), antes.getDate());
  const b = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}
