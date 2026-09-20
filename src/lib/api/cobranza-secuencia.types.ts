/**
 * Cobranza con reglaje — los tipos del contrato con
 * `/inmobiliaria/cobranza/secuencia`.
 *
 * Calcados de `back/src/inmobiliaria/cobros/secuencia-de-cobranza/`. Los enums
 * son los del back, letra por letra: el front no inventa valores.
 */

export const CANALES_DE_COBRANZA = ['CORREO', 'WHATSAPP'] as const;
export type CanalDeCobranza = (typeof CANALES_DE_COBRANZA)[number];

/**
 * 🔴 La lista tiene que estar COMPLETA: la pantalla recorre esta constante para
 * armar el resumen de exclusiones, así que un motivo que falte no sale como
 * «otros» — la gente excluida por ese motivo simplemente DESAPARECE del conteo
 * y nadie se entera de por qué la lista se encogió.
 *
 * `AUN_NO_VENCE` y `DENTRO_DEL_PLAZO` nacieron el 2026-09-15 con la separación
 * entre deuda y cartera: del paso 1 en adelante el aviso lleva interés, y eso
 * sólo se le manda a quien ya es cartera.
 */
export const MOTIVOS_DE_EXCLUSION = [
  'YA_PAGO',
  'AUN_NO_VENCE',
  'DENTRO_DEL_PLAZO',
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
  /**
   * 🔴 La CUOTA: la llave de la fila y lo que viaja en `soloEstasCuotas`. Antes
   * esto era `cobroId`, que hoy puede venir en `null`; mandar ids de cobro deja
   * la selección vacía y no sale nada.
   */
  cuotaId: string;
  /** El cobro, cuando existe. `null` en toda cuota que finanzas no reclamó. */
  cobroId: string | null;
  nombre: string;
  inmueble: string;
  pendienteCop: number;
  /** Días desde que se acabó el plazo. `0` en el recordatorio. */
  diasDeMora: number;
  /** `true` = esta cuota ya es cartera (vencida más allá del plazo). */
  esCartera: boolean;
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
  /**
   * `false` en el paso 0 (el recordatorio: basta con deber) y `true` de ahí en
   * adelante (aviso CON INTERÉS: hace falta estar en cartera). Es lo que
   * explica por qué la lista se encoge al pasar de paso.
   */
  exigeCartera: boolean;
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
  detalle: Array<{
    /** La cuota. 🔴 Antes esta clave era `cobroId`. */
    cuotaId: string;
    cobroId: string | null;
    nombre: string;
    estado: string;
    motivo: string | null;
  }>;
}

/** Cómo se lee cada motivo de exclusión en el resumen de la pantalla. */
export const ETIQUETA_DEL_MOTIVO: Record<MotivoDeExclusion, string> = {
  YA_PAGO: 'Ya pagaron',
  AUN_NO_VENCE: 'Todavía no les vence',
  DENTRO_DEL_PLAZO: 'Dentro del plazo del contrato',
  CUBIERTO_POR_ANTICIPO: 'Pagaron por adelantado',
  YA_SE_LE_ENVIO: 'Ya se les envió',
  SIN_DATOS_DE_CONTACTO: 'Sin datos de contacto',
  SIN_CORREO: 'Sin correo',
  SIN_WHATSAPP: 'Sin WhatsApp',
  LEY_2300: 'Bloqueados por la Ley 2300',
};
