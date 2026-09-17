/**
 * 🔴 COBRO JURÍDICO (Nico, 17-09-2026).
 *
 * «Los abogados se registran por inmobiliaria. UNA persona pasa el caso a
 * jurídico; el sistema lo SUGIERE desde el día 90 sin póliza. Los honorarios
 * van a cargo del inquilino sólo si el contrato lo pacta, son un % de lo
 * RECAUDADO con tope, y son del ABOGADO: cuenta por pagar, no ingreso.»
 *
 *   GET/POST/PATCH /inmobiliaria/juridico/abogados
 *   GET/PUT        /inmobiliaria/juridico/configuracion
 *   GET            /inmobiliaria/juridico/sugeridos
 *   GET/POST       /inmobiliaria/juridico/casos     · POST casos/:id/cerrar
 *   PUT            /inmobiliaria/juridico/contratos/:id/honorarios
 *   GET            /inmobiliaria/juridico/honorarios · POST honorarios/pagar
 *
 * Sin la migración 20260917170000 todo responde 503 `COBRO_JURIDICO_SIN_MIGRAR`
 * con el motivo, y la pantalla lo dice en palabras.
 */

import { apiClient } from '@/lib/api/client';
import { invalidar } from './refresco-de-datos';

const BASE = '/inmobiliaria/juridico';

export interface Abogado {
  id: string;
  nombre: string;
  documento: string | null;
  email: string | null;
  telefono: string | null;
  activo: boolean;
}

export interface ConfiguracionJuridica {
  /** `null` = la inmobiliaria no lo configuró, que es NO cobrar honorarios. */
  pactaHonorarios: boolean | null;
  honorariosPct: number | null;
  honorariosTopeCop: number | null;
}

export interface CasoSugerido {
  contractId: string;
  numero: string;
  tenantId: string | null;
  tenantName: string | null;
  direccion: string;
  diasDeMora: number;
  deudaCop: number;
  pactaHonorarios: boolean;
}

export interface CasoJuridico {
  id: string;
  contractId: string;
  tenantId: string | null;
  estado: 'EN_JURIDICO' | 'CERRADO';
  pasadoAt: string;
  motivo: string | null;
  diasDeMora: number | null;
  deudaAlPasarCop: number | null;
  pactaHonorarios: boolean;
  honorariosPct: number | null;
  honorariosTopeCop: number | null;
  cerradoAt: string | null;
  motivoDeCierre: string | null;
  abogado: { id: string; nombre: string; documento: string | null };
  honorariosCausadosCop: number;
  honorariosPorPagarCop: number;
}

export interface HonorarioJuridico {
  id: string;
  casoId: string;
  contractId: string;
  abogado: { id: string; nombre: string };
  reciboId: string;
  recaudoCop: number;
  honorarioCop: number;
  estado: 'POR_PAGAR_AL_ABOGADO' | 'PAGADO_AL_ABOGADO' | 'ANULADO';
  pagadoAt: string | null;
  createdAt: string;
}

export const juridicoApi = {
  abogados(): Promise<Abogado[]> {
    return apiClient.get<Abogado[]>(`${BASE}/abogados`);
  },

  crearAbogado(datos: {
    nombre: string;
    documento?: string;
    email?: string;
    telefono?: string;
  }): Promise<Abogado> {
    const cuerpo: Record<string, unknown> = { nombre: datos.nombre };
    if (datos.documento) cuerpo.documento = datos.documento;
    if (datos.email) cuerpo.email = datos.email;
    if (datos.telefono) cuerpo.telefono = datos.telefono;
    return apiClient.post<Abogado>(`${BASE}/abogados`, cuerpo);
  },

  actualizarAbogado(id: string, datos: { activo?: boolean; nombre?: string }): Promise<Abogado> {
    const cuerpo: Record<string, unknown> = {};
    if (datos.activo !== undefined) cuerpo.activo = datos.activo;
    if (datos.nombre !== undefined) cuerpo.nombre = datos.nombre;
    return apiClient.patch<Abogado>(`${BASE}/abogados/${id}`, cuerpo);
  },

  configuracion(): Promise<ConfiguracionJuridica> {
    return apiClient.get<ConfiguracionJuridica>(`${BASE}/configuracion`);
  },

  guardarConfiguracion(datos: {
    pactaHonorarios?: boolean;
    honorariosPct?: number;
    honorariosTopeCop?: number;
  }): Promise<ConfiguracionJuridica> {
    const cuerpo: Record<string, unknown> = {};
    if (datos.pactaHonorarios !== undefined) cuerpo.pactaHonorarios = datos.pactaHonorarios;
    if (datos.honorariosPct !== undefined) cuerpo.honorariosPct = datos.honorariosPct;
    if (datos.honorariosTopeCop !== undefined) cuerpo.honorariosTopeCop = datos.honorariosTopeCop;
    return apiClient.put<ConfiguracionJuridica>(`${BASE}/configuracion`, cuerpo);
  },

  sugeridos(): Promise<CasoSugerido[]> {
    return apiClient.get<CasoSugerido[]>(`${BASE}/sugeridos`);
  },

  casos(estado?: 'EN_JURIDICO' | 'CERRADO'): Promise<CasoJuridico[]> {
    return apiClient.get<CasoJuridico[]>(
      estado ? `${BASE}/casos?estado=${estado}` : `${BASE}/casos`,
    );
  },

  /** 🔴 Lo pasa una PERSONA: el sistema sólo lo sugiere. */
  async pasar(datos: {
    contractId: string;
    abogadoId: string;
    motivo?: string;
  }): Promise<CasoJuridico> {
    const cuerpo: Record<string, unknown> = {
      contractId: datos.contractId,
      abogadoId: datos.abogadoId,
    };
    if (datos.motivo) cuerpo.motivo = datos.motivo;
    const res = await apiClient.post<CasoJuridico>(`${BASE}/casos`, cuerpo);
    invalidar('cobros');
    return res;
  },

  async cerrar(casoId: string, motivo: string): Promise<CasoJuridico> {
    const res = await apiClient.post<CasoJuridico>(`${BASE}/casos/${casoId}/cerrar`, { motivo });
    invalidar('cobros');
    return res;
  },

  /** La bandera POR CONTRATO. `null` hereda la de la inmobiliaria. */
  pactarEnElContrato(
    contractId: string,
    pacta: boolean | null,
  ): Promise<{ contractId: string; pacta: boolean | null; efectivo: boolean }> {
    return apiClient.put(`${BASE}/contratos/${contractId}/honorarios`, { pacta });
  },

  honorarios(estado?: string): Promise<HonorarioJuridico[]> {
    return apiClient.get<HonorarioJuridico[]>(
      estado ? `${BASE}/honorarios?estado=${estado}` : `${BASE}/honorarios`,
    );
  },

  pagarHonorarios(ids: string[]): Promise<{ pagados: number }> {
    return apiClient.post<{ pagados: number }>(`${BASE}/honorarios/pagar`, { ids });
  },
};
