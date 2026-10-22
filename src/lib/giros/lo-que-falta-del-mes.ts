/**
 * «Lo que falta del mes» en Giros a propietarios (decisión 17 de Nico, 22-10-2026).
 *
 * Nico, al ver el riel de los cuatro pasos con sus chulos: «NO ENTIENDO esos
 * steps la verdad ni entiendo en qué le ayudará al usuario». El riel decía
 * «hecho» en los cuatro pasos de octubre al lado de «Por girar $ 2.371.800»:
 * miraba sólo el lote del mes, no la plata.
 *
 * Ahora la respuesta va primero —«Falta girar $ X a N propietarios», o «está
 * girado completo»— y cada paso dice su número y lo que hay que hacer:
 *   1 Liquidar          — los propietarios con giros por generar;
 *   2 Revisar y aprobar — los giros por aprobar (y los que no salieron);
 *   3 Archivo del banco — los aprobados que esperan lote y los lotes en curso;
 *   4 Marcar pagado     — los lotes que ya salieron al banco y falta marcar.
 * Un paso sólo dice «hecho» si de verdad no queda nada en él. PURA: la llenan
 * las respuestas del back y no inventa lo que no llegó (`null` = no se sabe).
 */
import type { LoteResumen } from '@/lib/api/lotes-de-dispersion.types';
import type { LiquidacionDelMesCompleto } from '@/lib/liquidaciones/liquidacion-del-mes';
import type { PasoDelGiro } from './estado-de-los-pasos';

export type EstadoDelPasoDelMes = 'hecho' | 'pendiente' | 'sin-dato';

export interface PasoDelMes {
  id: PasoDelGiro;
  estado: EstadoDelPasoDelMes;
  /** Qué hay en el paso, en una frase con su número. */
  detalle: string;
  /** Lo que hay que hacer ahí, cuando falta algo. */
  accion?: string;
}

export interface LoQueFaltaDelMes {
  /** Lo que falta girar del mes (generado o no). `null` = no se pudo leer la liquidación. */
  faltaCop: number | null;
  faltanPropietarios: number | null;
  /** Todo lo del mes salió y quedó marcado. */
  completo: boolean;
  /** El mes no tiene a nadie que liquidar. */
  sinNadaQueGirar: boolean;
  /** El primer paso con algo pendiente: el que toca ahora. */
  siguiente: PasoDelGiro | null;
  pasos: PasoDelMes[];
}

export interface EntradaDelMes {
  liquidacion: LiquidacionDelMesCompleto | null;
  /** Los giros aprobados que esperan lote (`GET lotes-de-dispersion/candidatos?month=`). */
  candidatos: { cantidad: number; totalCop: number } | null;
  /** Los lotes del mes. */
  lotes: readonly Pick<LoteResumen, 'month' | 'estado'>[] | null;
  /** Para escribir la plata como el resto de la pantalla. */
  plata: (cop: number) => string;
}

const EN_CURSO: readonly LoteResumen['estado'][] = ['BORRADOR', 'ESPERANDO_APROBACION', 'APROBADO'];
const EN_EL_BANCO: readonly LoteResumen['estado'][] = ['ARCHIVO_GENERADO', 'EN_WOMPI'];

function cuantos(n: number, uno: string, varios: string): string {
  return `${n.toLocaleString('es-CO')} ${n === 1 ? uno : varios}`;
}

export function loQueFaltaDelMes({ liquidacion, candidatos, lotes, plata }: EntradaDelMes): LoQueFaltaDelMes {
  const filas = liquidacion?.propietarios ?? null;

  // 1 · Liquidar: lo que todavía no se generó.
  const porGenerar = filas?.filter((f) => f.estado === 'POR_GENERAR' || f.estado === 'GENERADA_EN_PARTE') ?? null;
  const porGenerarCop = porGenerar?.reduce((s, f) => s + Math.max(0, f.pendiente?.aGirarCop ?? 0), 0) ?? 0;

  // 2 · Revisar y aprobar: los giros generados sin aprobar, y los que no salieron.
  const giros = filas?.flatMap((f) => f.dispersiones) ?? null;
  const porAprobar = giros?.filter((d) => d.status === 'DISP_PENDING') ?? null;
  const noSalieron = giros?.filter((d) => d.status === 'FAILED') ?? null;
  const porAprobarCop = porAprobar?.reduce((s, d) => s + Math.max(0, d.aGirarCop), 0) ?? 0;

  // 3 · Archivo del banco y 4 · Marcar pagado: de los lotes del mes.
  const enCurso = lotes?.filter((l) => EN_CURSO.includes(l.estado)).length ?? null;
  const enElBanco = lotes?.filter((l) => EN_EL_BANCO.includes(l.estado)).length ?? null;

  const pasos: PasoDelMes[] = [];

  if (filas === null || porGenerar === null) {
    pasos.push({ id: 'liquidar', estado: 'sin-dato', detalle: 'No se pudo leer la liquidación del mes.' });
  } else if (filas.length === 0) {
    pasos.push({ id: 'liquidar', estado: 'hecho', detalle: 'Este mes no hay nada que liquidar.' });
  } else if (porGenerar.length > 0) {
    pasos.push({
      id: 'liquidar',
      estado: 'pendiente',
      detalle: `${cuantos(porGenerar.length, 'propietario', 'propietarios')} con giros por generar (${plata(porGenerarCop)})`,
      accion: 'Generar los giros',
    });
  } else {
    pasos.push({ id: 'liquidar', estado: 'hecho', detalle: `${cuantos(filas.length, 'propietario liquidado', 'propietarios liquidados')}` });
  }

  if (porAprobar === null || noSalieron === null) {
    pasos.push({ id: 'revisar', estado: 'sin-dato', detalle: 'No se pudo leer cuántos giros faltan por aprobar.' });
  } else if (porAprobar.length > 0 || noSalieron.length > 0) {
    const partes = [
      porAprobar.length > 0 ? `${cuantos(porAprobar.length, 'giro', 'giros')} por aprobar (${plata(porAprobarCop)})` : null,
      noSalieron.length > 0 ? `${cuantos(noSalieron.length, 'giro no salió', 'giros no salieron')}` : null,
    ].filter(Boolean);
    pasos.push({
      id: 'revisar',
      estado: 'pendiente',
      detalle: partes.join(' · '),
      accion: porAprobar.length > 0 ? `Revisar ${cuantos(porAprobar.length, 'giro', 'giros')}` : 'Revisar los que no salieron',
    });
  } else {
    pasos.push({ id: 'revisar', estado: 'hecho', detalle: 'Nada por aprobar' });
  }

  if (candidatos === null || enCurso === null) {
    pasos.push({ id: 'banco', estado: 'sin-dato', detalle: 'No se pudo leer qué espera lote.' });
  } else if (candidatos.cantidad > 0) {
    pasos.push({
      id: 'banco',
      estado: 'pendiente',
      detalle: `${cuantos(candidatos.cantidad, 'giro aprobado espera', 'giros aprobados esperan')} lote (${plata(candidatos.totalCop)})`,
      accion: 'Armar el lote',
    });
  } else if (enCurso > 0) {
    pasos.push({
      id: 'banco',
      estado: 'pendiente',
      detalle: `${cuantos(enCurso, 'lote', 'lotes')} por aprobar o por sacar el archivo`,
      accion: enCurso === 1 ? 'Abrir el lote' : 'Ver los lotes',
    });
  } else {
    pasos.push({ id: 'banco', estado: 'hecho', detalle: 'Nada esperando lote' });
  }

  if (enElBanco === null) {
    pasos.push({ id: 'pagado', estado: 'sin-dato', detalle: 'No se pudo leer los lotes del mes.' });
  } else if (enElBanco > 0) {
    pasos.push({
      id: 'pagado',
      estado: 'pendiente',
      detalle: `${cuantos(enElBanco, 'lote está', 'lotes están')} en el banco y falta marcarlo pagado`,
      accion: 'Marcar pagado',
    });
  } else {
    pasos.push({ id: 'pagado', estado: 'hecho', detalle: 'Nada por marcar' });
  }

  // Lo que falta girar del mes: lo no generado + todo giro que no está girado.
  const faltaCop =
    filas === null || giros === null
      ? null
      : porGenerarCop + giros.filter((d) => d.status !== 'DISP_COMPLETED').reduce((s, d) => s + Math.max(0, d.aGirarCop), 0);
  const faltanPropietarios =
    filas === null
      ? null
      : filas.filter(
          (f) =>
            (f.estado === 'POR_GENERAR' || f.estado === 'GENERADA_EN_PARTE') ||
            f.dispersiones.some((d) => d.status !== 'DISP_COMPLETED'),
        ).length;

  const siguiente = pasos.find((p) => p.estado === 'pendiente')?.id ?? null;
  const completo = pasos.every((p) => p.estado === 'hecho') && (faltaCop ?? 1) === 0;
  return { faltaCop, faltanPropietarios, completo, sinNadaQueGirar: filas !== null && filas.length === 0, siguiente, pasos };
}
