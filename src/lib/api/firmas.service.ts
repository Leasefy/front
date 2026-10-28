/**
 * Firmas (back `src/firmas/`, Nico 28-10-2026): cualquier documento PDF que una cuenta manda a firmar a hasta 5
 * personas, con nuestro código (correo y WhatsApp), la hoja de firmas o la firma donde la ponga quien envía, y el PDF
 * sellado. La inmobiliaria (y el agente) usa `/inmobiliaria/firmas`; el propietario sin inmobiliaria,
 * `/propietario/firmas`; quien firma, sin cuenta, `/publico/firmas/:token`.
 */
import { apiClient } from './client';
import { enviarFormulario, sinSesion } from './consignacion-firma.service';
import type { SendOtpResponse, VerifyOtpResponse } from './contracts.types';

export type EstadoDelDocumento = 'BORRADOR' | 'POR_PAGAR' | 'ENVIADO' | 'FIRMADO' | 'CANCELADO';
export type FormaDePago = 'REGALO' | 'PAQUETE' | 'PAGO_UNICO' | 'FACTURA';
export type ComoPaga = 'BOLSA' | 'PAGO_UNICO' | 'FACTURA';
export type Ubicacion = 'HOJA_FINAL' | 'EN_EL_DOCUMENTO';

/** Página (desde 1) y caja en fracciones de la página (0 a 1, desde arriba a la izquierda). */
export interface Posicion {
  pagina: number;
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

export interface FirmanteDelDocumento {
  id: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  numeroDocumento: string | null;
  posicion: Posicion | null;
  invitacion: 'ENVIADA' | 'FALLO' | 'SIN_CORREO' | null;
  firmado: boolean;
  firmadoAt: string | null;
}

export interface DocumentoParaFirmar {
  id: string;
  titulo: string;
  mensaje: string | null;
  estado: EstadoDelDocumento;
  ubicacion: Ubicacion;
  paginas: number;
  formaDePago: FormaDePago | null;
  devuelto: boolean;
  creadoAt: string;
  enviadoAt: string | null;
  firmadoAt: string | null;
  canceladoAt: string | null;
  creadoPor: { id: string; nombre: string | null };
  firmaron: number;
  total: number;
  firmantes: FirmanteDelDocumento[];
}

export interface EnlaceDelFirmante {
  firmanteId: string;
  enlace: string;
  whatsapp: string;
  tieneCelular: boolean;
}

export interface DetalleDelDocumento extends DocumentoParaFirmar {
  enlaces: EnlaceDelFirmante[];
}

export interface BolsaDeFirmas {
  gratis: number;
  enPaquetes: number;
  total: number;
  proximoVencimiento: string | null;
}

export interface PaqueteDeFirmasALaVenta {
  firmas: number;
  precio: number;
  iva: number;
  total: number;
  porFirma: number;
}

export interface CompraDeFirmas {
  id: string;
  firmas: number;
  precio: number;
  iva: number;
  origen: 'COMPRA' | 'DEVOLUCION';
  estado: 'PENDIENTE' | 'PAGADO' | 'ANULADO';
  pagadoAt: string | null;
  venceAt: string | null;
  creadoAt: string;
}

export interface VistaDeFirmas {
  disponible: boolean;
  precioPorDocumento: { precio: number; iva: number; total: number };
  firmantesPorDocumento: number;
  aLaVenta: PaqueteDeFirmasALaVenta[];
  codigoPorWhatsapp: boolean;
  bolsa: BolsaDeFirmas;
  puedeCargarALaFactura: boolean;
  enLaFacturaEsteMes: { documentos: number; total: number };
  documentos: DocumentoParaFirmar[];
  compras: CompraDeFirmas[];
}

export interface FirmanteNuevo {
  nombre: string;
  email?: string;
  telefono?: string;
  numeroDocumento?: string;
  posicion?: Posicion | null;
}

export interface DatosDelDocumentoNuevo {
  titulo: string;
  mensaje?: string;
  ubicacion: Ubicacion;
  firmantes: FirmanteNuevo[];
}

export interface FirmaPublica {
  firmante: { nombre: string; firmado: boolean; firmadoAt: string | null };
  documento: {
    titulo: string;
    mensaje: string | null;
    estado: EstadoDelDocumento;
    paginas: number;
    ubicacion: Ubicacion;
    url: string;
    firmado: boolean;
  };
  quienEnvia: string;
  firmantes: Array<{ nombre: string; firmado: boolean; esUsted: boolean }>;
  canales: { correo: string | null; whatsapp: string | null };
}

export type DondeFirma = 'inmobiliaria' | 'propietario';

/** Las rutas del panel: las de la inmobiliaria (y del agente) o las del propietario sin inmobiliaria. */
export function firmasApi(donde: DondeFirma) {
  const base = donde === 'inmobiliaria' ? '/inmobiliaria/firmas' : '/propietario/firmas';
  return {
    vista: () => apiClient.get<VistaDeFirmas>(base),
    detalle: (id: string) => apiClient.get<DetalleDelDocumento>(`${base}/${id}`),
    crear(archivo: File, datos: DatosDelDocumentoNuevo): Promise<DetalleDelDocumento> {
      const f = new FormData();
      f.append('archivo', archivo);
      f.append('datos', JSON.stringify(datos));
      return enviarFormulario<DetalleDelDocumento>(base, f, 'No pudimos subir el documento');
    },
    enviar: (id: string, como: ComoPaga) =>
      apiClient.post<{ documento: DetalleDelDocumento; paymentUrl?: string; total?: number }>(`${base}/${id}/enviar`, { como }),
    cancelar: (id: string) => apiClient.post<DetalleDelDocumento>(`${base}/${id}/cancelar`, {}),
    reenviar: (id: string, firmanteId: string) => apiClient.post<DetalleDelDocumento>(`${base}/${id}/firmantes/${firmanteId}/reenviar`, {}),
    descargar: (id: string) => apiClient.get<{ url: string; expiresAt: string; firmado: boolean; sellado: boolean }>(`${base}/${id}/descargar`),
    comprar: (firmas: number) => apiClient.post<{ paqueteId: string; paymentUrl: string; total: number }>(`${base}/paquetes`, { firmas }),
  };
}

/** La página pública de quien firma (sin sesión: el token del enlace es la llave). */
export const firmaPublicaApi = {
  obtener: (token: string) => sinSesion<FirmaPublica>('GET', `/publico/firmas/${encodeURIComponent(token)}`),
  otpSend: (token: string) => sinSesion<SendOtpResponse>('POST', `/publico/firmas/${encodeURIComponent(token)}/otp/send`, {}),
  otpVerify: (token: string, code: string) =>
    sinSesion<VerifyOtpResponse>('POST', `/publico/firmas/${encodeURIComponent(token)}/otp/verify`, { code }),
  firmar: (token: string, dto: { signatureData: string; acceptedTerms: boolean; otpVerificationToken: string }) =>
    sinSesion<FirmaPublica>('POST', `/publico/firmas/${encodeURIComponent(token)}/firmar`, dto),
};
