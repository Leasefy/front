import { ApiError } from '@/lib/api/client';

/**
 * 🔴 La firma electrónica del MANDATO desde el lado del PROPIETARIO, sin
 * sesión (auditoría de lógica, 23-09-2026). El enlace se lo manda el servidor
 * a su correo; el token de la URL es la credencial, y además firmar pide un
 * código de 6 dígitos que le llega a ese mismo correo. Así un enlace
 * reenviado —o el empleado que lo pidió— no alcanza para firmar por él.
 *
 * Sin `apiClient` a propósito: ése le pega el token de sesión a cada petición,
 * y esta página la abre alguien que no tiene cuenta.
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

export interface ContextoDeLaFirma {
  firmante: string;
  /** A dónde le llega el código, enmascarado (`jor***@correo.co`). */
  codigoA: string | null;
  /**
   * El PDF del mandato que va a firmar: su huella se manda al firmar (la firma
   * queda atada a ESE documento). `null` = enlace sin documento: no se firma.
   */
  documento: { sha256: string; bytes: number } | null;
  venceEl: string | null;
  inmueble: { titulo: string | null; sector: string };
  inmobiliaria: string | null;
  comisionPct: number | null;
}

export interface CodigoEnviado {
  enviadoA: string;
  venceEl: string;
}

export interface MandatoFirmado {
  id: string;
  estado: 'FIRMADA';
  firmadaEl: string;
}

async function publica<T>(method: 'GET' | 'POST', ruta: string, cuerpo?: unknown): Promise<T> {
  let respuesta: Response;
  try {
    respuesta = await fetch(`${BACKEND_URL}${ruta}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(cuerpo !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
      cache: 'no-store',
    });
  } catch (error) {
    throw new ApiError(
      0,
      `No pudimos conectarnos al servidor. ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (!respuesta.ok) {
    const c = (await respuesta.json().catch(() => ({}))) as { message?: unknown; code?: unknown };
    throw new ApiError(
      respuesta.status,
      typeof c.message === 'string' ? c.message : `Error ${respuesta.status}`,
      typeof c.code === 'string' ? c.code : undefined,
    );
  }
  return respuesta.json() as Promise<T>;
}

const base = (token: string) => `/mandato/firma/${encodeURIComponent(token)}`;

export const firmaDelMandatoApi = {
  /** GET /mandato/firma/:token — lo mínimo para reconocer el mandato. */
  contexto: (token: string) => publica<ContextoDeLaFirma>('GET', base(token)),
  /** POST /mandato/firma/:token/codigo — el código va al correo de la ficha. */
  pedirCodigo: (token: string) => publica<CodigoEnviado>('POST', `${base(token)}/codigo`),
  /**
   * GET /mandato/firma/:token/pdf — el PDF del mandato (el back lo compara con
   * su huella antes de entregarlo). Devuelve un Blob para abrirlo sin sesión.
   */
  pdf: async (token: string): Promise<Blob> => {
    let r: Response;
    try {
      r = await fetch(`${BACKEND_URL}${base(token)}/pdf`, { cache: 'no-store' });
    } catch (error) {
      throw new ApiError(
        0,
        `No pudimos conectarnos al servidor. ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    if (!r.ok) {
      const c = (await r.json().catch(() => ({}))) as { message?: unknown; code?: unknown };
      throw new ApiError(
        r.status,
        typeof c.message === 'string' ? c.message : `Error ${r.status}`,
        typeof c.code === 'string' ? c.code : undefined,
      );
    }
    return r.blob();
  },
  /**
   * POST /mandato/firma/:token/firmar — con el código del correo y la huella
   * del PDF que revisó.
   */
  firmar: (token: string, codigo: string, sha256: string) =>
    publica<MandatoFirmado>('POST', `${base(token)}/firmar`, { codigo, sha256 }),
};
