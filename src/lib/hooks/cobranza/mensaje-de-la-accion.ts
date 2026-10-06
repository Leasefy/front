import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores'

/**
 * La frase de una acción de cobranza que no salió (02-10-2026, tanda 2 de
 * errores, A6).
 *
 * Los hooks del micro devuelven (o guardan) dos cosas:
 *  · `fallo`: el `ApiError` de `falloDelMicro` o el error de la red tal cual.
 *    Si está, la acción salió y el micro (o la red) dijo que no: manda el
 *    traductor (un 4xx dice su `message`, un 5xx «de nuestro lado» con la
 *    referencia, «conexión» sólo sin respuesta).
 *  · `error`: un código del propio hook cuando la acción NI SALIÓ (sin agente
 *    configurado, sin permiso, falta un dato). No es para una persona: acá se
 *    dice en español qué pasa. Lo que no se reconoce cae en `porDefecto`.
 *
 * No es otro traductor: lo que vino del servidor va SIEMPRE al de
 * `lib/errores/`.
 */
export const FRASES_DE_LOS_CODIGOS_DEL_HOOK: Readonly<Record<string, string>> = {
  ENV_OR_AGENCY_MISSING: 'El agente de cobranza no está configurado para tu inmobiliaria.',
  PERMISSION_DENIED: 'No tienes permiso para hacer esto. Pídeselo a un administrador.',
  NO_PLAN_LOADED: 'El plan todavía no terminó de cargar. Espera un momento y vuelve a intentar.',
  SEND_METHOD_OR_ADDRESS_MISSING: 'Elige cómo se envía la carta y escribe la dirección.',
  REJECT_REASON_REQUIRED: 'Elige el motivo del rechazo.',
  NO_INSURERS_SELECTED: 'Elige al menos una aseguradora.',
  DEBTOR_REQUIRED: 'Elige el deudor para el que se genera el reporte.',
}

export interface OpcionesDeLaAccion {
  porDefecto: string
  /** En infinitivo: «aprobar la carta». */
  accion: string
}

export function mensajeDeLaAccion(
  resultado: { error?: string | null; fallo?: unknown },
  opciones: OpcionesDeLaAccion,
): string {
  if (resultado.fallo !== undefined && resultado.fallo !== null) {
    return mensajeParaLaPersona(resultado.fallo, opciones)
  }
  const frase = resultado.error ? FRASES_DE_LOS_CODIGOS_DEL_HOOK[resultado.error] : undefined
  return frase ?? opciones.porDefecto
}
