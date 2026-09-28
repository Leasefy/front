/**
 * T-0109 contract.md §3.1.C/D — firma electrónica reforzada de la consignación
 * (contrato entre la inmobiliaria y el propietario). Dos superficies:
 *
 *   · Panel de agencia (C1–C9, `P-EDIT`/`P-VIEW`): iniciar el proceso, ver su
 *     estado, cancelar, reenviar la invitación, y el representante de la
 *     agencia firma con OTP. C9 (subida del PDF firmado en papel) NO cambia —
 *     sigue viva y conviviendo con el proceso electrónico.
 *   · Página pública del copropietario (D1–D4, `PUBLIC-LINK`): el token de la
 *     URL es la credencial, sin sesión.
 *
 * Back WU-3 no existe todavía (front y back corren en paralelo sobre el
 * contrato congelado) — estos tipos son la ÚNICA fuente de verdad hasta que
 * se integre. Un endpoint ausente (404) es degradación esperada, no un tipo
 * equivocado: la UI lo oculta (contract.md §3.2, última fila).
 */

import type { OtpChannel, SealStatus } from './contracts.types';

export type EstadoDeFirmaDeConsignacion = 'PENDIENTE' | 'FIRMADO' | 'CANCELADO';
export type TipoDeFirmanteDeConsignacion = 'PROPIETARIO' | 'REPRESENTANTE_DE_LA_AGENCIA';

export interface FirmanteDeConsignacionResponse {
  id: string;
  tipo: TipoDeFirmanteDeConsignacion;
  propietarioId: string | null;
  userId: string | null;
  nombre: string;
  email: string | null;
  telefono: string | null;
  firmado: boolean;
  firmadoAt: string | null;
  /** `null` mientras no ha firmado. */
  codigoVerificado: boolean | null;
  /** Canales SENT del código verificado. `null` mientras no ha firmado. */
  otpChannels: OtpChannel[] | null;
  /** `null` para el representante — la invitación es sólo para el propietario. */
  invitacion: 'ENVIADA' | 'SIN_CORREO' | 'FALLO' | null;
  /** `null` para el representante o una vez firmado. */
  enlaceVenceEn: string | null;
}

export interface ProcesoDeFirmaResponse {
  id: string;
  consignacionId: string;
  estado: EstadoDeFirmaDeConsignacion;
  /** SHA-256 del PDF sin firmar — lo que todos firman. */
  documentoSha256: string;
  createdAt: string;
  firmadoAt: string | null;
  canceladoAt: string | null;
  motivoDeCancelacion: string | null;
  iniciadoPor: { id: string; nombre: string } | null;
  /** Propietarios primero (orden del back), representante al final. */
  firmantes: FirmanteDeConsignacionResponse[];
  documentoFirmado: { version: number; sealStatus: SealStatus | null; sealedAt: string | null } | null;
  /** El usuario que mira es el representante, sin firmar, estado PENDIENTE. */
  puedeFirmarElUsuarioActual: boolean;
}

/** C2 — `GET .../firma-electronica`: el último proceso en cualquier estado, o ninguno. */
export interface ProcesoDeFirmaOpcional {
  proceso: ProcesoDeFirmaResponse | null;
}

/** C4 — reenviar la invitación a un propietario (rota el token). */
export interface ReenvioDeInvitacionResponse {
  firmanteId: string;
  enlace: string;
  enlaceVenceEn: string;
  invitacion: 'ENVIADA' | 'SIN_CORREO' | 'FALLO';
}

/** C8 — el documento del proceso (sin firmar mientras PENDIENTE/CANCELADO). */
export interface DocumentoDelProcesoResponse {
  url: string;
  expiresAt: string;
  firmado: boolean;
  sealStatus: SealStatus | null;
  version: number | null;
}

/** C1 — iniciar el proceso (multipart). */
export interface IniciarFirmaDeConsignacionDto {
  file: File;
  /** UUID de un miembro ACTIVO de la agencia. Por defecto, quien llama. */
  representanteUserId?: string;
  /** ≤500, va en el correo de invitación. */
  mensaje?: string;
}

// ============================================================================
// D — página pública del copropietario
// ============================================================================

export interface FirmaPublicaResponse {
  firmante: { nombre: string; firmado: boolean; firmadoAt: string | null };
  proceso: { estado: EstadoDeFirmaDeConsignacion; createdAt: string };
  consignacion: { propertyTitle: string; propertyAddress: string; propertyCity: string };
  agencia: { nombre: string };
  /** El PDF sin firmar mientras el proceso está en curso; el final una vez FIRMADO. */
  documento: { url: string; expiresAt: string };
  /** Enmascarados. `whatsapp` es `null` cuando el canal no es elegible. */
  canales: { correo: string | null; whatsapp: string | null };
}

/** Firma electrónica DTO para C7/D4 — mismo shape que `SignContractDto`. */
export interface FirmarConsignacionDto {
  acceptedTerms: true;
  consentText: string;
  signatureData?: string;
  otpVerificationToken: string;
}
