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
 *
 * 02-10-2026 · El cuerpo ENTERO viaja en `detalle` (y su `code`): así el
 * traductor ve los `campos` de un 400 (van a su campo en el formulario) y la
 * `referencia` de un 5xx (soporte la encuentra en el log). Se lee también el
 * `message` del sobre de error, no sólo el `error` de antes.
 */
function textoDelMicro(body: Record<string, unknown>): string {
  if (Array.isArray(body.message)) return body.message.map(String).filter(Boolean).join(' · ');
  if (typeof body.message === 'string' && body.message) return body.message;
  return typeof body.error === 'string' ? body.error : '';
}

/**
 * ¿El cuerpo es el SOBRE de error del micro (`{ statusCode, code, message }`,
 * 02-10-2026)? Su `message` ya está escrito para la persona, en español.
 */
function esElSobre(body: Record<string, unknown>): boolean {
  const { message } = body;
  return (
    typeof body.code === 'string' &&
    body.code !== '' &&
    ((typeof message === 'string' && message.trim() !== '') ||
      (Array.isArray(message) && message.some((m) => String(m).trim() !== '')))
  );
}

async function lanzarError(res: Response, contexto: 'extract' | 'bill' | 'vendor' | 'read'): Promise<never> {
  const body = ((await res.json().catch(() => ({}))) ?? {}) as Record<string, unknown>;
  const delMicro = textoDelMicro(body);
  const code = typeof body.code === 'string' ? body.code : undefined;
  const falla = (status: number, mensaje: string | string[]) => new ApiError(status, mensaje, code, body);
  /*
   * 🔴 Con el sobre del micro, SU frase (Nico, 02-10-2026): «Tu sesión
   * expiró» o «No tienes permiso para registrar facturas» eran fijas por
   * status y a veces mentían (un 401 `SESION_NO_VERIFICADA` no es una sesión
   * vencida; un 403 de rol en «ver proveedores» no es «registrar facturas»).
   * El `message` viaja tal cual —una lista, si el micro mandó varias— y
   * `mensajeParaLaPersona` lo muestra. Sin sobre (un cuerpo viejo `{ error }`
   * en inglés, o ningún cuerpo), la frase de siempre.
   */
  if (esElSobre(body)) {
    const { message } = body;
    throw falla(
      res.status,
      Array.isArray(message) ? message.map(String).filter((m) => m.trim() !== '') : String(message),
    );
  }
  if (res.status === 401) throw falla(401, 'Tu sesión expiró. Vuelve a iniciar sesión.');
  if (res.status === 403) throw falla(403, 'No tienes permiso para registrar facturas en esta agencia.');
  if (res.status === 413) throw falla(413, 'Los archivos son demasiado grandes (máximo 20 MB en total).');
  if (res.status === 429) throw falla(429, delMicro || 'Demasiadas solicitudes. Intenta de nuevo en un momento.');
  if (res.status === 409) {
    throw falla(
      409,
      contexto === 'vendor'
        ? 'Ya existe un proveedor con ese NIT o cédula en esta agencia.'
        : 'Ya hay una factura con ese número para este proveedor.',
    );
  }
  if (res.status === 400) {
    if (contexto === 'extract' && delMicro) throw falla(400, delMicro);
    if (contexto === 'bill' && /costCenterCode/i.test(delMicro)) {
      throw falla(400, 'El centro de costo no es válido para esta agencia.');
    }
    // Con `campos` en español (el sobre de error), el formulario los reparte.
    if (Array.isArray(body.campos) && body.campos.length > 0 && delMicro) throw falla(400, delMicro);
    throw falla(400, 'Revisa los datos: hay campos incompletos o inválidos.');
  }
  if (res.status === 503) throw falla(503, 'El servicio no está disponible en este momento. Intenta más tarde.');
  throw falla(res.status, delMicro || `Error ${res.status}`);
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
