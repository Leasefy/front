/**
 * Cliente de extracción de terceros por IA (v6-07).
 *
 * Llama directamente al microservicio `agent` (POST /terceros/extract) con el
 * JWT de Supabase del usuario — mismo patrón que el cotizador
 * (`NEXT_PUBLIC_AGENT_URL` + Bearer del usuario). No hay secreto de servidor
 * involucrado: el endpoint se autentica con el propio token del usuario, que el
 * navegador ya posee. La extracción solo SUGIERE campos; el guardado real lo
 * hace el flujo manual existente (TERC-04 sin cambios).
 */

import { getAccessToken } from './client';
import type {
  TerceroDocKind,
  TerceroExtraido,
  TerceroExtractResponse,
  TerceroImageMediaType,
} from './terceros-extract.types';
import type { Propietario } from '@/lib/types/inmobiliaria';

/** El motor de IA no está configurado/disponible (no hay URL de agente). */
export class TerceroExtractUnavailableError extends Error {
  constructor(message = 'El servicio de IA no está disponible.') {
    super(message);
    this.name = 'TerceroExtractUnavailableError';
  }
}

const ALLOWED_MEDIA: TerceroImageMediaType[] = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/** Lee un File como base64 crudo + su media type. */
function fileToBase64(file: File): Promise<{ base64: string; mediaType: TerceroImageMediaType }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Formato de archivo inválido.'));
        return;
      }
      // result === `data:<mime>;base64,<data>`
      const match = result.match(/^data:(.*?);base64,([\s\S]*)$/);
      const mime = (match?.[1] ?? file.type) as TerceroImageMediaType;
      const base64 = match?.[2] ?? '';
      const mediaType = ALLOWED_MEDIA.includes(mime) ? mime : 'image/jpeg';
      resolve({ base64, mediaType });
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Sube una foto de cédula/RUT al endpoint de extracción y devuelve los campos
 * sugeridos. Lanza TerceroExtractUnavailableError si el motor no está
 * configurado; Error con mensaje del backend en otros fallos.
 */
export async function extractTerceroFromImage(
  file: File,
  documentKind: TerceroDocKind,
): Promise<TerceroExtractResponse> {
  const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL;
  if (!agentUrl) {
    throw new TerceroExtractUnavailableError();
  }

  const { base64, mediaType } = await fileToBase64(file);

  const res = await globalThis.fetch(`${agentUrl}/terceros/extract`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getAccessToken() ?? ''}`,
    },
    body: JSON.stringify({ documentKind, imageBase64: base64, imageMediaType: mediaType }),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body?.error ?? `Error ${res.status}`);
  }

  return (await res.json()) as TerceroExtractResponse;
}

/**
 * Mapea los campos extraídos a un Propietario parcial para prellenar
 * PropietarioForm (initialData). Los campos bancarios quedan vacíos para que el
 * usuario los complete (no están en una cédula/RUT).
 */
export function extractedToPropietario(e: TerceroExtraido): Propietario {
  return {
    id: '',
    name: e.nombre ?? e.razonSocial ?? '',
    email: '',
    phone: '',
    documentType: e.tipoDocumento ?? 'CC',
    documentNumber: e.numeroDocumento ?? '',
    address: '',
    city: '',
    // vacíos a propósito — el usuario completa la cuenta (no está en el documento)
    bankAccount: {
      bank: '',
      accountType: '',
      accountNumber: '',
      accountHolder: e.nombre ?? e.razonSocial ?? '',
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
