/**
 * «Este movimiento son N recibos» — lo que se calcula sin React (02-10-2026).
 *
 * Pedido de Nico: «hazlo muy inteligente para que la conciliación y el agente
 * de conciliación pueda detectar muy bien cuáles son los recibos todos de ese
 * registro». El back propone la combinación (`muchosAUno` en cada movimiento
 * PENDIENTE y `recibos-que-suman` con las alternativas); acá vive lo que la
 * pantalla decide con eso: la suma en vivo de lo que la persona marca, si
 * calza, cuándo se deja enviar y qué decir cuando el servidor dice que no.
 *
 * 🔴 El front NO concilia por su cuenta ni inventa reglas: una diferencia (el
 * GMF, una comisión) sólo cuenta si el back la propuso para ESE conjunto
 * exacto de recibos. El servidor re-verifica todo igual.
 */

import { leerFallo, mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import type {
  DiferenciaConocida,
  NivelDeConfianza,
  PropuestaMuchosAUno,
  PropuestaParcial,
  ReciboDeLaPropuesta,
} from '@/lib/api/conciliacion-bancaria.types';

// ── Cifras ──────────────────────────────────────────────────────────────────

export const NOMBRE_DEL_NIVEL: Record<NivelDeConfianza, string> = {
  alta: 'alta',
  media: 'media',
  baja: 'baja',
};

/**
 * «Confianza alta». 🔴 Sin porcentaje (Nico, C1-MEDIR Q1, 03-10-2026: «sólo
 * alta, media o baja; si hay número, el medido»): el 0–1 que manda el back es
 * una fórmula y en el banco de casos la «media» acertaba la mitad de las
 * veces que decía 63 %.
 */
export function textoDeLaConfianza(nivel: NivelDeConfianza): string {
  return `Confianza ${NOMBRE_DEL_NIVEL[nivel] ?? nivel}`;
}

/**
 * El número MEDIDO por el banco de casos del back para ese nivel: «de cada 10
 * así, 5 son la correcta». `null` (un back viejo, un nivel sin medir, un valor
 * raro) = no se dice ningún número.
 */
export function textoDeLoMedido(deCadaDiez: number | null | undefined): string | null {
  if (typeof deCadaDiez !== 'number' || !Number.isInteger(deCadaDiez)) return null;
  if (deCadaDiez < 0 || deCadaDiez > 10) return null;
  return deCadaDiez === 1
    ? 'de cada 10 así, 1 es la correcta'
    : `de cada 10 así, ${deCadaDiez} son la correcta`;
}

/**
 * El nivel de una confianza 0–1, con los cortes del back (alta 0,90–0,99 ·
 * media 0,50–0,89 · baja 0,05–0,49). Sólo para la propuesta PARCIAL, que no
 * trae `nivel`: las demás traen el suyo y ése manda.
 */
export function nivelDeLaConfianza(confianza: number): NivelDeConfianza {
  if (confianza >= 0.9) return 'alta';
  if (confianza >= 0.5) return 'media';
  return 'baja';
}

/** El nombre corto de una diferencia conocida: «GMF (4×1000)», «retención Arrendamientos». */
export function nombreDeLaDiferencia(d: DiferenciaConocida): string {
  if (d.tipo === 'GMF_4X1000') return 'GMF (4×1000)';
  const nombre = d.nombre?.trim();
  if (d.tipo === 'RETENCION') return nombre ? `la retención «${nombre}»` : 'una retención';
  if (d.tipo === 'COMISION') return nombre ? `la comisión «${nombre}»` : 'una comisión del banco';
  return 'una diferencia conocida';
}

const NUMEROS_EN_PALABRAS = ['cero', 'una', 'dos', 'tres', 'cuatro', 'cinco'];

/** «dos combinaciones», «4 combinaciones». */
export function combinacionesEnPalabras(n: number): string {
  const cuantas = n >= 0 && n < NUMEROS_EN_PALABRAS.length ? NUMEROS_EN_PALABRAS[n] : String(n);
  return `${cuantas} ${n === 1 ? 'combinación' : 'combinaciones'}`;
}

/** El título de la tarjeta. Un solo recibo (k = 1) también sale del mismo buscador. */
export function tituloDeLaPropuesta(cuantos: number): string {
  return cuantos === 1 ? 'Este movimiento es un recibo ya emitido' : `Este movimiento son ${cuantos} recibos`;
}

const MEDIOS: Record<string, string> = {
  transferencia: 'Transferencia',
  efectivo: 'Efectivo',
  consignacion: 'Consignación',
  tarjeta: 'Tarjeta',
  cheque: 'Cheque',
  pse: 'PSE',
  nequi: 'Nequi',
  daviplata: 'Daviplata',
  enlace_de_pago: 'Enlace de pago',
  otro: 'Otro',
};

/** El medio del recibo, legible. Uno que no se conoce va tal cual, con mayúscula inicial. */
export function medioLegible(medio: string | null | undefined): string | null {
  const limpio = (medio ?? '').trim();
  if (!limpio) return null;
  const clave = limpio
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '_');
  return MEDIOS[clave] ?? limpio.charAt(0).toUpperCase() + limpio.slice(1);
}

// ── El 1:1 cuando la plata ya tiene sus recibos ─────────────────────────────

/**
 * 🔴 ARREGLOS-5 (Nico Q4 a): cuando el muchos a uno encuentra recibos YA
 * EMITIDOS que suman exacto la línea del banco (sin diferencia), la fila NO
 * ofrece las cuotas del 1:1 ni «Conciliar con un cliente»: cualquiera de los
 * dos emitiría OTRO recibo por la misma plata. La salida es aprobar esos
 * recibos o «Corregir» la combinación.
 */
export function yaLaRespaldanRecibosEmitidos(m: {
  valorCop: number;
  muchosAUno?: { mejor: { sumaCop: number; diferencia: unknown | null } | null } | null;
}): boolean {
  const mejor = m.muchosAUno?.mejor;
  return Boolean(mejor) && !mejor!.diferencia && mejor!.sumaCop === m.valorCop && m.valorCop > 0;
}

// ── El conjunto que arma la persona ─────────────────────────────────────────

/** ¿Los dos conjuntos tienen exactamente los mismos ids (sin importar el orden)? */
export function mismosIds(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const enA = new Set(a);
  return enA.size === new Set(b).size && b.every((id) => enA.has(id));
}

/**
 * Los recibos que se pueden marcar a mano: los de todas las combinaciones que
 * propuso el back (y los de la parcial, si la hay), sin repetir, en el orden
 * en que aparecen (la mejor primero).
 *
 * 🔴 El contrato del back (02-10-2026) no trae otra lista de candidatos: lo
 * que se puede marcar es lo que el back propuso. Ver el informe de S2-D.
 */
export function recibosCandidatos(
  propuestas: readonly PropuestaMuchosAUno[],
  parcial: PropuestaParcial | null = null,
): ReciboDeLaPropuesta[] {
  const vistos = new Set<string>();
  const lista: ReciboDeLaPropuesta[] = [];
  for (const p of parcial ? [...propuestas, parcial] : propuestas) {
    for (const r of p.recibos) {
      if (vistos.has(r.id)) continue;
      vistos.add(r.id);
      lista.push(r);
    }
  }
  return lista;
}

/** Lo que suman los recibos marcados. */
export function sumaDe(recibos: readonly ReciboDeLaPropuesta[], ids: readonly string[]): number {
  const marcados = new Set(ids);
  return recibos.reduce((s, r) => (marcados.has(r.id) ? s + r.valorCop : s), 0);
}

export type EstadoDeLaSuma =
  | { tipo: 'vacia' }
  | { tipo: 'calza' }
  /** No calza exacto, pero es una propuesta del back explicada por una regla. */
  | { tipo: 'conDiferencia'; diferencia: DiferenciaConocida }
  | { tipo: 'falta'; cuanto: number }
  | { tipo: 'sobra'; cuanto: number };

/**
 * ¿Lo marcado calza con el valor del banco?
 *
 * 🔴 Una diferencia sólo vale si el conjunto marcado ES una propuesta del back
 * con esa diferencia y la cuenta da: el front no calcula el GMF por su cuenta.
 */
export function estadoDeLaSuma(
  ids: readonly string[],
  suma: number,
  valorDelBanco: number,
  propuestas: readonly PropuestaMuchosAUno[],
): EstadoDeLaSuma {
  if (ids.length === 0) return { tipo: 'vacia' };
  if (suma === valorDelBanco) return { tipo: 'calza' };
  const explicada = propuestas.find(
    (p) =>
      p.diferencia !== null &&
      mismosIds(p.reciboIds, ids) &&
      p.sumaCop === suma &&
      suma - p.diferencia.valorCop === valorDelBanco,
  );
  if (explicada?.diferencia) return { tipo: 'conDiferencia', diferencia: explicada.diferencia };
  return suma < valorDelBanco
    ? { tipo: 'falta', cuanto: valorDelBanco - suma }
    : { tipo: 'sobra', cuanto: suma - valorDelBanco };
}

/** Sólo se deja enviar lo que calza exacto (o la propuesta del back con su regla). */
export function seDejaEnviar(estado: EstadoDeLaSuma): boolean {
  return estado.tipo === 'calza' || estado.tipo === 'conDiferencia';
}

// ── Cuando el servidor dice que no ──────────────────────────────────────────

export type TipoDeRechazo =
  | 'sinTabla'
  | 'sumaNoCalza'
  /** El movimiento ya no es pendiente (conciliado o ignorado): la lista se vuelve a leer. */
  | 'movimientoYaNoEsPendiente'
  | 'reciboYaConciliado'
  | 'reciboAnulado'
  | 'otro';

export interface CifrasDelRechazo {
  sumaCop: number;
  valorCop: number;
  /** suma − valor: negativo = el banco trae de más (sobrante). */
  diferenciaCop: number;
}

export interface Rechazo {
  tipo: TipoDeRechazo;
  mensaje: string;
  /** Sólo en `sumaNoCalza`: suma, valor del banco y diferencia. */
  cifras?: CifrasDelRechazo;
  /** En `reciboYaConciliado` y `reciboAnulado`: cuáles (número). */
  recibos?: { id: string; numero: number }[];
}

export const MENSAJE_SIN_TABLA =
  'Todavía no se puede conciliar contra recibos: falta un paso que el equipo de Leasefy está habilitando. ' +
  'La propuesta se puede revisar, pero no aplicar todavía.';

/** El cuerpo del error (el sobre del back), venga en `detalle`, en `body` o suelto. */
function sobreDelError(error: unknown): Record<string, unknown> {
  if (!error || typeof error !== 'object') return {};
  const e = error as Record<string, unknown>;
  for (const sitio of [e.detalle, e.body, e]) {
    if (sitio && typeof sitio === 'object' && !Array.isArray(sitio) && 'code' in sitio) {
      return sitio as Record<string, unknown>;
    }
  }
  return e;
}

function numero(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

/** `recibos: { id, numero }[]` de los 409 de recibos (contrato del back). */
function recibosDelError(sobre: Record<string, unknown>): { id: string; numero: number }[] | undefined {
  const lista = sobre.recibos;
  if (!Array.isArray(lista)) return undefined;
  const limpios = lista.filter(
    (r): r is { id: string; numero: number } =>
      Boolean(r) && typeof r === 'object' && typeof (r as { id?: unknown }).id === 'string' &&
      typeof (r as { numero?: unknown }).numero === 'number',
  );
  return limpios.length > 0 ? limpios.map((r) => ({ id: r.id, numero: r.numero })) : undefined;
}

/**
 * Qué le pasó al pedido, en palabras para la persona.
 *
 * El `message` del back gana cuando se puede leer (dice cuál recibo, cuánto
 * falta); lo de acá es para cuando no lo trae. Las cifras de `LA_SUMA_NO_CALZA`
 * son las del back (`sumaCop`, `valorCop`, `diferenciaCop`); si un back no las
 * manda, las de lo que se envió.
 */
export function leerElRechazo(
  error: unknown,
  enviado: { sumaCop: number; valorCop: number },
): Rechazo {
  const { code } = leerFallo(error);
  const sobre = sobreDelError(error);

  // El nombre de la migración es para el equipo, no para la persona.
  if (code === 'FALTA_UNA_MIGRACION') return { tipo: 'sinTabla', mensaje: MENSAJE_SIN_TABLA };

  if (code === 'LA_SUMA_NO_CALZA') {
    const sumaCop = numero(sobre.sumaCop) ?? enviado.sumaCop;
    const valorCop = numero(sobre.valorCop) ?? enviado.valorCop;
    const diferenciaCop = numero(sobre.diferenciaCop) ?? sumaCop - valorCop;
    return {
      tipo: 'sumaNoCalza',
      mensaje: mensajeParaLaPersona(error, {
        porDefecto: 'Los recibos no suman lo que trae el banco: revisa la combinación con «Corregir».',
      }),
      cifras: { sumaCop, valorCop, diferenciaCop },
    };
  }

  if (code === 'MOVIMIENTO_YA_CONCILIADO' || code === 'MOVIMIENTO_IGNORADO' || code === 'MOVIMIENTO_NO_ENCONTRADO') {
    return {
      tipo: 'movimientoYaNoEsPendiente',
      mensaje: mensajeParaLaPersona(error, {
        porDefecto:
          code === 'MOVIMIENTO_IGNORADO'
            ? 'Este movimiento está ignorado: vuélvelo a pendiente para conciliarlo.'
            : 'Este movimiento ya no está pendiente: alguien más lo concilió mientras lo revisabas.',
      }),
    };
  }

  if (code === 'RECIBO_YA_CONCILIADO') {
    return {
      tipo: 'reciboYaConciliado',
      mensaje: mensajeParaLaPersona(error, {
        porDefecto: 'Uno de los recibos ya respalda otro movimiento del banco. Revisa la combinación con «Corregir».',
      }),
      recibos: recibosDelError(sobre),
    };
  }

  if (code === 'RECIBO_ANULADO') {
    return {
      tipo: 'reciboAnulado',
      mensaje: mensajeParaLaPersona(error, {
        porDefecto: 'Uno de los recibos está anulado. Revisa la combinación con «Corregir».',
      }),
      recibos: recibosDelError(sobre),
    };
  }

  return {
    tipo: 'otro',
    mensaje: mensajeParaLaPersona(error, {
      porDefecto: 'No se pudo conciliar el movimiento con sus recibos.',
      accion: 'conciliar el movimiento con sus recibos',
    }),
  };
}
