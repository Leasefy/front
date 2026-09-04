/**
 * Cliente de extracción de terceros por IA (v6-07; varios documentos desde
 * 2026-09-02).
 *
 * Llama directamente al microservicio `agent` (POST /terceros/extract) con el
 * JWT de Supabase del usuario — mismo patrón que el cotizador
 * (`NEXT_PUBLIC_AGENT_URL` + Bearer del usuario). No hay secreto de servidor
 * involucrado: el endpoint se autentica con el propio token del usuario, que el
 * navegador ya posee. La extracción solo SUGIERE campos; el guardado real lo
 * hace el flujo manual existente (TERC-04 sin cambios).
 */

import { getAccessToken, ApiError } from './client';
import {
  TERCERO_DOC_MEDIA_TYPE,
  TERCERO_DOCX_MEDIA_TYPE,
  TERCERO_MAX_ARCHIVOS,
  TERCERO_MAX_BYTES_POR_ARCHIVO,
  TERCERO_MAX_BYTES_TOTAL,
  TERCERO_MEDIA_TYPES_SOPORTADOS,
  TERCERO_PDF_MEDIA_TYPE,
} from './terceros-extract.types';
import type {
  TerceroDocKind,
  TerceroDocumentoRequest,
  TerceroExtraido,
  TerceroExtractResponse,
} from './terceros-extract.types';
import type { Propietario } from '@/lib/types/inmobiliaria';

/** El motor de IA no está configurado/disponible (no hay URL de agente). */
export class TerceroExtractUnavailableError extends Error {
  constructor(message = 'El servicio de IA no está disponible.') {
    super(message);
    this.name = 'TerceroExtractUnavailableError';
  }
}

/**
 * El tipo real del archivo. Windows manda `''` o `application/octet-stream`
 * para un .docx; ahí decide la extensión. Un tipo específico que conocemos
 * gana; uno que no (HEIC, TIFF) queda como vino y se rechaza más abajo.
 */
export function mediaTypeDeArchivo(file: Pick<File, 'name' | 'type'>): string {
  const declarado = (file.type || '').toLowerCase();
  const ext = file.name.toLowerCase().split('.').pop() ?? '';
  const porExtension: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    pdf: TERCERO_PDF_MEDIA_TYPE,
    docx: TERCERO_DOCX_MEDIA_TYPE,
    doc: TERCERO_DOC_MEDIA_TYPE,
  };
  if (TERCERO_MEDIA_TYPES_SOPORTADOS.includes(declarado)) return declarado;
  return porExtension[ext] ?? declarado;
}

export function esArchivoSoportado(file: Pick<File, 'name' | 'type'>): boolean {
  return TERCERO_MEDIA_TYPES_SOPORTADOS.includes(mediaTypeDeArchivo(file));
}

/**
 * Qué está mal con esta lista de archivos, antes de leer un byte. `null` =
 * todo bien. Devuelve una clave de i18n (`inmobiliaria.terceroIA.*`) porque
 * el que muestra el mensaje es el componente.
 */
export function validarArchivos(files: ReadonlyArray<Pick<File, 'name' | 'type' | 'size'>>): string | null {
  if (files.length === 0) return 'errorSinArchivos';
  if (files.length > TERCERO_MAX_ARCHIVOS) return 'errorDemasiados';
  for (const f of files) {
    if (!esArchivoSoportado(f)) return 'errorUnsupported';
    if (f.size > TERCERO_MAX_BYTES_POR_ARCHIVO) return 'errorTooLarge';
  }
  const total = files.reduce((s, f) => s + f.size, 0);
  if (total > TERCERO_MAX_BYTES_TOTAL) return 'errorTotalTooLarge';
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
      // result === `data:<mime>;base64,<data>`
      const match = result.match(/^data:(.*?);base64,([\s\S]*)$/);
      resolve(match?.[2] ?? '');
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Sube TODOS los documentos del tercero (fotos, PDF, Word) al endpoint de
 * extracción en una sola llamada y devuelve el tercero consolidado más los
 * conflictos. Lanza TerceroExtractUnavailableError si el motor no está
 * configurado; Error con mensaje del backend en otros fallos (un formato o
 * tamaño que el agente rechaza llega como 400 con texto para la persona).
 */
export async function extractTerceroFromFiles(
  files: File[],
  pista?: TerceroDocKind,
): Promise<TerceroExtractResponse> {
  const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL;
  if (!agentUrl) {
    throw new TerceroExtractUnavailableError();
  }

  const documentos: TerceroDocumentoRequest[] = await Promise.all(
    files.map(async (file) => ({
      nombre: file.name,
      mediaType: mediaTypeDeArchivo(file),
      base64: await fileToBase64(file),
    })),
  );

  // Bearer-only auth (no cookies) — credentials:'include' would force the agent
  // CORS allowlist to drop the wildcard for no reason.
  const res = await globalThis.fetch(`${agentUrl}/terceros/extract`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getAccessToken() ?? ''}`,
    },
    body: JSON.stringify({ documentos, ...(pista ? { pista } : {}) }),
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error('Tu sesión expiró. Vuelve a iniciar sesión.');
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new ApiError(res.status, body?.error ?? `Error ${res.status}`);
  }

  const json = (await res.json()) as TerceroExtractResponse;
  // Un agente anterior a esta rama no manda estas listas: nunca `undefined`
  // para el componente.
  return { ...json, conflictos: json.conflictos ?? [], documentos: json.documentos ?? [] };
}

/**
 * Mapea los campos extraídos a un Propietario parcial para prellenar
 * PropietarioForm (initialData). Lo que no vino queda vacío para que el
 * usuario lo complete; el titular de la cuenta cae al nombre cuando la
 * certificación bancaria no lo trajo.
 */
export function extractedToPropietario(e: TerceroExtraido): Propietario {
  const nombre = e.nombre ?? e.razonSocial ?? '';
  return {
    id: '',
    name: nombre,
    email: e.correo ?? '',
    phone: e.telefono ?? '',
    documentType: e.tipoDocumento ?? 'CC',
    documentNumber: e.numeroDocumento ?? '',
    address: e.direccion ?? '',
    city: e.ciudad ?? '',
    // `bank`/`accountType` vacíos cuando no vinieron: el formulario los exige
    // y los marca; un banco que no está en la lista (billetera) queda vacío y
    // el nombre impreso se muestra aparte.
    bankAccount: {
      bank: e.banco ?? '',
      accountType: e.tipoCuenta ?? '',
      accountNumber: e.numeroCuenta ?? '',
      accountHolder: e.titularCuenta ?? nombre,
    } as unknown as Propietario['bankAccount'],
    propertyCount: 0,
    activeLeases: 0,
    totalMonthlyRent: 0,
    pendingBalance: 0,
    notes: '',
    tags: [],
    createdAt: '',
    updatedAt: '',
  };
}
