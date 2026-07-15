/**
 * Creación de terceros por IA — contrato del cliente de extracción (v6-07).
 *
 * Shape de la respuesta del endpoint del microservicio `agent`
 * (POST {NEXT_PUBLIC_AGENT_URL}/terceros/extract): OCR de una foto de cédula
 * (CC/CE/pasaporte) o RUT con Claude Vision, que devuelve los campos sugeridos
 * para PRELLENAR el formulario de tercero. El usuario revisa y guarda con el
 * flujo manual existente (sin cambios — TERC-04). La extracción es stateless:
 * no persiste nada.
 */

export type TerceroDocKind = 'cedula' | 'rut';

export type TerceroDocTipo = 'CC' | 'CE' | 'NIT' | 'PASSPORT';

export type TerceroImageMediaType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';

/** Request que el frontend envía al endpoint de extracción. */
export interface TerceroExtractRequest {
  documentKind: TerceroDocKind;
  imageBase64: string;
  imageMediaType: TerceroImageMediaType;
}

/** Campos extraídos (mapeables a PropietarioFormData). */
export interface TerceroExtraido {
  nombre: string | null;
  tipoDocumento: TerceroDocTipo | null;
  numeroDocumento: string | null;
  fechaNacimiento: string | null;
  lugarExpedicion: string | null;
  razonSocial: string | null;
  /** confianza por campo (0-1) de los campos que el modelo devolvió */
  fieldConfidence: Record<string, number>;
}

/** Respuesta del endpoint de extracción. */
export interface TerceroExtractResponse {
  success: boolean;
  tercero: TerceroExtraido;
  /** confianza global promedio (0-1) */
  confidence: number;
  tokensUsed: number;
  estimatedCostUsd: number;
}
