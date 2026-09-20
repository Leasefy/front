/**
 * Cobranza con reglaje — `/inmobiliaria/cobranza/secuencia`.
 *
 * Sigue el patrón de `reglas-de-mora.service.ts`: `apiClient` + un cuerpo
 * armado clave por clave.
 *
 * 🔴 Por qué los cuerpos se arman a mano y no con un spread: el back valida con
 * `forbidNonWhitelisted: true`, así que una clave de más no se ignora —
 * devuelve 400. `cobranza-secuencia.service.test.ts` fija el juego exacto.
 *
 * 🔴 `enviar` es lo ÚNICO que le escribe a un inquilino. Nada en este archivo
 * se llama solo: la pantalla lo dispara después de mostrar la vista previa.
 */

import { apiClient } from '@/lib/api/client';
import type {
  CalendarioDeLaSecuencia,
  CambiosDeLaSecuencia,
  CanalDeCobranza,
  ResultadoDelEnvio,
  SecuenciaDeCobranza,
  VistaPreviaDeCobranza,
} from './cobranza-secuencia.types';

const BASE = '/inmobiliaria/cobranza/secuencia';

function cuerpoDeCambios(cambios: CambiosDeLaSecuencia): Record<string, unknown> {
  const cuerpo: Record<string, unknown> = {};
  if (cambios.activa !== undefined) cuerpo.activa = cambios.activa;
  if (cambios.diaDelRecordatorio !== undefined) {
    cuerpo.diaDelRecordatorio = cambios.diaDelRecordatorio;
  }
  if (cambios.diasEntreAvisos !== undefined) cuerpo.diasEntreAvisos = cambios.diasEntreAvisos;
  if (cambios.maxAvisosConInteres !== undefined) {
    cuerpo.maxAvisosConInteres = cambios.maxAvisosConInteres;
  }
  if (cambios.canalPreferido !== undefined) cuerpo.canalPreferido = cambios.canalPreferido;
  if (cambios.mensajeDelRecordatorio !== undefined) {
    cuerpo.mensajeDelRecordatorio = cambios.mensajeDelRecordatorio;
  }
  if (cambios.mensajeDelAviso !== undefined) cuerpo.mensajeDelAviso = cambios.mensajeDelAviso;
  return cuerpo;
}

/** El mes de hoy en Bogotá, como `AAAA-MM`. Es el que la pantalla abre. */
export function mesDeHoy(ahora: Date = new Date()): string {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
  }).format(ahora);
  return partes.slice(0, 7);
}

export const cobranzaSecuenciaApi = {
  /** Las condiciones de cobro de la inmobiliaria. */
  async obtener(): Promise<SecuenciaDeCobranza> {
    return apiClient.get<SecuenciaDeCobranza>(BASE);
  },

  /** Guardar las condiciones. Sólo viajan las claves que cambian. */
  async guardar(cambios: CambiosDeLaSecuencia): Promise<SecuenciaDeCobranza> {
    return apiClient.put<SecuenciaDeCobranza>(BASE, cuerpoDeCambios(cambios));
  },

  /** Qué va a pasar y cuándo, con el reglaje de hoy. */
  async calendario(mes: string): Promise<CalendarioDeLaSecuencia> {
    return apiClient.get<CalendarioDeLaSecuencia>(
      `${BASE}/calendario?mes=${encodeURIComponent(mes)}`,
    );
  },

  /**
   * A cuántos le va a llegar — y a quién NO, con el motivo. Es `GET` y no
   * tiene ningún efecto: la pantalla lo vuelve a pedir cada vez que se cambia
   * el mes, el paso o el canal.
   */
  async destinatarios(args: {
    mes: string;
    paso?: number;
    canal?: CanalDeCobranza;
  }): Promise<VistaPreviaDeCobranza> {
    const query = new URLSearchParams({ mes: args.mes });
    if (args.paso !== undefined) query.set('paso', String(args.paso));
    if (args.canal !== undefined) query.set('canal', args.canal);
    return apiClient.get<VistaPreviaDeCobranza>(`${BASE}/destinatarios?${query.toString()}`);
  },

  /**
   * Mandar el paso del reglaje. Puede fallar con 400 y un mensaje en español
   * (la secuencia no está activa, el canal de WhatsApp está apagado) o con 503
   * si al back le falta la migración: ese mensaje se muestra tal cual.
   */
  async enviar(args: {
    mes: string;
    paso?: number;
    canal?: CanalDeCobranza;
    /**
     * 🔴 Los `cuotaId` de la vista previa, NO los `cobroId`.
     *
     * El back renombró este filtro el 2026-09-15. Sigue aceptando el nombre
     * viejo (`soloEstosCobros`) para no dar 400 con `forbidNonWhitelisted`,
     * pero lee sus valores como `cuotaId`: un front que mande ids de cobro no
     * coincide con ninguna cuota, la selección queda vacía y NO SALE NADA. Es
     * un fallo silencioso hacia «no mandé», que es el lado seguro, pero es un
     * fallo igual — por eso acá viaja con el nombre nuevo.
     */
    soloEstasCuotas?: string[];
  }): Promise<ResultadoDelEnvio> {
    const cuerpo: Record<string, unknown> = { mes: args.mes };
    if (args.paso !== undefined) cuerpo.paso = args.paso;
    if (args.canal !== undefined) cuerpo.canal = args.canal;
    if (args.soloEstasCuotas !== undefined) cuerpo.soloEstasCuotas = args.soloEstasCuotas;
    return apiClient.post<ResultadoDelEnvio>(`${BASE}/enviar`, cuerpo);
  },
};

export type {
  CalendarioDeLaSecuencia,
  CambiosDeLaSecuencia,
  CanalDeCobranza,
  Destinatario,
  MotivoDeExclusion,
  PasoDelCalendario,
  ResultadoDelEnvio,
  SecuenciaDeCobranza,
  VistaPreviaDeCobranza,
} from './cobranza-secuencia.types';
