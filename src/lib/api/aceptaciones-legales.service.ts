/**
 * Re-aceptar la política y los términos de hoy (FALTANTES, 05-10-2026;
 * decisión 1 del 05-10). Back: `src/legal/aceptaciones/`.
 */
import { apiClient } from '@/lib/api/client';

export interface EstadoDeLasAceptaciones {
  /** `false` = el back todavía no puede guardarlo: la ventana NO se muestra (sin bucles). */
  disponible: boolean;
  debeAceptar: boolean;
  politica: { version: string; aceptada: boolean; aceptadaEl: string | null };
  terminos: { version: string; aceptada: boolean; aceptadaEl: string | null };
  cambios: string[];
}

export const aceptacionesLegalesApi = {
  estado(): Promise<EstadoDeLasAceptaciones> {
    return apiClient.get<EstadoDeLasAceptaciones>('/users/me/legales');
  },
  aceptar(politica: string, terminos: string): Promise<EstadoDeLasAceptaciones> {
    return apiClient.post<EstadoDeLasAceptaciones>('/users/me/legales/aceptar', { politica, terminos });
  },
};

/**
 * Dónde NO se pide (aunque haya sesión): las páginas que hay que poder leer
 * para aceptar, el inicio de sesión, las firmas públicas por enlace y el
 * backoffice de Leasefy. Pura.
 */
export function rutaSinVentanaLegal(ruta: string | null | undefined): boolean {
  const r = ruta ?? '';
  return (
    r.startsWith('/privacidad') ||
    r.startsWith('/terminos') ||
    r.startsWith('/auth') ||
    r.startsWith('/firmar') ||
    r.startsWith('/admin') ||
    r.startsWith('/publico')
  );
}
