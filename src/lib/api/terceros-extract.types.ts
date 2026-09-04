/**
 * Creación de terceros por IA — contrato del cliente de extracción (v6-07,
 * ampliado 2026-09-02 a varios documentos).
 *
 * Shape de la respuesta del endpoint del microservicio `agent`
 * (POST {NEXT_PUBLIC_AGENT_URL}/terceros/extract): Claude lee TODOS los
 * documentos que se suban sobre el mismo tercero — cédula, RUT, certificación
 * bancaria, cámara de comercio… en foto, PDF o Word — y devuelve UN tercero
 * consolidado para PRELLENAR el formulario, más los conflictos entre
 * documentos (la cédula dice un nombre, el RUT otro). El usuario revisa y
 * guarda con el flujo manual existente (sin cambios — TERC-04). La extracción
 * es stateless: no persiste nada.
 */

/** Pista opcional de qué es el PRIMER documento; el modelo detecta el resto. */
export type TerceroDocKind = 'cedula' | 'rut';

export type TerceroDocTipo = 'CC' | 'CE' | 'NIT' | 'PASSPORT';

export type TerceroImageMediaType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';

export const TERCERO_PDF_MEDIA_TYPE = 'application/pdf';
export const TERCERO_DOCX_MEDIA_TYPE =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
export const TERCERO_DOC_MEDIA_TYPE = 'application/msword';

/** Lo que el agente sabe leer. Cualquier otra cosa se rechaza ANTES de subir. */
export const TERCERO_MEDIA_TYPES_SOPORTADOS: readonly string[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  TERCERO_PDF_MEDIA_TYPE,
  TERCERO_DOCX_MEDIA_TYPE,
  TERCERO_DOC_MEDIA_TYPE,
];

/** Topes del agente (`MAX_ARCHIVOS`, `MAX_BYTES_TOTAL`, `MAX_BYTES_POR_ARCHIVO`). */
export const TERCERO_MAX_ARCHIVOS = 10;
export const TERCERO_MAX_BYTES_TOTAL = 20 * 1024 * 1024;
export const TERCERO_MAX_BYTES_POR_ARCHIVO = 10 * 1024 * 1024;

/** Un documento tal como viaja al agente. */
export interface TerceroDocumentoRequest {
  nombre: string;
  mediaType: string;
  base64: string;
}

/** Request que el frontend envía al endpoint de extracción. */
export interface TerceroExtractRequest {
  documentos: TerceroDocumentoRequest[];
  pista?: TerceroDocKind;
}

/** Códigos de banco del formulario del propietario (`BankCode`). */
export type TerceroBancoCodigo =
  | 'bancolombia'
  | 'davivienda'
  | 'bbva'
  | 'bogota'
  | 'popular'
  | 'occidente'
  | 'colpatria'
  | 'cajasocial'
  | 'falabella'
  | 'itau'
  | 'avvillas'
  | 'bancoomeva'
  | 'pichincha';

/** Campos extraídos (mapeables a PropietarioFormData). */
export interface TerceroExtraido {
  nombre: string | null;
  tipoDocumento: TerceroDocTipo | null;
  numeroDocumento: string | null;
  fechaNacimiento: string | null;
  lugarExpedicion: string | null;
  razonSocial: string | null;
  correo: string | null;
  telefono: string | null;
  direccion: string | null;
  ciudad: string | null;
  /** Código del formulario cuando el banco impreso es uno de los del formulario. */
  banco: TerceroBancoCodigo | null;
  /** El banco tal como está impreso (también cuando es una billetera). */
  bancoNombre: string | null;
  tipoCuenta: 'savings' | 'checking' | null;
  numeroCuenta: string | null;
  titularCuenta: string | null;
  /** confianza por campo (0-1) de los campos que el modelo devolvió */
  fieldConfidence: Record<string, number>;
}

/** Dos documentos dijeron cosas distintas del mismo campo. */
export interface TerceroConflicto {
  campo: keyof TerceroExtraido;
  valores: Array<{ valor: string; documento: string }>;
}

export interface TerceroDocumentoDetectado {
  nombre: string;
  tipo: string;
}

/** Respuesta del endpoint de extracción. */
export interface TerceroExtractResponse {
  success: boolean;
  tercero: TerceroExtraido;
  conflictos: TerceroConflicto[];
  documentos: TerceroDocumentoDetectado[];
  /** confianza global promedio (0-1) */
  confidence: number;
  tokensUsed: number;
  estimatedCostUsd: number;
}
