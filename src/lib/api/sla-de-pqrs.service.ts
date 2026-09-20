import { apiClient } from './client';

/**
 * 🔴 EL TIEMPO MÁXIMO DE UNA PQRS, por tipo (Nico, 17/18-09-2026: «cada PQRS con
 * responsable, tiempo máximo CONFIGURABLE y escalamiento automático al jefe»).
 *
 * La columna `agencies.pqrs_sla_horas` existía desde el 18-09 y el cómputo ya la
 * respetaba, pero NADIE la escribía: no había endpoint ni pantalla. Una
 * inmobiliaria que quería prometer 48 horas no tenía cómo decirlo.
 *
 * 🔴 Cambiar esto NO mueve ninguna PQRS ya radicada: el plazo se congela en la
 * fila el día que se radica. Bajar el compromiso de 15 días a 48 horas no puede
 * volver vencidas de golpe a las que estaban abiertas.
 */

/** Horas prometidas por tipo. `null` = ese tipo se rige por el plazo legal. */
export type SlaPorTipoDePqrs = Record<string, number | null>;

export interface SlaDePqrs {
  /** `false` = falta la migración: todavía no se puede configurar. */
  disponible: boolean;
  motivo: string | null;
  porTipo: SlaPorTipoDePqrs;
  /** Los días hábiles que aplican cuando no hay nada configurado. */
  legalDiasHabiles: number;
}

const BASE = '/inmobiliaria/pqrs/sla';

export const slaDePqrsApi = {
  ver(): Promise<SlaDePqrs> {
    return apiClient.get<SlaDePqrs>(BASE);
  },

  /**
   * Los tipos que van en `null` (o que no viajan) vuelven al plazo legal. El
   * back guarda sólo los que traen número, así que el JSONB nunca acumula
   * llaves muertas.
   */
  guardar(porTipo: SlaPorTipoDePqrs): Promise<SlaDePqrs> {
    const soloNumeros = Object.fromEntries(
      Object.entries(porTipo).filter(([, v]) => typeof v === 'number'),
    );
    return apiClient.put<SlaDePqrs>(BASE, soloNumeros);
  },
};
