/**
 * Cliente de captura de propiedad por IA (v6-08).
 *
 * Envía el audio grabado (+ fotos opcionales) al microservicio `agent`
 * (POST /property-capture/extract) con el JWT de Supabase del usuario — mismo
 * patrón que cotizador / terceros. El endpoint transcribe (Whisper) y extrae la
 * ficha + descripción (Claude). Solo SUGIERE; el guardado real lo hace el flujo
 * de creación existente (CAPT-04 sin cambios).
 */

import { getAccessToken } from './client';
import type {
  PropertyAudioMediaType,
  PropertyCapturePhoto,
  PropertyExtractResponse,
  PropertyImageMediaType,
} from './property-capture.types';

export class PropertyExtractUnavailableError extends Error {
  constructor(message = 'El servicio de IA no está disponible.') {
    super(message);
    this.name = 'PropertyExtractUnavailableError';
  }
}

const ALLOWED_AUDIO: PropertyAudioMediaType[] = [
  'audio/webm',
  'audio/mp4',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/x-m4a',
];
const ALLOWED_IMAGE: PropertyImageMediaType[] = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/** Normaliza un mime de MediaRecorder ('audio/webm;codecs=opus') al enum permitido. */
function normalizeAudioMime(mime: string): PropertyAudioMediaType {
  const base = mime.split(';')[0].trim() as PropertyAudioMediaType;
  return ALLOWED_AUDIO.includes(base) ? base : 'audio/webm';
}

/** Lee un Blob/File como base64 crudo (sin el prefijo data:). */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Formato de archivo inválido.'));
        return;
      }
      const match = result.match(/^data:(.*?);base64,([\s\S]*)$/);
      resolve(match?.[2] ?? '');
    };
    reader.readAsDataURL(blob);
  });
}

/**
 * Sube el audio (+ fotos) y devuelve la ficha sugerida. Lanza
 * PropertyExtractUnavailableError si el motor no está configurado.
 */
export async function extractPropertyFromCapture(
  audioBlob: Blob,
  photos: File[] = [],
): Promise<PropertyExtractResponse> {
  const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL;
  if (!agentUrl) {
    throw new PropertyExtractUnavailableError();
  }

  const audioBase64 = await blobToBase64(audioBlob);
  const audioMediaType = normalizeAudioMime(audioBlob.type || 'audio/webm');

  const photoPayload: PropertyCapturePhoto[] = [];
  for (const file of photos.slice(0, 4)) {
    const base = file.type as PropertyImageMediaType;
    // Skip unsupported formats (e.g. HEIC) rather than mislabel the bytes as
    // jpeg — Claude Vision would silently ignore a mislabeled image.
    if (!ALLOWED_IMAGE.includes(base)) continue;
    photoPayload.push({ data: await blobToBase64(file), mediaType: base });
  }

  // Bearer-only auth (no cookies) — credentials:'include' would force the agent
  // CORS allowlist to drop the wildcard for no reason.
  const res = await globalThis.fetch(`${agentUrl}/property-capture/extract`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getAccessToken() ?? ''}`,
    },
    body: JSON.stringify({
      audioBase64,
      audioMediaType,
      photos: photoPayload.length > 0 ? photoPayload : undefined,
    }),
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error('Tu sesión expiró. Vuelve a iniciar sesión.');
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body?.error ?? `Error ${res.status}`);
  }

  return (await res.json()) as PropertyExtractResponse;
}
