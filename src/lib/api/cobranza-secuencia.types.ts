/**
 * Cobranza con reglaje — los tipos del contrato con
 * `/inmobiliaria/cobranza/secuencia`.
 *
 * Calcados de `back/src/inmobiliaria/cobros/secuencia-de-cobranza/`. Los enums
 * son los del back, letra por letra: el front no inventa valores.
 */

export const CANALES_DE_COBRANZA = ['CORREO', 'WHATSAPP'] as const;
export type CanalDeCobranza = (typeof CANALES_DE_COBRANZA)[number];

export const MOTIVOS_DE_EXCLUSION = [
  'YA_PAGO',
  'CUBIERTO_POR_ANTICIPO',
  'YA_SE_LE_ENVIO',
  'SIN_DATOS_DE_CONTACTO',
  'SIN_CORREO',
  'SIN_WHATSAPP',
  'LEY_2300',
] as const;
export type MotivoDeExclusion = (typeof MOTIVOS_DE_EXCLUSION)[number];

/** Por qué el canal de WhatsApp está o no disponible. */
export type EstadoDelCanal = { disponible: true } | { disponible: false; motivo: string };

/** Las condiciones de cobro de la inmobiliaria — `GET /`. */
export interface SecuenciaDeCobranza {
  activa: boolean;
  /** Día del mes en que sale el recordatorio (1-28). */
  diaDelRecordatorio: number;
  /** Días que se le dan al inquilino entre un aviso y el siguiente. */
  diasEntreAvisos: number;
  /** Cuántos avisos CON INTERÉS se mandan como máximo después del recordatorio. */
  maxAvisosConInteres: number;
  canalPreferido: CanalDeCobranza;
  mensajeDelRecordatorio: string | null;
  mensajeDelAviso: string | null;
  /** `false` = la migración del back no está aplicada: se ve, no se envía. */
  disponible: boolean;
  motivo: string | null;
  canalDeWhatsapp: EstadoDelCanal;
}

/** El cuerpo de `PUT /`. Todo opcional: sólo viajan las claves que cambian. */
export type CambiosDeLaSecuencia = Partial<
  Pick<
    SecuenciaDeCobranza,
    | 'activa'
    | 'diaDelRecordatorio'
    | 'diasEntreAvisos'
    | 'maxAvisosConInteres'
    | 'canalPreferido'
  >
> & {
  mensajeDelRecordatorio?: string;
  mensajeDelAviso?: string;
};

/** Un paso del calendario — `GET /calendario`. */
export interface PasoDelCalendario {
  /** `0` es el recordatorio; de `1` en adelante, los avisos con interés. */
  paso: number;
  /** `AAAA-MM-DD`: un día del calendario, sin husos de por medio. */
  fecha: string;
  conInteres: boolean;
  titulo: string;
}

export interface CalendarioDeLaSecuencia {
  mes: string;
  pasos: PasoDelCalendario[];
}

/** Una fila de la vista previa. Las que NO reciben traen su motivo. */
export interface Destinatario {
  cobroId: string;
  nombre: string;
  inmueble: string;
  pendienteCop: number;
  personaClave: string | null;
  canal: CanalDeCobranza;
  destino: string | null;
  leLlega: boolean;
  motivo: MotivoDeExclusion | null;
  /** El motivo escrito para que lo lea una persona. Se muestra tal cual. */
  explicacion: string | null;
}

/** `GET /destinatarios` — a cuántos le va a llegar antes de mandar. */
export interface VistaPreviaDeCobranza {
  mes: string;
  canal: CanalDeCobranza;
  paso: number;
  revisados: number;
  lesLlega: number;
  excluidos: Record<MotivoDeExclusion, number>;
  destinatarios: Destinatario[];
  disponible: boolean;
  motivo: string | null;
}

/** `POST /enviar` — el desenlace, fila por fila. */
export interface ResultadoDelEnvio {
  mes: string;
  paso: number;
  canal: CanalDeCobranza;
  enviados: number;
  omitidos: number;
  fallidos: number;
  detalle: Array<{ cobroId: string; nombre: string; estado: string; motivo: string | null }>;
}

/** Cómo se lee cada motivo de exclusión en el resumen de la pantalla. */
export const ETIQUETA_DEL_MOTIVO: Record<MotivoDeExclusion, string> = {
  YA_PAGO: 'Ya pagaron',
  CUBIERTO_POR_ANTICIPO: 'Pagaron por adelantado',
  YA_SE_LE_ENVIO: 'Ya se les envió',
  SIN_DATOS_DE_CONTACTO: 'Sin datos de contacto',
  SIN_CORREO: 'Sin correo',
  SIN_WHATSAPP: 'Sin WhatsApp',
  LEY_2300: 'Bloqueados por la Ley 2300',
};
