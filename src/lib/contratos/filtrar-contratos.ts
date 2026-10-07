/**
 * Buscar, filtrar y ordenar la lista de contratos.
 *
 * 🔴 Nico, 2026-09-12: «esta tabla ¿por qué no tiene buscador?» y, la misma
 * noche, «la tabla de contratos con TODOS los filtros, el mismo patrón de las
 * otras tablas (estado, vigencia, inmueble, canon…)». Con **1.836 contratos**
 * paginados de a 10, encontrar uno era pasar 184 páginas.
 *
 * ── Se filtra sobre la lista COMPLETA, nunca sobre la página ────────────────
 * Es la misma lección que ya está escrita en la pantalla de propietarios
 * (`lib/propietarios/filtrar-propietarios.ts`): filtrar lo que ya se paginó
 * hace un buscador que MIENTE — buscar «Martínez» desde la página 1 contesta
 * «no se encontró» con Martínez en la página 3, y nada en la pantalla lo
 * delata. El orden es filtrar → ordenar → paginar, y por eso esto vive acá,
 * puro y probado, y no adentro de la tabla.
 *
 * ── Qué se busca ────────────────────────────────────────────────────────────
 * Lo mismo que la fila muestra: los DOS números del contrato (el de la
 * inmobiliaria y el nuestro — Nico buscó «1839» y encontró a otra persona
 * porque sólo existía el nuestro), el inquilino y la dirección. Buscar por
 * algo que no está en pantalla deja a alguien mirando un resultado sin
 * entender por qué salió.
 */

import type { Contract, ContractStatus } from '@/lib/types/contract';
import { fechaDeVigencia } from './fecha-de-vigencia';

export type EstadoDeFiltro = ContractStatus | 'all';
/**
 * La vigencia se mide por FECHAS, no por el estado del flujo de firma: un
 * contrato migrado entra «activo» aunque su fecha de fin ya haya pasado.
 */
export type VigenciaDeFiltro = 'all' | 'vigente' | 'por_vencer' | 'vencido' | 'por_empezar' | 'sin_fechas';
export type ConOSin = 'all' | 'con' | 'sin';
export type OrigenDeFiltro = 'all' | 'migrado' | 'nativo';
/** Bandas de canon en pesos. `sin_canon` = migrados sin el dato (nunca «$ 0»). */
export type CanonDeFiltro = 'all' | 'sin_canon' | 'hasta_1m' | '1m_2m' | '2m_5m' | 'mas_5m';
export type CampoDeOrden = 'numero' | 'tenantName' | 'monthlyRent' | 'startDate' | 'endDate';
export type SentidoDeOrden = 'asc' | 'desc';

export interface FiltrosDeContratos {
  busqueda: string;
  estado: EstadoDeFiltro;
  vigencia: VigenciaDeFiltro;
  inmueble: ConOSin;
  inquilino: ConOSin;
  origen: OrigenDeFiltro;
  canon: CanonDeFiltro;
  /** `null` = el orden en que llega la lista (el back manda las más nuevas primero). */
  campo: CampoDeOrden | null;
  sentido: SentidoDeOrden;
}

export const FILTROS_INICIALES: FiltrosDeContratos = {
  busqueda: '',
  estado: 'all',
  vigencia: 'all',
  inmueble: 'all',
  inquilino: 'all',
  origen: 'all',
  canon: 'all',
  campo: null,
  sentido: 'asc',
};

/**
 * «Por vencer» = vence dentro de los próximos 90 días. Es el plazo del aviso
 * de no renovación de la Ley 820 (tres meses): es cuando la inmobiliaria
 * tiene que estar mirando el contrato, no después.
 */
export const DIAS_POR_VENCER = 90;

const MILLON = 1_000_000;

/** ¿Hay algo puesto que explique por qué la lista es más corta? El orden no cuenta. */
export function hayFiltros(f: FiltrosDeContratos): boolean {
  return (
    f.busqueda.trim().length > 0 ||
    f.estado !== 'all' ||
    f.vigencia !== 'all' ||
    f.inmueble !== 'all' ||
    f.inquilino !== 'all' ||
    f.origen !== 'all' ||
    f.canon !== 'all'
  );
}

/** Cuántos filtros hay puestos, sin contar la búsqueda ni el orden. */
export function cuantosFiltros(f: FiltrosDeContratos): number {
  return [f.estado, f.vigencia, f.inmueble, f.inquilino, f.origen, f.canon].filter(
    (v) => v !== 'all',
  ).length;
}

/** Sin acentos, sin mayúsculas: «Martínez» encuentra a «MARTINEZ». */
function comparable(v: unknown): string {
  return typeof v === 'string'
    ? v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    : '';
}

/** Un día sin hora, para comparar vigencias por calendario y no por instante. */
function dia(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/**
 * Una dirección sin lo que cada quien escribe distinto: espacios, «#», guiones,
 * puntos y «No.» (QA-CONT C-16: «calle 7 #39» no encontraba «Calle 7 # 39-12»).
 */
function direccionCompacta(v: unknown): string {
  return comparable(v).replace(/\bno\.?(?=\s*\d)/g, '').replace(/[\s#\-.,°º]/g, '');
}

function soloDigitos(v: unknown): string {
  return typeof v === 'string' ? v.replace(/\D/g, '') : '';
}

/** Los dueños del inmueble que la fila conoce (la lista los trae cuando el back los manda). */
function nombresDeLosPropietarios(c: Partial<Contract>): string[] {
  const nombres = (c.propietariosDelContrato?.propietarios ?? []).map((p) => p.name);
  if (c.propietarioDeLaConsignacion?.name) nombres.push(c.propietarioDeLaConsignacion.name);
  return nombres;
}

function coincideBusqueda(c: Partial<Contract>, q: string): boolean {
  /*
   * «#1981» y «1981» encuentran lo mismo: el numeral es como se LEE el código
   * en la pantalla, así que alguien lo va a escribir, y exigirlo o prohibirlo
   * son dos formas de no encontrar nada.
   */
  const sinNumeral = q.replace(/^#+/, '');
  const codigo = c.code != null ? String(c.code) : '';
  const externo = comparable(c.externalId).trim();
  /*
   * QA-CONT-95 (A-06): con el numeral («#3») se busca ESE número, no los que
   * lo contienen (antes «#3» traía 15 contratos y el #3 no iba primero).
   */
  if (q.startsWith('#') && sinNumeral !== '') {
    return codigo === sinNumeral || externo === sinNumeral;
  }
  /*
   * 🔴 QA-CONT C-16: el documento del inquilino («1037600101», o con puntos)
   * se busca por sus DÍGITOS, desde 5 (menos que eso es cualquier número). Y
   * el propietario: la fila ahora lo muestra, así que también se encuentra.
   */
  const digitos = soloDigitos(q);
  const documento = soloDigitos(c.tenantDocument);
  const direccion = direccionCompacta(q);
  return (
    (codigo !== '' && codigo.includes(sinNumeral)) ||
    (externo !== '' && externo.includes(sinNumeral)) ||
    comparable(c.tenantName).includes(q) ||
    comparable(c.propertyAddress).includes(q) ||
    (direccion.length >= 3 && direccionCompacta(c.propertyAddress).includes(direccion)) ||
    comparable(c.propertyCity).includes(q) ||
    (digitos.length >= 5 && digitos === q.replace(/[\s.\-]/g, '') && documento !== '' && documento.includes(digitos)) ||
    // CR-16: también por correo y por teléfono del inquilino.
    comparable(c.tenantEmail).includes(q) ||
    (digitos.length >= 5 && digitos === q.replace(/[\s.\-+()]/g, '') && soloDigitos(c.tenantPhone).includes(digitos)) ||
    nombresDeLosPropietarios(c).some((n) => comparable(n).includes(q))
  );
}

/**
 * 🔴 QA-CONT C-05/C-06 (03-10-2026): la vigencia ya no mira SÓLO la fecha de
 * fin. Un contrato terminado (`expired`/`cancelled`, o con `terminadoEn`) salía
 * en «Vigentes» y en «Vencen en 90 días» si su fin pactado era futuro (#9: en
 * «Expirado» y a la vez «vigente»), y uno que empieza el 1 de noviembre contaba
 * como vigente (Nico: «Empieza el 1 de nov» y no suma en vigentes).
 */
function yaTermino(c: Partial<Contract>, hoy: Date): boolean {
  if (c.status === 'expired' || c.status === 'cancelled') return true;
  // C-01: una terminación PROGRAMADA (fecha futura) todavía no terminó nada.
  const terminado = fechaDeVigencia(c.terminadoEn);
  return terminado !== null && dia(terminado) <= dia(hoy);
}

/** ¿Empieza después de hoy? (Nico, I-04 / C-05: «Por empezar».) */
export function empiezaDespues(c: Partial<Contract>, hoy: Date = new Date()): boolean {
  if (yaTermino(c, hoy)) return false;
  const inicio = fechaDeVigencia(c.startDate);
  return inicio !== null && dia(inicio) > dia(hoy);
}

function coincideVigencia(c: Partial<Contract>, v: VigenciaDeFiltro, hoy: Date): boolean {
  if (v === 'all') return true;
  const fin = fechaDeVigencia(c.endDate);
  if (v === 'sin_fechas') return fin === null;
  if (v === 'por_empezar') return empiezaDespues(c, hoy);
  if (v === 'vencido' && yaTermino(c, hoy)) return true;
  if (fin === null) return false;
  if (yaTermino(c, hoy) || empiezaDespues(c, hoy)) return false;
  const h = dia(hoy);
  const f = dia(fin);
  if (v === 'vencido') return f < h;
  if (v === 'vigente') return f >= h;
  // por_vencer: todavía vigente y se acaba dentro del plazo del aviso.
  const tope = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + DIAS_POR_VENCER).getTime();
  return f >= h && f <= tope;
}

function coincideCanon(c: Partial<Contract>, banda: CanonDeFiltro): boolean {
  if (banda === 'all') return true;
  const canon = c.monthlyRent;
  if (banda === 'sin_canon') return canon == null;
  if (canon == null) return false;
  switch (banda) {
    case 'hasta_1m':
      return canon <= MILLON;
    case '1m_2m':
      return canon > MILLON && canon <= 2 * MILLON;
    case '2m_5m':
      return canon > 2 * MILLON && canon <= 5 * MILLON;
    case 'mas_5m':
      return canon > 5 * MILLON;
  }
}

function coincideConOSin(valor: unknown, f: ConOSin): boolean {
  if (f === 'all') return true;
  // `null` es «no tiene» (T-0031/T-0033); `undefined` es «el back no lo mandó»
  // y no se puede afirmar ni una cosa ni la otra: se deja pasar.
  if (valor === undefined) return true;
  return f === 'con' ? valor !== null : valor === null;
}

/**
 * El número por el que se ordena la columna «Código»: el de la inmobiliaria si
 * lo hay, si no el nuestro. Numérico cuando se puede (los consecutivos lo
 * son); un texto que no es número va al final.
 */
function numeroParaOrdenar(c: Partial<Contract>): number | null {
  const externo = typeof c.externalId === 'string' ? c.externalId.trim() : '';
  if (externo !== '') {
    const n = Number(externo);
    return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY;
  }
  return c.code ?? null;
}

function comparar(a: Partial<Contract>, b: Partial<Contract>, campo: CampoDeOrden): number {
  if (campo === 'tenantName') {
    return comparable(a.tenantName).localeCompare(comparable(b.tenantName), 'es');
  }
  let va: number | null;
  let vb: number | null;
  if (campo === 'numero') {
    va = numeroParaOrdenar(a);
    vb = numeroParaOrdenar(b);
  } else if (campo === 'monthlyRent') {
    va = a.monthlyRent ?? null;
    vb = b.monthlyRent ?? null;
  } else {
    va = fechaDeVigencia(a[campo])?.getTime() ?? null;
    vb = fechaDeVigencia(b[campo])?.getTime() ?? null;
  }
  // Los vacíos ya se apartaron antes de llegar acá (ver el `sort`).
  return (va ?? 0) - (vb ?? 0);
}

export function filtrarContratos<T extends Partial<Contract>>(
  contratos: readonly T[],
  filtros: FiltrosDeContratos,
  hoy: Date = new Date(),
): T[] {
  const q = comparable(filtros.busqueda).trim();

  let resultado = contratos.filter((c) => {
    if (q && !coincideBusqueda(c, q)) return false;
    if (filtros.estado !== 'all' && c.status !== filtros.estado) return false;
    // QA-CONT-95 (A-11): «Activo» es lo que la fila llama «Activo»: sin los que
    // todavía no empiezan («Empieza el…») ni los vencidos sin renovar («Vencido»).
    if (filtros.estado === 'active' && !esActivoDeVerdad(c, hoy)) return false;
    if (!coincideVigencia(c, filtros.vigencia, hoy)) return false;
    if (!coincideConOSin(c.propertyId, filtros.inmueble)) return false;
    if (!coincideConOSin(c.tenantId, filtros.inquilino)) return false;
    if (filtros.origen !== 'all') {
      const migrado = c.contractOrigin === 'MIGRATED';
      if (filtros.origen === 'migrado' ? !migrado : migrado) return false;
    }
    if (!coincideCanon(c, filtros.canon)) return false;
    return true;
  });

  /*
   * 🔴 QA-CONT-95 (A-06): un NÚMERO buscado («3» o «#3») pone primero al
   * contrato que tiene ESE número (el nuestro o el de la inmobiliaria). Sin el
   * numeral se sigue buscando también dentro de direcciones y documentos, pero
   * el #3 ya no queda enterrado detrás del #53 y del #43. Un orden elegido a
   * mano manda por encima de esto.
   */
  const numeroBuscado = q.replace(/^#+/, '');
  if (!filtros.campo && /^\d+$/.test(numeroBuscado)) {
    const esEseNumero = (c: Partial<Contract>) =>
      (c.code != null && String(c.code) === numeroBuscado) ||
      comparable(c.externalId).trim() === numeroBuscado;
    resultado = [...resultado.filter(esEseNumero), ...resultado.filter((c) => !esEseNumero(c))];
  }

  if (filtros.campo) {
    const campo = filtros.campo;
    const signo = filtros.sentido === 'asc' ? 1 : -1;
    // `sort` es estable: dos filas iguales conservan el orden del back.
    resultado = [...resultado].sort((a, b) => {
      // Sin dato → al final en los DOS sentidos: un «sin canon» no es ni el
      // más barato ni el más caro, y un «sin fecha» no vence ni primero ni
      // último.
      const aVacio = esVacio(a, campo);
      const bVacio = esVacio(b, campo);
      if (aVacio && bVacio) return 0;
      if (aVacio) return 1;
      if (bVacio) return -1;
      return comparar(a, b, campo) * signo;
    });
  }

  return resultado;
}

function esVacio(c: Partial<Contract>, campo: CampoDeOrden): boolean {
  if (campo === 'tenantName') return false;
  if (campo === 'numero') return numeroParaOrdenar(c) === null;
  if (campo === 'monthlyRent') return c.monthlyRent == null;
  return fechaDeVigencia(c[campo]) === null;
}

/**
 * QA-CONT-95 (A-03, A-11): un `active` que la fila llama «Activo»: ya empezó, no
 * pasó su fecha de fin y no se terminó. Los demás `active` son «Empieza el…»
 * o «Vencido».
 */
export function esActivoDeVerdad(c: Partial<Contract>, hoy: Date = new Date()): boolean {
  if (c.status !== 'active') return false;
  if (yaTermino(c, hoy) || empiezaDespues(c, hoy)) return false;
  const fin = fechaDeVigencia(c.endDate);
  return fin === null || dia(fin) >= dia(hoy);
}

/** QA-CONT-95 (A-03): un `active` cuya fecha de fin ya pasó y nadie renovó ni terminó. */
export function vencidoSinRenovar(c: Partial<Contract>, hoy: Date = new Date()): boolean {
  if (c.status !== 'active' || yaTermino(c, hoy) || empiezaDespues(c, hoy)) return false;
  const fin = fechaDeVigencia(c.endDate);
  return fin !== null && dia(fin) < dia(hoy);
}
