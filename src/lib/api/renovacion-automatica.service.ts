/**
 * La renovación automática de un contrato — `/inmobiliaria/renovaciones`.
 *
 * 🔴 El pronóstico («se renueva sola el 3/9/2027 con un incremento del
 * 5,10 % si nadie avisa antes del 3/6/2027») lo calcula el BACK, con la misma
 * regla que ejecuta el cron de las 00:20. La pantalla no lo recalcula: si lo
 * hiciera, tarde o temprano diría una cosa y el sistema haría otra.
 *
 * Los cuerpos se arman clave por clave: el back valida con
 * `forbidNonWhitelisted: true` y una clave de más devuelve 400.
 */

import { apiClient } from '@/lib/api/client';

const BASE = '/inmobiliaria/renovaciones';

/** Quién puede avisar que no renueva (Ley 820 art. 22). */
export const PARTES_QUE_AVISAN = ['INQUILINO', 'PROPIETARIO', 'INMOBILIARIA'] as const;
export type ParteQueAvisa = (typeof PARTES_QUE_AVISAN)[number];

export const NOMBRE_DE_LA_PARTE: Record<ParteQueAvisa, string> = {
  INQUILINO: 'El inquilino',
  PROPIETARIO: 'El propietario',
  INMOBILIARIA: 'La inmobiliaria',
};

/** Qué va a hacer el sistema con este contrato. */
export type AccionDeRenovacion = 'nada' | 'proponer' | 'renovar' | 'terminar';

/** Por qué un contrato no tiene pronóstico. */
export type SinPlanPorque = 'CONTRATO_NO_VIGENTE' | 'SIN_VENCIMIENTO' | 'SIN_CANON';

export interface TasaDeIpc {
  /** El porcentaje como lo publica el DANE: 5.10 son 5,10 %. */
  rate: number;
  anio: number;
}

export interface PlanDeRenovacion {
  accion: AccionDeRenovacion;
  porQue: string;
  /** Todas `YYYY-MM-DD`: un DATE es un día, no un instante. */
  fechaDeAviso: string;
  finDeVigencia: string;
  nuevoVencimiento: string;
  mesesDeTermino: number;
  canonActual: number;
  canonNuevo: number;
  incremento: number;
  incrementoPct: number;
  ipc: TasaDeIpc | null;
  seRenuevaSola: boolean;
}

export interface AvisoDeNoRenovacion {
  at: string;
  por: ParteQueAvisa | string | null;
  motivo: string | null;
}

export interface PlanDelContrato {
  contractId: string;
  /** La renovación abierta del inmueble; `null` si todavía no se abrió. */
  renovacionId: string | null;
  /** `Agency.renovacionAutomatica`: apagada, el cron no toca este contrato. */
  automaticaPrendida: boolean;
  plan: PlanDeRenovacion | null;
  aviso: AvisoDeNoRenovacion | null;
  propuestaEnviadaAt: string | null;
  sinPlanPorque: SinPlanPorque | null;
}

/** Lo que haría (o hizo) una pasada de la renovación automática. */
export interface ResumenDeLaCorrida {
  agencias: number;
  revisadas: number;
  propuestas: number;
  renovadas: number;
  terminadas: number;
  sinCambios: number;
  fallidas: number;
  /** `true` = no se tocó nada: es el pronóstico, no la corrida. */
  simulado?: boolean;
}

/**
 * ¿Falta el IPC del año que rige? Lo cuenta el back con la MISMA regla que
 * ejecuta el cron, así que el aviso no puede decir algo distinto de lo que va
 * a pasar.
 */
export interface IpcQueFalta {
  /** El año cuyo IPC de diciembre falta; `null` = no falta ninguno. */
  anioDelIpc: number | null;
  /** El año en que rigen las renovaciones que lo necesitan. */
  anioQueRige: number | null;
  /** Contratos vigentes que se renovarían SIN incremento por eso. */
  contratos: number;
}

export const renovacionAutomaticaApi = {
  /** Qué va a pasar con este contrato y cuándo. */
  async delContrato(contractId: string): Promise<PlanDelContrato> {
    return apiClient.get<PlanDelContrato>(`${BASE}/plan/${contractId}`);
  },

  /** 🔴 Cuántos contratos se renuevan sin incremento porque falta el IPC del año que rige. */
  async ipcQueFalta(): Promise<IpcQueFalta> {
    return apiClient.get<IpcQueFalta>(`${BASE}/ipc-que-falta`);
  },

  /**
   * 🔴 Contar sin hacer: cuántas propuestas saldrían y cuántos contratos se
   * renovarían si el cron corriera ahora. No manda un correo ni escribe una
   * fila, y a propósito no mira la perilla de la agencia — es el número que
   * hay que ver ANTES de prenderla.
   */
  async simular(): Promise<ResumenDeLaCorrida> {
    return apiClient.post<ResumenDeLaCorrida>(
      `${BASE}/correr-automatica?simular=true`,
      {},
    );
  },

  /** Registra que una parte avisó que no renueva. */
  async registrarAviso(
    renovacionId: string,
    datos: { parte: ParteQueAvisa; motivo: string },
  ): Promise<void> {
    await apiClient.post(`${BASE}/${renovacionId}/aviso-de-no-renovacion`, {
      parte: datos.parte,
      motivo: datos.motivo,
    });
  },

  /** La parte se retractó: el contrato vuelve a prorrogarse solo. */
  async borrarAviso(renovacionId: string): Promise<void> {
    await apiClient.delete(`${BASE}/${renovacionId}/aviso-de-no-renovacion`);
  },
};
