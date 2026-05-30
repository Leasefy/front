/**
 * Captura de propiedad por IA — contrato del cliente (v6-08).
 *
 * Shape de la respuesta del endpoint del microservicio `agent`
 * (POST {NEXT_PUBLIC_AGENT_URL}/property-capture/extract): Whisper transcribe el
 * audio del asesor y Claude extrae una ficha estructurada + descripción
 * comercial (las fotos enriquecen vía Vision). El asesor revisa y guarda con el
 * flujo de creación de propiedad existente (sin cambios — CAPT-04). Stateless.
 */

export type PropertyTipo = 'apartment' | 'house' | 'studio' | 'room';

export type PropertyAudioMediaType =
  | 'audio/webm'
  | 'audio/mp4'
  | 'audio/mpeg'
  | 'audio/wav'
  | 'audio/ogg'
  | 'audio/x-m4a';

export type PropertyImageMediaType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';

/** Foto adjunta (base64) enviada como contexto de extracción. */
export interface PropertyCapturePhoto {
  data: string;
  mediaType: PropertyImageMediaType;
}

/** Ficha extraída (mapeable al payload de creación de propiedad). */
export interface PropertyFichaExtraida {
  titulo: string | null;
  tipo: PropertyTipo | null;
  ciudad: string | null;
  barrio: string | null;
  direccion: string | null;
  habitaciones: number | null;
  banos: number | null;
  area: number | null;
  canon: number | null;
  administracion: number | null;
  estrato: number | null;
  restricciones: string | null;
  descripcionComercial: string | null;
  /** confianza por campo (0-1) de los campos devueltos */
  fieldConfidence: Record<string, number>;
}

/** Respuesta del endpoint de extracción. */
export interface PropertyExtractResponse {
  success: boolean;
  transcript: string;
  ficha: PropertyFichaExtraida;
  confidence: number;
  tokensUsed: number;
  estimatedCostUsd: number;
}
