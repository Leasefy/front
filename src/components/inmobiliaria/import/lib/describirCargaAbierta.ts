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
  /** El job del servidor la está procesando: no se puede descartar ni reintentar. */
  enVuelo: boolean;
  /**
   * T-0130 — la etapa en que quedó: todavía llegan filas (`subiendo`), faltan
   * direcciones por ubicar en el mapa (`ubicando`) o ya se revisa y activa.
   */
  etapa: 'subiendo' | 'ubicando' | 'revision';
  /** «1.230 de 2.000 creadas · 120 por revisar · 3 fallidas», o lo que aplique a la etapa. */
  avance: string;
  /** Cuántas filas fallaron al crearse (o 0). */
  fallidas: number;
  /** Se puede tocar «Reintentar»: job muerto o filas fallidas. */
  puedeReintentar: boolean;
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
  queHacer: 'procesando' | 'frena' | 'terminada' | 'sin-frenar' | 'fallida' | 'a-medias';
}

/**
 * `ahora` entra por parámetro a propósito: sin eso la descripción depende del
 * reloj de la máquina y no se puede fijar en una prueba.
 */
export function describirCargaAbierta(
  lote: EstadoDeLoteInmuebles,
  ahora: Date,
): CargaDescrita {
  const etapa = etapaDeLaCarga(lote);
  // Mientras se sube o se ubica NO hay job del servidor: lo hace el navegador.
  const enVuelo =
    etapa === 'revision' && (lote.estado === 'ENCOLADO' || lote.estado === 'PROCESANDO');
  // Las cuentas del lote llegan en 0 hasta que está LISTO; después, los campos
  // nuevos (que ya descuentan lo fallido) mandan sobre los de siempre.
  const frena = lote.listas ?? lote.listos;
  const porRevisar = lote.porRevisar ?? lote.pendientes;
  const yaEntraron = lote.activadas ?? lote.activados;
  const fallidas = lote.fallidas ?? 0;
  return {
    cuando: cuandoSeSubio(lote.creadoEn, ahora),
    yaEntraron,
    frena,
    porRevisar,
    enVuelo,
    etapa,
    fallidas,
    puedeReintentar: lote.puedeReintentar === true,
    avance: describirAvance(lote, etapa, { yaEntraron, porRevisar, fallidas }),
    queHacer:
      etapa !== 'revision'
        ? 'a-medias'
        : lote.estado === 'FALLIDO'
          ? 'fallida'
          : enVuelo
            ? 'procesando'
            : frena > 0
              ? 'frena'
              : yaEntraron > 0
                ? 'terminada'
                : 'sin-frenar',
  };
}

/** En qué etapa quedó la carga. Sin `fase` (back anterior) todo es revisión. */
export function etapaDeLaCarga(lote: EstadoDeLoteInmuebles): 'subiendo' | 'ubicando' | 'revision' {
  if (lote.fase === 'RECIBIENDO') return 'subiendo';
  if (lote.fase === 'UBICANDO' && faltaUbicar(lote)) return 'ubicando';
  return 'revision';
}

/**
 * ¿El lote sigue en la etapa de ubicar? Incluye el caso `ubicadas === total`
 * sin avanzar (un corte justo antes de que el back pasara a revisar): ahí no hay
 * nada que buscar pero sí hay que dar el paso, y «Continuar» lo da.
 */
export function faltaUbicar(lote: EstadoDeLoteInmuebles): boolean {
  return lote.fase === 'UBICANDO' && lote.ubicacion !== undefined;
}

/** Todas ubicadas pero el lote no avanzó: sólo falta darle «Continuar». */
export function ubicacionCompleta(lote: EstadoDeLoteInmuebles): boolean {
  const u = lote.ubicacion;
  return lote.fase === 'UBICANDO' && u !== undefined && u.ubicadas >= u.total;
}

const n = (x: number) => x.toLocaleString('es-CO');

function describirAvance(
  lote: EstadoDeLoteInmuebles,
  etapa: 'subiendo' | 'ubicando' | 'revision',
  c: { yaEntraron: number; porRevisar: number; fallidas: number },
): string {
  if (etapa === 'subiendo') {
    return `Subiendo el archivo: llegaron ${n(lote.recibidas ?? 0)} de ${n(lote.total)} filas`;
  }
  if (etapa === 'ubicando') {
    const u = lote.ubicacion;
    return `Ubicando direcciones: ${n(u?.ubicadas ?? 0)} de ${n(u?.total ?? lote.total)}`;
  }
  const partes = [`${n(c.yaEntraron)} de ${n(lote.total)} creadas`];
  if (c.porRevisar > 0) partes.push(`${n(c.porRevisar)} por revisar`);
  if (c.fallidas > 0) partes.push(`${n(c.fallidas)} ${c.fallidas === 1 ? 'fallida' : 'fallidas'}`);
  return partes.join(' · ');
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
