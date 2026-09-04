/**
 * Cliente de cuentas por pagar (AP) del microservicio `agent` (2026-09-02).
 *
 * Proveedores, centros de costo, facturas y la captura de una factura desde
 * una foto/PDF con IA (`POST /ap/bills/extract`). Va directo al agente con el
 * JWT del usuario vía `agentFetch` (reintento ante 401 por token vencido),
 * mismo patrón que `piloto.ts`. La extracción sólo SUGIERE; la factura se
 * registra con `createBill` después de que la persona revisa.
 */

import { ApiError } from './client';
import { agentFetch } from './agent-fetch';
import {
  FACTURA_MAX_ARCHIVOS,
  FACTURA_MAX_BYTES_POR_ARCHIVO,
  FACTURA_MAX_BYTES_TOTAL,
  FACTURA_MEDIA_TYPES_SOPORTADOS,
  FACTURA_PDF_MEDIA_TYPE,
} from './ap.types';
import type {
  ApBill,
  ApCostCenter,
  ApCreateBillBody,
  ApCreateVendorBody,
  ApVendor,
  FacturaDocumentoRequest,
  FacturaExtractResponse,
} from './ap.types';

/** El motor de IA / el agente no está configurado (no hay URL). */
export class ApUnavailableError extends Error {
  constructor(message = 'El servicio de cuentas por pagar no está disponible.') {
    super(message);
    this.name = 'ApUnavailableError';
  }
}

function agentUrl(): string {
  const url = process.env.NEXT_PUBLIC_AGENT_URL;
  if (!url) throw new ApUnavailableError();
  return url;
}

/**
 * Errores de la API en español. El micro ya escribe en español los 400 de la
 * extracción y los 429; los del alta (`{error}` en inglés) se traducen acá
 * por status para que la persona entienda qué pasó.
 */
async function lanzarError(res: Response, contexto: 'extract' | 'bill' | 'vendor' | 'read'): Promise<never> {
  if (res.status === 401) throw new ApiError(401, 'Tu sesión expiró. Volvé a iniciar sesión.');
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  const delMicro = typeof body.error === 'string' ? body.error : '';
  if (res.status === 403) throw new ApiError(403, 'No tenés permiso para registrar facturas en esta agencia.');
  if (res.status === 413) throw new ApiError(413, 'Los archivos son demasiado grandes (máximo 20 MB en total).');
  if (res.status === 429) throw new ApiError(429, delMicro || 'Demasiadas solicitudes. Intentá de nuevo en un momento.');
  if (res.status === 409) {
    throw new ApiError(
      409,
      contexto === 'vendor'
        ? 'Ya existe un proveedor con ese NIT o cédula en esta agencia.'
        : 'Ya hay una factura con ese número para este proveedor.',
    );
  }
  if (res.status === 400) {
    if (contexto === 'extract' && delMicro) throw new ApiError(400, delMicro);
    if (contexto === 'bill' && /costCenterCode/i.test(delMicro)) {
      throw new ApiError(400, 'El centro de costo no es válido para esta agencia.');
    }
    throw new ApiError(400, 'Revisá los datos: hay campos incompletos o inválidos.');
  }
  if (res.status === 503) throw new ApiError(503, 'El servicio no está disponible en este momento. Intentá más tarde.');
  throw new ApiError(res.status, delMicro || `Error ${res.status}`);
}

async function getJson<T>(path: string): Promise<T> {
  const res = await agentFetch(`${agentUrl()}${path}`);
  if (!res.ok) await lanzarError(res, 'read');
  return (await res.json()) as T;
}

async function postJson<T>(path: string, body: unknown, contexto: 'extract' | 'bill' | 'vendor'): Promise<T> {
  const res = await agentFetch(`${agentUrl()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) await lanzarError(res, contexto);
  return (await res.json()) as T;
}

// ── Archivos ────────────────────────────────────────────────────────────────

/** El tipo real del archivo: un tipo conocido gana; si el navegador no manda ninguno, decide la extensión. */
export function mediaTypeDeFactura(file: Pick<File, 'name' | 'type'>): string {
  const declarado = (file.type || '').toLowerCase();
  if (FACTURA_MEDIA_TYPES_SOPORTADOS.includes(declarado)) return declarado;
  const ext = file.name.toLowerCase().split('.').pop() ?? '';
  const porExtension: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    pdf: FACTURA_PDF_MEDIA_TYPE,
  };
  return porExtension[ext] ?? declarado;
}

/**
 * Qué está mal con esta lista de archivos, antes de leer un byte. `null` =
 * todo bien. Devuelve una clave de i18n (`inmobiliaria.tesoreria.facturas.*`).
 */
export function validarArchivosFactura(
  files: ReadonlyArray<Pick<File, 'name' | 'type' | 'size'>>,
): string | null {
  if (files.length === 0) return 'errorSinArchivos';
  if (files.length > FACTURA_MAX_ARCHIVOS) return 'errorDemasiados';
  for (const f of files) {
    if (!FACTURA_MEDIA_TYPES_SOPORTADOS.includes(mediaTypeDeFactura(f))) return 'errorUnsupported';
    if (f.size > FACTURA_MAX_BYTES_POR_ARCHIVO) return 'errorTooLarge';
  }
  const total = files.reduce((s, f) => s + f.size, 0);
  if (total > FACTURA_MAX_BYTES_TOTAL) return 'errorTotalTooLarge';
  return null;
}

/** Lee un File como base64 crudo (sin el prefijo `data:`). */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`No se pudo leer «${file.name}».`));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error(`«${file.name}»: formato de archivo inválido.`));
        return;
      }
      const match = result.match(/^data:(.*?);base64,([\s\S]*)$/);
      resolve(match?.[2] ?? '');
    };
    reader.readAsDataURL(file);
  });
}

// ── API ─────────────────────────────────────────────────────────────────────

export const apApi = {
  async listVendors(agencyId: string): Promise<ApVendor[]> {
    const json = await getJson<{ vendors: ApVendor[] }>(`/api/agency/${agencyId}/ap/vendors`);
    return json.vendors ?? [];
  },

  createVendor(agencyId: string, body: ApCreateVendorBody): Promise<ApVendor> {
    return postJson<ApVendor>(`/api/agency/${agencyId}/ap/vendors`, body, 'vendor');
  },

  async listCostCenters(agencyId: string): Promise<ApCostCenter[]> {
    const json = await getJson<{ costCenters: ApCostCenter[] }>(`/api/agency/${agencyId}/ap/cost-centers`);
    return json.costCenters ?? [];
  },

  /**
   * Sube la factura (fotos/PDF) al agente y devuelve la lectura + el proveedor
   * emparejado + la sugerencia para `createBill`. Valida los archivos primero
   * (lanza `Error` con la clave i18n como mensaje si algo no sirve).
   */
  async extractBill(agencyId: string, files: File[]): Promise<FacturaExtractResponse> {
    const invalido = validarArchivosFactura(files);
    if (invalido) throw new Error(invalido);
    const url = agentUrl();
    const documentos: FacturaDocumentoRequest[] = await Promise.all(
      files.map(async (file) => ({
        nombre: file.name,
        mediaType: mediaTypeDeFactura(file),
        base64: await fileToBase64(file),
      })),
    );
    const res = await agentFetch(`${url}/api/agency/${agencyId}/ap/bills/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentos }),
    });
    if (!res.ok) await lanzarError(res, 'extract');
    const json = (await res.json()) as FacturaExtractResponse;
    return {
      ...json,
      items: json.items ?? [],
      conflictos: json.conflictos ?? [],
      documentos: json.documentos ?? [],
      proveedor: json.proveedor ?? { match: null, candidatos: [] },
      adjuntoUrl: json.adjuntoUrl ?? null,
    };
  },

  createBill(agencyId: string, body: ApCreateBillBody): Promise<ApBill> {
    return postJson<ApBill>(`/api/agency/${agencyId}/ap/bills`, body, 'bill');
  },
};
