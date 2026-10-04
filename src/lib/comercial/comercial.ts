/**
 * COMERCIAL (Nico, 04-10-2026, TAL CUAL): que el área comercial —asesores y
 * gerente— trabaje con Leasefy sin Excel. El cliente de `/inmobiliaria/comercial/*`
 * y los textos que se repiten en la lista, la ficha y las pantallas.
 *
 * Es la comisión del ASESOR dentro de la inmobiliaria; lo que Leasefy le cobra
 * a la inmobiliaria no se toca.
 */
import { apiClient } from '@/lib/api/client';
import { formatCurrency } from '@/lib/format';
import { diaLegible, mesLegible } from '@/lib/mandato/textos';
import { campoCsv, SEPARADOR } from '@/lib/contabilidad/csv';

const BASE = '/inmobiliaria/comercial';

export type FormaDeLaRegla = 'PORCENTAJE' | 'FIJO_POR_CIERRE';

export interface ReglaDeComision {
  id: string;
  asesorUserId: string | null;
  asesorNombre?: string | null;
  desdeMes: string;
  forma: FormaDeLaRegla;
  pctCaptar: number | null;
  pctCerrar: number | null;
  fijoPorCierreCop: number | null;
  createdAt?: string;
}

export interface PersonaDelEquipo {
  userId: string;
  nombre: string;
}

export interface ReglasDeComision {
  reglas: ReglaDeComision[];
  asesores: PersonaDelEquipo[];
  vigenteDeTodos: ReglaDeComision | null;
}

export type AccionDelAsesor = 'CAPTO' | 'CERRO';
export type EstadoDeLaLinea = 'GANADA' | 'POR_CAUSAR' | 'PARCIAL' | 'SIN_REGLA';

export interface LineaDeComision {
  asesorUserId: string;
  contractId: string;
  codigo: number | null;
  inmueble: string;
  consignacionId: string | null;
  accion: AccionDelAsesor;
  baseCop: number;
  baseCausadaCop: number;
  regla: { id: string; forma: FormaDeLaRegla; desdeMes: string; deTodos: boolean; texto: string } | null;
  valorCop: number | null;
  ganadoCop: number;
  porCausarCop: number;
  estado: EstadoDeLaLinea;
}

export interface ComisionDelAsesor {
  userId: string;
  nombre: string;
  regla: ReglaDeComision | null;
  ganadoCop: number;
  porCausarCop: number;
  lineas: number;
  sinRegla: number;
  detalle: LineaDeComision[];
}

export interface ComisionesDelMes {
  mes: string;
  hayReglas: boolean;
  soloLaMia: boolean;
  asesores: ComisionDelAsesor[];
  totales: { ganadoCop: number; porCausarCop: number; lineas: number; sinRegla: number };
  sinAsesor: number;
}

export interface MetaDelAsesor {
  userId: string;
  nombre: string;
  meta: { cierres: number; captaciones: number } | null;
  avance: { cierres: number; captaciones: number };
}

export interface MetasDelMes {
  mes: string;
  soloLaMia: boolean;
  asesores: MetaDelAsesor[];
}

export interface Vacancia {
  vacante: boolean;
  desde: string | null;
  dias: number | null;
  fuente: 'FIN_DEL_CONTRATO' | 'CONSIGNACION' | null;
}

export type EstadoDelMandato = 'VIGENTE' | 'POR_VENCER' | 'VENCIDO' | 'SIN_FECHA';

export interface VencimientoDelMandato {
  estado: EstadoDelMandato;
  vence: string | null;
  dias: number | null;
}

export interface VacanciaYMandato {
  consignacionId: string;
  agenteUserId: string | null;
  vacancia: Vacancia;
  mandato: VencimientoDelMandato;
}

export interface GuardarRegla {
  asesorUserId: string | null;
  desdeMes: string;
  forma: FormaDeLaRegla;
  pctCaptar?: number | null;
  pctCerrar?: number | null;
  fijoPorCierreCop?: number | null;
}

export const comercialApi = {
  reglas: () => apiClient.get<ReglasDeComision>(`${BASE}/reglas`),
  guardarRegla: (cuerpo: GuardarRegla) => apiClient.put<ReglaDeComision>(`${BASE}/reglas`, cuerpo),
  borrarRegla: (id: string) => apiClient.delete<{ borrada: true }>(`${BASE}/reglas/${id}`),
  comisiones: (mes: string) =>
    apiClient.get<ComisionesDelMes>(`${BASE}/comisiones?mes=${encodeURIComponent(mes)}`),
  metas: (mes: string) => apiClient.get<MetasDelMes>(`${BASE}/metas?mes=${encodeURIComponent(mes)}`),
  guardarMeta: (cuerpo: { asesorUserId: string; mes: string; cierres: number; captaciones: number }) =>
    apiClient.put<MetaDelAsesor>(`${BASE}/metas`, cuerpo),
  vacanciaYMandatos: () =>
    apiClient.get<{ hoy: string; consignaciones: VacanciaYMandato[] }>(`${BASE}/vacancia-y-mandatos`),
};

/** El mes de hoy, `YYYY-MM` (Bogotá). */
export function mesDeHoy(ahora: Date = new Date()): string {
  const bogota = new Date(ahora.getTime() - 5 * 3_600_000);
  return bogota.toISOString().slice(0, 7);
}

/** «octubre de 2026» con mayúscula inicial. */
export function nombreDelMes(mes: string): string {
  const t = mesLegible(mes);
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function porcentajeEscrito(pct: number): string {
  return `${String(pct).replace('.', ',')} %`;
}

/** Cómo se lee una regla, de una línea. */
export function textoDeLaRegla(r: Pick<ReglaDeComision, 'forma' | 'pctCaptar' | 'pctCerrar' | 'fijoPorCierreCop'>): string {
  if (r.forma === 'FIJO_POR_CIERRE') {
    return `${formatCurrency(r.fijoPorCierreCop ?? 0)} por cada contrato que cierra`;
  }
  const partes: string[] = [];
  if (r.pctCaptar != null && r.pctCaptar > 0) partes.push(`${porcentajeEscrito(r.pctCaptar)} por captar`);
  if (r.pctCerrar != null && r.pctCerrar > 0) partes.push(`${porcentajeEscrito(r.pctCerrar)} por cerrar`);
  return `${partes.join(' y ')} de la comisión que gana la inmobiliaria`;
}

/** La regla de una línea, para la persona. */
export function textoDeLaReglaDeLaLinea(l: LineaDeComision): string {
  if (!l.regla) return 'Sin regla';
  const de = l.regla.deTodos ? 'regla de todos' : 'regla propia';
  if (l.regla.forma === 'FIJO_POR_CIERRE') return `Fijo por cierre (${de})`;
  return `${l.accion === 'CAPTO' ? 'Por captar' : 'Por cerrar'} (${de})`;
}

export const ESTADO_DE_LA_LINEA: Record<EstadoDeLaLinea, string> = {
  GANADA: 'Ganada',
  POR_CAUSAR: 'Por causar',
  PARCIAL: 'Parte por causar',
  SIN_REGLA: 'Sin regla',
};

export const ACCION: Record<AccionDelAsesor, string> = {
  CAPTO: 'Captó',
  CERRO: 'Cerró',
};

/** «Vacante hace 42 días», «Vacante desde hoy» o «No sabemos desde cuándo está vacante». */
export function textoDeLaVacancia(v: Vacancia): string | null {
  if (!v.vacante) return null;
  if (v.dias === null || v.desde === null) return 'No sabemos desde cuándo está vacante';
  if (v.dias === 0) return 'Vacante desde hoy';
  return `Vacante hace ${v.dias} ${v.dias === 1 ? 'día' : 'días'}`;
}

/** El porqué de la fecha. */
export function detalleDeLaVacancia(v: Vacancia): string | null {
  if (!v.vacante) return null;
  if (!v.desde) {
    return 'El mandato llegó por migración o importación y en Leasefy no hay un contrato terminado que diga desde cuándo está libre.';
  }
  return v.fuente === 'FIN_DEL_CONTRATO'
    ? `Desde el ${diaLegible(v.desde)}, el día después de que terminó el último contrato.`
    : `Desde el ${diaLegible(v.desde)}, cuando se consignó.`;
}

/** «Mandato vence el 15 de octubre de 2026 (faltan 11 días)» / «Mandato vencido hace 3 días». */
export function textoDelMandato(m: VencimientoDelMandato): string | null {
  if (m.estado === 'SIN_FECHA' || !m.vence || m.dias === null) return null;
  if (m.estado === 'VENCIDO') {
    const d = -m.dias;
    return `Mandato vencido el ${diaLegible(m.vence)} (hace ${d} ${d === 1 ? 'día' : 'días'})`;
  }
  if (m.dias === 0) return `Mandato vence hoy, ${diaLegible(m.vence)}`;
  return `Mandato vence el ${diaLegible(m.vence)} (faltan ${m.dias} ${m.dias === 1 ? 'día' : 'días'})`;
}

/** La versión corta, para la lista (la fecha completa va en el `title`). */
export function textoCortoDelMandato(m: VencimientoDelMandato): string | null {
  if (m.estado === 'SIN_FECHA' || !m.vence || m.dias === null) return null;
  if (m.estado === 'VENCIDO') {
    const d = -m.dias;
    return `Mandato vencido hace ${d} ${d === 1 ? 'día' : 'días'}`;
  }
  if (m.dias === 0) return 'Mandato vence hoy';
  return `Mandato vence en ${m.dias} ${m.dias === 1 ? 'día' : 'días'}`;
}

export const DIAS_DE_VACANCIA_LARGA = 30;

export function esVacanciaLarga(v: Vacancia | undefined): boolean {
  return Boolean(v?.vacante && v.dias !== null && v.dias > DIAS_DE_VACANCIA_LARGA);
}

export function mandatoPorVencerOVencido(m: VencimientoDelMandato | undefined): boolean {
  return m?.estado === 'POR_VENCER' || m?.estado === 'VENCIDO';
}

function pesosDelCsv(n: number | null): string {
  return n === null ? '' : String(n).replace('.', ',');
}

/** El CSV de la comisión del mes, para nómina (Excel en español: `;` y coma decimal). */
export function csvDeLasComisiones(datos: ComisionesDelMes): string {
  const encabezado = [
    'Mes',
    'Asesor',
    'Inmueble',
    'Contrato',
    'Qué hizo',
    'Comisión de la inmobiliaria del mes',
    'Causada',
    'Regla',
    'Valor del asesor',
    'Ganado',
    'Por causar',
    'Estado',
  ];
  const filas: string[][] = [];
  for (const a of datos.asesores) {
    for (const l of a.detalle) {
      filas.push([
        datos.mes,
        a.nombre,
        l.inmueble,
        l.codigo != null ? `#${l.codigo}` : '',
        ACCION[l.accion],
        pesosDelCsv(l.baseCop),
        pesosDelCsv(l.baseCausadaCop),
        l.regla?.texto ?? 'Sin regla',
        pesosDelCsv(l.valorCop),
        pesosDelCsv(l.ganadoCop),
        pesosDelCsv(l.porCausarCop),
        ESTADO_DE_LA_LINEA[l.estado],
      ]);
    }
  }
  // El total por asesor, que es lo que se paga.
  filas.push([]);
  filas.push(['Mes', 'Asesor', 'Total ganado', 'Total por causar']);
  for (const a of datos.asesores) {
    filas.push([datos.mes, a.nombre, pesosDelCsv(a.ganadoCop), pesosDelCsv(a.porCausarCop)]);
  }
  return [encabezado, ...filas].map((f) => f.map((c) => campoCsv(c)).join(SEPARADOR)).join('\r\n');
}

export function descargarCsv(nombre: string, contenido: string): void {
  const blob = new Blob(['﻿' + contenido], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
