/**
 * El mes gratis de los aliados y lo que ve cada cuenta (back `inmobiliaria/conversion/`, 27-10-2026).
 */
import { apiClient } from './client';
import type { AccesoConCotizacion, AccesoDeLaCuenta } from '@/lib/conversion/acceso';

export interface AlianzaPublica {
  codigo: string;
  nombre: string;
  diasGratis: number;
  vigente: boolean;
}

export const conversionApi = {
  /** Público: el aliado del enlace de invitado. */
  alianza: (codigo: string) => apiClient.get<AlianzaPublica>(`/alianzas/${encodeURIComponent(codigo)}`),
  /** Con sesión: activa el mes gratis para la cuenta. */
  usarAlianza: (codigo: string) => apiClient.post<AccesoDeLaCuenta>(`/alianzas/${encodeURIComponent(codigo)}/usar`, {}),
  /** Lo que ve la cuenta de la sesión (el propietario lo pide aquí). */
  accesoDeLaCuenta: () => apiClient.get<AccesoDeLaCuenta>('/cuenta/acceso'),
  /** El de la inmobiliaria, con lo que le saldría pagar. */
  accesoDeLaInmobiliaria: () => apiClient.get<AccesoConCotizacion>('/inmobiliaria/acceso'),
};
