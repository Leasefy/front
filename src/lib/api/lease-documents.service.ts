/**
 * Paz y salvo y certificado de estar al día, desde el portal del inquilino.
 *
 * 🔴 ESTE ARCHIVO ERA UN CONTRATO SIN BACK. Durante meses declaró
 * `POST /lease-documents/paz-y-salvo` + `GET /lease-documents/:id/status`, con
 * tipos, manejo de errores y pantalla — y el back nunca implementó ninguno de
 * los dos. Lo decía en su encabezado («CONTRACT ONLY, no backend today»), pero
 * nadie lee encabezados cuando está buscando si algo existe, así que el
 * producto parecía tener paz y salvo. El 21-09-2026 se construyó el back
 * (`back-erp/src/inmobiliaria/documentos/certificados/`) y este archivo pasó a
 * hablarle a rutas que existen.
 *
 * Lo que cambió, y por qué:
 *
 *   · **El flujo ya no es asíncrono.** El contrato viejo lo modelaba como el
 *     avalúo (pedir → sondear → URL firmada) porque no sabía cuánto iba a
 *     tardar. El certificado se arma de una lectura del estado de cuenta y un
 *     HTML: sale en la misma petición. Sondear algo que ya está listo es
 *     inventar una espera.
 *   · **Son DOS documentos y el cliente no elige cuál.** Lo decide el estado
 *     del contrato: terminado ⇒ paz y salvo, vigente ⇒ certificado de estar al
 *     día. Dejarlo elegir sería dejarlo pedir el equivocado y después
 *     explicarle por qué se lo negaron.
 *   · **Un «no se puede» viene con motivos.** El back devuelve, por contrato,
 *     si se puede emitir y TODO lo que falta si no — para que la pantalla lo
 *     diga antes y no después de un botón.
 */

import { apiClient } from './client';

/** Los dos certificados. El código es el de la plantilla legal del back. */
export type TipoDeCertificado = 'PAZ_Y_SALVO' | 'CERTIFICADO_ESTAR_AL_DIA';

/** Por qué no se puede emitir. `code` es lo que la pantalla puede mirar. */
export interface ImpedimentoDelCertificado {
  code: string;
  mensaje: string;
}

/** Un contrato del inquilino y qué certificado le corresponde. */
export interface CertificadoDisponible {
  contractId: string;
  /** El número que el cliente reconoce (el de su sistema anterior si lo hay). */
  numero: string;
  inmueble: string;
  agencia: { id: string; nombre: string };
  /** `null` cuando el contrato todavía no ha empezado. */
  tipo: TipoDeCertificado | null;
  puedeEmitirse: boolean;
  impedimentos: ImpedimentoDelCertificado[];
}

export interface CertificadoEmitido {
  documentoId: string;
  tipo: TipoDeCertificado;
}

export const leaseDocumentsApi = {
  /** Mis contratos con el veredicto puesto. */
  async disponibles(): Promise<CertificadoDisponible[]> {
    const r = await apiClient.get<{ contratos: CertificadoDisponible[] }>(
      '/portal/certificados',
    );
    return r.contratos ?? [];
  },

  /**
   * Emite el certificado de un contrato. El tipo no viaja: lo decide el back
   * con el estado del contrato, que es el único que lo sabe de verdad.
   */
  async emitir(contractId: string): Promise<CertificadoEmitido> {
    return apiClient.post<CertificadoEmitido>(`/portal/certificados/${contractId}`);
  },

  /** El PDF del certificado ya emitido. */
  async pdf(documentoId: string): Promise<Blob> {
    return apiClient.getBlob(`/portal/certificados/${documentoId}/pdf`);
  },
};
