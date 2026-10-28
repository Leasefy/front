/**
 * Refiere y gana (back `inmobiliaria/referidos/`, 28-10-2026): el enlace de cada cliente que paga, el código del colega
 * y lo que lleva ganado quien refiere.
 */
import { apiClient } from './client';
import type { AccesoDeLaCuenta, EstadoDelAcceso } from '@/lib/conversion/acceso';

export type TipoDeReferido = 'inmobiliaria' | 'agente' | 'propietario';

export interface CodigoPublico {
  codigo: string;
  deQuien: string;
  /** Quien invita sigue pagando: el código sirve. */
  vigente: boolean;
  diasGratis: number;
}

export interface ColegaReferido {
  id: string;
  nombre: string;
  tipo: TipoDeReferido;
  estado: 'registrado' | 'pago';
  /** `mes` = su pago te ganó un mes; `tope` = ya ibas en los 3 del año. */
  premio: 'mes' | 'tope' | null;
  registradoEn: string;
  pagoEn: string | null;
  aplicadoEn: string | null;
  aplicadoHasta: string | null;
}

export interface MiRefiereYGana {
  puedeReferir: boolean;
  estado: EstadoDelAcceso;
  codigo: string | null;
  tope: number;
  anio: number;
  ganadosEsteAnio: number;
  porUsar: number;
  diasGratisDelReferido: number;
  diasDelEnlace: number;
  referidos: ColegaReferido[];
}

export interface ResultadoDelCodigo {
  acceso: AccesoDeLaCuenta;
  mesGratis: boolean;
  deQuien: string;
}

export const refiereYGanaApi = {
  /** Público: de quién es el código y si sirve. */
  codigo: (codigo: string) => apiClient.get<CodigoPublico>(`/refiere-y-gana/codigo/${encodeURIComponent(codigo)}`),
  /** Con sesión: la cuenta entra con el código del colega. */
  usar: (codigo: string) => apiClient.post<ResultadoDelCodigo>(`/refiere-y-gana/codigo/${encodeURIComponent(codigo)}/usar`, {}),
  /** Lo de la cuenta de la sesión: su enlace, sus meses y sus colegas. */
  mio: () => apiClient.get<MiRefiereYGana>('/cuenta/refiere-y-gana'),
};
