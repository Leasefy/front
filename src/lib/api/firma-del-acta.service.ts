/**
 * 🔴 CERRAR EL ACTA DESDE EL PRODUCTO (ARREGLOS-3, 03-10-2026; Nico, la
 * recomendada «a» de PRUEBAS-PAGOS): «acta → fotos → firmas → cerrar → cuota de
 * cierre en el estado de cuenta».
 *
 * Dos clientes en este archivo:
 *
 *   · `firmaDelActaApi` — el PANEL, con sesión:
 *       `GET  /inmobiliaria/actas/:id`                       el acta con sus fotos firmadas, las firmas y `paraFirmar`;
 *       `POST /inmobiliaria/actas/:id/fotos`                 (multipart `file` + `espacio` + `clave`?) UNA foto;
 *       `DELETE /inmobiliaria/actas/:id/fotos?ruta=`         borra UNA foto (idempotente);
 *       `POST /inmobiliaria/actas/:id/firma-del-asesor`      la firma del asesor, DIBUJADA;
 *       `POST /inmobiliaria/actas/:id/enlace-del-inquilino`  el enlace para que el inquilino firme (vive 7 días).
 *   · `firmaPublicaDelActaApi` — la página PÚBLICA del inquilino, SIN sesión
 *     (`/firmar/acta/[token]`): el token de la URL abre el acta y el CÓDIGO que
 *     llega a su correo deja firmar:
 *       `GET  /publico/firma-del-acta/:token`, `POST …/otp/send`, `POST …/otp/verify`, `POST …/firmar`.
 *
 * Los rechazos salen con el sobre de error entero (`ApiError` con `detalle`):
 * el traductor (`mensajeParaLaPersona`) dice qué pasó; «conexión» sólo si el
 * pedido no salió.
 */

import { apiClient, ApiError, getAccessToken } from './client';
import type { SendOtpResponse, VerifyOtpResponse } from './contracts.types';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

// ── Tipos ────────────────────────────────────────────────────────────────

/** Una foto del acta, firmada por una hora. `url` es `null` si no se pudo firmar. */
export interface FotoDelActa {
  ruta: string;
  url: string | null;
}

/** Un espacio con sus fotos (lo que exige el cierre: fotos por espacio). */
export interface EspacioConFotos {
  espacio: string;
  /** El espacio del inventario (`sala`, `cocina`, `habitacion_1`…), si se subió desde ahí. */
  clave: string | null;
  fotos: FotoDelActa[];
}

/** Una firma, como la ve una persona. `firmaUrl` = la imagen dibujada (panel). */
export interface FirmaVisibleDelActa {
  /** `INQUILINO` | `ASESOR` | `PROPIETARIO` | lo que diga el back. */
  papel: string;
  nombre: string;
  firmadaEl: string | null;
  firmaUrl?: string | null;
}

/** Lo que falta para firmar, como lo resume el back. */
export interface ParaFirmarElActa {
  fotos: { completas: boolean; motivo: string | null; espacios: number };
  asesor: { firmo: boolean; nombre: string | null; firmadaEl: string | null };
  inquilino: { firmo: boolean; nombre: string | null; firmadaEl: string | null; correo: string | null };
  enlace: { sePuede: boolean; porQueNo: string | null };
}

/** Lo que dijo el back del cargo aparte al cerrar una devolución (`acta-del-back.ts` lo lee). */
export interface CargoAparteCrudo {
  estado: string;
  valorCop: number;
  mensaje: string;
  vence?: string | null;
}

/** `GET /inmobiliaria/actas/:id` con lo que agrega ARREGLOS-3. */
export interface ActaConSusArchivos {
  id: string;
  type: string;
  status: string;
  fotosDelActa: EspacioConFotos[];
  firmas: FirmaVisibleDelActa[];
  paraFirmar: ParaFirmarElActa;
  cargoAparte?: CargoAparteCrudo | null;
}

export interface FotosDelActaRespuesta {
  ruta: string;
  fotosDelActa: EspacioConFotos[];
}

export interface EnlaceDelInquilinoEnviado {
  enlace: string;
  venceEl: string;
  /** El correo enmascarado al que fue (el del contrato). */
  enviadoA: string | null;
  /** `ENVIADO` | `SIMULADO` (los correos están apagados en este entorno) | `FALLIDO`. */
  envio: 'ENVIADO' | 'SIMULADO' | 'FALLIDO';
}

/** Lo que ve el inquilino en la página pública. */
export interface ActaParaElInquilino {
  estado: 'PARA_FIRMAR' | 'YA_FIRMASTE' | 'CERRADA' | 'NO_LISTA';
  porQue: string | null;
  venceEl: string | null;
  correo: string | null;
  inmobiliaria: { nombre: string };
  acta: {
    tipo: string;
    inmueble: string;
    direccion: string;
    inquilino: string | null;
    fechaDeEntrega: string | null;
    estadoGeneral: string;
    observaciones: string | null;
    espacios: Array<{ espacio: string; clave: string | null; fotos: string[] }>;
    espaciosDelInventario: unknown[];
    inventario: Array<{
      espacio: string | null;
      nombre: string;
      cantidad: number | null;
      estado: string | null;
      notas: string | null;
    }>;
    medidores: unknown[];
    llaves: unknown[];
    deposito: number | null;
    descuentos: Array<{ concepto: string; valor: number; notas: string | null }>;
    aDevolver: number | null;
  };
  firmas: FirmaVisibleDelActa[];
}

// ── Transporte ───────────────────────────────────────────────────────────

/** El fallo de una respuesta, con su sobre entero (como `apiClient`). */
async function falloDe(respuesta: Response, porDefecto: string): Promise<ApiError> {
  const cuerpo = (await respuesta.json().catch(() => ({}))) as Record<string, unknown>;
  const mensaje =
    Array.isArray(cuerpo.message) || typeof cuerpo.message === 'string'
      ? (cuerpo.message as string | string[])
      : porDefecto;
  return new ApiError(respuesta.status, mensaje, typeof cuerpo.code === 'string' ? cuerpo.code : undefined, cuerpo);
}

/** Un pedido que no salió: status 0 (el traductor habla de la conexión SÓLO aquí). */
function sinRespuesta(error: unknown): ApiError {
  return new ApiError(0, `No pudimos conectarnos al servidor. ${error instanceof Error ? error.message : String(error)}`);
}

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
    throw sinRespuesta(error);
  }
  if (!respuesta.ok) throw await falloDe(respuesta, `Error ${respuesta.status}`);
  return respuesta.json() as Promise<T>;
}

const BASE = '/inmobiliaria/actas';
const PUBLICO = '/publico/firma-del-acta';
const id = (v: string) => encodeURIComponent(v);

// ── El panel ─────────────────────────────────────────────────────────────

export const firmaDelActaApi = {
  /** El acta con sus fotos firmadas, sus firmas y lo que falta para firmar. */
  detalle: (actaId: string) => apiClient.get<ActaConSusArchivos>(`${BASE}/${id(actaId)}`),

  /**
   * UNA foto a un espacio del acta. `espacio` es el nombre que verá el
   * inquilino; `clave`, el espacio del inventario. Devuelve todas las fotos del
   * acta firmadas.
   */
  async subirFoto(
    actaId: string,
    foto: File,
    espacio: string,
    clave?: string | null,
  ): Promise<FotosDelActaRespuesta> {
    const token = getAccessToken();
    const formulario = new FormData();
    formulario.append('file', foto, foto.name || 'foto.jpg');
    formulario.append('espacio', espacio);
    if (clave) formulario.append('clave', clave);
    let respuesta: Response;
    try {
      respuesta = await fetch(`${BACKEND_URL}${BASE}/${id(actaId)}/fotos`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formulario,
      });
    } catch (error) {
      throw sinRespuesta(error);
    }
    if (!respuesta.ok) throw await falloDe(respuesta, 'No se pudo subir la foto.');
    return respuesta.json() as Promise<FotosDelActaRespuesta>;
  },

  /** Borra UNA foto del acta (idempotente). */
  borrarFoto: (actaId: string, ruta: string) =>
    apiClient.delete<FotosDelActaRespuesta>(
      `${BASE}/${id(actaId)}/fotos?${new URLSearchParams({ ruta }).toString()}`,
    ),

  /** La firma del asesor, DIBUJADA (PNG en base64). Si ya firmó el inquilino, cierra el acta. */
  firmarComoAsesor: (actaId: string, signatureData: string) =>
    apiClient.post<ActaConSusArchivos>(`${BASE}/${id(actaId)}/firma-del-asesor`, { signatureData }),

  /** El enlace para que el inquilino firme: va a su correo y vuelve para copiarlo. */
  enlaceDelInquilino: (actaId: string) =>
    apiClient.post<EnlaceDelInquilinoEnviado>(`${BASE}/${id(actaId)}/enlace-del-inquilino`, {}),
};

// ── La página pública ────────────────────────────────────────────────────

export const firmaPublicaDelActaApi = {
  obtener: (token: string) => sinSesion<ActaParaElInquilino>('GET', `${PUBLICO}/${id(token)}`),
  otpSend: (token: string) => sinSesion<SendOtpResponse>('POST', `${PUBLICO}/${id(token)}/otp/send`, {}),
  otpVerify: (token: string, code: string) =>
    sinSesion<VerifyOtpResponse>('POST', `${PUBLICO}/${id(token)}/otp/verify`, { code }),
  firmar: (
    token: string,
    cuerpo: { signatureData: string; acceptedTerms: true; otpVerificationToken: string },
  ) => sinSesion<ActaParaElInquilino>('POST', `${PUBLICO}/${id(token)}/firmar`, cuerpo),
};

// ── Reglas de la pantalla (puras) ────────────────────────────────────────

/** Los tipos de foto que acepta el back y su peso máximo (el mismo de `archivos-del-acta.ts`). */
export const TIPOS_DE_FOTO_DEL_ACTA = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_BYTES_DE_UNA_FOTO_DEL_ACTA = 5 * 1024 * 1024;

/** Lo que está mal de una foto antes de subirla, o `null`. Las frases del back. */
export function problemaDeLaFoto(foto: { type: string; size: number }): string | null {
  if (!(TIPOS_DE_FOTO_DEL_ACTA as readonly string[]).includes(foto.type)) {
    return 'La foto tiene que ser JPG, PNG o WebP.';
  }
  if (foto.size === 0) return 'Falta la foto: elige una imagen del espacio.';
  if (foto.size > MAX_BYTES_DE_UNA_FOTO_DEL_ACTA) return 'La foto no puede pesar más de 5 MB.';
  return null;
}

/** El nombre de un espacio que se escribe a mano: 1 a 60 caracteres, sin < ni > (la regla del back). */
export function problemaDelEspacio(nombre: string): string | null {
  const limpio = nombre.replace(/\s+/g, ' ').trim();
  if (!limpio || limpio.length > 60 || /[<>]/.test(limpio)) {
    return 'Di de qué espacio es la foto (hasta 60 caracteres, sin < ni >).';
  }
  return null;
}

/**
 * Los espacios que se muestran para subir fotos: primero los del inventario del
 * acta (con su nombre legible y su clave), después los que ya tienen fotos y no
 * son del inventario (escritos a mano). Nunca uno repetido: se reconoce por la
 * clave y, sin ella, por el nombre.
 */
export function espaciosParaLasFotos(
  delInventario: ReadonlyArray<{ clave: string; nombre: string }>,
  conFotos: readonly EspacioConFotos[],
  agregados: readonly string[] = [],
): Array<{ espacio: string; clave: string | null; fotos: FotoDelActa[] }> {
  const salida: Array<{ espacio: string; clave: string | null; fotos: FotoDelActa[] }> = [];
  const igual = (a: string, b: string) => a.toLocaleLowerCase('es') === b.toLocaleLowerCase('es');
  const usados = new Set<number>();
  for (const e of delInventario) {
    const i = conFotos.findIndex(
      (c, j) => !usados.has(j) && ((c.clave && c.clave === e.clave) || (!c.clave && igual(c.espacio, e.nombre))),
    );
    if (i >= 0) usados.add(i);
    salida.push({ espacio: e.nombre, clave: e.clave, fotos: i >= 0 ? conFotos[i].fotos : [] });
  }
  conFotos.forEach((c, j) => {
    if (!usados.has(j) && !salida.some((s) => igual(s.espacio, c.espacio))) {
      salida.push({ espacio: c.espacio, clave: c.clave, fotos: c.fotos });
    }
  });
  for (const nombre of agregados) {
    if (!salida.some((s) => igual(s.espacio, nombre))) salida.push({ espacio: nombre, clave: null, fotos: [] });
  }
  return salida;
}

/** Lo que dice el envío del enlace, para la persona del panel. */
export function fraseDelEnvio(e: EnlaceDelInquilinoEnviado): string {
  switch (e.envio) {
    case 'ENVIADO':
      return `Le mandamos el enlace a ${e.enviadoA ?? 'su correo'}. El código para firmar le llega sólo a ese correo.`;
    case 'SIMULADO':
      return 'En este entorno los correos están apagados: no le llegó nada. Copia el enlace y mándaselo; el código para firmar sí se pide desde ahí.';
    default:
      return 'No pudimos mandarle el correo. Copia el enlace y mándaselo por otro medio: el código para firmar le llega a su correo.';
  }
}
