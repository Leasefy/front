/**
 * Los informes del propietario, en su portal.
 *
 * Punto 6 de la «ola 5» (Nico, 17-09-2026): «rentabilidad del inmueble,
 * certificado anual de ingresos, historial de reparaciones con soporte». La
 * rentabilidad ya existía en el panel de la inmobiliaria; las otras dos se
 * construyeron el 21-09-2026 (`portal/propietario/*`).
 */

import { apiClient } from './client';

export interface FichaDelPropietario {
  propietarioId: string;
  agencyId: string;
  agencia: string;
}

export interface InformesDisponibles {
  fichas: FichaDelPropietario[];
  /** Los años con algo que certificar, del más nuevo al más viejo. */
  anios: number[];
  motivo: string | null;
}

export interface MesDelCertificado {
  mes: string;
  ingresoBrutoCop: number;
  ivaCop: number;
  comisionCop: number;
  retenidoCop: number;
}

export interface InmuebleDelCertificado {
  contractId: string;
  inmueble: string;
  ingresoBrutoCop: number;
  comisionCop: number;
  retenidoCop: number;
}

export interface CertificadoDeIngresos {
  anio: number;
  ingresoBrutoCop: number;
  ivaCop: number;
  otrosConceptosCop: number;
  comisionCop: number;
  ivaComisionCop: number;
  retencionesQueLePracticaronCop: number;
  retencionesQueElPracticoCop: number;
  periodos: number;
  periodosDelSistemaAnterior: number;
  periodosAnulados: number;
  meses: MesDelCertificado[];
  inmuebles: InmuebleDelCertificado[];
  /** Lo que el documento dice de sí mismo. Nunca vacío. */
  advertencias: string[];
  motivo: string | null;
}

export interface ReparacionDelPropietario {
  id: string;
  fecha: string;
  inmueble: string;
  titulo: string;
  descripcion: string;
  estado: string;
  /** `null` es «no le tocó a él», que no es lo mismo que «$0». */
  aCargoDelPropietarioCop: number | null;
  fotos: { nombre: string; url: string }[];
  /** El comprobante vive en un bucket privado: se pide firmado por su id. */
  comprobante: { deduccionId: string; nombre: string | null } | null;
  proveedor: string | null;
}

export const informesDelPropietarioApi = {
  async disponibles(): Promise<InformesDisponibles> {
    return apiClient.get<InformesDisponibles>('/portal/propietario/informes');
  },

  async certificadoDeIngresos(anio?: number): Promise<CertificadoDeIngresos> {
    return apiClient.get<CertificadoDeIngresos>(
      `/portal/propietario/certificado-de-ingresos${anio ? `?anio=${anio}` : ''}`,
    );
  },

  async reparaciones(): Promise<{
    reparaciones: ReparacionDelPropietario[];
    motivo: string | null;
  }> {
    return apiClient.get('/portal/propietario/reparaciones');
  },

  /** El enlace firmado del comprobante de un descuento propio. */
  async comprobante(
    deduccionId: string,
  ): Promise<{ url: string; nombre: string | null }> {
    return apiClient.get(
      `/portal/propietario/reparaciones/${deduccionId}/comprobante`,
    );
  },
};
