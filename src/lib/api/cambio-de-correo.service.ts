/**
 * Cambiar el correo con que se ENTRA a Leasefy (21-10-2026) — `/users/me/correo`.
 *
 * Pedir manda un enlace al correo nuevo (24 h) y un aviso al viejo; el cambio
 * sólo se hace al CONFIRMAR con ese enlace y la sesión iniciada. Ver el
 * servicio del back `auth/correo-de-entrada/cambio-de-correo.service.ts`.
 */
import { apiClient } from '@/lib/api/client';

export interface EstadoDelCambioDeCorreo {
  correo: string;
  entraConContrasena: boolean;
  pendiente: { correo: string; vence: string; pedidoEl: string } | null;
}

export interface PedidoDelCambioDeCorreo {
  correoNuevo: string;
  vence: string;
  /** `false` si el correo con el enlace no salió: «Reenviar» lo intenta otra vez. */
  correoEnviado: boolean;
}

export interface CambioConfirmado {
  correo: string;
  sesionesCerradas: boolean;
  fichasMovidas: number;
}

const BASE = '/users/me/correo';

export const cambioDeCorreoApi = {
  estado(): Promise<EstadoDelCambioDeCorreo> {
    return apiClient.get<EstadoDelCambioDeCorreo>(BASE);
  },
  pedir(correoNuevo: string, contrasenaActual?: string): Promise<PedidoDelCambioDeCorreo> {
    return apiClient.post<PedidoDelCambioDeCorreo>(BASE, { correoNuevo, contrasenaActual });
  },
  reenviar(): Promise<PedidoDelCambioDeCorreo> {
    return apiClient.post<PedidoDelCambioDeCorreo>(`${BASE}/reenviar`);
  },
  cancelar(): Promise<{ cancelado: boolean }> {
    return apiClient.delete<{ cancelado: boolean }>(BASE);
  },
  confirmar(enlace: string): Promise<CambioConfirmado> {
    return apiClient.post<CambioConfirmado>(`${BASE}/confirmar`, { enlace });
  },
};
