/**
 * T-0109 contract.md §3.1.C/D — cliente de la firma electrónica de la
 * consignación. Dos clientes en este archivo:
 *
 *   · `firmaDeConsignacionApi` — panel de agencia, con sesión (`apiClient`).
 *   · `firmaPublicaApi` — la página pública del copropietario, SIN sesión: el
 *     token de la URL es la credencial (mismo patrón que
 *     `mandatoApi.cambioPublico`, `mandato.service.ts`).
 *
 * Back WU-3 no existe todavía — cada llamada puede responder 404 (endpoint
 * ausente) o los códigos nuevos de contract.md §3.3; el caller decide cómo
 * degradar, este archivo sólo transporta.
 */

import { apiClient, ApiError, getAccessToken } from './client';
import type {
  DocumentoDelProcesoResponse,
  FirmaPublicaResponse,
  FirmarConsignacionDto,
  IniciarFirmaDeConsignacionDto,
  ProcesoDeFirmaOpcional,
  ProcesoDeFirmaResponse,
  ReenvioDeInvitacionResponse,
} from './consignacion-firma.types';
import type { SendOtpResponse, VerifyOtpResponse } from './contracts.types';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

// ── Multipart (con sesión) ───────────────────────────────────────────────

async function enviarFormulario<T>(ruta: string, formulario: FormData, porDefecto: string): Promise<T> {
  const token = getAccessToken();
  let respuesta: Response;
  try {
    respuesta = await fetch(`${BACKEND_URL}${ruta}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formulario,
    });
  } catch (error) {
    throw new ApiError(0, `No pudimos conectarnos al servidor. ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!respuesta.ok) {
    const cuerpo = (await respuesta.json().catch(() => ({}))) as { message?: unknown; code?: unknown; details?: unknown };
    const mensaje = Array.isArray(cuerpo.message)
      ? (cuerpo.message as string[]).join(' · ')
      : typeof cuerpo.message === 'string'
        ? cuerpo.message
        : porDefecto;
    throw new ApiError(
      respuesta.status,
      mensaje,
      typeof cuerpo.code === 'string' ? cuerpo.code : undefined,
      cuerpo as Record<string, unknown>,
    );
  }
  return respuesta.json() as Promise<T>;
}

// ── Sin sesión (página pública) ──────────────────────────────────────────

async function sinSesion<T>(method: 'GET' | 'POST', ruta: string, body?: unknown): Promise<T> {
  let respuesta: Response;
  try {
    respuesta = await fetch(`${BACKEND_URL}${ruta}`, {
      method,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    });
  } catch (error) {
    throw new ApiError(0, `No pudimos conectarnos al servidor. ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!respuesta.ok) {
    const cuerpo = (await respuesta.json().catch(() => ({}))) as { message?: unknown; code?: unknown; details?: unknown };
    throw new ApiError(
      respuesta.status,
      typeof cuerpo.message === 'string' ? cuerpo.message : `Error ${respuesta.status}`,
      typeof cuerpo.code === 'string' ? cuerpo.code : undefined,
      cuerpo as Record<string, unknown>,
    );
  }
  return respuesta.json() as Promise<T>;
}

// ── Panel de agencia (C1–C8; C9 sigue en `consignacionesApi.subirContrato`) ──

export const firmaDeConsignacionApi = {
  /** C1 — inicia el proceso (multipart). 409 si ya hay uno PENDIENTE. */
  iniciar(consignacionId: string, dto: IniciarFirmaDeConsignacionDto): Promise<ProcesoDeFirmaResponse> {
    const f = new FormData();
    f.append('file', dto.file);
    if (dto.representanteUserId) f.append('representanteUserId', dto.representanteUserId);
    if (dto.mensaje) f.append('mensaje', dto.mensaje);
    return enviarFormulario<ProcesoDeFirmaResponse>(
      `/inmobiliaria/consignaciones/${consignacionId}/firma-electronica`,
      f,
      'No se pudo iniciar la firma electrónica',
    );
  },

  /** C2 — el último proceso en cualquier estado, o ninguno. */
  obtener(consignacionId: string): Promise<ProcesoDeFirmaOpcional> {
    return apiClient.get<ProcesoDeFirmaOpcional>(
      `/inmobiliaria/consignaciones/${consignacionId}/firma-electronica`,
    );
  },

  /** C3 — cancela el proceso en curso. */
  cancelar(consignacionId: string, motivo?: string): Promise<ProcesoDeFirmaResponse> {
    return apiClient.post<ProcesoDeFirmaResponse>(
      `/inmobiliaria/consignaciones/${consignacionId}/firma-electronica/cancelar`,
      motivo ? { motivo } : {},
    );
  },

  /** C4 — reenvía la invitación a un propietario (rota el token; el enlace anterior deja de servir). */
  reenviar(consignacionId: string, firmanteId: string): Promise<ReenvioDeInvitacionResponse> {
    return apiClient.post<ReenvioDeInvitacionResponse>(
      `/inmobiliaria/consignaciones/${consignacionId}/firma-electronica/firmantes/${firmanteId}/reenviar`,
      {},
    );
  },

  /** C5 — sólo el representante puede pedir su código. */
  otpSend(consignacionId: string): Promise<SendOtpResponse> {
    return apiClient.post<SendOtpResponse>(
      `/inmobiliaria/consignaciones/${consignacionId}/firma-electronica/otp/send`,
      {},
    );
  },

  /** C6 */
  otpVerify(consignacionId: string, code: string): Promise<VerifyOtpResponse> {
    return apiClient.post<VerifyOtpResponse>(
      `/inmobiliaria/consignaciones/${consignacionId}/firma-electronica/otp/verify`,
      { code },
    );
  },

  /** C7 — el representante firma con el token de C6. */
  firmar(consignacionId: string, dto: FirmarConsignacionDto): Promise<ProcesoDeFirmaResponse> {
    return apiClient.post<ProcesoDeFirmaResponse>(
      `/inmobiliaria/consignaciones/${consignacionId}/firma-electronica/firmar`,
      dto,
    );
  },

  /** C8 — el documento del proceso (sin firmar, o el final una vez FIRMADO). */
  documento(consignacionId: string): Promise<DocumentoDelProcesoResponse> {
    return apiClient.get<DocumentoDelProcesoResponse>(
      `/inmobiliaria/consignaciones/${consignacionId}/firma-electronica/documento`,
    );
  },
};

// ── Página pública del copropietario (D1–D4) ─────────────────────────────

export const firmaPublicaDeConsignacionApi = {
  /** D1 — 404 `ENLACE_DE_FIRMA_INVALIDO` / 410 `ENLACE_DE_FIRMA_VENCIDO`. */
  obtener(token: string): Promise<FirmaPublicaResponse> {
    return sinSesion<FirmaPublicaResponse>('GET', `/publico/firma-de-consignacion/${encodeURIComponent(token)}`);
  },

  /** D2 */
  otpSend(token: string): Promise<SendOtpResponse> {
    return sinSesion<SendOtpResponse>('POST', `/publico/firma-de-consignacion/${encodeURIComponent(token)}/otp/send`, {});
  },

  /** D3 */
  otpVerify(token: string, code: string): Promise<VerifyOtpResponse> {
    return sinSesion<VerifyOtpResponse>(
      'POST',
      `/publico/firma-de-consignacion/${encodeURIComponent(token)}/otp/verify`,
      { code },
    );
  },

  /** D4 */
  firmar(token: string, dto: FirmarConsignacionDto): Promise<FirmaPublicaResponse> {
    return sinSesion<FirmaPublicaResponse>(
      'POST',
      `/publico/firma-de-consignacion/${encodeURIComponent(token)}/firmar`,
      dto,
    );
  },
};
